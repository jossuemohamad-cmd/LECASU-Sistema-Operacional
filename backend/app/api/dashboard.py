from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.models import Client, Project, Task, Invoice, Proposal
from app.schemas.schemas import (
    DashboardOverviewResponse,
    DashboardKPIs,
    DashboardRecentProject,
    DashboardRecentInvoice,
    DashboardPendingTask
)

router = APIRouter()

@router.get('/dashboard/overview', response_model=DashboardOverviewResponse, summary='Visão Geral do Dashboard')
def get_dashboard_overview(db: Session = Depends(get_db)):
    # 1. Total Clients
    active_clients_count = db.query(Client).count()

    # 2. Active Projects (IN_PROGRESS)
    active_projects = (
        db.query(Project)
        .options(joinedload(Project.tasks))
        .filter(Project.status == 'IN_PROGRESS')
        .all()
    )
    active_projects_count = len(active_projects)

    # 3. Open Proposals (DRAFT or SENT)
    open_proposals_count = db.query(Proposal).filter(Proposal.status.in_(['DRAFT', 'SENT'])).count()

    # 4. Average Project Progress of active projects
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

    # 5. Financial KPIs (Invoices)
    # Total Invoiced (excluding CANCELLED)
    total_invoiced_query = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.status != 'CANCELLED')
        .scalar()
    )
    total_invoiced = float(total_invoiced_query or 0.0)

    # Total Received (PAID)
    total_received_query = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.status == 'PAID')
        .scalar()
    )
    total_received = float(total_received_query or 0.0)

    # Pending Amount (ISSUED / not paid and not cancelled)
    pending_amount_query = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.status.notin_(['PAID', 'CANCELLED']))
        .scalar()
    )
    pending_amount = float(pending_amount_query or 0.0)

    # If no invoices exist yet, also check accepted proposals total amount as projected value if needed,
    # but strictly from invoices per spec:
    kpis = DashboardKPIs(
        active_clients_count=active_clients_count,
        active_projects_count=active_projects_count,
        open_proposals_count=open_proposals_count,
        total_invoiced=round(total_invoiced, 2),
        total_received=round(total_received, 2),
        pending_amount=round(pending_amount, 2),
        average_project_progress=average_project_progress
    )

    # 6. Recent Projects (Last 5)
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

    # 7. Recent Invoices (Last 5)
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

    # 8. Pending Technical Tasks (TODO or IN_PROGRESS, ordered by due_date nullslast, then created_at desc)
    pending_tasks_raw = (
        db.query(Task)
        .options(joinedload(Task.project))
        .filter(Task.status.in_(['TODO', 'IN_PROGRESS']))
        .order_by(
            Task.due_date.is_(None),  # NULLs last
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

    return DashboardOverviewResponse(
        kpis=kpis,
        recent_projects=recent_projects,
        recent_invoices=recent_invoices,
        pending_tasks=pending_tasks
    )
