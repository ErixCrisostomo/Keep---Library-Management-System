from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import get_current_user, CurrentUser
from database.database import get_db
from models import schemas
from services import loan_service

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[schemas.TxLogOut])
def list_logs(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Librarians see the full transaction log; students see only their own."""
    student_id = None if current_user.role != "student" else current_user.id
    return loan_service.list_logs(db, student_id=student_id)
