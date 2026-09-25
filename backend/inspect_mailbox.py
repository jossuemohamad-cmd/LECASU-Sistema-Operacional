import sys, ssl, imaplib, email
from email.utils import parsedate_to_datetime
sys.path.append('backend')
from app.core.database import SessionLocal
from app.models.models import EmailAccount

db = SessionLocal()
acc = db.query(EmailAccount).filter(EmailAccount.is_active == True).first()
if not acc:
    acc = db.query(EmailAccount).first()

context = ssl.create_default_context()
context.check_hostname = False
context.verify_mode = ssl.CERT_NONE
mail = imaplib.IMAP4_SSL(acc.incoming_host, 993, ssl_context=context)
mail.login(acc.username, acc.password)
mail.select('INBOX')
status, data = mail.search(None, 'ALL')
msg_ids = data[0].split()
print(f"Total messages in INBOX on server: {len(msg_ids)}")

if msg_ids:
    # First message date
    _, d0 = mail.fetch(msg_ids[0], '(BODY.PEEK[HEADER.FIELDS (DATE SUBJECT)])')
    # Last message date
    _, d1 = mail.fetch(msg_ids[-1], '(BODY.PEEK[HEADER.FIELDS (DATE SUBJECT)])')
    print("Oldest message header:\n", d0[0][1].decode('latin1', errors='replace').strip())
    print("Newest message header:\n", d1[0][1].decode('latin1', errors='replace').strip())

mail.logout()
db.close()
