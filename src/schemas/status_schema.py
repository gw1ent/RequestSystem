from pydantic import BaseModel, ConfigDict, Field


class StatusUpdate(BaseModel):
    """Данные для изменения статуса заявки."""

    model_config = ConfigDict(extra="forbid")

    status_id: int = Field(gt=0)