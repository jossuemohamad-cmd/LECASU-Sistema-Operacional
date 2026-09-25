import sys, re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('backend')
from app.core.database import SessionLocal
from app.models.models import EmailMessageModel

db = SessionLocal()
msgs = db.query(EmailMessageModel).all()
pattern = re.compile(r'<img[^>]+src=[\'"]([^\'">]+)[\'"]', re.IGNORECASE)

for m in msgs:
    if m.body_html:
        matches = pattern.findall(m.body_html)
        if matches:
            cids = [s for s in matches if 'cid:' in s.lower()]
            datas = [s for s in matches if s.startswith('data:')]
            https = [s for s in matches if s.startswith('http')]
            others = [s for s in matches if not s.startswith('data:') and not s.startswith('http') and 'cid:' not in s.lower()]
            subj_clean = m.subject.encode('ascii', errors='ignore').decode('ascii')[:30]
            print(f"Msg {m.id} | Subj: {subj_clean} | Total: {len(matches)} | CID: {len(cids)} | Data: {len(datas)} | HTTP: {len(https)} | Other: {len(others)}")
            if cids:
                print("   UNRESOLVED CID:", cids[:5])
            if others:
                print("   OTHER:", others[:5])
db.close()
