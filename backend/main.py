import os
import sys

# Garantir importação correta de módulos da aplicação no Vercel Serverless
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

__all__ = ["app"]
