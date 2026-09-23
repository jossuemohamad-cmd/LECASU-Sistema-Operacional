from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.models import Project, Task, Proposal, Client
from app.schemas.schemas import (
    ProjectResponse,
    ProjectCreate,
    TaskCreate,
    TaskUpdate,
    TaskResponse
)

router = APIRouter()

def build_project_response(project: Project) -> ProjectResponse:
    total_tasks = len(project.tasks) if project.tasks else 0
    completed_tasks = sum(1 for t in project.tasks if t.status == 'DONE') if project.tasks else 0
    progress_percent = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    return ProjectResponse(
        id=project.id,
        client_id=project.client_id,
        proposal_id=project.proposal_id,
        code=project.code,
        name=project.name,
        status=project.status,
        created_at=project.created_at,
        client_name=project.client.name if project.client else None,
        tasks=[TaskResponse.model_validate(t) for t in (project.tasks or [])],
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        progress_percent=progress_percent
    )

@router.get('/projects', response_model=List[ProjectResponse], summary='Listar todos os projetos')
def list_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .options(joinedload(Project.client), joinedload(Project.tasks))
        .order_by(Project.created_at.desc())
        .all()
    )
    return [build_project_response(p) for p in projects]

@router.get('/projects/{project_id}', response_model=ProjectResponse, summary='Obter detalhes de um projeto')
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .options(joinedload(Project.client), joinedload(Project.tasks))
        .filter(Project.id == project_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Projeto não encontrado.')
    return build_project_response(project)

@router.post('/projects', response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary='Criar projeto manual')
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == project_in.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Cliente não encontrado.')

    year = datetime.utcnow().year
    count = db.query(Project).count() + 1
    code = project_in.code or f"PRJ-{year}-{count:03d}"
    
    while db.query(Project).filter(Project.code == code).first():
        count += 1
        code = f"PRJ-{year}-{count:03d}"

    new_project = Project(
        client_id=project_in.client_id,
        proposal_id=project_in.proposal_id,
        name=project_in.name,
        code=code,
        status=project_in.status or 'IN_PROGRESS'
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Re-fetch with joins
    return get_project(new_project.id, db)

@router.post('/proposals/{proposal_id}/convert-to-project', response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary='Converter proposta em projeto')
def convert_proposal_to_project(proposal_id: int, db: Session = Depends(get_db)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Proposta não encontrada.')

    # Check if already converted
    existing_project = db.query(Project).filter(Project.proposal_id == proposal_id).first()
    if existing_project:
        return get_project(existing_project.id, db)

    # Update proposal status to ACCEPTED
    proposal.status = 'ACCEPTED'

    # Generate sequential unique project code
    year = datetime.utcnow().year
    count = db.query(Project).count() + 1
    code = f"PRJ-{year}-{count:03d}"
    while db.query(Project).filter(Project.code == code).first():
        count += 1
        code = f"PRJ-{year}-{count:03d}"

    # Create new Project
    new_project = Project(
        proposal_id=proposal.id,
        client_id=proposal.client_id,
        name=proposal.title,
        code=code,
        status='IN_PROGRESS'
    )
    db.add(new_project)
    db.flush()

    # Create initial kick-off task for the project
    initial_task = Task(
        project_id=new_project.id,
        title=f"Kick-off & Mobilização: {proposal.title}",
        description=proposal.scope or "Início dos trabalhos operacionais do projeto.",
        status='TODO',
        created_at=datetime.utcnow()
    )
    db.add(initial_task)

    db.commit()
    db.refresh(new_project)

    return get_project(new_project.id, db)

@router.post('/projects/{project_id}/tasks', response_model=TaskResponse, status_code=status.HTTP_201_CREATED, summary='Adicionar tarefa técnica ao projeto')
def create_project_task(project_id: int, task_in: TaskCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Projeto não encontrado.')

    new_task = Task(
        project_id=project_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or 'TODO',
        due_date=task_in.due_date,
        assigned_to=task_in.assigned_to,
        created_at=datetime.utcnow()
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.patch('/tasks/{task_id}', response_model=TaskResponse, summary='Atualizar status ou detalhes da tarefa')
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Tarefa não encontrada.')

    if task_in.title is not None:
        task.title = task_in.title.strip()
    if task_in.description is not None:
        task.description = task_in.description.strip()
    if task_in.status is not None:
        task.status = task_in.status
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.assigned_to is not None:
        task.assigned_to = task_in.assigned_to

    db.commit()
    db.refresh(task)

    # Optional: check if all tasks in project are DONE and update project status
    project = db.query(Project).options(joinedload(Project.tasks)).filter(Project.id == task.project_id).first()
    if project and project.tasks:
        all_done = all(t.status == 'DONE' for t in project.tasks)
        if all_done and project.status == 'IN_PROGRESS':
            project.status = 'COMPLETED'
            db.commit()
        elif not all_done and project.status == 'COMPLETED':
            project.status = 'IN_PROGRESS'
            db.commit()

    return task

@router.delete('/tasks/{task_id}', status_code=status.HTTP_204_NO_CONTENT, summary='Remover tarefa')
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Tarefa não encontrada.')
    db.delete(task)
    db.commit()
    return None
