from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from core.config import settings
from database.database import get_db
from models import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@dataclass
class CurrentUser:
    """Unified view over a Student or Staff row, so downstream code doesn't care which table it came from."""
    id: str
    login_id: str
    name: str
    role: str  # "student" | "librarian" | "superadmin"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") is None or payload.get("role") is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> CurrentUser:
    payload = decode_access_token(token)
    role = payload["role"]
    if role == "student":
        row = db.query(models.Student).filter(models.Student.id == payload["sub"]).first()
        if row is None:
            raise HTTPException(status_code=401, detail="User not found")
        return CurrentUser(id=row.id, login_id=row.login_id, name=row.name, role="student")

    row = db.query(models.Librarian).filter(models.Librarian.id == payload["sub"]).first()
    if row is None:
        row = db.query(models.SuperAdmin).filter(models.SuperAdmin.id == payload["sub"]).first()
    if row is None:
        raise HTTPException(status_code=401, detail="User not found")
    return CurrentUser(id=row.id, login_id=row.login_id, name=row.name, role=row.role)


def require_librarian(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role not in ("librarian", "superadmin"):
        raise HTTPException(status_code=403, detail="Librarian access required")
    return user


def require_superadmin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user