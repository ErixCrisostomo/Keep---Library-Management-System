import enum
import uuid

from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Date, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.database import Base


"""Database models for the Keep Library application.

This module defines SQLAlchemy ORM models for Students, Staff, Books,
Loans and TxLog (transaction/audit log). The TxLog table is intentionally
denormalized so audit entries remain useful even if related rows are
deleted later (it stores book titles, student names, etc.).
"""


def gen_id(prefix: str) -> str:
    """Generate a short unique id string with the provided prefix.

    Example: gen_id('U') -> 'U-1a2b3c4d'. Used across the models as a
    human-readable primary key (students, staff, loans, txs).
    """
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class LoanStatusEnum(str, enum.Enum):
    requested = "Requested"
    active = "Active"
    return_requested = "Return Requested"
    returned = "Returned"
    # "Overdue" is a computed status (Active + past due_date), not stored


class TxTypeEnum(str, enum.Enum):
    request_borrow = "request_borrow"
    approve_borrow = "approve_borrow"
    reject_borrow = "reject_borrow"
    request_return = "request_return"
    reject_return = "reject_return"
    approve_return = "approve_return"
    direct_checkout = "direct_checkout"
    direct_return = "direct_return"
    # other system events
    login = "login"
    logout = "logout"
    add_book = "add_book"
    update_book = "update_book"
    delete_book = "delete_book"
    inventory_change = "inventory_change"
    create_account = "create_account"
    update_account = "update_account"
    delete_account = "delete_account"


class Student(Base):
    """Registered library patrons. Kept in a separate table from staff/admin accounts."""
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=lambda: gen_id("U"))
    login_id = Column(String, unique=True, nullable=False, index=True)  # SR / Student Code
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=True)
    course = Column(String, nullable=True)
    section = Column(String, nullable=True)
    year_level = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loans = relationship("Loan", back_populates="student", foreign_keys="Loan.student_id")


class StaffBase(Base):
    __abstract__ = True

    id = Column(String, primary_key=True, default=lambda: gen_id("S"))
    login_id = Column(String, unique=True, nullable=False, index=True)  # email
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def role(self) -> str:
        raise NotImplementedError("Subclasses must implement role")


class Librarian(StaffBase):
    __tablename__ = "librarians"

    @property
    def role(self) -> str:
        return "librarian"


class SuperAdmin(StaffBase):
    __tablename__ = "superadmins"

    @property
    def role(self) -> str:
        return "superadmin"


class Book(Base):
    __tablename__ = "books"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False, index=True)
    isbn = Column(String, nullable=False, unique=True)
    genre = Column(String, nullable=False, index=True)
    total = Column(Integer, nullable=False, default=0)
    available = Column(Integer, nullable=False, default=0)

    loans = relationship("Loan", back_populates="book")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(String, primary_key=True, default=lambda: gen_id("L"))
    book_id = Column(String, ForeignKey("books.id"), nullable=False)
    student_id = Column(String, ForeignKey("students.id"), nullable=False)

    borrow_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)

    status = Column(Enum(LoanStatusEnum), nullable=False, default=LoanStatusEnum.requested)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    book = relationship("Book", back_populates="loans")
    student = relationship("Student", back_populates="loans", foreign_keys=[student_id])


class TxLog(Base):
    """Append-only transaction log powering the History tabs and Reports."""
    __tablename__ = "tx_logs"

    id = Column(String, primary_key=True, default=lambda: gen_id("T"))
    type = Column(Enum(TxTypeEnum), nullable=False)

    book_id = Column(String, nullable=True)
    book_title = Column(String, nullable=False)
    author = Column(String, nullable=False)

    student_id = Column(String, nullable=True)  # Student.id (denormalized on purpose — survives deletion)
    student_name = Column(String, nullable=False)
    student_login_id = Column(String, nullable=False)

    loan_id = Column(String, nullable=True)
    actor_name = Column(String, nullable=False)  # who performed the action (staff name, or the student themself)

    # Optional rich metadata to help with audits and debugging
    details = Column(JSON, nullable=True)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    source = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
