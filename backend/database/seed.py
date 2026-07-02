"""
Seeds the database with demo data that mirrors the Figma Make prototype,
so the app behaves the same way out of the box.

Run with:  python -m database.seed
"""
from datetime import date, timedelta

from core.security import hash_password
from database.database import Base, SessionLocal, engine
from models import models

BOOKS = [
    ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "Fiction", 5, 3),
    ("To Kill a Mockingbird", "Harper Lee", "9780061935466", "Fiction", 4, 0),
    ("1984", "George Orwell", "9780451524935", "Dystopian", 6, 2),
    ("The Catcher in the Rye", "J.D. Salinger", "9780316769174", "Fiction", 3, 1),
    ("Brave New World", "Aldous Huxley", "9780060850524", "Dystopian", 4, 4),
    ("Of Mice and Men", "John Steinbeck", "9780140177398", "Fiction", 5, 2),
    ("Lord of the Flies", "William Golding", "9780399501487", "Fiction", 7, 5),
    ("The Alchemist", "Paulo Coelho", "9780062315007", "Philosophy", 3, 0),
    ("Noli Me Tangere", "José Rizal", "9789710801048", "Fiction", 8, 5),
    ("El Filibusterismo", "José Rizal", "9789710801055", "Fiction", 6, 3),
    ("Florante at Laura", "Francisco Balagtas", "9789710801062", "Poetry", 5, 5),
    ("A Brief History of Time", "Stephen Hawking", "9780553380163", "Science", 4, 2),
    ("Sapiens", "Yuval Noah Harari", "9780062316097", "History", 3, 1),
    ("The Selfish Gene", "Richard Dawkins", "9780198788607", "Science", 3, 3),
    ("Introduction to Algorithms", "Cormen et al.", "9780262033848", "Technology", 5, 2),
    ("Clean Code", "Robert C. Martin", "9780132350884", "Technology", 4, 0),
    ("The Art of War", "Sun Tzu", "9781599869773", "Philosophy", 6, 4),
    ("Meditations", "Marcus Aurelius", "9780812968255", "Philosophy", 4, 2),
    ("Pride and Prejudice", "Jane Austen", "9780141439518", "Fiction", 5, 3),
    ("The Republic", "Plato", "9780140455113", "Philosophy", 4, 4),
    ("Economics in One Lesson", "Henry Hazlitt", "9780517548233", "Economics", 3, 1),
    ("Thinking, Fast and Slow", "Daniel Kahneman", "9780374533557", "Psychology", 3, 2),
    ("The Midnight Library", "Matt Haig", "9780525559474", "Fiction", 4, 3),
    ("Atomic Habits", "James Clear", "9780735211292", "Psychology", 5, 4),
]

# login_id, name, password, email, course, section, year_level
STUDENTS = [
    ("22-22222", "Ana Reyes", "student1", "anareyes@email.com", "BS Information Technology", "BSIT 2201", "2nd Year"),
    ("24-00312", "Carlo Dela Cruz", "student1", "carlodelacruz@email.com", "BS Information Technology", "BSIT 2401", "1st Year"),
    ("24-00109", "Bea Villanueva", "student1", "beavillanueva@email.com", "BS Computer Science", "BSCS 2401", "1st Year"),
    ("24-00551", "Miguel Santos", "student1", "miguelsantos@email.com", "BS Information Technology", "BSIT 2402", "1st Year"),
    ("24-00773", "Jessa Mercado", "student1", "jessamercado@email.com", "BS Computer Science", "BSCS 2402", "1st Year"),
]

STAFF_ACCOUNTS = [
    ("juandelacruz@email.com", "Juan Dela Cruz", "lib123", "librarian"),
    ("mainadmin@email.com", "Main Admin", "admin1", "superadmin"),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Book).count() > 0:
            print("Database already seeded — skipping.")
            return

        book_rows: dict[str, models.Book] = {}
        for i, (title, author, isbn, genre, total, available) in enumerate(BOOKS, start=1):
            book = models.Book(id=f"B-{i:05d}", title=title, author=author, isbn=isbn, genre=genre,
                                total=total, available=available)
            db.add(book)
            book_rows[title] = book

        for login_id, name, password, role in STAFF_ACCOUNTS:
            if role == "librarian":
                db.add(models.Librarian(login_id=login_id, name=name,
                                         hashed_password=hash_password(password)))
            else:
                db.add(models.SuperAdmin(login_id=login_id, name=name,
                                          hashed_password=hash_password(password)))

        student_rows: dict[str, models.Student] = {}
        for login_id, name, password, email, course, section, year_level in STUDENTS:
            student = models.Student(login_id=login_id, name=name,
                                      hashed_password=hash_password(password),
                                      email=email, course=course, section=section, year_level=year_level)
            db.add(student)
            student_rows[login_id] = student

        db.flush()  # assign IDs before creating loans

        today = date.today()
        # (book_title, student_login_id, borrow_offset_days, due_offset_days, status, return_offset_days)
        sample_loans = [
            ("To Kill a Mockingbird", "24-00312", -19, -5, "active", None),
            ("The Alchemist", "24-00109", -17, -3, "active", None),
            ("1984", "22-22222", -13, 1, "active", None),
            ("The Great Gatsby", "24-00551", -11, 3, "active", None),
            ("The Catcher in the Rye", "24-00773", -9, 5, "active", None),
            ("Lord of the Flies", "22-22222", -32, -18, "returned", -19),
            ("Of Mice and Men", "22-22222", -52, -38, "returned", -39),
        ]
        loan_rows = []
        for title, login_id, borrow_off, due_off, status, return_off in sample_loans:
            loan = models.Loan(
                book_id=book_rows[title].id,
                student_id=student_rows[login_id].id,
                borrow_date=today + timedelta(days=borrow_off),
                due_date=today + timedelta(days=due_off),
                return_date=today + timedelta(days=return_off) if return_off is not None else None,
                status=models.LoanStatusEnum.returned if status == "returned" else models.LoanStatusEnum.active,
            )
            db.add(loan)
            loan_rows.append((loan, title, login_id, status))

        db.flush()

        # Seed matching transaction log entries so History tabs aren't empty on first run.
        librarian_name = next((name for _, name, _, role in STAFF_ACCOUNTS if role == "librarian"), "System")
        for loan, title, login_id, status in loan_rows:
            student = student_rows[login_id]
            book = book_rows[title]
            common = dict(book_id=book.id, book_title=book.title, author=book.author,
                          student_id=student.id, student_name=student.name,
                          student_login_id=student.login_id, loan_id=loan.id)
            db.add(models.TxLog(type=models.TxTypeEnum.direct_checkout, actor_name=librarian_name, **common))
            if status == "returned":
                db.add(models.TxLog(type=models.TxTypeEnum.direct_return, actor_name=librarian_name, **common))

        db.commit()
        print(f"Seeded {len(BOOKS)} books, {len(STAFF_ACCOUNTS)} staff account(s), "
              f"{len(STUDENTS)} student(s), {len(sample_loans)} loan(s).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
