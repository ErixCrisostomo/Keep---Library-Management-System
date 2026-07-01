from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import models, schemas


def _next_book_id(db: Session) -> str:
    """Generates sequential IDs like B-00001, B-00002, ... based on the highest existing number."""
    max_n = 0
    for (book_id,) in db.query(models.Book.id).all():
        try:
            n = int(book_id.split("-", 1)[1])
            max_n = max(max_n, n)
        except (IndexError, ValueError):
            continue
    return f"B-{max_n + 1:05d}"


def list_books(
    db: Session, search: Optional[str] = None, genre: Optional[str] = None,
    available_only: bool = False,
) -> list[models.Book]:
    query = db.query(models.Book)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(models.Book.title.ilike(like), models.Book.author.ilike(like)))
    if genre and genre != "All":
        query = query.filter(models.Book.genre == genre)
    if available_only:
        query = query.filter(models.Book.available > 0)
    return query.order_by(models.Book.title).all()


def create_book(db: Session, payload: schemas.BookCreate) -> models.Book:
    existing = db.query(models.Book).filter(models.Book.isbn == payload.isbn).first()
    if existing:
        raise HTTPException(status_code=400, detail="A book with this ISBN already exists.")
    book = models.Book(
        id=_next_book_id(db),
        title=payload.title, author=payload.author, isbn=payload.isbn,
        genre=payload.genre, total=payload.total, available=payload.total,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


def update_book(db: Session, book_id: str, payload: schemas.BookUpdate) -> models.Book:
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    # Adjust available copies by the same delta as total, floored at 0
    delta = payload.total - book.total
    book.title = payload.title
    book.author = payload.author
    book.isbn = payload.isbn
    book.genre = payload.genre
    book.total = payload.total
    book.available = max(0, book.available + delta)
    db.commit()
    db.refresh(book)
    return book


def delete_book(db: Session, book_id: str) -> None:
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    active_loans = db.query(models.Loan).filter(
        models.Loan.book_id == book_id,
        models.Loan.status != models.LoanStatusEnum.returned,
    ).count()
    if active_loans > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a book with active loans.")
    db.delete(book)
    db.commit()