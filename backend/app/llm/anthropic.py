"""Provedor Claude (Anthropic). Uma chamada por operação, sem ferramentas: o modelo só devolve texto.

Recebe apenas texto mascarado. A saída vem em JSON por structured outputs e ainda passa pela
validação Pydantic e pela checagem de evidência em `services/extracao.py`.
"""

import json
import logging

import anthropic

from app.core.config import get_settings
from app.llm.base import TITULOS_DOCUMENTO, RespostaLLM, carregar_prompt
from app.models.enums import CategoriaItem, NaturezaItem
from app.services.erros import ErroIA

log = logging.getLogger("llm")

VERSAO_PROMPT_REDACAO = "redacao_v1"

# US$ por milhão de tokens (entrada, saída)
PRECOS = {
    "claude-opus-5-5": (4.0, 20.0),
    "claude-sonnet-5-5": (2.0, 10.0),
    "claude-haiku-5-5": (0.10, 0.50),
}

_SCHEMA_EXTRACAO = {
    "type": "object",
    "properties": {"itens": {"type": "array", "items": {
        "type": "object",
        "properties": {
            "categoria": {"type": "string", "enum": [c.value for c in CategoriaItem]},
            "descricao": {"type": "string"},
            "natureza_proposta": {"type": "string", "enum": [n.value for n in NaturezaItem]},
            "evidencias": {"type": "array", "items": {
                "type": "object",
                "properties": {"segmento_ordem": {"type": "integer"}, "trecho": {"type": "string"}},
                "required": ["segmento_ordem", "trecho"],
                "additionalProperties": False,
            }},
        },
        "required": ["categoria", "descricao", "natureza_proposta", "evidencias"],
        "additionalProperties": False,
    }}},
    "required": ["itens"],
    "additionalProperties": False,
}

_SCHEMA_REDACAO = {
    "type": "object",
    "properties": {
        "markdown": {"type": "string"},
        "itens": {"type": "array", "items": {
            "type": "object",
            "properties": {"paragrafo": {"type": "integer"},
                           "item_ids": {"type": "array", "items": {"type": "integer"}}},
            "required": ["paragrafo", "item_ids"],
            "additionalProperties": False,
        }},
    },
    "required": ["markdown", "itens"],
    "additionalProperties": False,
}


class AnthropicProvider:
    nome = "anthropic"

    def __init__(self, client=None):
        cfg = get_settings()
        self.client = client or anthropic.Anthropic(api_key=cfg.anthropic_api_key or None)
        self.modelo, self.effort, self.max_tokens = cfg.llm_modelo, cfg.llm_effort, cfg.llm_max_tokens

    def extrair(self, segmentos: list[dict], versao_prompt: str, dica_reparo: str = "") -> RespostaLLM:
        linhas = "\n".join(f"[{s['ordem']}] {s['falante']}: {s['texto_mascarado']}" for s in segmentos)
        conteudo = f"<transcricao>\n{linhas}\n</transcricao>"
        if dica_reparo:
            conteudo += f"\n\n{dica_reparo}"
        return self._chamar(carregar_prompt(versao_prompt), conteudo, _SCHEMA_EXTRACAO)

    def redigir(self, tipo: str, contexto: dict) -> RespostaLLM:
        dados = {"titulo": TITULOS_DOCUMENTO.get(tipo, tipo), **contexto}
        conteudo = f"<itens>\n{json.dumps(dados, ensure_ascii=False)}\n</itens>"
        return self._chamar(carregar_prompt(VERSAO_PROMPT_REDACAO), conteudo, _SCHEMA_REDACAO)

    def _chamar(self, system: str, conteudo: str, schema: dict) -> RespostaLLM:
        try:
            resp = self.client.beta.messages.create(
                model=self.modelo,
                max_tokens=self.max_tokens,
                thinking={"type": "adaptive"},
                output_config={"effort": self.effort, "format": {"type": "json_schema", "schema": schema}},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",  # recusa do classificador é refeita em outro modelo pela API
                system=system,
                messages=[{"role": "user", "content": conteudo}],
            )
        except anthropic.RateLimitError:
            raise ErroIA("Limite de uso da IA atingido. Tente de novo em alguns minutos.")
        except anthropic.APIStatusError as e:
            raise ErroIA(f"A IA respondeu com erro {e.status_code}. Tente de novo.")
        except anthropic.APIConnectionError:
            raise ErroIA("Não foi possível falar com a IA. Verifique a conexão e tente de novo.")

        if resp.stop_reason == "refusal":
            categoria = getattr(resp.stop_details, "category", None) or "sem categoria"
            raise ErroIA(f"A IA recusou a solicitação ({categoria}).")
        if resp.stop_reason == "max_tokens":
            raise ErroIA("A resposta da IA foi cortada. Aumente LLM_MAX_TOKENS.")
        texto = next((b.text for b in resp.content if b.type == "text"), "")
        entrada, saida = resp.usage.input_tokens, resp.usage.output_tokens
        if resp.model not in PRECOS:
            log.warning("modelo %s sem preço cadastrado; custo registrado como 0", resp.model)
        preco_in, preco_out = PRECOS.get(resp.model, (0.0, 0.0))
        return RespostaLLM(texto, resp.model, tokens_entrada=entrada, tokens_saida=saida,
                           custo_estimado=(entrada * preco_in + saida * preco_out) / 1_000_000)
