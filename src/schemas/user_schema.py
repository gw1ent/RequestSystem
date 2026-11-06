from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    """Данные для создания пользователя."""

    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1)
    full_name: str = Field(min_length=1, max_length=150)
    role: str


class UserUpdate(BaseModel):
    """Данные для изменения пользователя."""

    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1, max_length=50)
    full_name: str = Field(min_length=1, max_length=150)
    role: str


class UserBlock(BaseModel):
    """Данные для блокировки или разблокировки."""

    model_config = ConfigDict(extra="forbid")

    is_blocked: bool