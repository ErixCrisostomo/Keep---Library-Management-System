from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.security import require_librarian, require_superadmin, CurrentUser, hash_password
from database.database import get_db
from models import models, schemas
from services import audit_service

router = APIRouter(prefix="/api/staff", tags=["staff"])

def _get_staff_by_id(db: Session, staff_id: str):
    librarian = db.query(models.Librarian).filter(models.Librarian.id == staff_id).first()
    if librarian:
        return librarian, "librarian"
    superadmin = db.query(models.SuperAdmin).filter(models.SuperAdmin.id == staff_id).first()
    if superadmin:
        return superadmin, "superadmin"
    return None, None


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


@router.post("", response_model=schemas.UserOut, status_code=201)
def create_staff(
    payload: schemas.StaffCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    exists_lib = db.query(models.Librarian).filter(models.Librarian.login_id == payload.login_id).first()
    exists_sa = db.query(models.SuperAdmin).filter(models.SuperAdmin.login_id == payload.login_id).first()
    if exists_lib or exists_sa:
        raise HTTPException(status_code=400, detail="Login ID already in use.")

    if payload.role == "superadmin":
        new_staff = models.SuperAdmin(
            login_id=payload.login_id,
            name=payload.name,
            hashed_password=hash_password(payload.password)
        )
    else:
        new_staff = models.Librarian(
            login_id=payload.login_id,
            name=payload.name,
            hashed_password=hash_password(payload.password)
        )
    
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.create_account,
        actor_name=current_user.name,
        details={"action": "create_staff", "role": payload.role, "login_id": payload.login_id},
        after={"id": new_staff.id, "name": new_staff.name, "login_id": new_staff.login_id}
    )
    return new_staff


@router.put("/{staff_id}", response_model=schemas.UserOut)
def update_staff(
    staff_id: str,
    payload: schemas.StaffUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    staff, role = _get_staff_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found.")

    # SECURITY: Prevent a Super Admin from demoting themselves
    if current_user.id == staff_id:
        if payload.login_id and payload.login_id != staff.login_id:
            raise HTTPException(status_code=400, detail="Cannot change your own login ID.")
        # You can allow them to change their own name/password, but role changes are blocked implicitly 
        # because we don't send 'role' in StaffUpdate.

    before = {"id": staff.id, "name": staff.name, "login_id": staff.login_id}

    if payload.name is not None:
        staff.name = payload.name
    if payload.login_id is not None:
        staff.login_id = payload.login_id
    if payload.password is not None:
        staff.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(staff)

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.update_account,
        actor_name=current_user.name,
        details={"action": "update_staff", "role": role},
        before=before,
        after={"id": staff.id, "name": staff.name, "login_id": staff.login_id}
    )
    return staff


@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    staff, role = _get_staff_by_id(db, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found.")

    # SECURITY CHECK 1: Cannot delete yourself
    if current_user.id == staff_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    # SECURITY CHECK 2: Cannot delete the last Super Admin (Brick Prevention)
    if role == "superadmin":
        sa_count = db.query(models.SuperAdmin).count()
        if sa_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last Super Admin account. System requires at least one.")

    before = {"id": staff.id, "name": staff.name, "login_id": staff.login_id, "role": role}
    
    db.delete(staff)
    db.commit()

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.delete_account,
        actor_name=current_user.name,
        details={"action": "delete_staff", "role": role},
        before=before
    )