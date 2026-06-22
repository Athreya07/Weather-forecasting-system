"""Application configuration using environment variables."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/pune_weather")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "./ml/models")
    DATA_PATH: str = os.getenv("DATA_PATH", "./data")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"


settings = Settings()
