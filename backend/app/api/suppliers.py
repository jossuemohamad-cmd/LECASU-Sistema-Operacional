from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Supplier, PurchaseOrder, Project, User
from app.core.security import get_current_user
from app.schemas.schemas import (
    SupplierCreate,
    SupplierUpdate,
    SupplierResponse,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    SupplierOverviewKPIs,
    GenericMessageResponse
)

router = APIRouter()

# ================= FORNECEDORES =================

@router.get('/suppliers', response_model=List[SupplierResponse], summary='Listar todos os fornecedores')
def list_suppliers(
    category: Optional[str] = None,
    active_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Supplier)
    if category:
        query = query.filter(Supplier.category == category)
    if active_only:
        query = query.filter(Supplier.is_active == True)
        
    suppliers = query.order_by(Supplier.name.asc()).all()

    # Single Aggregated Query for all suppliers' purchases (Eliminating N+1 queries)
    purchases_stats = (
        db.query(
            PurchaseOrder.supplier_id,
            func.count(PurchaseOrder.id).label('purchases_count'),
            func.coalesce(func.sum(case((PurchaseOrder.status == 'PAID', PurchaseOrder.total_amount), else_=0)), 0).label('total_spent')
        )
        .group_by(PurchaseOrder.supplier_id)
        .all()
    )

    stats_map = {
        row.supplier_id: (int(row.purchases_count), float(row.total_spent))
        for row in purchases_stats
    }

    results = []
    for s in suppliers:
        purchases_count, total_spent = stats_map.get(s.id, (0, 0.0))
        results.append(
            SupplierResponse(
                id=s.id,
                name=s.name,
                nuit=s.nuit,
                contact_person=s.contact_person,
                email=s.email,
                phone=s.phone,
                category=s.category or 'Geral',
                address=s.address,
                is_active=s.is_active if s.is_active is not None else True,
                created_at=s.created_at,
                purchases_count=purchases_count,
                total_spent=total_spent
            )
        )
    return results


@router.post('/suppliers', response_model=SupplierResponse, status_code=status.HTTP_201_CREATED, summary='Cadastrar novo fornecedor')
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name_clean = payload.name.strip()
    existing = db.query(Supplier).filter(func.lower(Supplier.name) == name_clean.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um fornecedor cadastrado com o nome '{name_clean}'."
        )

    new_supplier = Supplier(
        name=name_clean,
        nuit=payload.nuit.strip() if payload.nuit else None,
        contact_person=payload.contact_person.strip() if payload.contact_person else None,
        email=payload.email.strip().lower() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        category=payload.category.strip() if payload.category else 'Geral',
        address=payload.address.strip() if payload.address else None,
        is_active=payload.is_active,
        created_at=datetime.utcnow()
    )
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)

    return SupplierResponse(
        id=new_supplier.id,
        name=new_supplier.name,
        nuit=new_supplier.nuit,
        contact_person=new_supplier.contact_person,
        email=new_supplier.email,
        phone=new_supplier.phone,
        category=new_supplier.category,
        address=new_supplier.address,
        is_active=new_supplier.is_active,
        created_at=new_supplier.created_at,
        purchases_count=0,
        total_spent=0.0
    )


@router.patch('/suppliers/{supplier_id}/status', response_model=SupplierResponse, summary='Ativar ou desativar fornecedor')
def toggle_supplier_status(
    supplier_id: int,
    is_active: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado."
        )

    supplier.is_active = is_active
    db.commit()
    db.refresh(supplier)

    purchases_stats = (
        db.query(
            func.count(PurchaseOrder.id).label('purchases_count'),
            func.coalesce(func.sum(case((PurchaseOrder.status == 'PAID', PurchaseOrder.total_amount), else_=0)), 0).label('total_spent')
        )
        .filter(PurchaseOrder.supplier_id == supplier.id)
        .first()
    )

    purchases_count = int(purchases_stats.purchases_count if purchases_stats else 0)
    total_spent = float(purchases_stats.total_spent if purchases_stats else 0.0)

    return SupplierResponse(
        id=supplier.id,
        name=supplier.name,
        nuit=supplier.nuit,
        contact_person=supplier.contact_person,
        email=supplier.email,
        phone=supplier.phone,
        category=supplier.category,
        address=supplier.address,
        is_active=supplier.is_active,
        created_at=supplier.created_at,
        purchases_count=purchases_count,
        total_spent=total_spent
    )


