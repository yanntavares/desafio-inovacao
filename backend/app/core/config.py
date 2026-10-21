from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração lida do .env (segredos nunca ficam no código)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://handoff:handoff@localhost:5432/handoff"

    llm_provider: str = "mock"  # mock | anthropic | openai
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    llm_modelo: str = "claude-sonnet-5-5"
    llm_effort: str = "medium"
    llm_max_tokens: int = 16000  # cobre o raciocínio adaptativo + a resposta
    max_transcript_words: int = 15000
    extraction_max_repairs: int = 2

    jwt_secret: str = "troque-isto"
    jwt_expira_minutos: int = 480

    cors_origens: str = "http://localhost:3000"  # separadas por vírgula

    email_dominio: str = "seedabit.org.br"  # só e-mail institucional cria conta
    senha_minimo: int = 10
    demo_mode: bool = False  # habilita login de demonstração e recarga do seed

    login_max_tentativas: int = 5
    login_janela_minutos: int = 15

    def validar_producao(self) -> None:
        """Fora do modo demo, não sobe com o segredo de exemplo (tokens seriam forjáveis)."""
        if not self.demo_mode and (self.jwt_secret == "troque-isto" or len(self.jwt_secret) < 32):
            raise RuntimeError("JWT_SECRET inseguro: defina um segredo com 32+ caracteres no .env "
                               "(ex.: openssl rand -hex 32).")


@lru_cache
def get_settings() -> Settings:
    return Settings()
