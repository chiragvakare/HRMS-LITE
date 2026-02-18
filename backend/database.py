import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 1. Load environment variables
load_dotenv()

# 2. PRIORITY: Pehle poora DATABASE_URL check karein (Render isi ka use karta hai)
DATABASE_URL = os.getenv("DATABASE_URL")

# 3. FALLBACK: Agar DATABASE_URL nahi milta (Local testing ke liye)
if not DATABASE_URL:
    DB_NAME = os.getenv("DB_NAME", "hrms_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "123")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 4. Production settings (SSL for Render)
NODE_ENV = os.getenv("NODE_ENV", "development")
connect_args = {}
if NODE_ENV == "production":
    connect_args = {"sslmode": "require"}

# 5. Engine setup
engine = create_engine(
    DATABASE_URL, 
    connect_args=connect_args, 
    echo=(NODE_ENV == "development")
)

# 6. Session and Base setup
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 7. DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()