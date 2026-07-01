"""
Seeds the database with demo data that mirrors the original Figma Make
prototype, so the app behaves the same way out of the box.

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

STUDENTS = [
    ("22-22222", "Ana Reyes", "student1"),
    ("24-00312", "Carlo Dela Cruz", "student1"),
    ("24-00109", "Bea Villanueva", "student1"),
    ("24-00551", "Miguel Santos", "student1"),
    ("24-00773", "Jessa Mercado", "student1"),
]

LIBRARIANS = [
    ("juandelacruz@email.com", "Juan Dela Cruz", "lib123"),
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

        user_rows: dict[str, models.User] = {}
        for login_id, name, password in LIBRARIANS:
            user = models.User(login_id=login_id, name=name,
                                hashed_password=hash_password(password),
                                role=models.RoleEnum.librarian)
            db.add(user)

        for login_id, name, password in STUDENTS:
            user = models.User(login_id=login_id, name=name,
                                hashed_password=hash_password(password),
                                role=models.RoleEnum.student)
            db.add(user)
            user_rows[login_id] = user

        db.flush()  # assign IDs before creating loans

        today = date.today()
        sample_loans = [
            # (book_title, student_login_id, borrow_offset_days, due_offset_days, status, return_offset_days)
            ("To Kill a Mockingbird", "24-00312", -19, -5, "active", None),
            ("The Alchemist", "24-00109", -17, -3, "active", None),
            ("1984", "22-22222", -13, 1, "active", None),
            ("The Great Gatsby", "24-00551", -11, 3, "active", None),
            ("The Catcher in the Rye", "24-00773", -9, 5, "active", None),
            ("Lord of the Flies", "22-22222", -32, -18, "returned", -19),
            ("Of Mice and Men", "22-22222", -52, -38, "returned", -39),
        ]
        for title, login_id, borrow_off, due_off, status, return_off in sample_loans:
            loan = models.Loan(
                book_id=book_rows[title].id,
                student_id=user_rows[login_id].id,
                borrow_date=today + timedelta(days=borrow_off),
                due_date=today + timedelta(days=due_off),
                return_date=today + timedelta(days=return_off) if return_off is not None else None,
                status=models.LoanStatusEnum.returned if status == "returned" else models.LoanStatusEnum.active,
            )
            db.add(loan)

        db.commit()
        print(f"Seeded {len(BOOKS)} books, {len(LIBRARIANS)} librarian(s), "
              f"{len(STUDENTS)} student(s), {len(sample_loans)} loan(s).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
