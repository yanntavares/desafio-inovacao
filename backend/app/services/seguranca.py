"""Senha (scrypt da stdlib) e token de acesso (JWT)."""

import hashlib
import hmac
import os
import re
from datetime import timedelta

import jwt

from app.core.config import get_settings
from app.models.base import agora
from app.services.erros import ErroNegocio

_N, _R, _P = 2**14, 8, 1


def validar_forca_senha(senha: str) -> None:
    minimo = get_settings().senha_minimo
    if len(senha) < minimo or not re.search(r"[A-Za-z]", senha) or not re.search(r"\d", senha):
        raise ErroNegocio(f"A senha precisa ter no mínimo {minimo} caracteres, com letras e números.")


def hash_senha(senha: str) -> str:
    sal = os.urandom(16)
    h = hashlib.scrypt(senha.encode(), salt=sal, n=_N, r=_R, p=_P)
    return f"scrypt${sal.hex()}${h.hex()}"


def verificar_senha(senha: str, armazenado: str | None) -> bool:
    if not armazenado:
        return False
    try:
        _, sal, esperado = armazenado.split("$")
        h = hashlib.scrypt(senha.encode(), salt=bytes.fromhex(sal), n=_N, r=_R, p=_P)
    except ValueError:
        return False
    return hmac.compare_digest(h.hex(), esperado)


def criar_token(usuario_id: int) -> str:
    cfg = get_settings()
    exp = agora() + timedelta(minutes=cfg.jwt_expira_minutos)
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, cfg.jwt_secret, algorithm="HS256")


def ler_token(token: str) -> int:
    try:
        dados = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
        return int(dados["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise ErroNegocio("Sessão inválida ou expirada. Entre novamente.", 401, "nao_autenticado")
