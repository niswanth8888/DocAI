from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
VECTOR_DIR = DATA_DIR / "vectorstore"
METADATA_DIR = DATA_DIR / "metadata"


class Settings(BaseSettings):
    app_name: str = Field(default="DocAI", alias="APP_NAME")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    low_confidence_threshold: float = Field(default=0.10, alias="LOW_CONFIDENCE_THRESHOLD")
    medium_confidence_threshold: float = Field(default=0.18, alias="MEDIUM_CONFIDENCE_THRESHOLD")
    high_confidence_threshold: float = Field(default=0.35, alias="HIGH_CONFIDENCE_THRESHOLD")

    class Config:
        extra = "ignore"


settings = Settings()

for directory in [DATA_DIR, UPLOAD_DIR, VECTOR_DIR, METADATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)
