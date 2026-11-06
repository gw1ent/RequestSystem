import sqlite3

from src.repositories import category_repository


def get_category(category_id: int):
    """Возвращает категорию по её ID."""
    return category_repository.get_category_by_id(category_id)


def get_all_categories():
    """Возвращает список всех категорий."""
    return category_repository.get_all_categories()


def category_exists(category_id: int) -> bool:
    """Проверяет существование категории."""
    return get_category(category_id) is not None


def create_category(name: str):
    """Проверяет данные и создаёт категорию."""

    if not name or not name.strip():
        raise ValueError("Название категории не может быть пустым")

    try:
        return category_repository.create_category(name.strip())
    except sqlite3.IntegrityError as error:
        raise ValueError(
            "Категория с таким названием уже существует"
        ) from error


def update_category(category_id: int, name: str):
    """Проверяет данные и изменяет категорию."""

    if not name or not name.strip():
        raise ValueError("Название категории не может быть пустым")

    try:
        category = category_repository.update_category(
            category_id,
            name.strip()
        )
    except sqlite3.IntegrityError as error:
        raise ValueError(
            "Категория с таким названием уже существует"
        ) from error

    if category is None:
        raise ValueError("Категория не найдена")

    return category


def delete_category(category_id: int) -> bool:
    """Удаляет категорию, если она не используется."""

    try:
        deleted = category_repository.delete_category(category_id)
    except sqlite3.IntegrityError as error:
        raise ValueError(
            "Нельзя удалить категорию: она используется в заявках"
        ) from error

    if not deleted:
        raise ValueError("Категория не найдена")

    return True