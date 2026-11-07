from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "AgriChain"
    app_env: str = "development"
    
    mongodb_uri: str = "mongodb://localhost:27017/agri_chain?replicaSet=rs0"
    database_name: str = "agri_chain"
    
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    cors_origins: str = "http://localhost:3000"
    
    @field_validator("cors_origins")
    @classmethod
    def parse_cors_origins(cls, v: str) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    upload_directory: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    simulator_enabled: bool = True
    simulator_default_interval_seconds: int = 30
    
    ledger_chain_id: str = "AGRCHAIN-GLOBAL-001"
    ledger_genesis_hash: str = "0" * 64
    
    log_level: str = "INFO"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()