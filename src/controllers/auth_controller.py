from fastapi import APIRouter, Depends, HTTPException, Request, status
from src.controllers.auth_dependency import get_current_user
from src.schemas.auth_schema import LoginRequest
from src.services import user_service


router = APIRouter(
    prefix="/api/auth",
    tags=["Авторизация"]
)


@router.post("/login")
def login(data: LoginRequest, request: Request):
    """Выполняет вход пользователя в систему."""

    user = user_service.authenticate_user(
        login=data.login,
        password=data.password
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )

    # Удаляем предыдущие данные сессии
    request.session.clear()

    # Сохраняем только идентификатор пользователя
    request.session["user_id"] = user["id"]

    return {
        "message": "Вход выполнен успешно",
        "user": user
    }


@router.post("/logout")
def logout(request: Request):
    """Завершает пользовательскую сессию."""

    request.session.clear()

    return {
        "message": "Выход выполнен успешно"
    }


@router.get("/me")
def get_current_user_info(
    user: dict = Depends(get_current_user)
):
    """Возвращает данные текущего авторизованного пользователя."""

    return {
        "user": user
    }