"""python -m app.seed: carrega a demonstração."""

from app.core.database import SessionLocal
from app.seed import SENHA_DEMO, recarregar

with SessionLocal() as sessao:
    recarregar(sessao)
print(f"Demonstração carregada. Senha de todos os usuários: {SENHA_DEMO}")
