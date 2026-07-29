from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "scenesolver"

    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"

    STORAGE_PATH: str = "./storage"
    YOLO_MODEL_PATH: str = "./models/yolo_crime.pt"
    CLIP_MODEL_NAME: str = "openai/clip-vit-base-patch32"
    CLIP_CLASSIFIER_PATH: str = "./models/saved_model.joblib"
    CLIP_LABEL_ENCODER_PATH: str = "./models/label_encoder.joblib"

    MAX_FILE_SIZE_MB: int = 20

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
