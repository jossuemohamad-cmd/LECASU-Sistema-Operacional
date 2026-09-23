from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    role = Column(String(50), default='tecnico')  # admin, direcao, financeiro, tecnico, engenheiro
    is_active = Column(Boolean, default=True)
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    tasks = relationship('Task', back_populates='technician')


class Client(Base):
    __tablename__ = 'clients'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100))
    email = Column(String(150))
    phone = Column(String(50))
    nuit = Column(String(50))
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    proposals = relationship('Proposal', back_populates='client')
    projects = relationship('Project', back_populates='client')

class Proposal(Base):
    __tablename__ = 'proposals'
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False)
    title = Column(String(200), nullable=False)
    scope = Column(Text)
    total_amount = Column(Numeric(14, 2), default=0.00)
    status = Column(String(50), default='DRAFT')  # DRAFT, SENT, ACCEPTED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship('Client', back_populates='proposals')
    project = relationship('Project', back_populates='proposal', uselist=False)

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey('proposals.id'), nullable=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    status = Column(String(50), default='IN_PROGRESS')  # PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
    created_at = Column(DateTime, default=datetime.utcnow)
    proposal = relationship('Proposal', back_populates='project')
    client = relationship('Client', back_populates='projects')
    tasks = relationship('Task', back_populates='project')

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='TODO')  # TODO, IN_PROGRESS, DONE
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship('Project', back_populates='tasks')
    technician = relationship('User', back_populates='tasks')


class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True)
    client_id = Column(Integer, ForeignKey('clients.id'), nullable=False)
    invoice_number = Column(String(50), unique=True)
    amount = Column(Numeric(14, 2), nullable=False)
    status = Column(String(50), default='ISSUED')  # ISSUED, PAID, CANCELLED
    due_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    client = relationship('Client')
    project = relationship('Project')

class Service(Base):
    __tablename__ = 'services'
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), default='Geral')
    description = Column(Text, nullable=True)
    unit = Column(String(20), default='Projeto')
    base_price = Column(Numeric(14, 2), default=0.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


