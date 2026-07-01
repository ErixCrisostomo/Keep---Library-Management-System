# Keep — Library Management System

A full-stack rebuild of the Figma Make "Keep" prototype:
**FastAPI + PostgreSQL** backend, **Next.js (TypeScript + Tailwind)** frontend, JWT auth.

```
root
├── backend/      FastAPI, SQLAlchemy models, JWT auth, PostgreSQL
└── frontend/     Next.js (App Router), Tailwind, zustand stores
```

## 1. Database setup (PostgreSQL)

Create the database and a user (adjust names/password as you like — just keep them
in sync with `backend/.env`):

```sql
CREATE DATABASE keep_db;
CREATE USER keep_user WITH PASSWORD 'keep_password';
GRANT ALL PRIVILEGES ON DATABASE keep_db TO keep_user;
```

## 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit DATABASE_URL / JWT_SECRET_KEY if needed

# Creates tables + seeds demo data (24 books, 1 librarian, 5 students, sample loans)
python -m database.seed

uvicorn main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Visit `http://localhost:3000`.

## Demo credentials

| Role       | Login                        | Password  |
|------------|-------------------------------|-----------|
| Librarian  | `juandelacruz@email.com`      | `lib123`  |
| Student    | `22-22222`                    | `student1`|

(A few more student accounts exist — see `backend/database/seed.py`.)

## How the workflow maps to the original prototype

- **Librarian walk-in checkout / return** — immediate, decrements/increments stock directly.
- **Student self-service borrow** — creates a `Requested` loan; librarian approves (→ `Active`,
  stock decremented) or rejects (loan removed).
- **Student return request** — creates a `Return Requested` loan; librarian approves
  (→ `Returned`, stock incremented).
- **Overdue** is computed server-side (`Active` + past due date), not stored as its own status.

## Notable simplifications vs. the Figma Make prototype

- Auth is real JWT (email/SR-code + password) against the database, replacing the
  hardcoded credentials map.
- The "Requests" panel notification badge count and per-user event log (approved/rejected
  toasts across sessions) were simplified to notifications *derived live* from loan state,
  since there's no push/event-log table yet. Everything a librarian or student needs to see
  (pending requests, overdue items, due-soon items) is still there — it's just recomputed from
  current data rather than replayed as a historical event feed.
- The "auto-fill student name from SR code" preview in the checkout form was dropped, since
  that used a hardcoded client-side registry. The backend now resolves the student by SR code
  at checkout time and returns a clear error if not found.

## Tests

```bash
# Backend (uses an in-memory/SQLite override, no Postgres needed)
cd backend
DATABASE_URL="sqlite:///./test.db" python -m database.seed
# (or write pytest tests against the FastAPI TestClient — see the app's route list in main.py)

# Frontend
cd frontend
npm test
```

## Deployment notes

- `Base.metadata.create_all()` runs on backend startup for convenience. For real
  deployments, switch to Alembic migrations (the dependency is already in
  `requirements.txt`; run `alembic init alembic` to get started).
- Set a strong `JWT_SECRET_KEY` and correct `CORS_ORIGINS` in `backend/.env` before
  deploying anywhere public.
