from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    MONGO_URI: str = ""
    DB_NAME: str = "civicimpact"

    JWT_SECRET: str = "fallback_secret_change_in_env_file"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    FRONTEND_URL: str = "http://localhost:3000"

    # --- EMAILJS CONFIGURATION ---
    EMAILJS_SERVICE_ID: str = ""
    EMAILJS_TEMPLATE_ID: str = ""
    EMAILJS_PUBLIC_KEY: str = ""
    EMAILJS_PRIVATE_KEY: str = ""
    FROM_NAME: str = "ImpactHub"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()