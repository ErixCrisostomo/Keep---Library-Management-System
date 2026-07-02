from sqlalchemy.orm import Session

from core.security import verify_password, create_access_token, CurrentUser
from models import models


def authenticate_user(db: Session, login_id: str, password: str) -> CurrentUser | None:
    """Tries staff tables first (email login), then the students table (SR code login)."""
    staff = db.query(models.Librarian).filter(models.Librarian.login_id == login_id).first()
    if not staff:
        staff = db.query(models.SuperAdmin).filter(models.SuperAdmin.login_id == login_id).first()
    if staff and verify_password(password, staff.hashed_password):
        return CurrentUser(id=staff.id, login_id=staff.login_id, name=staff.name, role=staff.role)

    student = db.query(models.Student).filter(models.Student.login_id == login_id).first()
    if student and verify_password(password, student.hashed_password):
        return CurrentUser(id=student.id, login_id=student.login_id, name=student.name, role="student")

    return None


def issue_token(user: CurrentUser) -> str:
    return create_access_token(data={"sub": user.id, "role": user.role})
