from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import engine, Base, SessionLocal
import app.models.models as models
from app.api.clients import router as clients_router
from app.api.projects import router as projects_router
from app.api.dashboard import router as dashboard_router
from app.api.team import router as team_router
from app.api.services import router as services_router
from app.api.auth import router as auth_router, init_default_admin
from app.api.users import router as users_router
from app.api.suppliers import router as suppliers_router
from app.api.hr import router as hr_router
from app.api.ged import router as ged_router
from app.api.finance import router as finance_router

import asyncio
import sqlalchemy

async def neon_keepalive_worker():
    """Mantém o compute pool do Neon permanentemente ativo para eliminar cold starts"""
    while True:
        try:
            await asyncio.sleep(45)  # Ping a cada 45 segundos
            with SessionLocal() as db_session:
                db_session.execute(sqlalchemy.text("SELECT 1"))
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização resiliente de tabelas e utilizador Admin
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db_session:
            init_default_admin(db_session)
        print("[LECASU ERP] Base de dados e Administrador inicializados com sucesso.")
    except Exception as e:
        print(f"[LECASU ERP] Aviso na inicialização: {e}")
    
    # Iniciar worker de warm connection em background
    keepalive_task = asyncio.create_task(neon_keepalive_worker())
    
    yield
    
    keepalive_task.cancel()


app = FastAPI(
    title='LECASU Sistema Operacional API',
    version='2.0',
    description='API do ERP LECASU',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Rotas da API v1
app.include_router(auth_router, prefix='/api/v1')
app.include_router(users_router, prefix='/api/v1')
app.include_router(dashboard_router, prefix='/api/v1')
app.include_router(services_router, prefix='/api/v1')
app.include_router(clients_router, prefix='/api/v1')
app.include_router(projects_router, prefix='/api/v1')
app.include_router(team_router, prefix='/api/v1')
app.include_router(finance_router, prefix='/api/v1')
app.include_router(suppliers_router, prefix='/api/v1')
app.include_router(hr_router, prefix='/api/v1')
app.include_router(ged_router, prefix='/api/v1')

@app.get('/api/health')
def health_check():
    return {'status': 'online', 'system': 'LECASU ERP v2.0'}
