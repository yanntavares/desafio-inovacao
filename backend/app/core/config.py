from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração lida do .env (segredos nunca ficam no código)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://handoff:handoff@localhost:5432/handoff"

    llm_provider: str = "mock"  # mock | anthropic | openai
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    llm_max_tokens: int = 4000
    max_transcript_words: int = 15000
    extraction_max_repairs: int = 2

    jwt_secret: str = "troque-isto"


@lru_cache
def get_settings() -> Settings:
    return Settings()
