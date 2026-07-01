from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import settings
from models import models, schemas


def _computed_status(loan: models.Loan) -> str:
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


# ── Librarian walk-in checkout: immediately Active, decrements stock ───────

def process_checkout(db: Session, login_id: str, book_id: str) -> models.Loan:
    student = db.query(models.User).filter(models.User.login_id == login_id).first()
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
    return loan


# ── Librarian direct return: immediately Returned, increments stock ────────

def process_return(db: Session, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.returned
    loan.return_date = date.today()
    loan.book.available = min(loan.book.available + 1, loan.book.total)
    db.commit()
    db.refresh(loan)
    return loan


# ── Student self-service borrow request: Requested, no stock change yet ───

def request_borrow(db: Session, student: models.User, book_id: str) -> models.Loan:
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
    return loan


# ── Librarian approves a borrow request: Active, decrements stock ─────────

def approve_borrow(db: Session, loan_id: str) -> models.Loan:
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
    return loan


# ── Librarian rejects a borrow request: loan is removed ───────────────────

def reject_borrow(db: Session, loan_id: str) -> None:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    db.delete(loan)
    db.commit()


# ── Student requests a return: Return Requested, no stock change yet ──────

def request_return(db: Session, student: models.User, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(
        models.Loan.id == loan_id, models.Loan.student_id == student.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.return_requested
    db.commit()
    db.refresh(loan)
    return loan


# ── Librarian approves a return: Returned, increments stock ───────────────

def approve_return(db: Session, loan_id: str) -> models.Loan:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    loan.status = models.LoanStatusEnum.returned
    loan.return_date = date.today()
    loan.book.available = min(loan.book.available + 1, loan.book.total)
    db.commit()
    db.refresh(loan)
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
