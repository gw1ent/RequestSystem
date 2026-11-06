
from typing import Optional

from src.database.connection import get_connection


def get_category_by_id(category_id: int) -> Optional[dict]:
    """Возвращает категорию по ID."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, name
            FROM Categories
            WHERE id = ?
            """,
            (category_id,)
        )

        row = cursor.fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


def get_all_categories() -> list[dict]:
    """Возвращает список всех категорий."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, name
            FROM Categories
            ORDER BY id
            """
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


def create_category(name: str) -> dict:
    """Создаёт категорию и возвращает её данные."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO Categories (name)
            VALUES (?)
            """,
            (name,)
        )

        category_id = cursor.lastrowid
        connection.commit()

        return get_category_by_id(category_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def update_category(
    category_id: int,
    name: str
) -> Optional[dict]:
    """Изменяет название категории."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE Categories
            SET name = ?
            WHERE id = ?
            """,
            (name, category_id)
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_category_by_id(category_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


def delete_category(category_id: int) -> bool:
    """Удаляет категорию по ID."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            DELETE FROM Categories
            WHERE id = ?
            """,
            (category_id,)
        )

        connection.commit()

        return cursor.rowcount > 0

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
