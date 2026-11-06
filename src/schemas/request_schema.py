from pydantic import BaseModel, ConfigDict, Field


class RequestCreate(BaseModel):
    """Данные для создания заявки."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category_id: int = Field(gt=0)


class RequestUpdate(BaseModel):
    """Данные для редактирования заявки."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category_id: int = Field(gt=0)


class ExecutorAssign(BaseModel):
    """Данные для назначения исполнителя."""

    model_config = ConfigDict(extra="forbid")

    executor_id: int = Field(gt=0)