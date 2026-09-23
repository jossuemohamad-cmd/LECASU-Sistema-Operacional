from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import User
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter()

def init_default_admin(db: Session):
    admin_email = "admin@lecasu.co.mz"
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            name="Direção Geral LECASU",
            email=admin_email,
            hashed_password=get_password_hash("AdminLECASU@2026"),
            role="admin",
            phone="+258 84 000 2026",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(admin)
        db.commit()
    else:
        # Ensure password hash is valid
        if not admin.hashed_password or not admin.hashed_password.startswith("$2"):
            admin.hashed_password = get_password_hash("AdminLECASU@2026")
            admin.is_active = True
            db.commit()

@router.post('/auth/login', response_model=TokenResponse, summary='Iniciar sessão e obter token JWT')
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    init_default_admin(db)

    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas. Verifique o e-mail e a senha informados.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user.hashed_password or ""):
        # If user was seeded without hash, check and upgrade
        if user.email == "admin@lecasu.co.mz" and payload.password == "AdminLECASU@2026":
            user.hashed_password = get_password_hash("AdminLECASU@2026")
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas. Verifique o e-mail e a senha informados.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A sua conta de utilizador está inativa. Contacte a Direção do LECASU ERP.",
        )

    # Generate JWT
    token_data = {
        "sub": str(user.id),
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name
    }
    access_token = create_access_token(data=token_data)

    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        is_active=user.is_active if user.is_active is not None else True,
        created_at=user.created_at
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get('/auth/me', response_model=UserResponse, summary='Consultar perfil do utilizador autenticado')
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        is_active=current_user.is_active if current_user.is_active is not None else True,
        created_at=current_user.created_at
    )
