from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.models import User
from app.core.security import get_password_hash, get_current_user
from app.schemas.schemas import UserCreate, UserUpdateStatus, UserResponse, AdminResetPasswordRequest, GenericMessageResponse

router = APIRouter()

@router.get('/users', response_model=List[UserResponse], summary='Listar todos os utilizadores do sistema')
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            phone=u.phone,
            is_active=u.is_active if u.is_active is not None else True,
            created_at=u.created_at
        )
        for u in users
    ]

@router.post('/users', response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary='Cadastrar novo utilizador')
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    email_clean = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um utilizador cadastrado com o e-mail '{email_clean}'."
        )

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name.strip(),
        email=email_clean,
        hashed_password=hashed_pw,
        role=user_in.role.strip().lower(),
        phone=user_in.phone.strip() if user_in.phone else None,
        is_active=user_in.is_active,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        phone=new_user.phone,
        is_active=new_user.is_active,
        created_at=new_user.created_at
    )

@router.patch('/users/{user_id}/status', response_model=UserResponse, summary='Ativar ou desativar utilizador')
def update_user_status(user_id: int, payload: UserUpdateStatus, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizador não encontrado."
        )

    # Prevent deactivating the last active admin
    if not payload.is_active and user.role == 'admin':
        active_admins = db.query(User).filter(User.role == 'admin', User.is_active == True).count()
        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível desativar o único Administrador ativo do sistema."
            )

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        is_active=user.is_active,
        created_at=user.created_at
    )

@router.post('/users/{user_id}/admin-reset-password', response_model=GenericMessageResponse, summary='Redefinição administrativa de senha por um Administrador')
def admin_reset_password(
    user_id: int, 
    payload: AdminResetPasswordRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem redefinir a palavra-passe de utilizadores."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizador não encontrado."
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return GenericMessageResponse(
        message=f"Palavra-passe do utilizador '{user.name}' redefinida com sucesso.",
        status="success"
    )
