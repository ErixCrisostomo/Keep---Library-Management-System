from database.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    for tbl in ["students", "librarians", "superadmins"]:
        try:
            result = conn.execute(text(f"SELECT count(*) FROM {tbl}"))
            print(tbl, result.scalar())
        except Exception as e:
            print(tbl, "ERROR", repr(e))
