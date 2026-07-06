"""Loan-related business logic.

This module implements core loan workflows (student requests, librarian
approvals, direct checkout/return) and exposes helpers to list loans and
convert Loan models into API-friendly schemas. Audit logging for loan
events is performed via `audit_service.log_tx`.
"""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import settings
from core.security import CurrentUser
from models import models, schemas
from services import audit_service


def _computed_status(loan: models.Loan) -> str:
    """Return a human-friendly loan status string.

    The DB stores a compact enum but the API needs a computed "Overdue"
    state when the due_date is in the past.
    """
    if loan.status == models.LoanStatusEnum.returned:
        return "Returned"
    if loan.status == models.LoanStatusEnum.return_requested:
        return "Return Requested"
    if loan.status == models.LoanStatusEnum.requested:
        return "Requested"
    if loan.due_date < date.today():
        return "Overdue"
    return "Active"


def to_loan_out(loan: models.Loan) -> schemas.LoanOut:
    return schemas.LoanOut(
        id=loan.id,
        book_id=loan.book_id,
        book_title=loan.book.title,
        author=loan.book.author,
        student_name=loan.student.name,
        student_login_id=loan.student.login_id,
        borrow_date=loan.borrow_date,
        due_date=loan.due_date,
        return_date=loan.return_date,
        status=_computed_status(loan),
    )


def list_loans(db: Session, student_id: str | None = None) -> list[models.Loan]:
    query = db.query(models.Loan)
    if student_id:
        query = query.filter(models.Loan.student_id == student_id)
    return query.order_by(models.Loan.created_at.desc()).all()


def _get_active_or_pending_loan(db: Session, student_id: str, book_id: str):
    return db.query(models.Loan).filter(
        models.Loan.student_id == student_id,
        models.Loan.book_id == book_id,
        models.Loan.status != models.LoanStatusEnum.returned,
    ).first()


def _log(db: Session, tx_type: models.TxTypeEnum, loan: models.Loan, actor_name: str) -> None:
    # Wrapper used internally to create an audit entry for loan operations.
    # This calls the centralized audit_service and intentionally swallows
    # errors (rolling back) so the primary operation (checkout/return/etc.)
    # does not fail due to an auditing problem.
    try:
        audit_service.log_tx(db=db, tx_type=tx_type, actor_name=actor_name, loan=loan)
    except Exception:
        # Best-effort logging: avoid breaking main flow if audit write fails
        db.rollback()


def list_logs(
    db: Session,
    student_id: str | None = None,
    q: str | None = None,
    types: list[str] | None = None,
    page: int = 1,
    per_page: int = 100,
    sort_desc: bool = True,
) -> list[models.TxLog]:
    query = db.query(models.TxLog)
    if student_id:
        query = query.filter(models.TxLog.student_id == student_id)
    if types:
        # coerce to enum values
        enum_vals = []
        for t in types:
            try:
                enum_vals.append(models.TxTypeEnum(t))
            except Exception:
                continue
        if enum_vals:
            query = query.filter(models.TxLog.type.in_(enum_vals))
    if q:
        like = f"%{q}%"
        query = query.filter(
            models.TxLog.book_title.ilike(like)
            | models.TxLog.student_name.ilike(like)
            | models.TxLog.student_login_id.ilike(like)
            | models.TxLog.id.ilike(like)
            | models.TxLog.author.ilike(like)
        )
    if sort_desc:
        query = query.order_by(models.TxLog.created_at.desc())
    else:
        query = query.order_by(models.TxLog.created_at.asc())
    # pagination
    if page < 1:
        page = 1
    offset = (page - 1) * per_page
    return query.offset(offset).limit(per_page).all()


# ── Librarian walk-in checkout: immediately Active, decrements stock ───────

def process_checkout(db: Session, actor: CurrentUser, login_id: str, book_id: str) -> models.Loan:
    student = db.query(models.Student).filter(models.Student.login_id == login_id).first()
    if not student:
        raise HTTPException(status_code=404, detail=f'Student "{login_id}" not found.')
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail=f'Book ID "{book_id}" not found.')
    if book.available <= 0:
        raise HTTPException(status_code=400, detail=f'All copies of "{book.title}" are checked out.')
    if _get_active_or_pending_loan(db, student.id, book_id):
        raise HTTPException(status_code=400, detail=f"{login_id} already has this book.")

    loan = models.Loan(
        book_id=book_id, student_id=student.id,
        borrow_date=date.today(),
        due_date=date.today() + timedelta(days=settings.LOAN_PERIOD_DAYS),
        status=models.LoanStatusEnum.active,
    )
    book.available -= 1
    db.add(loan)
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.direct_checkout, loan, actor.name)
    return loan


