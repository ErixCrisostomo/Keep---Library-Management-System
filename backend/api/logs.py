"""API endpoints for retrieving transaction / audit logs.

The `/api/logs` endpoint is used by the frontend Super Admin UI to display
audit history. This module enforces simple access rules: students only see
their own logs while librarians and superadmins see the full stream.
"""

from fastapi import APIRouter, Depends, Query
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
    q: str | None = Query(None, description="Search text (book title, student name, id...)"),
    types: str | None = Query(None, description="Comma-separated Tx types to filter"),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=1000),
    sort_desc: bool = Query(True),
):
    """Return a filtered, paginated list of `TxLog` entries.

    Query params:
    - `q`: full-text like search across book title, student name, id and author
    - `types`: comma-separated TxType names to include (e.g. 'add_book,login')
    - `page` / `per_page`: pagination controls
    - `sort_desc`: order by created_at desc when True

    Access control: students are restricted to their own student_id; staff
    and superadmins may view all entries.
    """
    student_id = None if current_user.role != "student" else current_user.id
    type_list = types.split(",") if types else None
    return loan_service.list_logs(db, student_id=student_id, q=q, types=type_list, page=page, per_page=per_page, sort_desc=sort_desc)
