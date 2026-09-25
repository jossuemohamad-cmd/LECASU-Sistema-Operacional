import smtplib
import imaplib
import poplib
import email
from email.header import decode_header, Header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.utils import formatdate, make_msgid, parseaddr
import ssl
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import os

def clean_header_str(value: Optional[str]) -> str:
    """Decodifica cabeçalhos MIME RFC 2047 em string legível UTF-8."""
    if not value:
        return ""
    try:
        decoded_parts = decode_header(value)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                try:
                    result.append(part.decode(charset or 'utf-8', errors='replace'))
                except Exception:
                    result.append(part.decode('latin1', errors='replace'))
            else:
                result.append(str(part))
        return "".join(result).strip()
    except Exception:
        return str(value)

def parse_email_body(msg: email.message.Message) -> Tuple[str, str, List[Dict[str, Any]]]:
    """Extrai texto simples, html e lista de anexos de uma mensagem MIME."""
    text_content = ""
    html_content = ""
    attachments: List[Dict[str, Any]] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition") or "")
            filename = part.get_filename()

            if filename or "attachment" in content_disposition.lower():
                fn = clean_header_str(filename) or "anexo_desconhecido"
                payload = part.get_payload(decode=True)
                size_bytes = len(payload) if payload else 0
                attachments.append({
                    "filename": fn,
                    "size_bytes": size_bytes,
                    "content_type": content_type
                })
            elif content_type == "text/plain" and not text_content:
                charset = part.get_content_charset() or "utf-8"
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        text_content = payload.decode(charset, errors="replace")
                except Exception:
                    pass
            elif content_type == "text/html" and not html_content:
                charset = part.get_content_charset() or "utf-8"
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        html_content = payload.decode(charset, errors="replace")
                except Exception:
                    pass
    else:
        content_type = msg.get_content_type()
        charset = msg.get_content_charset() or "utf-8"
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                decoded = payload.decode(charset, errors="replace")
                if content_type == "text/html":
                    html_content = decoded
                else:
                    text_content = decoded
        except Exception:
            pass

    return text_content.strip(), html_content.strip(), attachments

def test_smtp_connection(
    host: str,
    port: int,
    secure: str,
    username: str,
    password: str,
    timeout: int = 12
) -> Tuple[bool, str]:
    """Testa a conectividade e autenticação SMTP real."""
    if not host or not username:
        return False, "Host e utilizador SMTP são obrigatórios."

    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if secure.lower() == 'ssl' or port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
        else:
            server = smtplib.SMTP(host, port, timeout=timeout)
            if secure.lower() == 'tls' or port == 587:
                server.starttls(context=context)

        server.ehlo()
        if password:
            server.login(username, password)
        server.quit()
        return True, f"Conexão SMTP com {host}:{port} bem-sucedida!"
    except smtplib.SMTPAuthenticationError as e:
        return False, f"Falha de autenticação SMTP (utilizador ou senha inválidos): {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else str(e)}"
    except smtplib.SMTPConnectError as e:
        return False, f"Falha ao conectar ao servidor SMTP {host}:{port}: {e}"
    except TimeoutError:
        return False, f"Tempo limite esgotado ao conectar ao SMTP {host}:{port}."
    except Exception as e:
        return False, f"Erro SMTP: {str(e)}"

def test_imap_connection(
    host: str,
    port: int,
    secure: str,
    username: str,
    password: str,
    timeout: int = 12
) -> Tuple[bool, str]:
    """Testa a conectividade e autenticação IMAP real."""
    if not host or not username:
        return False, "Host e utilizador IMAP são obrigatórios."

    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if secure.lower() == 'ssl' or port == 993:
            mail = imaplib.IMAP4_SSL(host, port, ssl_context=context)
        else:
            mail = imaplib.IMAP4(host, port)
            if secure.lower() == 'tls':
                mail.starttls(ssl_context=context)

        mail.login(username, password)
        mail.logout()
        return True, f"Conexão IMAP com {host}:{port} bem-sucedida!"
    except imaplib.IMAP4.error as e:
        return False, f"Erro de autenticação IMAP: {str(e)}"
    except TimeoutError:
        return False, f"Tempo limite esgotado ao conectar ao IMAP {host}:{port}."
    except Exception as e:
        return False, f"Erro IMAP: {str(e)}"

