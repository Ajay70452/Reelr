"""
Database configuration and connection management for ClipKing
"""

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/clipking"
)

# Handle Supabase connection pooling
if "supabase" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Dependency to get database session.
    Use this in FastAPI endpoints.
    
    Example:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Only creates tables that don't exist yet.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully!")


def test_connection():
    """
    Test database connection.
    Returns True if successful, False otherwise.
    """
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
