from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Данные для входа в систему."""

    model_config = ConfigDict(extra="forbid")

    login: str = Field(min_length=1)
    password: str = Field(min_length=1)