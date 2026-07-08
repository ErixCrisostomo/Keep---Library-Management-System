from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.security import require_librarian, require_superadmin, CurrentUser, hash_password
from database.database import get_db
from models import models, schemas
from services import audit_service

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("", response_model=list[schemas.StudentProfileOut])
def list_students(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_librarian),
):
    return db.query(models.Student).order_by(models.Student.name).all()


@router.post("", response_model=schemas.StudentProfileOut, status_code=201)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    exists = db.query(models.Student).filter(models.Student.login_id == payload.login_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Student login ID already exists.")

    new_student = models.Student(
        login_id=payload.login_id,
        name=payload.name,
        hashed_password=hash_password(payload.password),
        email=payload.email,
        course=payload.course,
        section=payload.section,
        year_level=payload.year_level
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.create_account,
        actor_name=current_user.name,
        details={"action": "create_student", "login_id": payload.login_id},
        after={"id": new_student.id, "name": new_student.name, "login_id": new_student.login_id}
    )
    return new_student


@router.put("/{student_id}", response_model=schemas.StudentProfileOut)
def update_student(
    student_id: str,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    before = {"id": student.id, "name": student.name, "login_id": student.login_id}

    if payload.name is not None:
        student.name = payload.name
    if payload.login_id is not None:
        student.login_id = payload.login_id
    if payload.password is not None:
        student.hashed_password = hash_password(payload.password)
    if payload.email is not None:
        student.email = payload.email
    if payload.course is not None:
        student.course = payload.course
    if payload.section is not None:
        student.section = payload.section
    if payload.year_level is not None:
        student.year_level = payload.year_level

    db.commit()
    db.refresh(student)

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.update_account,
        actor_name=current_user.name,
        details={"action": "update_student"},
        before=before,
        after={"id": student.id, "name": student.name, "login_id": student.login_id}
    )
    return student


@router.delete("/{student_id}", status_code=204)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_superadmin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # SAFETY: Prevent deleting students with active loans
    active_loans = db.query(models.Loan).filter(
        models.Loan.student_id == student_id,
        models.Loan.status != models.LoanStatusEnum.returned,
    ).count()
    
    if active_loans > 0:
        raise HTTPException(status_code=400, detail="Cannot delete student. They have active unreturned loans.")

    before = {"id": student.id, "name": student.name, "login_id": student.login_id}
    
    db.delete(student)
    db.commit()

    audit_service.log_tx(
        db=db,
        tx_type=models.TxTypeEnum.delete_account,
        actor_name=current_user.name,
        details={"action": "delete_student"},
        before=before
    )