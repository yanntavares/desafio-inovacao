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
    if nome == "anthropic":
        from app.llm.anthropic import AnthropicProvider
        return AnthropicProvider()
    raise ErroNegocio(f"Provedor de IA '{nome}' não implementado. Use LLM_PROVIDER=mock ou anthropic.", 501)
