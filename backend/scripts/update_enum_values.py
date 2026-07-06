"""Add missing values to the Postgres enum `txtypeenum` used by TxLog.type.

Run this script once (from the repo root):

    python backend/scripts/update_enum_values.py

It will add the commonly-needed values if they do not already exist.
"""
from database.database import engine
from sqlalchemy import text

NEW_VALUES = [
    "login",
    "logout",
    "add_book",
    "update_book",
    "delete_book",
    "inventory_change",
    "create_account",
    "update_account",
    "delete_account",
]

TYPE_NAME = "txtypeenum"  # Postgres enum type name (lowercased by SQLAlchemy)

def make_stmt(val: str) -> str:
    return f"""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = '{TYPE_NAME}' AND e.enumlabel = '{val}'
    ) THEN
        ALTER TYPE {TYPE_NAME} ADD VALUE '{val}';
    END IF;
END$$;
"""

def main():
    with engine.begin() as conn:
        for v in NEW_VALUES:
            stmt = make_stmt(v)
            print(f"Applying enum update for: {v}")
            conn.execute(text(stmt))

    print("Done. Restart your backend (uvicorn) if it is running.")


if __name__ == "__main__":
    main()
