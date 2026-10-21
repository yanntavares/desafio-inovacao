"""Interface do provedor de IA (RNF-08). O resto do código só conhece `LLMProvider`."""

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

PROMPTS = Path(__file__).parent / "prompts"


@dataclass
class RespostaLLM:
    texto: str  # JSON (extração) ou markdown (redação)
    modelo: str
    tokens_entrada: int = 0
    tokens_saida: int = 0
    custo_estimado: float = 0.0


class LLMProvider(Protocol):
    nome: str

    def extrair(self, segmentos: list[dict], versao_prompt: str, dica_reparo: str = "") -> RespostaLLM:
        """Recebe só segmentos com `texto_mascarado`; devolve JSON no formato SaidaExtracao."""

    def redigir(self, tipo: str, contexto: dict) -> RespostaLLM:
        """Redige um documento (markdown) a partir de itens já validados por pessoa."""


def carregar_prompt(nome: str) -> str:
    return (PROMPTS / f"{nome}.md").read_text(encoding="utf-8")
