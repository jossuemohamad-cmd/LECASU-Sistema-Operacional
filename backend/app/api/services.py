from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Service
from app.schemas.schemas import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceOverviewKPIs
)

router = APIRouter()

def seed_default_services_if_empty(db: Session):
    count = db.query(Service).count()
    if count == 0:
        default_services = [
            Service(
                code="SRV-SOLAR-01",
                name="Instalação de Sistema Solar 5kWp",
                category="Energia Solar",
                description="Dimensionamento, fornecimento e instalação completa de sistema fotovoltaico com inversor híbrido.",
                unit="Projeto",
                base_price=185000.00,
                is_active=True
            ),
            Service(
                code="SRV-AUDIT-01",
                name="Auditoria de Eficiência Energética",
                category="Auditoria",
                description="Diagnóstico técnico de consumo elétrico, análise termográfica e relatório de oportunidades de poupança.",
                unit="Projeto",
                base_price=45000.00,
                is_active=True
            ),
            Service(
                code="SRV-ELEC-01",
                name="Manutenção Preventiva de Quadros Elétricos",
                category="Instalação Elétrica",
                description="Reaperto de conexões, balanceamento de fases, substituição de disjuntores e limpeza técnica.",
                unit="Ponto",
                base_price=25000.00,
                is_active=True
            ),
            Service(
                code="SRV-CONS-01",
                name="Consultoria Técnica & Projetos AVAC",
                category="Consultoria",
                description="Elaboração de projetos executivos de climatização, ventilação e laudos de conformidade técnica.",
                unit="Projeto",
                base_price=60000.00,
                is_active=True
            ),
        ]
        for s in default_services:
            db.add(s)
        db.commit()

@router.get('/services', response_model=List[ServiceResponse], summary='Listar serviços do catálogo')
def list_services(
    category: Optional[str] = Query(None, description='Filtrar por categoria'),
    is_active: Optional[bool] = Query(None, description='Filtrar por status ativo'),
    search: Optional[str] = Query(None, description='Busca textual por nome, código ou descrição'),
    db: Session = Depends(get_db)
):
    seed_default_services_if_empty(db)

    query = db.query(Service).order_by(Service.category.asc(), Service.name.asc())

    if category and category != 'ALL':
        query = query.filter(Service.category == category)
    if is_active is not None:
        query = query.filter(Service.is_active == is_active)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Service.name.ilike(term)) | 
            (Service.code.ilike(term)) | 
            (Service.description.ilike(term))
        )

    services = query.all()
    return [
        ServiceResponse(
            id=s.id,
            code=s.code,
            name=s.name,
            category=s.category or 'Geral',
            description=s.description,
            unit=s.unit or 'Projeto',
            base_price=float(s.base_price or 0.0),
            is_active=s.is_active if s.is_active is not None else True,
            created_at=s.created_at
        )
        for s in services
    ]

@router.get('/services/categories', response_model=List[str], summary='Listar categorias de serviços')
def list_service_categories(db: Session = Depends(get_db)):
    seed_default_services_if_empty(db)
    categories = (
        db.query(Service.category)
        .distinct()
        .filter(Service.category.isnot(None))
        .all()
    )
    result = sorted([c[0] for c in categories if c[0]])
    return result

@router.get('/services/overview', response_model=ServiceOverviewKPIs, summary='KPIs do catálogo de serviços')
def get_services_overview(db: Session = Depends(get_db)):
    seed_default_services_if_empty(db)

    total_services = db.query(Service).count()
    active_categories_count = (
        db.query(Service.category)
        .filter(Service.is_active == True, Service.category.isnot(None))
        .distinct()
        .count()
    )

    avg_price_query = (
        db.query(func.coalesce(func.avg(Service.base_price), 0))
        .filter(Service.is_active == True)
        .scalar()
    )
    average_base_price = round(float(avg_price_query or 0.0), 2)

    return ServiceOverviewKPIs(
        total_services=total_services,
        active_categories_count=active_categories_count,
        average_base_price=average_base_price
    )

@router.post('/services', response_model=ServiceResponse, status_code=status.HTTP_201_CREATED, summary='Cadastrar novo serviço')
def create_service(service_in: ServiceCreate, db: Session = Depends(get_db)):
    # Generate sequential unique service code if not provided
    if service_in.code and service_in.code.strip():
        code = service_in.code.strip().upper()
        existing = db.query(Service).filter(Service.code == code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um serviço com o código '{code}'."
            )
    else:
        prefix = "SRV"
        if service_in.category:
            cat_clean = service_in.category.strip().upper()[:4]
            prefix = f"SRV-{cat_clean}"
        count = db.query(Service).count() + 1
        code = f"{prefix}-{count:02d}"
        while db.query(Service).filter(Service.code == code).first():
            count += 1
            code = f"{prefix}-{count:02d}"

    new_service = Service(
        code=code,
        name=service_in.name.strip(),
        category=service_in.category.strip() if service_in.category else "Geral",
        description=service_in.description.strip() if service_in.description else None,
        unit=service_in.unit.strip() if service_in.unit else "Projeto",
        base_price=service_in.base_price,
        is_active=service_in.is_active if service_in.is_active is not None else True,
        created_at=datetime.utcnow()
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return ServiceResponse(
        id=new_service.id,
        code=new_service.code,
        name=new_service.name,
        category=new_service.category,
        description=new_service.description,
        unit=new_service.unit,
        base_price=float(new_service.base_price or 0.0),
        is_active=new_service.is_active,
        created_at=new_service.created_at
    )

@router.patch('/services/{service_id}', response_model=ServiceResponse, summary='Atualizar serviço')
def update_service(service_id: int, service_in: ServiceUpdate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Serviço não encontrado."
        )

    if service_in.code is not None:
        code_clean = service_in.code.strip().upper()
        if code_clean != service.code:
            existing = db.query(Service).filter(Service.code == code_clean).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outro serviço com o código '{code_clean}'."
                )
            service.code = code_clean

    if service_in.name is not None:
        service.name = service_in.name.strip()
    if service_in.category is not None:
        service.category = service_in.category.strip()
    if service_in.description is not None:
        service.description = service_in.description.strip()
    if service_in.unit is not None:
        service.unit = service_in.unit.strip()
    if service_in.base_price is not None:
        service.base_price = service_in.base_price
    if service_in.is_active is not None:
        service.is_active = service_in.is_active

    db.commit()
    db.refresh(service)

    return ServiceResponse(
        id=service.id,
        code=service.code,
        name=service.name,
        category=service.category,
        description=service.description,
        unit=service.unit,
        base_price=float(service.base_price or 0.0),
        is_active=service.is_active,
        created_at=service.created_at
    )
