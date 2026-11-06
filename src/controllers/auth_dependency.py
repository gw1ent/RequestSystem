from fastapi import HTTPException, Request, status
from src.services import user_service
from typing import Callable
from fastapi import Depends

def get_current_user(request: Request):
    """Возвращает текущего авторизованного пользователя."""

    user_id = request.session.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация"
        )

    user = user_service.get_user(user_id)

    if user is None or user["is_blocked"]:
        request.session.clear()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия недействительна"
        )

    user.pop("password_hash", None)

    return user

def require_roles(*allowed_roles: str) -> Callable:
    """Ограничивает доступ к маршруту указанными ролями."""

    def role_checker(
        user: dict = Depends(get_current_user)
    ):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для выполнения операции"
            )

        return user

    return role_checker