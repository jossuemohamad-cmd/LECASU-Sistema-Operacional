from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey, DateTime, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(50), default='tecnico', index=True)  # admin, direcao, financeiro, tecnico, engenheiro
    is_active = Column(Boolean, default=True, index=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tasks = relationship('Task', back_populates='technician')


class Client(Base):
    __tablename__ = 'clients'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    contact_person = Column(String(100))
    email = Column(String(150), index=True)
    phone = Column(String(50))
    nuit = Column(String(50), index=True)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    proposals = relationship('Proposal', back_populates='client')
    projects = relationship('Project', back_populates='client')

class Proposal(Base):
    __tablename__ = 'proposals'
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    scope = Column(Text)
    total_amount = Column(Numeric(14, 2), default=0.00)
    status = Column(String(50), default='DRAFT', index=True)  # DRAFT, SENT, ACCEPTED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship('Client', back_populates='proposals')
    project = relationship('Project', back_populates='proposal', uselist=False)

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id'), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    status = Column(String(50), default='IN_PROGRESS', index=True)  # PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
    created_at = Column(DateTime, default=datetime.utcnow)
    proposal = relationship('Proposal', back_populates='project')
    client = relationship('Client', back_populates='projects')
    tasks = relationship('Task', back_populates='project')

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False, index=True)
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='TODO', index=True)  # TODO, IN_PROGRESS, DONE
    due_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship('Project', back_populates='tasks')
    technician = relationship('User', back_populates='tasks')


class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    status = Column(String(50), default='ISSUED', index=True)  # ISSUED, PAID, CANCELLED
    due_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship('Client')
    project = relationship('Project')

class Service(Base):
    __tablename__ = 'services'
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    category = Column(String(100), default='Geral', index=True)
    description = Column(Text, nullable=True)
    unit = Column(String(20), default='Projeto')
    base_price = Column(Numeric(14, 2), default=0.00)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Supplier(Base):
    __tablename__ = 'suppliers'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    nuit = Column(String(50), nullable=True, index=True)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(150), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    category = Column(String(100), default='Geral', index=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    purchases = relationship('PurchaseOrder', back_populates='supplier')

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True, index=True)
    order_number = Column(String(50), unique=True, index=True)
    description = Column(Text, nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    status = Column(String(50), default='PENDING', index=True)  # PENDING, PAID, CANCELLED
    due_date = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    supplier = relationship('Supplier', back_populates='purchases')
    project = relationship('Project')

class Employee(Base):
    __tablename__ = 'employees'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(150), unique=True, index=True, nullable=True)
    phone = Column(String(50), nullable=True)
    bi_number = Column(String(50), nullable=True, index=True)
    nuit = Column(String(50), nullable=True, index=True)
    department = Column(String(100), default='Engenharia & Operações', index=True)
    position = Column(String(100), default='Técnico', index=True)
    contract_type = Column(String(50), default='Indeterminado')
    base_salary = Column(Numeric(14, 2), default=0.00)
    hire_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    leaves = relationship('EmployeeLeave', back_populates='employee')

class EmployeeLeave(Base):
    __tablename__ = 'employee_leaves'
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False, index=True)
    leave_type = Column(String(50), default='Férias', index=True)  # Férias, Licença Médica, Falta Justificada, Licença de Casamento/Paternidade
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default='PENDING', index=True)  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    employee = relationship('Employee', back_populates='leaves')

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    category = Column(String(100), default='Geral', index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    version = Column(String(20), default='v1.0')
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=True, index=True)
    uploaded_by_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project = relationship('Project')
    client = relationship('Client')
    uploaded_by = relationship('User')

class EmailAccount(Base):
    __tablename__ = 'email_accounts'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    display_name = Column(String(150), default='LECASU - Engenharia & Serviços')
    provider = Column(String(50), default='cpanel')  # cpanel, gmail, office365, custom
    smtp_host = Column(String(150), default='mail.lecasu.co.mz')
    smtp_port = Column(Integer, default=465)
    smtp_secure = Column(String(20), default='ssl')  # ssl, tls, none
    incoming_type = Column(String(20), default='imap')  # imap, pop3
    incoming_host = Column(String(150), default='mail.lecasu.co.mz')
    incoming_port = Column(Integer, default=993)
    incoming_secure = Column(String(20), default='ssl')  # ssl, tls, none
    username = Column(String(150), default='info@lecasu.co.mz')
    password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailMessageModel(Base):
    __tablename__ = 'email_messages'
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True, nullable=True)
    account_id = Column(Integer, ForeignKey('email_accounts.id'), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=True, index=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id'), nullable=True, index=True)
    folder = Column(String(50), default='inbox', index=True)  # inbox, sent, drafts, trash, spam
    from_email = Column(String(255), nullable=False, index=True)
    from_name = Column(String(150), nullable=True)
    to_email = Column(String(255), nullable=False, index=True)
    cc = Column(Text, nullable=True)
    subject = Column(String(500), nullable=False, default='')
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    has_attachment = Column(Boolean, default=False)
    attachments_json = Column(Text, nullable=True)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship('Client')
    proposal = relationship('Proposal')
    account = relationship('EmailAccount')




