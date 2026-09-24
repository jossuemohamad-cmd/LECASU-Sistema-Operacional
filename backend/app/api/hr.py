from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Employee, EmployeeLeave, User
from app.core.security import get_current_user
from app.schemas.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    LeaveCreate,
    LeaveApproveRequest,
    LeaveResponse,
    HROverviewKPIs
)

router = APIRouter()

# ================= COLABORADORES (EMPLOYEES) =================

@router.get('/hr/employees', response_model=List[EmployeeResponse], summary='Listar colaboradores da empresa')
def list_employees(
    department: Optional[str] = None,
    active_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)
    if active_only:
        query = query.filter(Employee.is_active == True)

    employees = query.order_by(Employee.name.asc()).all()

    now = datetime.utcnow()
    results = []
    for emp in employees:
        active_leaves_count = db.query(EmployeeLeave).filter(
            EmployeeLeave.employee_id == emp.id,
            EmployeeLeave.status == 'APPROVED',
            EmployeeLeave.end_date >= now
        ).count()

        results.append(
            EmployeeResponse(
                id=emp.id,
                name=emp.name,
                email=emp.email,
                phone=emp.phone,
                bi_number=emp.bi_number,
                nuit=emp.nuit,
                department=emp.department or 'Geral',
                position=emp.position or 'Colaborador',
                contract_type=emp.contract_type or 'Indeterminado',
                base_salary=float(emp.base_salary or 0),
                hire_date=emp.hire_date,
                is_active=emp.is_active if emp.is_active is not None else True,
                created_at=emp.created_at,
                active_leaves_count=active_leaves_count
            )
        )
    return results


@router.post('/hr/employees', response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED, summary='Cadastrar novo colaborador')
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name_clean = payload.name.strip()
    email_clean = payload.email.strip().lower() if payload.email else None

    if email_clean:
        existing = db.query(Employee).filter(func.lower(Employee.email) == email_clean).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um colaborador cadastrado com o e-mail '{email_clean}'."
            )

    new_emp = Employee(
        name=name_clean,
        email=email_clean,
        phone=payload.phone.strip() if payload.phone else None,
        bi_number=payload.bi_number.strip() if payload.bi_number else None,
        nuit=payload.nuit.strip() if payload.nuit else None,
        department=payload.department.strip() if payload.department else 'Engenharia & Operações',
        position=payload.position.strip() if payload.position else 'Técnico',
        contract_type=payload.contract_type.strip() if payload.contract_type else 'Indeterminado',
        base_salary=payload.base_salary,
        hire_date=payload.hire_date or datetime.utcnow(),
        is_active=payload.is_active,
        created_at=datetime.utcnow()
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)

    return EmployeeResponse(
        id=new_emp.id,
        name=new_emp.name,
        email=new_emp.email,
        phone=new_emp.phone,
        bi_number=new_emp.bi_number,
        nuit=new_emp.nuit,
        department=new_emp.department,
        position=new_emp.position,
        contract_type=new_emp.contract_type,
        base_salary=float(new_emp.base_salary or 0),
        hire_date=new_emp.hire_date,
        is_active=new_emp.is_active,
        created_at=new_emp.created_at,
        active_leaves_count=0
    )


@router.patch('/hr/employees/{employee_id}/status', response_model=EmployeeResponse, summary='Ativar ou desativar colaborador')
def toggle_employee_status(
    employee_id: int,
    is_active: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colaborador não encontrado."
        )

    emp.is_active = is_active
    db.commit()
    db.refresh(emp)

    now = datetime.utcnow()
    active_leaves_count = db.query(EmployeeLeave).filter(
        EmployeeLeave.employee_id == emp.id,
        EmployeeLeave.status == 'APPROVED',
        EmployeeLeave.end_date >= now
    ).count()

    return EmployeeResponse(
        id=emp.id,
        name=emp.name,
        email=emp.email,
        phone=emp.phone,
        bi_number=emp.bi_number,
        nuit=emp.nuit,
        department=emp.department,
        position=emp.position,
        contract_type=emp.contract_type,
        base_salary=float(emp.base_salary or 0),
        hire_date=emp.hire_date,
        is_active=emp.is_active,
        created_at=emp.created_at,
        active_leaves_count=active_leaves_count
    )


