from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{Path(__file__).resolve().parents[1] / 'data' / 'stockpicker.db'}"
    brapi_base: str = "https://brapi.dev/api"
    brapi_token: str = ""
    brapi_cache_ttl_seconds: int = 1800
    cors_origins: str = "http://localhost:3000"
    data_dir: Path = Path(__file__).resolve().parents[1] / "data"

    auto_ingest: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
(settings.data_dir / "cvm_cache").mkdir(parents=True, exist_ok=True)
