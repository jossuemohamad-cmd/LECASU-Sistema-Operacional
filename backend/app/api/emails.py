from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from app.core.database import get_db
from app.models.models import EmailAccount, EmailMessageModel, Client, Proposal
from app.schemas.schemas import (
    EmailAccountConfigSchema,
    EmailSendRequest,
    EmailSyncRequest,
    EmailTestRequest
)
from app.services.email_service import (
    test_smtp_connection,
    test_imap_connection,
    test_pop3_connection,
    send_email_smtp,
    fetch_imap_emails,
    fetch_pop3_emails
)

router = APIRouter(prefix="/emails", tags=["Emails"])

# ================= CONFIGURAÇÃO =================

@router.get("/config", response_model=EmailAccountConfigSchema)
def get_email_config(db: Session = Depends(get_db)):
    """Obtém a configuração ativa de correio da LECASU."""
    account = db.query(EmailAccount).filter(EmailAccount.is_active == True).first()
    if not account:
        # Retorna padrão oficial cPanel LECASU
        return EmailAccountConfigSchema()
    
    return EmailAccountConfigSchema(
        provider=account.provider,
        displayName=account.display_name,
        email=account.email,
        smtpHost=account.smtp_host,
        smtpPort=account.smtp_port,
        smtpSecure=account.smtp_secure,
        incomingType=account.incoming_type,
        incomingHost=account.incoming_host,
        incomingPort=account.incoming_port,
        incomingSecure=account.incoming_secure,
        username=account.username,
        password=account.password,
        isConnected=account.is_active,
        lastSync=account.last_sync.strftime('%d/%m/%Y às %H:%M') if account.last_sync else None
    )

@router.post("/config", response_model=EmailAccountConfigSchema)
def save_email_config(config: EmailAccountConfigSchema, db: Session = Depends(get_db)):
    """Salva ou atualiza a conta de correio ativa no banco de dados."""
    account = db.query(EmailAccount).filter(EmailAccount.email == config.email).first()
    if not account:
        account = EmailAccount(email=config.email)
        db.add(account)

    account.display_name = config.displayName
    account.provider = config.provider
    account.smtp_host = config.smtpHost
    account.smtp_port = config.smtpPort
    account.smtp_secure = config.smtpSecure
    account.incoming_type = config.incomingType
    account.incoming_host = config.incomingHost
    account.incoming_port = config.incomingPort
    account.incoming_secure = config.incomingSecure
    account.username = config.username
    if config.password and config.password != '••••••••••••':
        account.password = config.password
    account.is_active = True
    account.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(account)
    return config

# ================= TESTE DE CONECTIVIDADE =================

@router.post("/test-connection")
def test_connection(req: EmailTestRequest):
    """Testa conexões SMTP e IMAP / POP3 com os servidores de correio."""
    cfg = req.config
    password = cfg.password or ""
    incoming_type = (cfg.incomingType or 'imap').lower()
    
    # 1. Testar Servidor de Envio (SMTP)
    smtp_ok, smtp_msg = test_smtp_connection(
        host=cfg.smtpHost,
        port=cfg.smtpPort,
        secure=cfg.smtpSecure,
        username=cfg.username,
        password=password
    )

    # 2. Testar Servidor de Entrada (IMAP ou POP3)
    if incoming_type == 'pop3':
        inc_ok, inc_msg = test_pop3_connection(
            host=cfg.incomingHost,
            port=cfg.incomingPort or 995,
            secure=cfg.incomingSecure or 'ssl',
            username=cfg.username,
            password=password
        )
    else:
        inc_ok, inc_msg = test_imap_connection(
            host=cfg.incomingHost,
            port=cfg.incomingPort or 993,
            secure=cfg.incomingSecure or 'ssl',
            username=cfg.username,
            password=password
        )

    return {
        "success": smtp_ok and inc_ok,
        "smtp": {
            "success": smtp_ok,
            "message": smtp_msg
        },
        "imap": {
            "success": inc_ok,
            "message": inc_msg
        },
        "incomingType": incoming_type
    }

# ================= ENVIO DE EMAIL =================

