import enum
import uuid

from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class RoleEnum(str, enum.Enum):
    librarian = "librarian"
    student = "student"


class LoanStatusEnum(str, enum.Enum):
    requested = "Requested"
    active = "Active"
    return_requested = "Return Requested"
    returned = "Returned"
    # "Overdue" is a computed status (Active + past due_date), not stored


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: gen_id("U"))
    # For librarians: an email. For students: their SR/Student ID.
    login_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    loans = relationship("Loan", back_populates="student", foreign_keys="Loan.student_id")


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
    student_id = Column(String, ForeignKey("users.id"), nullable=False)

    borrow_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)

    status = Column(Enum(LoanStatusEnum), nullable=False, default=LoanStatusEnum.requested)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    book = relationship("Book", back_populates="loans")
    student = relationship("User", back_populates="loans", foreign_keys=[student_id])
