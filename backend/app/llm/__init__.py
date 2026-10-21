"""Provedor de IA atrás de `LLMProvider`; prompts versionados em `prompts/`."""

from app.core.config import get_settings
from app.llm.base import LLMProvider
from app.llm.mock import MockProvider
from app.services.erros import ErroNegocio

VERSAO_PROMPT_EXTRACAO = "extracao_v1"


def get_provider() -> LLMProvider:
    nome = get_settings().llm_provider
    if nome == "mock":
        return MockProvider()
    # Provedor real fica para depois do teste comparativo nas transcrições fictícias.
    raise ErroNegocio(f"Provedor de IA '{nome}' ainda não implementado. Use LLM_PROVIDER=mock.", 501)
