from sqlalchemy.orm import Session
from database.database import SessionLocal
from services import loan_service
from models import models

with SessionLocal() as db:
    loan = db.query(models.Loan).filter(models.Loan.status == models.LoanStatusEnum.return_requested).first()
    if not loan:
        print('No return_requested loan found.')
    else:
        librarian = db.query(models.Librarian).first() or db.query(models.SuperAdmin).first()
        if not librarian:
            print('No librarian or superadmin user found.')
        else:
            print('Testing loan:', loan.id, loan.book_title, loan.student_name)
            updated = loan_service.reject_return(db, librarian, loan.id)
            print('Updated loan status:', updated.status)
            print('Return date:', updated.return_date)
