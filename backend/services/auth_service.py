from sqlalchemy.orm import Session

from core.security import verify_password, create_access_token
from models import models


def authenticate_user(db: Session, login_id: str, password: str) -> models.User | None:
    user = db.query(models.User).filter(models.User.login_id == login_id).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def issue_token(user: models.User) -> str:
    return create_access_token(data={"sub": user.id, "role": user.role.value})
