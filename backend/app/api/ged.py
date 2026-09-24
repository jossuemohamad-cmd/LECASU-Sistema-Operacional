import os
import shutil
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import Document, Project, Client, User
from app.core.security import get_current_user
from app.schemas.schemas import DocumentResponse, GEDOverviewKPIs, GenericMessageResponse

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

def format_file_size(size_in_bytes: int) -> str:
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    elif size_in_bytes < 1024 * 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_in_bytes / (1024 * 1024 * 1024):.2f} GB"

@router.get('/ged/documents', response_model=List[DocumentResponse], summary='Listar documentos do repositório GED')
def list_documents(
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)

    if category:
        query = query.filter(Document.category == category)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if client_id:
        query = query.filter(Document.client_id == client_id)
    if search:
        search_clean = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Document.title).like(search_clean) | 
            func.lower(Document.file_name).like(search_clean) |
            func.lower(Document.description).like(search_clean)
        )

    documents = query.order_by(Document.id.desc()).all()

    results = []
    for doc in documents:
        results.append(
            DocumentResponse(
                id=doc.id,
                title=doc.title,
                category=doc.category or 'Geral',
                file_name=doc.file_name,
                file_path=doc.file_path,
                file_size_bytes=doc.file_size_bytes or 0,
                file_size_formatted=format_file_size(doc.file_size_bytes or 0),
                mime_type=doc.mime_type,
                version=doc.version or 'v1.0',
                description=doc.description,
                project_id=doc.project_id,
                client_id=doc.client_id,
                uploaded_by_id=doc.uploaded_by_id,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                project_name=doc.project.name if doc.project else None,
                project_code=doc.project.code if doc.project else None,
                client_name=doc.client.name if doc.client else None,
                uploaded_by_name=doc.uploaded_by.name if doc.uploaded_by else None,
                download_url=f"/api/v1/ged/documents/{doc.id}/download"
            )
        )
    return results


@router.post('/ged/upload', response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, summary='Enviar e armazenar documento no repositório GED')
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form('Geral'),
    version: str = Form('v1.0'),
    description: Optional[str] = Form(None),
    project_id: Optional[int] = Form(None),
    client_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O título do documento é obrigatório."
        )

    # Validate project / client if provided
    if project_id and not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto selecionado não encontrado.")

    if client_id and not db.query(Client).filter(Client.id == client_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente selecionado não encontrado.")

    # Generate unique safe file name
    original_filename = os.path.basename(file.filename or 'documento')
    extension = os.path.splitext(original_filename)[1]
    unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
    saved_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size_bytes = os.path.getsize(saved_file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar o arquivo no servidor: {str(e)}"
        )

    # Guess mime type
    mime_type = file.content_type
    if not mime_type or mime_type == 'application/octet-stream':
        guessed, _ = mimetypes.guess_type(original_filename)
        mime_type = guessed or 'application/octet-stream'

    new_doc = Document(
        title=title.strip(),
        category=category.strip() if category else 'Geral',
        file_name=original_filename,
        file_path=saved_file_path,
        file_size_bytes=file_size_bytes,
        mime_type=mime_type,
        version=version.strip() if version else 'v1.0',
        description=description.strip() if description else None,
        project_id=project_id,
        client_id=client_id,
        uploaded_by_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return DocumentResponse(
        id=new_doc.id,
        title=new_doc.title,
        category=new_doc.category,
        file_name=new_doc.file_name,
        file_path=new_doc.file_path,
        file_size_bytes=new_doc.file_size_bytes,
        file_size_formatted=format_file_size(new_doc.file_size_bytes),
        mime_type=new_doc.mime_type,
        version=new_doc.version,
        description=new_doc.description,
        project_id=new_doc.project_id,
        client_id=new_doc.client_id,
        uploaded_by_id=new_doc.uploaded_by_id,
        created_at=new_doc.created_at,
        updated_at=new_doc.updated_at,
        project_name=new_doc.project.name if new_doc.project else None,
        project_code=new_doc.project.code if new_doc.project else None,
        client_name=new_doc.client.name if new_doc.client else None,
        uploaded_by_name=current_user.name,
        download_url=f"/api/v1/ged/documents/{new_doc.id}/download"
    )


@router.get('/ged/documents/{document_id}/download', summary='Descarregar arquivo do repositório GED')
def download_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado."
        )

    if not os.path.exists(doc.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O arquivo físico não foi encontrado no servidor."
        )

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type or 'application/octet-stream'
    )


@router.delete('/ged/documents/{document_id}', response_model=GenericMessageResponse, summary='Eliminar documento do repositório GED')
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento não encontrado."
        )

    # Remove physical file if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"[GED Warning] Não foi possível remover o arquivo físico: {e}")

    db.delete(doc)
    db.commit()

    return GenericMessageResponse(
        message=f"Documento '{doc.title}' eliminado com sucesso do repositório.",
        status="success"
    )


@router.get('/ged/overview', response_model=GEDOverviewKPIs, summary='KPIs consolidados do Repositório GED')
def get_ged_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    documents = db.query(Document).all()
    total_documents = len(documents)

    distinct_categories = set(d.category for d in documents if d.category)
    active_categories_count = len(distinct_categories)

    total_storage_bytes = sum(int(d.file_size_bytes or 0) for d in documents)
    total_storage_formatted = format_file_size(total_storage_bytes)

    # Monthly uploads count
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)
    monthly_uploads_count = sum(1 for d in documents if d.created_at and d.created_at >= current_month_start)

    return GEDOverviewKPIs(
        total_documents=total_documents,
        active_categories_count=active_categories_count,
        total_storage_bytes=total_storage_bytes,
        total_storage_formatted=total_storage_formatted,
        monthly_uploads_count=monthly_uploads_count
    )
