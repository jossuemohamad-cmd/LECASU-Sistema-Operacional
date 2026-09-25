import sys, ssl, imaplib, email
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('backend')
from app.core.database import SessionLocal
from app.models.models import EmailAccount

db = SessionLocal()
acc = db.query(EmailAccount).first()

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE
mail = imaplib.IMAP4_SSL(acc.incoming_host, 993, ssl_context=context)
mail.login(acc.username, acc.password)
mail.select('INBOX')

status, data = mail.search(None, '(SUBJECT "Ronil")')
msg_ids = data[0].split()
print("Found msg_ids by SUBJECT Ronil:", msg_ids)

if msg_ids:
    res, mdata = mail.fetch(msg_ids[-1], '(RFC822)')
    raw = mdata[0][1]
    parsed = email.message_from_bytes(raw)
    for i, part in enumerate(parsed.walk()):
        ctype = part.get_content_type()
        cid = part.get('Content-ID')
        x_att = part.get('X-Attachment-Id')
        fn = part.get_filename()
        disp = part.get('Content-Disposition')
        cloc = part.get('Content-Location')
        has_payload = bool(part.get_payload(decode=True))
        print(f"Part {i}: CType: {ctype} | CID: {cid} | X-Att: {x_att} | Loc: {cloc} | Fn: {fn} | Disp: {disp} | Payload: {has_payload}")

mail.logout()
db.close()
