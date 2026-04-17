"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Azure Cosmos DB
    cosmos_db_url: str = ""
    cosmos_db_key: str = ""
    cosmos_db_name: str = "vacation-tracker"

    # Microsoft Entra ID
    azure_tenant_id: str = ""
    azure_client_id: str = ""
    azure_client_secret: str = ""

    # Email
    email_provider: str = "acs"  # "acs" | "sendgrid"
    acs_connection_string: str = ""
    sendgrid_api_key: str = ""
    email_from: str = "noreply@yourcompany.com"

    # Public holiday API
    public_holiday_api_base: str = "https://date.nager.at/api/v3"

    # App
    app_env: str = "development"
    frontend_url: str = "http://localhost:5173"
    frontend_allowed_origins: str = ""

    @property
    def normalized_frontend_url(self) -> str:
        return self.frontend_url.rstrip("/")

    @property
    def cors_allowed_origins(self) -> list[str]:
        source = self.frontend_allowed_origins or self.normalized_frontend_url
        origins: list[str] = []
        for raw_origin in source.split(","):
            origin = raw_origin.strip().rstrip("/")
            if origin and origin not in origins:
                origins.append(origin)
        return origins


settings = Settings()
