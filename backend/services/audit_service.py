"""Centralized audit logging helper with in-process background worker.

This module provides `log_tx()` which enqueues audit events to an
in-memory queue. A background thread drains the queue and persists events
to the database using a dedicated SQLAlchemy session. This avoids blocking
request handlers while keeping deployment simple (no Redis required).
"""

from typing import Optional
from queue import Queue, Empty
from threading import Thread, Event
import time
import logging

from sqlalchemy.orm import Session

from models import models
from database.database import SessionLocal

_logger = logging.getLogger("keep.audit")

# In-process queue and worker controls
_audit_queue: Queue[dict] = Queue()
_worker_thread: Optional[Thread] = None
_worker_stop: Optional[Event] = None


def _worker_loop(stop_event: Event):
    logger = logging.getLogger("keep.audit.worker")
    logger.info("Audit worker started")
    while not stop_event.is_set() or not _audit_queue.empty():
        try:
            payload = _audit_queue.get(timeout=0.5)
        except Empty:
            continue

        # Persist payload with simple retry logic
        attempts = 0
        while attempts < 3:
            attempts += 1
            db = None
            try:
                db = SessionLocal()
                tx_enum = models.TxTypeEnum(payload.get("type")) if payload.get("type") else models.TxTypeEnum.inventory_change
                entry = models.TxLog(
                    type=tx_enum,
                    actor_name=payload.get("actor_name") or "system",
                    details=payload.get("details"),
                    before_data=payload.get("before_data"),
                    after_data=payload.get("after_data"),
                    ip_address=payload.get("ip_address"),
                    user_agent=payload.get("user_agent"),
                    source=payload.get("source"),
                    book_id=payload.get("book_id"),
                    book_title=payload.get("book_title") or "",
                    author=payload.get("author") or "",
                    student_id=payload.get("student_id"),
                    student_name=payload.get("student_name") or "",
                    student_login_id=payload.get("student_login_id") or "",
                    loan_id=payload.get("loan_id"),
                )
                db.add(entry)
                db.commit()
                logger.info("Persisted audit event: %s", payload.get("type"))
                break
            except Exception:
                logger.exception("Failed to persist audit event (attempt %d)", attempts)
                try:
                    if db is not None:
                        db.rollback()
                except Exception:
                    pass
                time.sleep(0.5 * attempts)
            finally:
                if db is not None:
                    db.close()
        else:
            logger.error("Dropping audit event after retries: %s", payload)

    logger.info("Audit worker stopped")


def start_worker():
    global _worker_thread, _worker_stop
    if _worker_thread is not None and _worker_thread.is_alive():
        return
    _worker_stop = Event()
    _worker_thread = Thread(target=_worker_loop, args=(_worker_stop,), daemon=True)
    _worker_thread.start()


def stop_worker(timeout: float = 5.0):
    global _worker_thread, _worker_stop
    if _worker_stop is None:
        return
    _worker_stop.set()
    if _worker_thread is not None:
        _worker_thread.join(timeout)
    _worker_thread = None
    _worker_stop = None


def log_tx(
    db: Optional[Session] = None,
    tx_type: models.TxTypeEnum | str | None = None,
    actor_name: str = "system",
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
    """Enqueue an audit event for background persistence.

    This is non-blocking and will return quickly. The worker will attempt
    to persist the event in the background. Note: events may be lost if the
    process crashes before the worker persists them.
    """
    try:
        tx_enum = tx_type if isinstance(tx_type, models.TxTypeEnum) else models.TxTypeEnum(tx_type)  # type: ignore
    except Exception:
        tx_enum = models.TxTypeEnum.inventory_change

    payload = {
        "type": tx_enum.value,
        "actor_name": actor_name,
        "details": details,
        "before_data": before,
        "after_data": after,
        "ip_address": ip,
        "user_agent": user_agent,
        "source": source,
        "book_id": None,
        "book_title": "",
        "author": "",
        "student_id": None,
        "student_name": "",
        "student_login_id": "",
        "loan_id": None,
    }

    if loan is not None:
        payload["loan_id"] = getattr(loan, "id", None)
        payload["book_id"] = getattr(loan, "book_id", None)
    if book is not None:
        payload["book_id"] = getattr(book, "id", None)
        payload["book_title"] = getattr(book, "title", "")
        payload["author"] = getattr(book, "author", "")
    else:
        if loan is not None and getattr(loan, "book", None) is not None:
            payload["book_id"] = getattr(loan.book, "id", None)
            payload["book_title"] = getattr(loan.book, "title", "")
            payload["author"] = getattr(loan.book, "author", "")

    if student is not None:
        payload["student_id"] = getattr(student, "id", None)
        payload["student_name"] = getattr(student, "name", "")
        payload["student_login_id"] = getattr(student, "login_id", "")
    else:
        if loan is not None and getattr(loan, "student", None) is not None:
            payload["student_id"] = getattr(loan.student, "id", None)
            payload["student_name"] = getattr(loan.student, "name", "")
            payload["student_login_id"] = getattr(loan.student, "login_id", "")
    # If the worker isn't running, persist synchronously so events aren't lost
    def _sync_persist(payload: dict, caller_db: Optional[Session] = None):
        _logger.info("Worker not running — performing synchronous audit write")
        attempts = 0
        while attempts < 3:
            attempts += 1
            db = None
            try:
                # If caller supplied a DB session (tests override), use its bind
                if caller_db is not None:
                    from sqlalchemy.orm import sessionmaker

                    engine = caller_db.get_bind()
                    Local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
                    db = Local()
                else:
                    db = SessionLocal()
                tx_enum = models.TxTypeEnum(payload.get("type")) if payload.get("type") else models.TxTypeEnum.inventory_change
                entry = models.TxLog(
                    type=tx_enum,
                    actor_name=payload.get("actor_name") or "system",
                    details=payload.get("details"),
                    before_data=payload.get("before_data"),
                    after_data=payload.get("after_data"),
                    ip_address=payload.get("ip_address"),
                    user_agent=payload.get("user_agent"),
                    source=payload.get("source"),
                    book_id=payload.get("book_id"),
                    book_title=payload.get("book_title") or "",
                    author=payload.get("author") or "",
                    student_id=payload.get("student_id"),
                    student_name=payload.get("student_name") or "",
                    student_login_id=payload.get("student_login_id") or "",
                    loan_id=payload.get("loan_id"),
                )
                db.add(entry)
                db.commit()
                return True
            except Exception:
                _logger.exception("Synchronous audit write failed (attempt %d)", attempts)
                try:
                    if db is not None:
                        db.rollback()
                except Exception:
                    pass
            finally:
                if db is not None:
                    db.close()
        return False

    if _worker_thread is None or not _worker_thread.is_alive():
        _sync_persist(payload, caller_db=db)
        return

    try:
        _audit_queue.put_nowait(payload)
    except Exception:
        _logger.exception("Audit queue full or error enqueuing event")
        # fallback to synchronous write if enqueue fails
        _sync_persist(payload, caller_db=db)

