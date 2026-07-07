from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import models, schemas
from services import audit_service


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
        query = query.filter(or_(
            models.Book.title.ilike(like),
            models.Book.author.ilike(like),
            models.Book.isbn.ilike(like),
            models.Book.id.ilike(like),
        ))
    if genre and genre != "All":
        query = query.filter(models.Book.genre == genre)
    if available_only:
        query = query.filter(models.Book.available > 0)
    return query.order_by(models.Book.title).all()


def create_book(db: Session, payload: schemas.BookCreate, actor_name: str = "system") -> models.Book:
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
    # audit: record creation with after snapshot
    # Best-effort audit write (internal session) — no need for caller rollback.
    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.add_book,
        actor_name=actor_name,
        book=book,
        details={"action": "create_book"},
        after={"id": book.id, "title": book.title, "author": book.author, "isbn": book.isbn, "total": book.total, "available": book.available},
    )
    return book


def update_book(db: Session, book_id: str, payload: schemas.BookUpdate, actor_name: str = "system") -> models.Book:
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    # Adjust available copies by the same delta as total, floored at 0
    before = {"id": book.id, "title": book.title, "author": book.author, "isbn": book.isbn, "genre": book.genre, "total": book.total, "available": book.available}
    delta = payload.total - book.total
    book.title = payload.title
    book.author = payload.author
    book.isbn = payload.isbn
    book.genre = payload.genre
    book.total = payload.total
    book.available = max(0, book.available + delta)
    db.commit()
    db.refresh(book)
    after = {"id": book.id, "title": book.title, "author": book.author, "isbn": book.isbn, "genre": book.genre, "total": book.total, "available": book.available}
    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.update_book,
        actor_name=actor_name,
        book=book,
        details={"action": "update_book"},
        before=before,
        after=after,
    )
    return book


def delete_book(db: Session, book_id: str, actor_name: str = "system") -> None:
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found.")
    active_loans = db.query(models.Loan).filter(
        models.Loan.book_id == book_id,
        models.Loan.status != models.LoanStatusEnum.returned,
    ).count()
    if active_loans > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a book with active loans.")
    before = {"id": book.id, "title": book.title, "author": book.author, "isbn": book.isbn, "genre": book.genre, "total": book.total, "available": book.available}
    db.delete(book)
    db.commit()
    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.delete_book,
        actor_name=actor_name,
        details={"action": "delete_book"},
        before=before,
    )
