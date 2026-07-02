from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import require_librarian, CurrentUser
from database.database import get_db
from models import models, schemas

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.get("", response_model=list[schemas.UserOut])
def list_staff(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_librarian),
):
    librarians = db.query(models.Librarian).all()
    superadmins = db.query(models.SuperAdmin).all()
    return sorted(
        [*librarians, *superadmins],
        key=lambda staff_member: staff_member.name,
    )
