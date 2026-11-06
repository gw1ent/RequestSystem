
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
