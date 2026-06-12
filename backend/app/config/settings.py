from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False)

    app_name: str = 'EduPredict'
    environment: str = 'development'
    secret_key: str = 'change-me'
    algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    mongo_uri: str = 'mongodb://localhost:27017'
    mongo_db: str = 'edupredict'

    redis_url: str = 'redis://localhost:6379/0'

    hdfs_host: str = 'localhost'
    hdfs_port: int = 9870
    hdfs_user: str = 'hdfs'
    hdfs_base_path: str = '/edupredict'

    smtp_host: str = 'localhost'
    smtp_port: int = 1025
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_from: str = 'no-reply@edupredict.local'

    cors_origins: List[str] = Field(default_factory=lambda: ['http://localhost:3000', 'http://localhost:5173'])
    rate_limit_per_minute: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
