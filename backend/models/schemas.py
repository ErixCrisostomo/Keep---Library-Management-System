from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, field_validator, Field

Role = Literal["librarian", "student", "superadmin"]
LoanStatus = Literal["Requested", "Active", "Overdue", "Return Requested", "Returned"]


# ── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    # login_id: email for librarians, SR code for students
    login_id: str = Field(..., max_length=64)
    # password length limit
    password: str = Field(..., min_length=1, max_length=128)


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


# ── Transaction Log ──────────────────────────────────────────────────────

TxType = Literal[
    "request_borrow", "approve_borrow", "reject_borrow",
    "request_return", "approve_return", "reject_return", "direct_checkout", "direct_return",
    "login", "logout", "add_book", "update_book", "delete_book", "inventory_change",
    "create_account", "update_account", "delete_account",
]


class TxLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: TxType
    book_id: Optional[str] = None
    book_title: str
    author: str
    student_id: Optional[str] = None
    student_name: str
    student_login_id: str
    loan_id: Optional[str] = None
    actor_name: str
    details: Optional[dict] = None
    before_data: Optional[dict] = None
    after_data: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime

    @field_validator("type", mode="before")
    @classmethod
    def _coerce_type(cls, v):
        return v.value if hasattr(v, "value") else v


# ── Students (registered patrons) ────────────────────────────────────────

class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    login_id: str
    name: str
    email: Optional[str] = None
    course: Optional[str] = None
    section: Optional[str] = None
    year_level: Optional[str] = None
