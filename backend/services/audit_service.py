"""Centralized audit logging helper.

Use `log_tx` from services and API handlers to create denormalized tx_log
entries that record who did what and include optional before/after JSON
snapshots. This makes it easy for Super Admins to inspect system activity.
"""

from typing import Optional

from sqlalchemy.orm import Session

from models import models


def log_tx(
    db: Session,
    tx_type: models.TxTypeEnum | str,
    actor_name: str,
    loan: Optional[models.Loan] = None,
    book: Optional[models.Book] = None,
    student: Optional[models.Student] = None,
    details: Optional[dict] = None,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    source: Optional[str] = None,
) -> None:
    """Create an audit entry.

    Parameters
    - db: SQLAlchemy session
    - tx_type: either a `TxTypeEnum` or a string name of the type
    - actor_name: human-readable name of the actor (student, librarian, admin)
    - loan/book/student: optional model instances to denormalize identifying data
    - details/before/after: free-form JSON blobs for rich context
    - ip/user_agent/source: optional client metadata

    The function is defensive: callers may pass only partial information and
    `log_tx` will populate whatever it can to keep the audit entry useful.
    """
    # coerce tx_type to enum if needed; this raises ValueError for unknown names
    # which will surface to the caller unless handled upstream.
    tx_enum = tx_type if isinstance(tx_type, models.TxTypeEnum) else models.TxTypeEnum(tx_type)

    entry = models.TxLog(
        type=tx_enum,
        actor_name=actor_name,
        details=details,
        before_data=before,
        after_data=after,
        ip_address=ip,
        user_agent=user_agent,
        source=source,
    )

    # Denormalize identifying fields so audit entries remain meaningful even
    # if related rows (books/students) are later deleted or modified.
    if loan is not None:
        entry.loan_id = getattr(loan, "id", None)
        entry.book_id = getattr(loan, "book_id", None)
    if book is not None:
        entry.book_id = getattr(book, "id", None)
        entry.book_title = getattr(book, "title", "")
        entry.author = getattr(book, "author", "")
    else:
        # if loan provided and loan.book relationship present
        if loan is not None and getattr(loan, "book", None) is not None:
            entry.book_id = getattr(loan.book, "id", None)
            entry.book_title = getattr(loan.book, "title", "")
            entry.author = getattr(loan.book, "author", "")

    if student is not None:
        entry.student_id = getattr(student, "id", None)
        entry.student_name = getattr(student, "name", "")
        entry.student_login_id = getattr(student, "login_id", "")
    else:
        if loan is not None and getattr(loan, "student", None) is not None:
            entry.student_id = getattr(loan.student, "id", None)
            entry.student_name = getattr(loan.student, "name", "")
            entry.student_login_id = getattr(loan.student, "login_id", "")

    # Guarantee required string fields (TxLog has non-null constraints for some)
    if not getattr(entry, "book_title", None):
        entry.book_title = ""
    if not getattr(entry, "author", None):
        entry.author = ""
    if not getattr(entry, "student_name", None):
        entry.student_name = ""
    if not getattr(entry, "student_login_id", None):
        entry.student_login_id = ""

    db.add(entry)
    db.commit()
