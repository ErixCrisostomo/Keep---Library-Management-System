from database.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'txtypeenum' ORDER BY enumsortorder"))
    values = [row[0] for row in result.fetchall()]
    print('Current txtypeenum values:', values)
    if 'reject_return' not in values:
        print('Adding reject_return to txtypeenum...')
        conn.execute(text("ALTER TYPE txtypeenum ADD VALUE 'reject_return'"))
        print('Added reject_return.')
    else:
        print('reject_return already present.')
