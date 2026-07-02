from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import require_librarian, CurrentUser
from database.database import get_db
from models import models, schemas

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("", response_model=list[schemas.StudentProfileOut])
def list_students(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_librarian),
):
    return db.query(models.Student).order_by(models.Student.name).all()