@router.post("/send")
def send_email(req: EmailSendRequest, db: Session = Depends(get_db)):
    """Envia um e-mail através do servidor SMTP e registra na base de dados."""
    # Obter credenciais da requisição ou do banco
    cfg = req.config
    password = cfg.password if cfg else None

    if not cfg or not password or password == '••••••••••••':
        saved_account = db.query(EmailAccount).filter(EmailAccount.is_active == True).first()
        if saved_account:
            cfg = EmailAccountConfigSchema(
                provider=saved_account.provider,
                displayName=saved_account.display_name,
                email=saved_account.email,
                smtpHost=saved_account.smtp_host,
                smtpPort=saved_account.smtp_port,
                smtpSecure=saved_account.smtp_secure,
                incomingType=saved_account.incoming_type,
                incomingHost=saved_account.incoming_host,
                incomingPort=saved_account.incoming_port,
                incomingSecure=saved_account.incoming_secure,
                username=saved_account.username,
                password=saved_account.password
            )
            password = saved_account.password

    from_email = cfg.email if cfg else "info@lecasu.co.mz"
    display_name = cfg.displayName if cfg else "LECASU Engenharia & Serviços"

    # Preparar anexo da proposta se houver
    attachments = []
    attached_proposal = None
    if req.proposalId:
        attached_proposal = db.query(Proposal).filter(Proposal.id == req.proposalId).first()
        if attached_proposal:
            # Gerar PDF simulado ou real para anexo
            dummy_pdf_content = f"PROPOSTA COMERCIAL #{attached_proposal.id}\nLECASU ENGENHARIA\nTitulo: {attached_proposal.title}\nValor: {attached_proposal.total_amount} MZN\n".encode('utf-8')
            attachments.append({
                "filename": f"Proposta_{attached_proposal.id}_{attached_proposal.title.replace(' ', '_')}.pdf",
                "content": dummy_pdf_content
            })

    # Tentar envio real via SMTP se senha fornecida
    smtp_sent = False
    smtp_error = ""
    msg_id = f"sent_{int(datetime.utcnow().timestamp())}"

    if cfg and cfg.smtpHost and cfg.username and password and password != '••••••••••••':
        success, message, ext_id = send_email_smtp(
            smtp_host=cfg.smtpHost,
            smtp_port=cfg.smtpPort,
            smtp_secure=cfg.smtpSecure,
            username=cfg.username,
            password=password,
            from_email=from_email,
            display_name=display_name,
            to_email=req.to,
            subject=req.subject,
            body_text=req.body,
            cc=req.cc,
            attachments=attachments
        )
        if success:
            smtp_sent = True
            msg_id = ext_id
        else:
            smtp_error = message
    else:
        smtp_error = "Credenciais SMTP não configuradas ou senha em branco. E-mail registrado nos Enviados do sistema."

    # Encontrar cliente correspondente
    client = None
    if req.clientId:
        client = db.query(Client).filter(Client.id == req.clientId).first()
    elif req.to:
        client = db.query(Client).filter(Client.email == req.to.strip()).first()

    # Salvar nos Enviados no banco de dados
    attachments_meta = []
    if attachments:
        for a in attachments:
            attachments_meta.append({
                "filename": a["filename"],
                "size_bytes": len(a["content"])
            })

    email_record = EmailMessageModel(
        external_id=msg_id,
        client_id=client.id if client else None,
        proposal_id=req.proposalId,
        folder='sent',
        from_email=from_email,
        from_name=display_name,
        to_email=req.to,
        cc=req.cc,
        subject=req.subject,
        body_text=req.body,
        is_read=True,
        has_attachment=len(attachments_meta) > 0,
        attachments_json=json.dumps(attachments_meta) if attachments_meta else None,
        date=datetime.utcnow()
    )
    db.add(email_record)
    db.commit()
    db.refresh(email_record)

    return {
        "success": True,
        "smtp_sent": smtp_sent,
        "message": "E-mail enviado com sucesso via servidor SMTP!" if smtp_sent else "E-mail registrado nos Enviados com sucesso!",
        "smtp_warning": smtp_error if not smtp_sent else None,
        "email": {
            "id": f"msg_{email_record.id}",
            "clientId": email_record.client_id,
            "clientName": client.name if client else req.to,
            "from": email_record.from_email,
            "to": email_record.to_email,
            "cc": email_record.cc,
            "subject": email_record.subject,
            "body": email_record.body_text,
            "date": email_record.date.isoformat(),
            "isRead": True,
            "hasAttachment": email_record.has_attachment,
            "folder": "sent",
            "attachedProposalId": email_record.proposal_id
        }
    }

# ================= SINCRONIZAÇÃO / RECEBIMENTO IMAP =================

