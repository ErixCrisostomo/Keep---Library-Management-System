from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.security import get_current_user, require_librarian, CurrentUser
from database.database import get_db
from models import schemas
from services import book_service

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[schemas.BookOut])
def list_books(
    search: Optional[str] = None,
    genre: Optional[str] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    return book_service.list_books(db, search=search, genre=genre, available_only=available_only)


@router.post("", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(
    payload: schemas.BookCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_librarian),
):
    return book_service.create_book(db, payload, actor_name=current_user.name)


@router.put("/{book_id}", response_model=schemas.BookOut)
def update_book(
    book_id: str,
    payload: schemas.BookUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_librarian),
):
    return book_service.update_book(db, book_id, payload, actor_name=current_user.name)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_librarian),
):
    book_service.delete_book(db, book_id, actor_name=current_user.name)
