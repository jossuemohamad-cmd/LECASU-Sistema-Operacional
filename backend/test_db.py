import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
db_url = os.getenv('DATABASE_URL')

try:
    print('Conectando ao PostgreSQL na nuvem...')
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text('SELECT version();'))
        print('\nCONEXAO BEM-SUCEDIDA!')
        print('Versao do PostgreSQL:', res.fetchone()[0])
except Exception as e:
    print('\nErro ao conectar:', e)
