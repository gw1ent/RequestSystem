from fastapi import APIRouter, Depends

from src.controllers.auth_dependency import get_current_user
from src.services import status_service


router = APIRouter(
    prefix="/api/statuses",
    tags=["Статусы"]
)


@router.get("/")
def get_statuses(
    current_user: dict = Depends(get_current_user)
):
    """Возвращает список всех статусов."""

    return status_service.get_all_statuses()