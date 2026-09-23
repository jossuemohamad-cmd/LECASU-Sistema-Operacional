from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
import re

# ================= PROPOSALS =================
class ProposalBase(BaseModel):
    title: str
    scope: Optional[str] = None
    total_amount: float = 0.0
    status: Optional[str] = 'DRAFT'

class ProposalCreate(BaseModel):
    client_id: int
    title: str
    scope: Optional[str] = None
    total_amount: float = 0.0
    status: Optional[str] = 'DRAFT'

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O título da proposta deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('total_amount')
    @classmethod
    def validate_total_amount(cls, v: float) -> float:
        if v < 0:
            raise ValueError('O valor total não pode ser negativo.')
        return v

class ProposalResponse(BaseModel):
    id: int
    client_id: int
    title: str
    scope: Optional[str] = None
    total_amount: float
    status: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ================= CLIENTS =================
class ClientBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    nuit: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    nuit: Optional[str] = None
    address: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O nome do cliente é obrigatório e deve ter pelo menos 2 caracteres.')
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if v and not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', v):
                raise ValueError('O endereço de e-mail informado é inválido.')
            return v if v else None
        return None

    @field_validator('nuit')
    @classmethod
    def validate_nuit(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if v and len(v) < 5:
                raise ValueError('O NUIT deve ter pelo menos 5 dígitos.')
            return v if v else None
        return None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if v and len(v) < 6:
                raise ValueError('O telefone deve ter pelo menos 6 caracteres.')
            return v if v else None
        return None

class ClientResponse(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    nuit: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None
    proposals: List[ProposalResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ================= TASKS =================
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = 'TODO'
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = 'TODO'
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O título da tarefa deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['TODO', 'IN_PROGRESS', 'DONE']:
            raise ValueError("O status da tarefa deve ser 'TODO', 'IN_PROGRESS' ou 'DONE'.")
        return v or 'TODO'

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in ['TODO', 'IN_PROGRESS', 'DONE']:
            raise ValueError("O status da tarefa deve ser 'TODO', 'IN_PROGRESS' ou 'DONE'.")
        return v

class TaskResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ================= PROJECTS =================
class ProjectBase(BaseModel):
    name: str
    code: Optional[str] = None
    status: Optional[str] = 'IN_PROGRESS'

class ProjectCreate(BaseModel):
    client_id: int
    proposal_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    status: Optional[str] = 'IN_PROGRESS'

class ProjectResponse(BaseModel):
    id: int
    client_id: int
    proposal_id: Optional[int] = None
    code: Optional[str] = None
    name: str
    status: str
    created_at: Optional[datetime] = None
    client_name: Optional[str] = None
    tasks: List[TaskResponse] = []
    total_tasks: int = 0
    completed_tasks: int = 0
    progress_percent: float = 0.0

    model_config = ConfigDict(from_attributes=True)


# ================= INVOICES =================
class InvoiceResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    client_id: int
    invoice_number: Optional[str] = None
    amount: float
    status: str
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    client_name: Optional[str] = None
    project_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ================= DASHBOARD =================
class DashboardKPIs(BaseModel):
    active_clients_count: int
    active_projects_count: int
    open_proposals_count: int = 0
    total_invoiced: float
    total_received: float
    pending_amount: float
    average_project_progress: float

class DashboardRecentProject(BaseModel):
    id: int
    code: Optional[str] = None
    name: str
    client_name: Optional[str] = None
    status: str
    progress_percent: float
    total_tasks: int
    completed_tasks: int
    created_at: Optional[datetime] = None

class DashboardRecentInvoice(BaseModel):
    id: int
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None
    project_code: Optional[str] = None
    amount: float
    status: str
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

class DashboardPendingTask(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None
    created_at: Optional[datetime] = None

class DashboardOverviewResponse(BaseModel):
    kpis: DashboardKPIs
    recent_projects: List[DashboardRecentProject]
    recent_invoices: List[DashboardRecentInvoice]
    pending_tasks: List[DashboardPendingTask]


# ================= TEAM & TECHNICIANS =================
class TechnicianResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    active_tasks_count: int = 0
    completed_tasks_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TaskAssignRequest(BaseModel):
    assigned_to_user_id: int

class TeamTaskResponse(BaseModel):
    id: int
    project_id: int
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    assigned_to: Optional[int] = None
    assigned_technician_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TeamOverviewKPIs(BaseModel):
    total_technicians: int
    in_progress_tasks: int
    completed_tasks_this_month: int