@router.post("/sync")
def sync_emails(req: EmailSyncRequest, db: Session = Depends(get_db)):
    """Sincroniza os e-mails da caixa de correio através do protocolo IMAP."""
    cfg = req.config
    password = cfg.password if cfg else None

    if not cfg or not password or password == '••••••••••••':
        saved_account = db.query(EmailAccount).filter(EmailAccount.is_active == True).first()
        if saved_account:
            cfg = EmailAccountConfigSchema(
                provider=saved_account.provider,
                displayName=saved_account.display_name,
                email=saved_account.email,
                smtpHost=saved_account.smtp_host,
                smtpPort=saved_account.smtp_port,
                smtpSecure=saved_account.smtp_secure,
                incomingType=saved_account.incoming_type,
                incomingHost=saved_account.incoming_host,
                incomingPort=saved_account.incoming_port,
                incomingSecure=saved_account.incoming_secure,
                username=saved_account.username,
                password=saved_account.password
            )
            password = saved_account.password

    incoming_connected = False
    incoming_message = ""
    synced_count = 0
    incoming_type = (cfg.incomingType or 'imap').lower() if cfg else 'imap'

    if cfg and cfg.incomingHost and cfg.username and password and password != '••••••••••••':
        if incoming_type == 'pop3':
            success, fetched_list, msg = fetch_pop3_emails(
                host=cfg.incomingHost,
                port=cfg.incomingPort or 995,
                secure=cfg.incomingSecure or 'ssl',
                username=cfg.username,
                password=password,
                limit=req.limit or 25
            )
        else:
            success, fetched_list, msg = fetch_imap_emails(
                host=cfg.incomingHost,
                port=cfg.incomingPort or 993,
                secure=cfg.incomingSecure or 'ssl',
                username=cfg.username,
                password=password,
                folder=req.folder or 'INBOX',
                limit=req.limit or 25
            )
        incoming_connected = success
        incoming_message = msg

        if success:
            for item in fetched_list:
                ext_id = item.get("external_id")
                # Verificar se já existe
                existing = db.query(EmailMessageModel).filter(EmailMessageModel.external_id == ext_id).first()
                if not existing:
                    # Encontrar cliente por email
                    client = db.query(Client).filter(Client.email == item["from"]).first()
                    new_email = EmailMessageModel(
                        external_id=ext_id,
                        client_id=client.id if client else None,
                        folder='inbox',
                        from_email=item["from"],
                        from_name=item["clientName"],
                        to_email=item["to"],
                        cc=item.get("cc"),
                        subject=item["subject"],
                        body_text=item["body"],
                        body_html=item.get("bodyHtml"),
                        is_read=False,
                        has_attachment=item["hasAttachment"],
                        attachments_json=json.dumps(item.get("attachments", [])),
                        date=datetime.fromisoformat(item["date"]) if isinstance(item["date"], str) else datetime.utcnow()
                    )
                    db.add(new_email)
                    synced_count += 1
            db.commit()
    else:
        incoming_message = f"Credenciais {incoming_type.upper()} não configuradas. Exibindo mensagens locais salvas no ERP."

    # Atualizar last_sync na conta
    saved_acc = db.query(EmailAccount).filter(EmailAccount.is_active == True).first()
    if saved_acc:
        saved_acc.last_sync = datetime.utcnow()
        db.commit()

    return {
        "success": True,
        "imap_connected": incoming_connected,
        "incoming_connected": incoming_connected,
        "incoming_type": incoming_type,
        "message": incoming_message,
        "new_messages_count": synced_count
    }

# ================= LISTAGEM DE MENSAGENS =================

