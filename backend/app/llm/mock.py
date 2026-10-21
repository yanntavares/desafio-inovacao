"""Provedor de mentira, determinístico e sem custo: heurística por palavra-chave.

Serve para desenvolvimento, testes e demonstração. Segue as mesmas regras do prompt:
só devolve trechos literais e nunca inventa valor de orçamento ou prazo.
"""

import json
import re

from app.llm.base import RespostaLLM
from app.models.enums import CategoriaItem as C
from app.services.matriz import TITULO_SECAO

# Ordem importa: a primeira regra que casar com a frase define a categoria.
_REGRAS: list[tuple[C, re.Pattern]] = [
    (C.ORCAMENTO, re.compile(r"or[çc]amento|investimento|r\$|custo|pre[çc]o|valor", re.I)),
    (C.PRAZO, re.compile(r"prazo|at[ée] (?:o )?(?:dia|m[êe]s)|entrega(?:r)? em|semanas?|meses", re.I)),
    (C.MARCO, re.compile(r"marco|primeira vers[ãa]o|piloto|lan[çc]amento", re.I)),
    (C.PROBLEMA, re.compile(r"problema|dor\b|n[ãa]o conseguem?|dificuldade|perdemos|demora", re.I)),
    (C.INTEGRACAO, re.compile(r"integra[çc][ãa]o|integrar|api\b|erp|whatsapp|pagamento", re.I)),
    (C.RISCO, re.compile(r"risco|preocupa|depende de|pode atrasar", re.I)),
    (C.RESTRICAO, re.compile(r"restri[çc][ãa]o|n[ãa]o pode|obrigat[óo]rio|precisa seguir|lgpd", re.I)),
    (C.CRITERIO_ACEITE, re.compile(r"crit[ée]rio|aceite|considera(?:mos)? pronto", re.I)),
    (C.STAKEHOLDER, re.compile(r"diretor|respons[áa]vel|decide|aprova|coordena[çc][ãa]o|gestor", re.I)),
    (C.OBJETIVO, re.compile(r"objetivo|meta\b|queremos aumentar|queremos reduzir", re.I)),
    (C.PUBLICO, re.compile(r"alunos?|professores?|usu[áa]rios?|clientes finais|p[úu]blico", re.I)),
    (C.DUVIDA, re.compile(r"n[ãa]o sei|n[ãa]o definimos|ainda n[ãa]o|d[úu]vida", re.I)),
    (C.ENTREGAVEL, re.compile(r"entreg[áa]vel|relat[óo]rio|dashboard|painel|certificado", re.I)),
    (C.ESCOPO, re.compile(r"queremos|precisamos|login|[áa]rea d|m[óo]dulo|funcionalidade|cadastro|tela", re.I)),
]
_EM_DISCUSSAO = re.compile(r"talvez|avaliar|podemos pensar|quem sabe|ainda n[ãa]o decidimos|ver depois", re.I)
_SENTENCAS = re.compile(r"(?<=[.!?])\s+")


class MockProvider:
    nome = "mock"
    modelo = "mock-1"

    def extrair(self, segmentos: list[dict], versao_prompt: str, dica_reparo: str = "") -> RespostaLLM:
        itens, vistos = [], set()
        for seg in segmentos:
            for frase in _SENTENCAS.split(seg["texto_mascarado"]):
                frase = frase.strip()
                if len(frase) < 12:
                    continue
                for categoria, padrao in _REGRAS:
                    if padrao.search(frase) and (categoria, frase) not in vistos:
                        vistos.add((categoria, frase))
                        itens.append({
                            "categoria": categoria.value,
                            # descrição = o próprio trecho: o mock não inventa valores
                            "descricao": frase,
                            "natureza_proposta": "em_discussao" if _EM_DISCUSSAO.search(frase) else "acordado",
                            "evidencias": [{"segmento_ordem": seg["ordem"], "trecho": frase}],
                        })
                        break
        texto = json.dumps({"itens": itens}, ensure_ascii=False)
        return RespostaLLM(texto, self.modelo, tokens_entrada=sum(len(s["texto_mascarado"]) for s in segmentos) // 4,
                           tokens_saida=len(texto) // 4)

    def redigir(self, tipo: str, contexto: dict) -> RespostaLLM:
        """Template determinístico. Só usa o que está nos itens recebidos (números e datas inclusive)."""
        titulos = {
            "resumo_comercial": "Resumo da reunião",
            "briefing_comercial": "Briefing comercial",
            "resumo_gerencial": "Resumo gerencial",
            "briefing_projeto": "Briefing de projeto",
            "pauta_kickoff": "Pauta de kickoff",
        }
        linhas = [f"# {titulos.get(tipo, tipo)} — {contexto.get('cliente', '')}", ""]
        mapa = []
        for cat in C:
            itens = contexto.get("itens", {}).get(cat.value, [])
            if not itens:
                continue
            linhas.append(f"## {TITULO_SECAO[cat]}")
            for it in itens:
                marca = "" if it["natureza"] == "acordado" else " (a validar)"
                linhas.append(f"- {it['descricao']}{marca}")
                mapa.append({"paragrafo": len(linhas) - 1, "item_ids": [it["id"]]})
            linhas.append("")
        abertas = contexto.get("pendencias", [])
        if abertas:
            linhas.append("## A esclarecer")
            linhas += [f"- {p}" for p in abertas]
        texto = "\n".join(linhas).strip() + "\n"
        return RespostaLLM(json.dumps({"markdown": texto, "itens": mapa}, ensure_ascii=False), self.modelo,
                           tokens_saida=len(texto) // 4)
