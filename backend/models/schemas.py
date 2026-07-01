from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, field_validator

Role = Literal["librarian", "student"]
LoanStatus = Literal["Requested", "Active", "Overdue", "Return Requested", "Returned"]


# ── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    login_id: str  # email for librarians, SR code for students
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    login_id: str
    name: str
    role: Role

    @field_validator("role", mode="before")
    @classmethod
    def _coerce_role(cls, v):
        return v.value if hasattr(v, "value") else v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Books ─────────────────────────────────────────────────────────────────

class BookBase(BaseModel):
    title: str
    author: str
    isbn: str
    genre: str
    total: int


class BookCreate(BookBase):
    pass


class BookUpdate(BookBase):
    pass


class BookOut(BookBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    available: int


# ── Loans ─────────────────────────────────────────────────────────────────

class LoanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    book_id: str
    book_title: str
    author: str
    student_name: str
    student_login_id: str
    borrow_date: date
    due_date: date
    return_date: Optional[date] = None
    status: LoanStatus  # includes computed "Overdue"


class CheckoutRequest(BaseModel):
    """Librarian walk-in checkout."""
    login_id: str  # student SR code
    book_id: str


class BorrowRequest(BaseModel):
    """Student self-service borrow request."""
    book_id: str


class ReportSummary(BaseModel):
    total_books_in_inventory: int
    total_active_checkouts: int
    total_overdue_books: int
    overdue_students: list[dict]
