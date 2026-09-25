import sys
import os

# Adiciona o diretório atual ao sys.path para importações relativas
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from a2wsgi import ASGIMiddleware
from app.main import app

# Converte o app FastAPI (ASGI) em WSGI compatível com o Phusion Passenger do cPanel
application = ASGIMiddleware(app)