# ================= PRESENÇAS E LICENÇAS (LEAVES) =================

@router.get('/hr/leaves', response_model=List[LeaveResponse], summary='Listar pedidos de férias e ausências')
def list_leaves(
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmployeeLeave)
    if employee_id:
        query = query.filter(EmployeeLeave.employee_id == employee_id)
    if status_filter:
        query = query.filter(EmployeeLeave.status == status_filter)

    leaves = query.order_by(EmployeeLeave.id.desc()).all()

    results = []
    for l in leaves:
        emp_name = l.employee.name if l.employee else None
        emp_dept = l.employee.department if l.employee else None
        emp_pos = l.employee.position if l.employee else None

        results.append(
            LeaveResponse(
                id=l.id,
                employee_id=l.employee_id,
                leave_type=l.leave_type,
                start_date=l.start_date,
                end_date=l.end_date,
                reason=l.reason,
                status=l.status,
                created_at=l.created_at,
                employee_name=emp_name,
                employee_department=emp_dept,
                employee_position=emp_pos
            )
        )
    return results


@router.post('/hr/leaves', response_model=LeaveResponse, status_code=status.HTTP_201_CREATED, summary='Registar pedido de férias ou licença')
def create_leave(
    payload: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Colaborador selecionado não encontrado."
        )

    new_leave = EmployeeLeave(
        employee_id=payload.employee_id,
        leave_type=payload.leave_type or 'Férias',
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip() if payload.reason else None,
        status='PENDING',
        created_at=datetime.utcnow()
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)

    return LeaveResponse(
        id=new_leave.id,
        employee_id=new_leave.employee_id,
        leave_type=new_leave.leave_type,
        start_date=new_leave.start_date,
        end_date=new_leave.end_date,
        reason=new_leave.reason,
        status=new_leave.status,
        created_at=new_leave.created_at,
        employee_name=emp.name,
        employee_department=emp.department,
        employee_position=emp.position
    )


@router.patch('/hr/leaves/{leave_id}/approve', response_model=LeaveResponse, summary='Aprovar ou rejeitar pedido de ausência')
def approve_leave(
    leave_id: int,
    payload: LeaveApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido de licença/ausência não encontrado."
        )

    leave.status = payload.status
    db.commit()
    db.refresh(leave)

    emp_name = leave.employee.name if leave.employee else None
    emp_dept = leave.employee.department if leave.employee else None
    emp_pos = leave.employee.position if leave.employee else None

    return LeaveResponse(
        id=leave.id,
        employee_id=leave.employee_id,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        reason=leave.reason,
        status=leave.status,
        created_at=leave.created_at,
        employee_name=emp_name,
        employee_department=emp_dept,
        employee_position=emp_pos
    )


# ================= KPIS E OVERVIEW =================

@router.get('/hr/overview', response_model=HROverviewKPIs, summary='KPIs consolidados de Recursos Humanos')
def get_hr_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.is_active == True).all()
    active_count = len(active_employees)

    # Distinct active departments
    distinct_depts = set(emp.department for emp in active_employees if emp.department)
    active_departments_count = len(distinct_depts)

    # Total monthly payroll (MZN)
    monthly_payroll_mzn = sum(float(emp.base_salary or 0) for emp in active_employees)

    # On leave / absent currently
    now = datetime.utcnow()
    on_leave_count = db.query(EmployeeLeave).filter(
        EmployeeLeave.status == 'APPROVED',
        EmployeeLeave.start_date <= now,
        EmployeeLeave.end_date >= now
    ).count()

    return HROverviewKPIs(
        total_employees=total_employees,
        active_employees_count=active_count,
        active_departments_count=active_departments_count,
        on_leave_count=on_leave_count,
        monthly_payroll_mzn=monthly_payroll_mzn
    )
