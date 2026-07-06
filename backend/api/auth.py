from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.security import get_current_user, CurrentUser
from database.database import get_db
from models import schemas
from services import auth_service
from services import audit_service
from models import models

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, payload.login_id, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = auth_service.issue_token(user)
    # audit login
    try:
        # IP and user-agent may be absent in some clients
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        audit_service.log_tx(
            db=db,
            tx_type=models.TxTypeEnum.login,
            actor_name=user.name,
            details={"login_id": user.login_id},
            ip=ip,
            user_agent=ua,
            source="/api/auth/login",
        )
    except Exception:
        db.rollback()
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user


@router.post("/logout", status_code=204)
def logout(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Log a logout event for the current user. Token revocation isn't implemented; this is an audit-only endpoint."""
    try:
        audit_service.log_tx(
            db=db,
            tx_type=models.TxTypeEnum.logout,
            actor_name=current_user.name,
            details={"login_id": current_user.login_id},
            source="/api/auth/logout",
        )
    except Exception:
        db.rollback()
    return None
