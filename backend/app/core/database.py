import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / '.env')
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./lecasu_erp.db"

def create_resilient_engine(db_url: str):
    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False}
        )
    
    # Tentar PostgreSQL
    try:
        engine_pg = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=15,
            max_overflow=25,
            pool_recycle=240,
            pool_timeout=5,
            connect_args={
                "connect_timeout": 5,
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5
            }
        )
        # Testar conexão ativamente
        with engine_pg.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[LECASU ERP] Conectado ao PostgreSQL com sucesso.")
        return engine_pg
    except Exception as e:
        print(f"[LECASU ERP] PostgreSQL inacessível no ambiente atual ({e}). Alternando para SQLite local resiliente (lecasu_erp.db)...")
        sqlite_url = "sqlite:///./lecasu_erp.db"
        return create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False}
        )

engine = create_resilient_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


