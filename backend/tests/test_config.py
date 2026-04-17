from app.config import Settings


def test_cors_allowed_origins_defaults_to_frontend_url() -> None:
    settings = Settings(frontend_url="https://frontend.example.com/")

    assert settings.normalized_frontend_url == "https://frontend.example.com"
    assert settings.cors_allowed_origins == ["https://frontend.example.com"]


def test_cors_allowed_origins_supports_csv_override() -> None:
    settings = Settings(
        frontend_url="https://frontend.example.com/",
        frontend_allowed_origins=(
            "https://frontend.example.com/, https://admin.example.com, https://frontend.example.com"
        ),
    )

    assert settings.cors_allowed_origins == [
        "https://frontend.example.com",
        "https://admin.example.com",
    ]