from pydantic import BaseModel, ConfigDict, Field


class RequestCreate(BaseModel):
    """Данные для создания заявки."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True
    )

    subject: str = Field(
        min_length=1,
        max_length=200,
        description="Краткая тема заявки"
    )
    description: str = Field(
        min_length=1,
        max_length=5000,
        description="Описание заявки, не более 5000 символов"
    )
    category_id: int = Field(gt=0)


class RequestUpdate(BaseModel):
    """Данные для редактирования заявки."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True
    )

    subject: str = Field(
        min_length=1,
        max_length=200,
        description="Краткая тема заявки"
    )
    description: str = Field(
        min_length=1,
        max_length=5000,
        description="Описание заявки, не более 5000 символов"
    )
    category_id: int = Field(gt=0)


class ExecutorAssign(BaseModel):
    """Данные для назначения исполнителя."""

    model_config = ConfigDict(extra="forbid")

    executor_id: int = Field(gt=0)