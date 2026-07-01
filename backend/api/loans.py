from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import get_current_user, require_librarian
from database.database import get_db
from models import models, schemas
from services import loan_service

router = APIRouter(prefix="/api/loans", tags=["loans"])


@router.get("", response_model=list[schemas.LoanOut])
def list_loans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Librarians see all loans; students see only their own."""
    student_id = None if current_user.role == models.RoleEnum.librarian else current_user.id
    loans = loan_service.list_loans(db, student_id=student_id)
    return [loan_service.to_loan_out(l) for l in loans]


# ── Librarian: walk-in checkout / direct return ────────────────────────────

@router.post("/checkout", response_model=schemas.LoanOut)
def checkout(
    payload: schemas.CheckoutRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    loan = loan_service.process_checkout(db, payload.login_id, payload.book_id)
    return loan_service.to_loan_out(loan)


@router.post("/{loan_id}/return", response_model=schemas.LoanOut)
def direct_return(
    loan_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    loan = loan_service.process_return(db, loan_id)
    return loan_service.to_loan_out(loan)


# ── Student: self-service borrow / return requests ─────────────────────────

@router.post("/borrow-request", response_model=schemas.LoanOut)
def borrow_request(
    payload: schemas.BorrowRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loan = loan_service.request_borrow(db, current_user, payload.book_id)
    return loan_service.to_loan_out(loan)


@router.post("/{loan_id}/request-return", response_model=schemas.LoanOut)
def request_return(
    loan_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    loan = loan_service.request_return(db, current_user, loan_id)
    return loan_service.to_loan_out(loan)


# ── Librarian: approve/reject requests ──────────────────────────────────

@router.post("/{loan_id}/approve-borrow", response_model=schemas.LoanOut)
def approve_borrow(
    loan_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    loan = loan_service.approve_borrow(db, loan_id)
    return loan_service.to_loan_out(loan)


@router.post("/{loan_id}/reject-borrow", status_code=204)
def reject_borrow(
    loan_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    loan_service.reject_borrow(db, loan_id)


@router.post("/{loan_id}/approve-return", response_model=schemas.LoanOut)
def approve_return(
    loan_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    loan = loan_service.approve_return(db, loan_id)
    return loan_service.to_loan_out(loan)
