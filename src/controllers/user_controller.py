from fastapi import APIRouter, Depends, HTTPException, status

from src.controllers.auth_dependency import require_roles
from src.schemas.user_schema import UserCreate, UserUpdate, UserBlock
from src.services import user_service


router = APIRouter(
    prefix="/api/users",
    tags=["Пользователи"]
)


@router.get("/")
def get_users(
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Возвращает список пользователей."""

    users = user_service.get_all_users()

    # Не передаём хеши паролей клиенту
    for user in users:
        user.pop("password_hash", None)

    return users


@router.get("/executors")
def get_executors(
    current_user: dict = Depends(
        require_roles("Оператор", "Администратор")
    )
):
    """Возвращает список активных исполнителей для назначения на заявки."""

    executors = user_service.get_executors()

    for executor in executors:
        executor.pop("password_hash", None)

    return {"executors": executors}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Создаёт нового пользователя."""

    try:
        user = user_service.create_user(
            login=data.login,
            password=data.password,
            full_name=data.full_name,
            role=data.role
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    user.pop("password_hash", None)

    return {
        "message": "Пользователь успешно создан",
        "user": user
    }


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Изменяет данные пользователя."""

    if user_id == current_user["id"] and data.role is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя изменять собственную роль"
        )

    try:
        user = user_service.update_user(
            user_id=user_id,
            login=data.login,
            full_name=data.full_name,
            role=data.role
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    user.pop("password_hash", None)

    return {
        "message": "Данные пользователя обновлены",
        "user": user
    }


@router.patch("/{user_id}/block")
def set_user_blocked(
    user_id: int,
    data: UserBlock,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Блокирует или разблокирует пользователя."""

    if user_id == current_user["id"] and data.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя заблокировать собственную учётную запись"
        )

    try:
        user = user_service.set_user_blocked(
            user_id=user_id,
            is_blocked=data.is_blocked
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    user.pop("password_hash", None)

    return {
        "message": "Статус блокировки изменён",
        "user": user
    }


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: dict = Depends(
        require_roles("Администратор")
    )
):
    """Удаляет пользователя."""

    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить собственную учётную запись"
        )

    try:
        user_service.delete_user(user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

    return {
        "message": "Пользователь успешно удалён"
    }