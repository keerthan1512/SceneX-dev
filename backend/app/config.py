from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    MONGODB_URL: str          # required — set in .env
    DATABASE_NAME: str = "scenesolver"

    # ── Auth ──────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str       # required — set in .env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── AI / LLM ──────────────────────────────────────────────────────────────
    GROQ_API_KEY: str         # required — set in .env
    GROQ_MODEL: str           # required — set in .env

    # ── Storage & model paths ─────────────────────────────────────────────────
    STORAGE_PATH: str = "./storage"
    YOLO_MODEL_PATH: str = "./models/yolo_crime.pt"
    CLIP_MODEL_NAME: str = "openai/clip-vit-base-patch32"
    CLIP_CLASSIFIER_PATH: str = "./models/saved_model.joblib"
    CLIP_LABEL_ENCODER_PATH: str = "./models/label_encoder.joblib"

    # ── Limits & CORS ─────────────────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 20
    ALLOWED_ORIGINS: str      # required — set in .env

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