@router.get('/suppliers/overview', response_model=SupplierOverviewKPIs, summary='KPIs consolidados de fornecedores e compras')
def get_suppliers_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_suppliers = db.query(func.count(Supplier.id)).scalar() or 0
    active_suppliers = db.query(func.count(Supplier.id)).filter(Supplier.is_active == True).scalar() or 0

    order_stats = (
        db.query(
            func.count(PurchaseOrder.id).label('total_count'),
            func.coalesce(func.sum(case((PurchaseOrder.status == 'PENDING', 1), else_=0)), 0).label('pending_count'),
            func.coalesce(func.sum(case((PurchaseOrder.status == 'PENDING', PurchaseOrder.total_amount), else_=0)), 0).label('pending_amount'),
            func.coalesce(func.sum(case((PurchaseOrder.status == 'PAID', PurchaseOrder.total_amount), else_=0)), 0).label('paid_amount')
        )
        .first()
    )

    return SupplierOverviewKPIs(
        total_suppliers=total_suppliers,
        active_suppliers_count=active_suppliers,
        pending_amount_mzn=float(order_stats.pending_amount if order_stats else 0.0),
        paid_amount_mzn=float(order_stats.paid_amount if order_stats else 0.0),
        total_purchases_count=int(order_stats.total_count if order_stats else 0),
        pending_orders_count=int(order_stats.pending_count if order_stats else 0)
    )


# ================= ORDENS DE COMPRA (PURCHASES) =================

@router.get('/purchases', response_model=List[PurchaseOrderResponse], summary='Listar todas as ordens de compra')
def list_purchases(
    supplier_id: Optional[int] = None,
    project_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.supplier), joinedload(PurchaseOrder.project))
        .order_by(PurchaseOrder.created_at.desc())
    )

    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    if project_id:
        query = query.filter(PurchaseOrder.project_id == project_id)
    if status_filter and status_filter.upper() != 'ALL':
        query = query.filter(PurchaseOrder.status == status_filter.upper())

    orders = query.all()

    return [
        PurchaseOrderResponse(
            id=p.id,
            supplier_id=p.supplier_id,
            project_id=p.project_id,
            order_number=p.order_number,
            description=p.description,
            total_amount=float(p.total_amount or 0),
            status=p.status,
            due_date=p.due_date,
            created_at=p.created_at,
            paid_at=p.paid_at,
            supplier_name=p.supplier.name if p.supplier else None,
            project_name=p.project.name if p.project else None,
            project_code=p.project.code if p.project else None
        )
        for p in orders
    ]


@router.post('/purchases', response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED, summary='Emitir nova ordem de compra')
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor selecionado não encontrado."
        )

    if payload.project_id:
        proj = db.query(Project).filter(Project.id == payload.project_id).first()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projeto associado não encontrado."
            )

    year = datetime.utcnow().year
    count = db.query(func.count(PurchaseOrder.id)).scalar() or 0
    order_number = f"OC-{year}-{(count + 1):04d}"
    while db.query(PurchaseOrder).filter(PurchaseOrder.order_number == order_number).first():
        count += 1
        order_number = f"OC-{year}-{(count + 1):04d}"

    new_order = PurchaseOrder(
        supplier_id=payload.supplier_id,
        project_id=payload.project_id,
        order_number=order_number,
        description=payload.description.strip(),
        total_amount=payload.total_amount,
        status='PENDING',
        due_date=payload.due_date,
        created_at=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return PurchaseOrderResponse(
        id=new_order.id,
        supplier_id=new_order.supplier_id,
        project_id=new_order.project_id,
        order_number=new_order.order_number,
        description=new_order.description,
        total_amount=float(new_order.total_amount),
        status=new_order.status,
        due_date=new_order.due_date,
        created_at=new_order.created_at,
        paid_at=new_order.paid_at,
        supplier_name=supplier.name,
        project_name=None,
        project_code=None
    )


@router.patch('/purchases/{purchase_id}/pay', response_model=PurchaseOrderResponse, summary='Registar pagamento da ordem de compra')
def pay_purchase_order(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = (
        db.query(PurchaseOrder)
        .options(joinedload(PurchaseOrder.supplier), joinedload(PurchaseOrder.project))
        .filter(PurchaseOrder.id == purchase_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordem de compra não encontrada."
        )

    order.status = 'PAID'
    order.paid_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    return PurchaseOrderResponse(
        id=order.id,
        supplier_id=order.supplier_id,
        project_id=order.project_id,
        order_number=order.order_number,
        description=order.description,
        total_amount=float(order.total_amount),
        status=order.status,
        due_date=order.due_date,
        created_at=order.created_at,
        paid_at=order.paid_at,
        supplier_name=order.supplier.name if order.supplier else None,
        project_name=order.project.name if order.project else None,
        project_code=order.project.code if order.project else None
    )
