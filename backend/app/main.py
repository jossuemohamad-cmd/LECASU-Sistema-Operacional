from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models.models as models
from app.api.clients import router as clients_router
from app.api.projects import router as projects_router
from app.api.dashboard import router as dashboard_router
from app.api.team import router as team_router
from app.api.services import router as services_router
from app.api.auth import router as auth_router, init_default_admin
from app.api.users import router as users_router
from app.api.suppliers import router as suppliers_router
from app.core.database import SessionLocal

# Criar tabelas no banco de dados se não existirem
Base.metadata.create_all(bind=engine)

# Garantir existência do Administrador padrão
try:
    with SessionLocal() as db_session:
        init_default_admin(db_session)
except Exception as e:
    print(f"[LECASU ERP] Aviso na inicialização do Admin: {e}")

app = FastAPI(
    title='LECASU Sistema Operacional API',
    version='2.0',
    description='API do ERP LECASU'
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
app.include_router(suppliers_router, prefix='/api/v1')

@app.get('/api/health')
def health_check():
    return {'status': 'online', 'system': 'LECASU ERP v2.0'}




