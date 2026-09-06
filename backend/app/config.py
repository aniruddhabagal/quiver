from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every knob, from env or .env. Flat names, sensible defaults."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="QUIVER_", extra="ignore")

    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "quiver"

    secret_key: str = "change-me-in-production"
    encryption_key: str | None = None

    access_token_minutes: int = 15
    refresh_token_days: int = 7

    allowed_origins: str = "http://localhost:5182"
    frontend_url: str = "http://localhost:5182"
    public_api_url: str = "http://localhost:8010"

    agent_header_default: str = "X-Agent-Name"
    approval_timeout_default: int = 120
    probe_interval_s: int = 300
    probe_enabled: bool = True
    upstream_connect_timeout_s: float = 10
    upstream_call_timeout_default: float = 60

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def encryption_secret(self) -> str:
        return self.encryption_key or self.secret_key


settings = Settings()
