from fastapi import APIRouter, Depends, HTTPException, status

from src.controllers.auth_dependency import (
    get_current_user,
    require_roles
)
from src.schemas.category_schema import CategoryCreate, CategoryUpdate
from src.services import category_service


router = APIRouter(
    prefix="/api/categories",
    tags=["Категории"]
)


@router.get("/")
def get_categories(
    current_user: dict = Depends(get_current_user)
):
    """Возвращает список категорий."""

    return {
        "categories": category_service.get_all_categories()
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Создаёт новую категорию."""

    try:
        category = category_service.create_category(data.name)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    return {
        "message": "Категория успешно создана",
        "category": category
    }

@router.patch("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Изменяет категорию."""

    try:
        category = category_service.update_category(
            category_id=category_id,
            name=data.name
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    return {
        "message": "Категория успешно обновлена",
        "category": category
    }


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Удаляет категорию."""

    try:
        category_service.delete_category(category_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    return {
        "message": "Категория успешно удалена"
    }