from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.security import require_librarian
from database.database import get_db
from models import models, schemas
from services import loan_service

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary", response_model=schemas.ReportSummary)
def summary(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_librarian),
):
    return loan_service.get_report_summary(db)
