import os
import shutil
import uuid
import mimetypes
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract

from app.core.database import get_db
from app.models.models import Document, Project, Client, User
from app.core.security import get_current_user
from app.schemas.schemas import DocumentResponse, GEDOverviewKPIs, GenericMessageResponse
from app.services.storage import (
    upload_file_to_s3,
    generate_presigned_url,
    delete_file_from_s3,
    test_storage_connection
)

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


@router.get('/ged/storage-health', summary='Status de Conexão com Neon S3 Storage')
def check_storage_health():
    """
    Verifica se o Neon S3 Object Storage está ativo e operacional.
    """
    return test_storage_connection()


@router.get('/ged/documents', response_model=List[DocumentResponse], summary='Listar documentos do repositório GED')
def list_documents(
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    client_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(Document)
        .options(
            joinedload(Document.project),
            joinedload(Document.client),
            joinedload(Document.uploaded_by)
        )
    )

    if category and category.strip() and category.upper() != 'ALL':
        query = query.filter(Document.category == category.strip())
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if client_id:
        query = query.filter(Document.client_id == client_id)
    if search and search.strip():
        search_clean = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Document.title).like(search_clean) | 
            func.lower(Document.file_name).like(search_clean) |
            func.lower(Document.description).like(search_clean)
        )

    documents = query.order_by(Document.id.desc()).all()

    return [
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
        for doc in documents
    ]


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="O título do documento é obrigatório.")

    # Validate project / client if provided
    proj_name, proj_code, cl_name = None, None, None
    if project_id:
        proj = db.query(Project).filter(Project.id == project_id).first()
        if not proj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projeto associado não encontrado.")
        proj_name = proj.name
        proj_code = proj.code

    if client_id:
        cl = db.query(Client).filter(Client.id == client_id).first()
        if not cl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente associado não encontrado.")
        cl_name = cl.name

    # Generate unique storage filename
    original_filename = file.filename or "documento"
    _, ext = os.path.splitext(original_filename)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    s3_key = f"ged/{category.lower().replace(' ', '_')}/{unique_name}"
    local_destination_path = os.path.join(UPLOAD_DIR, unique_name)

    # Read file content into memory
    file_bytes = await file.read()
    file_size = len(file_bytes)
    mime_type, _ = mimetypes.guess_type(original_filename)
    content_type = mime_type or file.content_type or "application/octet-stream"

    # 1. Upload directly to Neon S3 Object Storage
    try:
        upload_file_to_s3(
            file_bytes=file_bytes,
            key=s3_key,
            content_type=content_type
        )
        stored_path = s3_key
    except Exception:
        stored_path = unique_name

    # 2. Local disk backup
    try:
        with open(local_destination_path, "wb") as buffer:
            buffer.write(file_bytes)
    except Exception:
        pass

    new_doc = Document(
        title=title.strip(),
        category=category.strip() if category else 'Geral',
        file_name=original_filename,
        file_path=stored_path,
        file_size_bytes=file_size,
        mime_type=content_type,
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
        project_name=proj_name,
        project_code=proj_code,
        client_name=cl_name,
        uploaded_by_name=current_user.name,
        download_url=f"/api/v1/ged/documents/{new_doc.id}/download"
    )


@router.get('/ged/documents/{document_id}/presigned-url', summary='Obter URL assinada temporária S3')
def get_document_presigned_url(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado.")

    try:
        url = generate_presigned_url(doc.file_path, expires_in=3600)
        return {"presigned_url": url, "expires_in": 3600, "file_name": doc.file_name}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Falha ao gerar URL assinada: {str(e)}")


@router.get('/ged/documents/{document_id}/download', summary='Descarregar arquivo do GED')
def download_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado.")

    # If file is stored in S3, redirect directly to presigned URL
    if doc.file_path.startswith("ged/") or "/" in doc.file_path:
        try:
            s3_url = generate_presigned_url(doc.file_path, expires_in=3600)
            return RedirectResponse(url=s3_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
        except Exception:
            pass

    # Fallback local file
    filename_only = os.path.basename(doc.file_path)
    file_path = os.path.join(UPLOAD_DIR, filename_only)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo físico não encontrado no servidor.")

    return FileResponse(
        path=file_path,
        filename=doc.file_name,
        media_type=doc.mime_type or "application/octet-stream"
    )


@router.delete('/ged/documents/{document_id}', response_model=GenericMessageResponse, summary='Excluir documento do repositório')
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado.")

    # Remove from S3
    try:
        delete_file_from_s3(doc.file_path)
    except Exception:
        pass

    # Remove physical file if exists
    filename_only = os.path.basename(doc.file_path)
    file_path = os.path.join(UPLOAD_DIR, filename_only)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    return GenericMessageResponse(
        message=f"Documento '{doc.title}' removido com sucesso.",
        success=True
    )


@router.get('/ged/overview', response_model=GEDOverviewKPIs, summary='KPIs consolidados do Repositório GED')
def get_ged_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = (
        db.query(
            func.count(Document.id).label('total_docs'),
            func.count(func.distinct(Document.category)).label('categories_count'),
            func.coalesce(func.sum(Document.file_size_bytes), 0).label('total_bytes')
        )
        .first()
    )

    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year

    monthly_uploads = db.query(func.count(Document.id)).filter(
        extract('month', Document.created_at) == current_month,
        extract('year', Document.created_at) == current_year
    ).scalar() or 0

    total_bytes = int(stats.total_bytes if stats else 0)

    return GEDOverviewKPIs(
        total_documents=int(stats.total_docs if stats else 0),
        active_categories_count=int(stats.categories_count if stats else 0),
        total_storage_bytes=total_bytes,
        total_storage_formatted=format_file_size(total_bytes),
        monthly_uploads_count=monthly_uploads
    )
