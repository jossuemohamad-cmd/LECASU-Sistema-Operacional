import sys, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('backend')
from app.core.database import SessionLocal
from app.models.models import EmailMessageModel

db = SessionLocal()
msg49 = db.query(EmailMessageModel).filter(EmailMessageModel.id == 49).first()
if msg49:
    print("Subject:", msg49.subject)
    print("External ID:", msg49.external_id)
    # Check for <img tags
    pattern = re.compile(r'<img[^>]+>', re.IGNORECASE)
    imgs = pattern.findall(msg49.body_html or '')
    print(f"Total img tags: {len(imgs)}")
    for img in imgs[:5]:
        print("  Tag:", img)
db.close()
