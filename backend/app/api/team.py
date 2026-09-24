from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, extract
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import User, Task, Project
from app.schemas.schemas import (
    TechnicianResponse,
    TaskAssignRequest,
    TeamTaskResponse,
    TeamOverviewKPIs
)

router = APIRouter()

def seed_default_technicians_if_empty(db: Session):
    count = db.query(func.count(User.id)).scalar()
    if count == 0:
        default_members = [
            User(
                name="Eng. Carlos Manhiça",
                email="carlos.manhica@lecasu.co.mz",
                phone="+258 84 123 4567",
                role="engenheiro",
                is_active=True
            ),
            User(
                name="Téc. Armando Sitoe",
                email="armando.sitoe@lecasu.co.mz",
                phone="+258 82 987 6543",
                role="tecnico",
                is_active=True
            ),
            User(
                name="Téc. Manuel Mabote",
                email="manuel.mabote@lecasu.co.mz",
                phone="+258 84 555 7890",
                role="tecnico",
                is_active=True
            ),
            User(
                name="Eng. Sofia Tembe",
                email="sofia.tembe@lecasu.co.mz",
                phone="+258 86 333 1122",
                role="engenheiro",
                is_active=True
            ),
        ]
        for m in default_members:
            db.add(m)
        db.commit()

@router.get('/team/technicians', response_model=List[TechnicianResponse], summary='Listar técnicos e colaboradores operacionais')
def list_technicians(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.name.asc()).all()
    if not users:
        seed_default_technicians_if_empty(db)
        users = db.query(User).order_by(User.name.asc()).all()

    # Optimized Single Aggregation Query for all users' task counts (Eliminating N+1 queries)
    task_counts_raw = (
        db.query(
            Task.assigned_to,
            func.coalesce(func.sum(case((Task.status.in_(['TODO', 'IN_PROGRESS']), 1), else_=0)), 0).label('active_count'),
            func.coalesce(func.sum(case((Task.status == 'DONE', 1), else_=0)), 0).label('completed_count')
        )
        .filter(Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .all()
    )

    counts_map = {
        row.assigned_to: (int(row.active_count), int(row.completed_count))
        for row in task_counts_raw
    }

    technicians: List[TechnicianResponse] = []
    for u in users:
        active_count, completed_count = counts_map.get(u.id, (0, 0))
        technicians.append(
            TechnicianResponse(
                id=u.id,
                name=u.name,
                email=u.email,
                phone=u.phone,
                role=u.role,
                is_active=u.is_active if u.is_active is not None else True,
                active_tasks_count=active_count,
                completed_tasks_count=completed_count,
                created_at=u.created_at
            )
        )

    return technicians

@router.get('/team/overview', response_model=TeamOverviewKPIs, summary='KPIs do domínio de Equipa Técnica')
def get_team_overview(db: Session = Depends(get_db)):
    total_technicians = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    in_progress_tasks = db.query(func.count(Task.id)).filter(Task.status.in_(['TODO', 'IN_PROGRESS'])).scalar() or 0

    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year

    completed_tasks_this_month = db.query(func.count(Task.id)).filter(
        Task.status == 'DONE',
        extract('month', Task.created_at) == current_month,
        extract('year', Task.created_at) == current_year
    ).scalar() or 0

    return TeamOverviewKPIs(
        total_technicians=total_technicians,
        in_progress_tasks=in_progress_tasks,
        completed_tasks_this_month=completed_tasks_this_month
    )

@router.get('/team/tasks', response_model=List[TeamTaskResponse], summary='Listar intervenções e tarefas técnicas com filtros')
def list_team_tasks(
    technician_id: Optional[int] = Query(None, description='Filtrar por técnico responsável'),
    project_id: Optional[int] = Query(None, description='Filtrar por projeto'),
    status_filter: Optional[str] = Query(None, alias='status', description='Filtrar por status da tarefa'),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Task)
        .options(joinedload(Task.project), joinedload(Task.technician))
        .order_by(
            Task.due_date.is_(None),
            Task.due_date.asc(),
            Task.created_at.desc()
        )
    )

    if technician_id is not None:
        query = query.filter(Task.assigned_to == technician_id)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter.upper())

    tasks = query.all()

    return [
        TeamTaskResponse(
            id=t.id,
            project_id=t.project_id,
            project_name=t.project.name if t.project else None,
            project_code=t.project.code if t.project else None,
            title=t.title,
            description=t.description,
            status=t.status,
            due_date=t.due_date,
            assigned_to=t.assigned_to,
            assigned_technician_name=t.technician.name if t.technician else None,
            created_at=t.created_at
        )
        for t in tasks
    ]

@router.patch('/tasks/{task_id}/assign', response_model=TeamTaskResponse, summary='Alocar ou reatribuir tarefa a um técnico')
def assign_task(
    task_id: int,
    payload: TaskAssignRequest,
    db: Session = Depends(get_db)
):
    task = db.query(Task).options(joinedload(Task.project)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Tarefa técnica com ID {task_id} não foi encontrada.'
        )

    technician = db.query(User).filter(User.id == payload.assigned_to_user_id).first()
    if not technician:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Técnico com ID {payload.assigned_to_user_id} não encontrado.'
        )

    task.assigned_to = technician.id
    db.commit()
    db.refresh(task)

    return TeamTaskResponse(
        id=task.id,
        project_id=task.project_id,
        project_name=task.project.name if task.project else None,
        project_code=task.project.code if task.project else None,
        title=task.title,
        description=task.description,
        status=task.status,
        due_date=task.due_date,
        assigned_to=task.assigned_to,
        assigned_technician_name=technician.name,
        created_at=task.created_at
    )
