import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / '.env')
load_dotenv()

DEFAULT_NEON_URL = "postgresql://neondb_owner:npg_CnokQWcF2A1N@ep-sweet-shadow-b4g0mnvb-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL = os.getenv('DATABASE_URL', DEFAULT_NEON_URL)
if not DATABASE_URL or not DATABASE_URL.strip():
    DATABASE_URL = DEFAULT_NEON_URL

def create_resilient_engine(db_url: str):
    if db_url.startswith("postgresql"):
        try:
            engine_pg = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                pool_recycle=240,
                pool_timeout=10,
                connect_args={
                    "connect_timeout": 10,
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5
                }
            )
            with engine_pg.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[LECASU ERP] Conectado ao Neon PostgreSQL Cloud com sucesso.")
            return engine_pg
        except Exception as e:
            print(f"[LECASU ERP] Aviso ao conectar PostgreSQL ({e}). Tentando URL padrão Neon...")
            if db_url != DEFAULT_NEON_URL:
                try:
                    engine_pg_default = create_engine(
                        DEFAULT_NEON_URL,
                        pool_pre_ping=True,
                        pool_size=10,
                        max_overflow=20,
                        pool_recycle=240,
                        pool_timeout=10
                    )
                    with engine_pg_default.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    print("[LECASU ERP] Conectado ao Neon PostgreSQL Cloud via fallback padrão.")
                    return engine_pg_default
                except Exception as ex_def:
                    print(f"[LECASU ERP] Falha ao conectar ao Neon ({ex_def}).")

    # Fallback local para desenvolvimento offline
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