def seed_initial_emails_if_empty(db: Session):
    count = db.query(EmailMessageModel).count()
    if count == 0:
        c1 = db.query(Client).first()
        p1 = db.query(Proposal).first()
        initial = [
            EmailMessageModel(
                external_id="rc_wo_01914318",
                client_id=c1.id if c1 else None,
                proposal_id=p1.id if p1 else None,
                folder="inbox",
                from_email="sualehe@lecasu.co.mz",
                from_name="Sualehe S. Sualehe",
                to_email="comercial@lecasu.co.mz",
                subject="RE: WO 01914318 Matendene 83830.32",
                body_text="""Prezados Senhores,

Espero que se encontrem bem.

Escrevemos para informar que a obra referente à Montagem e desmontagem de painéis solares na capela de Matendene (5023169-01) foi concluída e entregue com sucesso. Em anexo seguem os documentos necessários:
  • Fatura
  • Cotação
  • Goods and Services Verification – Matendene 2
  • Relatório Fotográfico

Caso seja necessária alguma informação adicional, por favor, não hesitem em contactar-nos. Permanecemos inteiramente à disposição para quaisquer esclarecimentos.

Agradecemos, mais uma vez, a confiança e a parceria.

Com os melhores cumprimentos,""",
                is_read=True,
                has_attachment=True,
                attachments_json=json.dumps([
                    {"filename": "Processo_2_WO_01914318_Matendene_83830.32.pdf", "size_bytes": 826368},
                    {"filename": "Relatorio_Fotografico_Viabilidade_LECASU.pdf", "size_bytes": 1363148}
                ]),
                date=datetime.utcnow()
            ),
            EmailMessageModel(
                external_id="rc_ronil_h100",
                client_id=c1.id if c1 else None,
                folder="inbox",
                from_email="vladmir.naiene@ronil.co.mz",
                from_name="Vladmir Naiene",
                to_email="comercial@lecasu.co.mz",
                subject="A Ronil, Lda. Apresenta Viaturas da Marca Hyundai H100",
                body_text="""Exmos. Senhores da LECASU,

Temos o prazer de apresentar a nova linha de viaturas comerciais para a vossa frota de engenharia. Segue portfólio em anexo.

Cumprimentos,
Vladmir Naiene""",
                is_read=True,
                has_attachment=True,
                attachments_json=json.dumps([
                    {"filename": "Catalogo_Hyundai_H100_LECASU.pdf", "size_bytes": 826368}
                ]),
                date=datetime.utcnow()
            ),
            EmailMessageModel(
                external_id="rc_jeremias_diag",
                folder="inbox",
                from_email="jeremias.como@gmail.com",
                from_name="Jeremias Heigar Como",
                to_email="comercial@lecasu.co.mz",
                subject="Re: [Ext] Autorização para Diagnóstico Técnico de Sistema Solar",
                body_text="""Boa tarde equipa técnica,

Conforme solicitado, autorizamos a deslocação da vossa equipa para o diagnóstico técnico na nossa instalação na Matola.

Obrigado,
Jeremias Como""",
                is_read=True,
                has_attachment=False,
                date=datetime.utcnow()
            )
        ]
        db.add_all(initial)
        db.commit()

@router.get("")
def list_emails(
    folder: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista e-mails registrados no banco de dados."""
    seed_initial_emails_if_empty(db)
    query = db.query(EmailMessageModel)
    if folder and folder != 'all':
        query = query.filter(EmailMessageModel.folder == folder)
    if client_id:
        query = query.filter(EmailMessageModel.client_id == client_id)

    records = query.order_by(EmailMessageModel.date.desc()).all()


    result = []
    for r in records:
        client_name = r.from_name or r.from_email
        if r.client:
            client_name = r.client.name

        proposal_title = None
        proposal_amount = None
        if r.proposal:
            proposal_title = r.proposal.title
            proposal_amount = float(r.proposal.total_amount)

        result.append({
            "id": f"msg_{r.id}",
            "clientId": r.client_id,
            "clientName": client_name,
            "from": r.from_email,
            "to": r.to_email,
            "cc": r.cc,
            "subject": r.subject,
            "body": r.body_text or "",
            "date": r.date.isoformat() if r.date else datetime.utcnow().isoformat(),
            "isRead": r.is_read,
            "hasAttachment": r.has_attachment,
            "folder": r.folder,
            "attachedProposalId": r.proposal_id,
            "attachedProposalTitle": proposal_title,
            "attachedProposalAmount": proposal_amount
        })

    return result

@router.patch("/{id}/read")
def toggle_read(id: str, db: Session = Depends(get_db)):
    """Alterna o status de lido/não lido."""
    raw_id = id.replace("msg_", "").replace("rc_msg_", "")
    try:
        record_id = int(raw_id)
        msg = db.query(EmailMessageModel).filter(EmailMessageModel.id == record_id).first()
        if msg:
            msg.is_read = not msg.is_read
            db.commit()
            return {"success": True, "isRead": msg.is_read}
    except Exception:
        pass
    return {"success": True}

@router.delete("/{id}")
def delete_email(id: str, db: Session = Depends(get_db)):
    """Move para a lixeira ou remove definitivamente."""
    raw_id = id.replace("msg_", "").replace("rc_msg_", "")
    try:
        record_id = int(raw_id)
        msg = db.query(EmailMessageModel).filter(EmailMessageModel.id == record_id).first()
        if msg:
            if msg.folder == 'trash':
                db.delete(msg)
            else:
                msg.folder = 'trash'
            db.commit()
            return {"success": True}
    except Exception:
        pass
    return {"success": True}
