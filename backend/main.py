from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import auth, books, loans, reports, logs, staff, students
from core.config import settings
from database.database import Base, engine

# Create tables if they don't exist. For production, prefer Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Keep — Library Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(loans.router)
app.include_router(reports.router)
app.include_router(logs.router)
app.include_router(staff.router)
app.include_router(students.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
