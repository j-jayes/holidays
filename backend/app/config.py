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


settings = Settings()
