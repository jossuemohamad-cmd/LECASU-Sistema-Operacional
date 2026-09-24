from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Invoice, Client, Project, PurchaseOrder, Employee, User
from app.core.security import get_current_user
from app.schemas.schemas import (
    InvoiceCreate,
    InvoiceResponse,
    FinanceOverviewKPIs,
    GenericMessageResponse
)

router = APIRouter()

def build_invoice_response(inv: Invoice) -> InvoiceResponse:
    return InvoiceResponse(
        id=inv.id,
        client_id=inv.client_id,
        project_id=inv.project_id,
        invoice_number=inv.invoice_number,
        amount=float(inv.amount),
        status=inv.status,
        due_date=inv.due_date,
        created_at=inv.created_at,
        client_name=inv.client.name if inv.client else None,
        project_code=inv.project.code if inv.project else None,
        project_name=inv.project.name if inv.project else None
    )

@router.get('/finance/invoices', response_model=List[InvoiceResponse], summary='Listar faturas')
def list_invoices(
    status_filter: Optional[str] = Query(None, alias='status', description='Filtrar por status: ISSUED, PAID, CANCELLED'),
    client_id: Optional[int] = Query(None, description='Filtrar por cliente'),
    project_id: Optional[int] = Query(None, description='Filtrar por projeto'),
    search: Optional[str] = Query(None, description='Pesquisar por número da fatura ou cliente'),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.project))
        .order_by(Invoice.created_at.desc())
    )

    if status_filter and status_filter.upper() != 'ALL':
        query = query.filter(Invoice.status == status_filter.upper())
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if project_id:
        query = query.filter(Invoice.project_id == project_id)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.join(Invoice.client, isouter=True).filter(
            func.lower(Invoice.invoice_number).like(term) |
            func.lower(Client.name).like(term)
        )

    invoices = query.all()
    return [build_invoice_response(inv) for inv in invoices]


@router.post('/finance/invoices', response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, summary='Emitir nova fatura')
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify client
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente com ID {payload.client_id} não encontrado."
        )

    # If project_id provided, verify project
    if payload.project_id:
        proj = db.query(Project).filter(Project.id == payload.project_id).first()
        if not proj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Projeto com ID {payload.project_id} não encontrado."
            )

    # Generate sequential invoice number if not provided
    year = datetime.utcnow().year
    if payload.invoice_number and payload.invoice_number.strip():
        inv_num = payload.invoice_number.strip().upper()
        existing = db.query(Invoice).filter(Invoice.invoice_number == inv_num).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma fatura emitida com o número '{inv_num}'."
            )
    else:
        count = db.query(Invoice).count() + 1
        inv_num = f"FT-{year}-{count:04d}"
        while db.query(Invoice).filter(Invoice.invoice_number == inv_num).first():
            count += 1
            inv_num = f"FT-{year}-{count:04d}"

    new_invoice = Invoice(
        client_id=payload.client_id,
        project_id=payload.project_id,
        invoice_number=inv_num,
        amount=payload.amount,
        status=payload.status or 'ISSUED',
        due_date=payload.due_date,
        created_at=datetime.utcnow()
    )
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)

    return build_invoice_response(new_invoice)


@router.patch('/finance/invoices/{invoice_id}/pay', response_model=InvoiceResponse, summary='Registar pagamento de fatura')
def pay_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).options(joinedload(Invoice.client), joinedload(Invoice.project)).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fatura não encontrada."
        )

    invoice.status = 'PAID'
    db.commit()
    db.refresh(invoice)

    return build_invoice_response(invoice)


@router.patch('/finance/invoices/{invoice_id}/cancel', response_model=InvoiceResponse, summary='Cancelar fatura')
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).options(joinedload(Invoice.client), joinedload(Invoice.project)).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fatura não encontrada."
        )

    invoice.status = 'CANCELLED'
    db.commit()
    db.refresh(invoice)

    return build_invoice_response(invoice)


@router.get('/finance/overview', response_model=FinanceOverviewKPIs, summary='KPIs consolidados da Gestão Financeira')
def get_finance_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Single aggregated query for invoices stats
    inv_stats = db.query(
        func.coalesce(func.sum(case((Invoice.status != 'CANCELLED', Invoice.amount), else_=0)), 0).label('total_invoiced'),
        func.coalesce(func.sum(case((Invoice.status == 'PAID', Invoice.amount), else_=0)), 0).label('total_received'),
        func.coalesce(func.sum(case((Invoice.status.notin_(['PAID', 'CANCELLED']), Invoice.amount), else_=0)), 0).label('pending_receivables'),
        func.coalesce(func.sum(case((Invoice.status == 'ISSUED', 1), else_=0)), 0).label('issued_count'),
        func.coalesce(func.sum(case((Invoice.status == 'PAID', 1), else_=0)), 0).label('paid_count'),
    ).first()

    total_invoiced = float(inv_stats.total_invoiced if inv_stats else 0.0)
    total_received = float(inv_stats.total_received if inv_stats else 0.0)
    pending_receivables = float(inv_stats.pending_receivables if inv_stats else 0.0)
    issued_count = int(inv_stats.issued_count if inv_stats else 0)
    paid_count = int(inv_stats.paid_count if inv_stats else 0)

    # Expenses: Paid purchase orders
    purchases_expense = db.query(
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0)
    ).filter(PurchaseOrder.status == 'PAID').scalar()

    total_expenses = float(purchases_expense or 0.0)
    net_cashflow = round(total_received - total_expenses, 2)

    return FinanceOverviewKPIs(
        total_invoiced=round(total_invoiced, 2),
        total_received=round(total_received, 2),
        pending_receivables=round(pending_receivables, 2),
        total_expenses=round(total_expenses, 2),
        net_cashflow=net_cashflow,
        issued_invoices_count=issued_count,
        paid_invoices_count=paid_count
    )
