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


# ================= SERVICES =================
class ServiceCreate(BaseModel):
    code: Optional[str] = None
    name: str
    category: Optional[str] = 'Geral'
    description: Optional[str] = None
    unit: Optional[str] = 'Projeto'
    base_price: float = 0.0
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O nome do serviço deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('base_price')
    @classmethod
    def validate_base_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError('O preço base não pode ser negativo.')
        return v

class ServiceUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError('O nome do serviço deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('base_price')
    @classmethod
    def validate_base_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError('O preço base não pode ser negativo.')
        return v

class ServiceResponse(BaseModel):
    id: int
    code: Optional[str] = None
    name: str
    category: str
    description: Optional[str] = None
    unit: str
    base_price: float
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ServiceOverviewKPIs(BaseModel):
    total_services: int
    active_categories_count: int
    average_base_price: float


# ================= USERS & AUTHENTICATION =================
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or '@' not in v:
            raise ValueError('Informe um endereço de e-mail válido.')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "tecnico"
    phone: Optional[str] = None
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O nome deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r'^[\w.-]+@[\w.-]+\.\w+$', v):
            raise ValueError('O endereço de e-mail informado é inválido.')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('A senha deve conter no mínimo 6 caracteres.')
        return v

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> str:
        role = (v or 'tecnico').strip().lower()
        valid_roles = ['admin', 'direcao', 'financeiro', 'tecnico', 'engenheiro']
        if role not in valid_roles:
            raise ValueError(f"Perfil inválido. Perfis permitidos: {', '.join(valid_roles)}.")
        return role

class UserUpdateStatus(BaseModel):
    is_active: bool

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or '@' not in v:
            raise ValueError('Informe um endereço de e-mail válido.')
        return v

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or '@' not in v:
            raise ValueError('Informe um endereço de e-mail válido.')
        return v

    @field_validator('token')
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 4:
            raise ValueError('Código de recuperação inválido.')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('A nova palavra-passe deve conter no mínimo 6 caracteres.')
        return v

class AdminResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('A nova palavra-passe deve conter no mínimo 6 caracteres.')
        return v

class GenericMessageResponse(BaseModel):
    message: str
    status: str = "success"
    temp_code: Optional[str] = None


# ================= SUPPLIERS & PURCHASES =================
class SupplierCreate(BaseModel):
    name: str
    nuit: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = 'Geral'
    address: Optional[str] = None
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O nome do fornecedor deve ter no mínimo 2 caracteres.')
        return v

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    nuit: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(BaseModel):
    id: int
    name: str
    nuit: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: str
    address: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    purchases_count: int = 0
    total_spent: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    project_id: Optional[int] = None
    description: str
    total_amount: float
    due_date: Optional[datetime] = None

    @field_validator('description')
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('A descrição da compra deve ter no mínimo 3 caracteres.')
        return v

    @field_validator('total_amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('O valor total da compra deve ser maior que zero.')
        return v

class PurchaseOrderResponse(BaseModel):
    id: int
    supplier_id: int
    project_id: Optional[int] = None
    order_number: str
    description: str
    total_amount: float
    status: str
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    supplier_name: Optional[str] = None
    supplier_category: Optional[str] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SupplierOverviewKPIs(BaseModel):
    total_suppliers: int
    active_suppliers_count: int
    pending_amount_mzn: float
    paid_amount_mzn: float
    total_purchases_count: int
    pending_orders_count: int


# ================= RECURSOS HUMANOS (HR) =================
class EmployeeCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    bi_number: Optional[str] = None
    nuit: Optional[str] = None
    department: Optional[str] = 'Engenharia & Operações'
    position: Optional[str] = 'Técnico'
    contract_type: Optional[str] = 'Indeterminado'
    base_salary: float = 0.0
    hire_date: Optional[datetime] = None
    is_active: bool = True

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError('O nome do colaborador deve ter no mínimo 2 caracteres.')
        return v

    @field_validator('base_salary')
    @classmethod
    def validate_salary(cls, v: float) -> float:
        if v < 0:
            raise ValueError('O salário base não pode ser negativo.')
        return v

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bi_number: Optional[str] = None
    nuit: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    contract_type: Optional[str] = None
    base_salary: Optional[float] = None
    hire_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    bi_number: Optional[str] = None
    nuit: Optional[str] = None
    department: str
    position: str
    contract_type: str
    base_salary: float
    hire_date: Optional[datetime] = None
    is_active: bool
    created_at: Optional[datetime] = None
    active_leaves_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class LeaveCreate(BaseModel):
    employee_id: int
    leave_type: Optional[str] = 'Férias'
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None

class LeaveApproveRequest(BaseModel):
    status: str  # APPROVED, REJECTED

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ['APPROVED', 'REJECTED', 'PENDING']:
            raise ValueError("O status deve ser 'APPROVED', 'REJECTED' ou 'PENDING'.")
        return v

class LeaveResponse(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    employee_name: Optional[str] = None
    employee_department: Optional[str] = None
    employee_position: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class HROverviewKPIs(BaseModel):
    total_employees: int
    active_employees_count: int
    active_departments_count: int
    on_leave_count: int
    monthly_payroll_mzn: float


# ================= GED - GESTÃO ELETRÓNICA DE DOCUMENTOS =================
class DocumentResponse(BaseModel):
    id: int
    title: str
    category: str
    file_name: str
    file_path: str
    file_size_bytes: int
    file_size_formatted: Optional[str] = None
    mime_type: Optional[str] = None
    version: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    uploaded_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    project_name: Optional[str] = None
    project_code: Optional[str] = None
    client_name: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class GEDOverviewKPIs(BaseModel):
    total_documents: int
    active_categories_count: int
    total_storage_bytes: int
    total_storage_formatted: str
    monthly_uploads_count: int


# ================= GESTÃO FINANCEIRA (INVOICES & FINANCE) =================
class InvoiceCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount: float
    due_date: Optional[datetime] = None
    status: Optional[str] = 'ISSUED'

    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('O valor da fatura deve ser maior que zero.')
        return round(v, 2)

class InvoiceResponse(BaseModel):
    id: int
    client_id: int
    project_id: Optional[int] = None
    invoice_number: str
    amount: float
    status: str
    due_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    client_name: Optional[str] = None
    project_code: Optional[str] = None
    project_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class FinanceOverviewKPIs(BaseModel):
    total_invoiced: float
    total_received: float
    pending_receivables: float
    total_expenses: float
    net_cashflow: float
    issued_invoices_count: int
    paid_invoices_count: int


