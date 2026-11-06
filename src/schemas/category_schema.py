from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    """Данные для создания категории."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)


class CategoryUpdate(BaseModel):
    """Данные для изменения категории."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)