def test_pop3_connection(
    host: str,
    port: int,
    secure: str,
    username: str,
    password: str,
    timeout: int = 12
) -> Tuple[bool, str]:
    """Testa a conectividade e autenticação POP3 real."""
    if not host or not username:
        return False, "Host e utilizador POP3 são obrigatórios."

    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if secure.lower() == 'ssl' or port == 995:
            client = poplib.POP3_SSL(host, port, context=context, timeout=timeout)
        else:
            client = poplib.POP3(host, port, timeout=timeout)
            if secure.lower() == 'tls':
                try:
                    client.stls(context=context)
                except Exception:
                    pass

        client.user(username)
        if password:
            client.pass_(password)
        client.quit()
        return True, f"Conexão POP3 com {host}:{port} bem-sucedida!"
    except poplib.error_proto as e:
        return False, f"Falha de autenticação/protocolo POP3: {str(e)}"
    except TimeoutError:
        return False, f"Tempo limite esgotado ao conectar ao POP3 {host}:{port}."
    except Exception as e:
        return False, f"Erro POP3: {str(e)}"

def send_email_smtp(
    smtp_host: str,
    smtp_port: int,
    smtp_secure: str,
    username: str,
    password: str,
    from_email: str,
    display_name: str,
    to_email: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    cc: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
    timeout: int = 15
) -> Tuple[bool, str, str]:
    """Envia um email real através do servidor SMTP configurado."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header(subject, 'utf-8')
        from_display = f"{display_name} <{from_email}>" if display_name else from_email
        msg['From'] = from_display
        msg['To'] = to_email
        msg['Date'] = formatdate(localtime=True)
        message_id = make_msgid(domain='lecasu.co.mz')
        msg['Message-ID'] = message_id

        if cc:
            msg['Cc'] = cc

        # Partes do corpo
        part_text = MIMEText(body_text or '', 'plain', 'utf-8')
        msg.attach(part_text)

        if body_html:
            part_html = MIMEText(body_html, 'html', 'utf-8')
            msg.attach(part_html)

        # Anexos se houver
        if attachments:
            for att in attachments:
                fn = att.get('filename', 'anexo.pdf')
                content = att.get('content') # bytes
                if content:
                    part_att = MIMEApplication(content, Name=fn)
                    part_att['Content-Disposition'] = f'attachment; filename="{fn}"'
                    msg.attach(part_att)

        # Destinatários totais
        recipients = [to_email]
        if cc:
            for c in cc.split(','):
                c_clean = c.strip()
                if c_clean:
                    recipients.append(c_clean)

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if smtp_secure.lower() == 'ssl' or smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=timeout, context=context)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=timeout)
            if smtp_secure.lower() == 'tls' or smtp_port == 587:
                server.starttls(context=context)

        server.ehlo()
        if password:
            server.login(username, password)

        server.sendmail(from_email, recipients, msg.as_string())
        server.quit()

        return True, "E-mail enviado com sucesso via SMTP!", message_id
    except Exception as e:
        return False, f"Falha ao enviar e-mail via SMTP: {str(e)}", ""

def fetch_imap_emails(
    host: str,
    port: int,
    secure: str,
    username: str,
    password: str,
    folder: str = 'INBOX',
    limit: int = 25,
    timeout: int = 15
) -> Tuple[bool, List[Dict[str, Any]], str]:
    """Busca e-mails reais do servidor IMAP."""
    if not host or not username or not password:
        return False, [], "Credenciais IMAP incompletas."

    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if secure.lower() == 'ssl' or port == 993:
            mail = imaplib.IMAP4_SSL(host, port, ssl_context=context)
        else:
            mail = imaplib.IMAP4(host, port)
            if secure.lower() == 'tls':
                mail.starttls(ssl_context=context)

        mail.login(username, password)
        status, _ = mail.select(folder)
        if status != 'OK':
            mail.logout()
            return False, [], f"Não foi possível abrir a pasta '{folder}' no IMAP."

        status, data = mail.search(None, 'ALL')
        if status != 'OK' or not data or not data[0]:
            mail.logout()
            return True, [], "Nenhum e-mail encontrado na pasta."

        msg_ids = data[0].split()
        # Pegar os mais recentes (últimos N IDs em ordem inversa)
        recent_ids = msg_ids[-limit:]
        recent_ids.reverse()

        parsed_emails = []

        for msg_id in recent_ids:
            try:
                res, msg_data = mail.fetch(msg_id, '(RFC822)')
                if res != 'OK' or not msg_data or not msg_data[0]:
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                # Assunto
                subject = clean_header_str(msg.get("Subject"))
                
                # De
                from_raw = clean_header_str(msg.get("From"))
                name, from_email = parseaddr(from_raw)
                client_name = name or from_email

                # Para
                to_raw = clean_header_str(msg.get("To"))
                _, to_email = parseaddr(to_raw)

                # CC
                cc_raw = clean_header_str(msg.get("Cc"))

                # Data
                date_str = msg.get("Date")
                parsed_date = datetime.utcnow()
                if date_str:
                    try:
                        time_tuple = email.utils.parsedate_tz(date_str)
                        if time_tuple:
                            parsed_date = datetime.fromtimestamp(email.utils.mktime_tz(time_tuple))
                    except Exception:
                        pass

                # Message-ID
                external_id = msg.get("Message-ID") or f"imap_{msg_id.decode()}"

                # Corpo e anexos
                body_text, body_html, attachments = parse_email_body(msg)

                parsed_emails.append({
                    "id": f"imap_{msg_id.decode()}",
                    "external_id": external_id,
                    "from": from_email or from_raw,
                    "clientName": client_name,
                    "to": to_email or to_raw,
                    "cc": cc_raw,
                    "subject": subject or "(Sem assunto)",
                    "body": body_text or "(Conteúdo sem texto simples disponível)",
                    "bodyHtml": body_html,
                    "date": parsed_date.isoformat(),
                    "isRead": True, # se buscado já lido
                    "hasAttachment": len(attachments) > 0,
                    "attachments": attachments,
                    "folder": "inbox" if folder.upper() == "INBOX" else "sent"
                })
            except Exception as e:
                print(f"[IMAP Fetch Error] Msg {msg_id}: {e}")
                continue

        mail.close()
        mail.logout()
        return True, parsed_emails, f"{len(parsed_emails)} e-mails sincronizados com sucesso."

    except Exception as e:
        return False, [], f"Falha na sincronização IMAP: {str(e)}"

def fetch_pop3_emails(
    host: str,
    port: int,
    secure: str,
    username: str,
    password: str,
    limit: int = 25,
    timeout: int = 15
) -> Tuple[bool, List[Dict[str, Any]], str]:
    """Busca e-mails reais do servidor POP3."""
    if not host or not username or not password:
        return False, [], "Credenciais POP3 incompletas."

    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if secure.lower() == 'ssl' or port == 995:
            client = poplib.POP3_SSL(host, port, context=context, timeout=timeout)
        else:
            client = poplib.POP3(host, port, timeout=timeout)
            if secure.lower() == 'tls':
                try:
                    client.stls(context=context)
                except Exception:
                    pass

        client.user(username)
        client.pass_(password)

        stat = client.stat()
        num_messages = stat[0]
        if num_messages == 0:
            client.quit()
            return True, [], "Nenhum e-mail encontrado no servidor POP3."

        start_idx = max(1, num_messages - limit + 1)
        parsed_emails = []

        for msg_num in range(num_messages, start_idx - 1, -1):
            try:
                response, lines, octets = client.retr(msg_num)
                raw_bytes = b"\r\n".join(lines)
                msg = email.message_from_bytes(raw_bytes)

                subject = clean_header_str(msg.get("Subject"))
                from_raw = clean_header_str(msg.get("From"))
                name, from_email = parseaddr(from_raw)
                client_name = name or from_email

                to_raw = clean_header_str(msg.get("To"))
                _, to_email = parseaddr(to_raw)

                cc_raw = clean_header_str(msg.get("Cc"))

                date_str = msg.get("Date")
                parsed_date = datetime.utcnow()
                if date_str:
                    try:
                        time_tuple = email.utils.parsedate_tz(date_str)
                        if time_tuple:
                            parsed_date = datetime.fromtimestamp(email.utils.mktime_tz(time_tuple))
                    except Exception:
                        pass

                external_id = msg.get("Message-ID") or f"pop3_{msg_num}"
                body_text, body_html, attachments = parse_email_body(msg)

                parsed_emails.append({
                    "id": f"pop3_{msg_num}",
                    "external_id": external_id,
                    "from": from_email or from_raw,
                    "clientName": client_name,
                    "to": to_email or to_raw,
                    "cc": cc_raw,
                    "subject": subject or "(Sem assunto)",
                    "body": body_text or "(Conteúdo sem texto simples disponível)",
                    "bodyHtml": body_html,
                    "date": parsed_date.isoformat(),
                    "isRead": True,
                    "hasAttachment": len(attachments) > 0,
                    "attachments": attachments,
                    "folder": "inbox"
                })
            except Exception as e:
                print(f"[POP3 Fetch Error] Msg {msg_num}: {e}")
                continue

        client.quit()
        return True, parsed_emails, f"{len(parsed_emails)} e-mails sincronizados com sucesso via POP3."

    except Exception as e:
        return False, [], f"Falha na sincronização POP3: {str(e)}"

