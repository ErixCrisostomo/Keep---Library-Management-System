from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.security import get_current_user, CurrentUser
from database.database import get_db
from models import schemas
from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, payload.login_id, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = auth_service.issue_token(user)
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user
