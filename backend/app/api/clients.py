from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.core.database import get_db
from app.models.models import Client, Proposal
from app.schemas.schemas import ClientCreate, ClientResponse, ProposalCreate, ProposalResponse

router = APIRouter()

@router.get('/clients', response_model=List[ClientResponse], summary='Listar clientes')
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).options(joinedload(Client.proposals)).order_by(Client.created_at.desc()).all()
    return clients

@router.post('/clients', response_model=ClientResponse, status_code=status.HTTP_201_CREATED, summary='Criar novo cliente')
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    # Check if NUIT already exists if provided
    if client_in.nuit:
        existing_nuit = db.query(Client).filter(Client.nuit == client_in.nuit).first()
        if existing_nuit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Já existe um cliente cadastrado com o NUIT {client_in.nuit}.'
            )

    # Check if Email already exists if provided
    if client_in.email:
        existing_email = db.query(Client).filter(Client.email == client_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f'Já existe um cliente cadastrado com o e-mail {client_in.email}.'
            )

    new_client = Client(
        name=client_in.name,
        contact_person=client_in.contact_person,
        email=client_in.email,
        phone=client_in.phone,
        nuit=client_in.nuit,
        address=client_in.address
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client

@router.get('/clients/{client_id}', response_model=ClientResponse, summary='Obter detalhes do cliente')
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).options(joinedload(Client.proposals)).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Cliente não encontrado.')
    return client

@router.post('/proposals', response_model=ProposalResponse, status_code=status.HTTP_201_CREATED, summary='Criar proposta')
def create_proposal(proposal_in: ProposalCreate, db: Session = Depends(get_db)):
    # Verify client exists
    client = db.query(Client).filter(Client.id == proposal_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f'Cliente com ID {proposal_in.client_id} não foi encontrado.'
        )

    new_proposal = Proposal(
        client_id=proposal_in.client_id,
        title=proposal_in.title,
        scope=proposal_in.scope,
        total_amount=proposal_in.total_amount,
        status=proposal_in.status or 'DRAFT'
    )
    db.add(new_proposal)
    db.commit()
    db.refresh(new_proposal)
    return new_proposal

@router.get('/proposals', response_model=List[ProposalResponse], summary='Listar propostas')
def list_proposals(db: Session = Depends(get_db)):
    proposals = db.query(Proposal).order_by(Proposal.created_at.desc()).all()
    return proposals
