from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List, Dict, Any
import time

from app.core.database import get_db
from app.models.models import (
    Client, 
    Project, 
    Task, 
    Invoice, 
    Proposal, 
    Service, 
    Supplier, 
    PurchaseOrder, 
    Employee, 
    EmployeeLeave, 
    Document, 
    User
)
from app.schemas.schemas import (
    DashboardOverviewResponse,
    DashboardKPIs,
    DashboardRecentProject,
    DashboardRecentInvoice,
    DashboardPendingTask
)

router = APIRouter()

# In-memory cache for Dashboard with 3-second TTL to balance speed and freshness
_DASHBOARD_CACHE: Dict[str, Any] = {"timestamp": 0, "data": None}

def invalidate_dashboard_cache():
    _DASHBOARD_CACHE["timestamp"] = 0
    _DASHBOARD_CACHE["data"] = None

@router.get('/dashboard/overview', response_model=DashboardOverviewResponse, summary='Visão Geral do Dashboard')
def get_dashboard_overview(db: Session = Depends(get_db)):
    now = time.time()
    if _DASHBOARD_CACHE["data"] and (now - _DASHBOARD_CACHE["timestamp"]) < 3:
        return _DASHBOARD_CACHE["data"]

    # 1. Clients & Proposals
    active_clients_count = db.query(func.count(Client.id)).scalar() or 0
    
    proposal_agg = db.query(
        func.count(Proposal.id).label('total_count'),
        func.coalesce(func.sum(case((Proposal.status.in_(['DRAFT', 'SENT']), 1), else_=0)), 0).label('open_count'),
        func.coalesce(func.sum(case((Proposal.status == 'ACCEPTED', 1), else_=0)), 0).label('accepted_count'),
        func.coalesce(func.sum(case((Proposal.status != 'REJECTED', Proposal.total_amount), else_=0)), 0).label('total_amount')
    ).first()
    
    total_proposals_count = int(proposal_agg.total_count if proposal_agg else 0)
    open_proposals_count = int(proposal_agg.open_count if proposal_agg else 0)
    accepted_proposals_count = int(proposal_agg.accepted_count if proposal_agg else 0)
    proposals_total_amount = float(proposal_agg.total_amount if proposal_agg else 0.0)

    # 2. Projects & Tasks
    total_projects_count = db.query(func.count(Project.id)).scalar() or 0
    active_projects = (
        db.query(Project)
        .options(joinedload(Project.tasks))
        .filter(Project.status == 'IN_PROGRESS')
        .all()
    )
    active_projects_count = len(active_projects)
    completed_projects_count = db.query(func.count(Project.id)).filter(Project.status == 'COMPLETED').scalar() or 0

    if active_projects:
        progress_list = []
        for p in active_projects:
            total_tasks = len(p.tasks) if p.tasks else 0
            if total_tasks > 0:
                completed_tasks = sum(1 for t in p.tasks if t.status == 'DONE')
                progress_list.append((completed_tasks / total_tasks) * 100.0)
            else:
                progress_list.append(0.0)
        average_project_progress = round(sum(progress_list) / len(progress_list), 1) if progress_list else 0.0
    else:
        average_project_progress = 0.0

    task_agg = db.query(
        func.count(Task.id).label('total_tasks'),
        func.coalesce(func.sum(case((Task.status != 'DONE', 1), else_=0)), 0).label('pending_tasks'),
        func.coalesce(func.sum(case((Task.status == 'DONE', 1), else_=0)), 0).label('completed_tasks')
    ).first()
    total_tasks_count = int(task_agg.total_tasks if task_agg else 0)
    pending_tasks_count = int(task_agg.pending_tasks if task_agg else 0)
    completed_tasks_count = int(task_agg.completed_tasks if task_agg else 0)

    technicians_count = db.query(func.count(User.id)).filter(User.role.in_(['tecnico', 'engenheiro']), User.is_active == True).scalar() or 0

    # 3. Financial KPIs (Invoices)
    inv_agg = db.query(
        func.coalesce(func.sum(case((Invoice.status != 'CANCELLED', Invoice.amount), else_=0)), 0).label('total_invoiced'),
        func.coalesce(func.sum(case((Invoice.status == 'PAID', Invoice.amount), else_=0)), 0).label('total_received'),
        func.coalesce(func.sum(case((Invoice.status.notin_(['PAID', 'CANCELLED']), Invoice.amount), else_=0)), 0).label('pending_amount'),
        func.coalesce(func.sum(case((Invoice.status == 'PAID', 1), else_=0)), 0).label('paid_count'),
        func.coalesce(func.sum(case((Invoice.status.notin_(['PAID', 'CANCELLED']), 1), else_=0)), 0).label('pending_count')
    ).first()

    total_invoiced = float(inv_agg.total_invoiced if inv_agg else 0.0)
    total_received = float(inv_agg.total_received if inv_agg else 0.0)
    pending_amount = float(inv_agg.pending_amount if inv_agg else 0.0)
    invoices_paid_count = int(inv_agg.paid_count if inv_agg else 0)
    invoices_pending_count = int(inv_agg.pending_count if inv_agg else 0)

    # 4. Services Catalog
    total_services_count = db.query(func.count(Service.id)).scalar() or 0
    active_services_count = db.query(func.count(Service.id)).filter(Service.is_active == True).scalar() or 0

    # 5. Suppliers & Purchase Orders
    suppliers_count = db.query(func.count(Supplier.id)).filter(Supplier.is_active == True).scalar() or 0
    po_agg = db.query(
        func.count(PurchaseOrder.id).label('total_orders'),
        func.coalesce(func.sum(case((PurchaseOrder.status == 'PENDING', 1), else_=0)), 0).label('pending_orders'),
        func.coalesce(func.sum(case((PurchaseOrder.status != 'CANCELLED', PurchaseOrder.total_amount), else_=0)), 0).label('total_amount'),
        func.coalesce(func.sum(case((PurchaseOrder.status == 'PENDING', PurchaseOrder.total_amount), else_=0)), 0).label('pending_amount')
    ).first()

    purchase_orders_count = int(po_agg.total_orders if po_agg else 0)
    pending_purchase_orders_count = int(po_agg.pending_orders if po_agg else 0)
    total_purchases_amount = float(po_agg.total_amount if po_agg else 0.0)
    pending_purchases_amount = float(po_agg.pending_amount if po_agg else 0.0)

    # 6. Human Resources (RH)
    employees_count = db.query(func.count(Employee.id)).scalar() or 0
    active_employees_count = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 0
    total_payroll_monthly = float(db.query(func.coalesce(func.sum(Employee.base_salary), 0)).filter(Employee.is_active == True).scalar() or 0.0)
    active_leaves_count = db.query(func.count(EmployeeLeave.id)).filter(EmployeeLeave.status == 'APPROVED').scalar() or 0

    # 7. Documents (GED)
    documents_count = db.query(func.count(Document.id)).scalar() or 0

    # 8. Users & Access
    system_users_count = db.query(func.count(User.id)).scalar() or 0
    active_users_count = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0

    kpis = DashboardKPIs(
        active_clients_count=active_clients_count,
        total_proposals_count=total_proposals_count,
        open_proposals_count=open_proposals_count,
        accepted_proposals_count=accepted_proposals_count,
        proposals_total_amount=round(proposals_total_amount, 2),

        total_projects_count=total_projects_count,
        active_projects_count=active_projects_count,
        completed_projects_count=completed_projects_count,
        average_project_progress=average_project_progress,
        total_tasks_count=total_tasks_count,
        pending_tasks_count=pending_tasks_count,
        completed_tasks_count=completed_tasks_count,
        technicians_count=technicians_count,

        total_invoiced=round(total_invoiced, 2),
        total_received=round(total_received, 2),
        pending_amount=round(pending_amount, 2),
        invoices_paid_count=invoices_paid_count,
        invoices_pending_count=invoices_pending_count,

        total_services_count=total_services_count,
        active_services_count=active_services_count,

        suppliers_count=suppliers_count,
        purchase_orders_count=purchase_orders_count,
        pending_purchase_orders_count=pending_purchase_orders_count,
        total_purchases_amount=round(total_purchases_amount, 2),
        pending_purchases_amount=round(pending_purchases_amount, 2),

        employees_count=employees_count,
        active_employees_count=active_employees_count,
        total_payroll_monthly=round(total_payroll_monthly, 2),
        active_leaves_count=active_leaves_count,

        documents_count=documents_count,

        system_users_count=system_users_count,
        active_users_count=active_users_count
    )

    # Recent Projects (Last 5 with joinedload)
    recent_projects_raw = (
        db.query(Project)
        .options(joinedload(Project.client), joinedload(Project.tasks))
        .order_by(Project.created_at.desc())
        .limit(5)
        .all()
    )

    recent_projects: List[DashboardRecentProject] = []
    for proj in recent_projects_raw:
        total_tasks = len(proj.tasks) if proj.tasks else 0
        completed_tasks = sum(1 for t in proj.tasks if t.status == 'DONE') if proj.tasks else 0
        progress_percent = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0
        
        recent_projects.append(
            DashboardRecentProject(
                id=proj.id,
                code=proj.code,
                name=proj.name,
                client_name=proj.client.name if proj.client else None,
                status=proj.status,
                progress_percent=progress_percent,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                created_at=proj.created_at
            )
        )

    # Recent Invoices (Last 5 with joinedload)
    recent_invoices_raw = (
        db.query(Invoice)
        .options(joinedload(Invoice.client), joinedload(Invoice.project))
        .order_by(Invoice.created_at.desc())
        .limit(5)
        .all()
    )

    recent_invoices: List[DashboardRecentInvoice] = []
    for inv in recent_invoices_raw:
        recent_invoices.append(
            DashboardRecentInvoice(
                id=inv.id,
                invoice_number=inv.invoice_number,
                client_name=inv.client.name if inv.client else None,
                project_code=inv.project.code if inv.project else None,
                amount=float(inv.amount),
                status=inv.status,
                due_date=inv.due_date,
                created_at=inv.created_at
            )
        )

    # Pending Technical Tasks
    pending_tasks_raw = (
        db.query(Task)
        .options(joinedload(Task.project))
        .filter(Task.status.in_(['TODO', 'IN_PROGRESS']))
        .order_by(
            Task.due_date.is_(None),
            Task.due_date.asc(),
            Task.created_at.desc()
        )
        .limit(10)
        .all()
    )

    pending_tasks: List[DashboardPendingTask] = []
    for t in pending_tasks_raw:
        pending_tasks.append(
            DashboardPendingTask(
                id=t.id,
                project_id=t.project_id,
                project_name=t.project.name if t.project else None,
                project_code=t.project.code if t.project else None,
                title=t.title,
                description=t.description,
                status=t.status,
                due_date=t.due_date,
                assigned_to=t.assigned_to,
                created_at=t.created_at
            )
        )

    response = DashboardOverviewResponse(
        kpis=kpis,
        recent_projects=recent_projects,
        recent_invoices=recent_invoices,
        pending_tasks=pending_tasks
    )

    _DASHBOARD_CACHE["timestamp"] = now
    _DASHBOARD_CACHE["data"] = response

    return response
