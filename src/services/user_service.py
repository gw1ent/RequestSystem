import sqlite3
from argon2 import PasswordHasher
from argon2.exceptions import (
    VerifyMismatchError,
    VerificationError,
    InvalidHashError
)

from src.repositories import user_repository


password_hasher = PasswordHasher()


def get_user(user_id: int):
    """Получает пользователя по ID."""

    return user_repository.get_user_by_id(user_id)


def get_all_users():
    """Получает список пользователей."""

    return user_repository.get_all_users()


def get_executors():
    """Возвращает список активных исполнителей (для назначения на заявки)."""

    return [
        user
        for user in user_repository.get_all_users()
        if user["role"] == "Исполнитель" and not user["is_blocked"]
    ]


def authenticate_user(login: str, password: str):
    """Проверяет логин, пароль и блокировку пользователя."""

    user = user_repository.get_user_by_login(login)

    if not user:
        return None

    if user["is_blocked"]:
        return None

    try:
        password_hasher.verify(user["password_hash"], password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return None

    # Не передаём хеш пароля дальше по приложению
    user.pop("password_hash", None)

    return user


def create_password_hash(password: str) -> str:
    """Создаёт Argon2-хеш пароля."""

    return password_hasher.hash(password)


def create_user(
    login: str,
    password: str,
    full_name: str,
    role: str
):
    """Подготавливает данные нового пользователя."""

    if not login or not login.strip():
        raise ValueError("Логин не может быть пустым")

    if not password:
        raise ValueError("Пароль не может быть пустым")

    if not full_name or not full_name.strip():
        raise ValueError("ФИО не может быть пустым")

    if role not in (
        "Заявитель",
        "Оператор",
        "Исполнитель",
        "Администратор"
    ):
        raise ValueError("Указана некорректная роль")

    password_hash = create_password_hash(password)

    return user_repository.create_user(
        login=login.strip(),
        password_hash=password_hash,
        full_name=full_name.strip(),
        role=role
    )


def update_user(
    user_id: int,
    login: str,
    full_name: str,
    role: str
):
    """Проверяет данные и обновляет пользователя."""

    if not login or not login.strip():
        raise ValueError("Логин не может быть пустым")

    if not full_name or not full_name.strip():
        raise ValueError("ФИО не может быть пустым")

    if role not in (
        "Заявитель",
        "Оператор",
        "Исполнитель",
        "Администратор"
    ):
        raise ValueError("Указана некорректная роль")

    try:
        user = user_repository.update_user(
            user_id=user_id,
            login=login.strip(),
            full_name=full_name.strip(),
            role=role
        )
    except sqlite3.IntegrityError as error:
        raise ValueError(
            "Пользователь с таким логином уже существует"
        ) from error

    if user is None:
        raise ValueError("Пользователь не найден")

    return user


def set_user_blocked(user_id: int, is_blocked: bool):
    """Блокирует или разблокирует пользователя."""

    if not isinstance(is_blocked, bool):
        raise ValueError("Статус блокировки должен быть True или False")

    user = user_repository.set_user_blocked(user_id, is_blocked)

    if user is None:
        raise ValueError("Пользователь не найден")

    return user


def delete_user(user_id: int) -> bool:
    """Удаляет пользователя."""

    try:
        deleted = user_repository.delete_user(user_id)
    except sqlite3.IntegrityError as error:
        raise ValueError(
            "Нельзя удалить пользователя: он связан с другими записями"
        ) from error

    if not deleted:
        raise ValueError("Пользователь не найден")

    return True