# ── Librarian direct return: immediately Returned, increments stock ────────

def process_return(db: Session, actor: CurrentUser, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.returned
    loan.return_date = date.today()
    loan.book.available = min(loan.book.available + 1, loan.book.total)
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.direct_return, loan, actor.name)
    return loan


# ── Student self-service borrow request: Requested, no stock change yet ───

def request_borrow(db: Session, student: CurrentUser, book_id: str) -> models.Loan:
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    if book.available <= 0:
        raise HTTPException(status_code=400, detail=f'No copies of "{book.title}" are available.')
    if _get_active_or_pending_loan(db, student.id, book_id):
        raise HTTPException(status_code=400, detail="You already have a loan or request for this book.")

    loan = models.Loan(
        book_id=book_id, student_id=student.id,
        borrow_date=date.today(),
        due_date=date.today() + timedelta(days=settings.LOAN_PERIOD_DAYS),
        status=models.LoanStatusEnum.requested,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.request_borrow, loan, student.name)
    return loan


# ── Librarian approves a borrow request: Active, decrements stock ─────────

def approve_borrow(db: Session, actor: CurrentUser, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    if loan.book.available <= 0:
        raise HTTPException(status_code=400, detail="No copies available to approve this request.")
    loan.status = models.LoanStatusEnum.active
    loan.borrow_date = date.today()
    loan.due_date = date.today() + timedelta(days=settings.LOAN_PERIOD_DAYS)
    loan.book.available -= 1
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.approve_borrow, loan, actor.name)
    return loan


# ── Librarian rejects a borrow request: loan is removed ───────────────────

def reject_borrow(db: Session, actor: CurrentUser, loan_id: str) -> None:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    _log(db, models.TxTypeEnum.reject_borrow, loan, actor.name)
    db.delete(loan)
    db.commit()


# ── Student requests a return: Return Requested, no stock change yet ──────

def request_return(db: Session, student: CurrentUser, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(
        models.Loan.id == loan_id, models.Loan.student_id == student.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.return_requested
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.request_return, loan, student.name)
    return loan


# ── Librarian approves a return: Returned, increments stock ───────────────

def approve_return(db: Session, actor: CurrentUser, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.returned
    loan.return_date = date.today()
    loan.book.available = min(loan.book.available + 1, loan.book.total)
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.approve_return, loan, actor.name)
    return loan


def reject_return(db: Session, actor: CurrentUser, loan_id: str) -> models.Loan:
    """Librarian rejects a student's return request: reset to Active and keep stock unchanged."""
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    if loan.status != models.LoanStatusEnum.return_requested:
        raise HTTPException(status_code=400, detail="Loan is not pending return.")
    loan.status = models.LoanStatusEnum.active
    # return_date should remain None for active loans
    db.commit()
    db.refresh(loan)
    _log(db, models.TxTypeEnum.reject_return, loan, actor.name)
    return loan


# ── Reports ─────────────────────────────────────────────────────────────

def get_report_summary(db: Session) -> schemas.ReportSummary:
    books = db.query(models.Book).all()
    loans = db.query(models.Loan).all()

    total_books = sum(b.total for b in books)
    active_checkouts = sum(1 for l in loans if _computed_status(l) in ("Active", "Overdue"))
    overdue_loans = [l for l in loans if _computed_status(l) == "Overdue"]

    overdue_students = [
        {
            "student_name": l.student.name,
            "student_login_id": l.student.login_id,
            "book_title": l.book.title,
            "due_date": l.due_date.isoformat(),
            "days_overdue": (date.today() - l.due_date).days,
        }
        for l in overdue_loans
    ]

    return schemas.ReportSummary(
        total_books_in_inventory=total_books,
        total_active_checkouts=active_checkouts,
        total_overdue_books=len(overdue_loans),
        overdue_students=overdue_students,
    )
