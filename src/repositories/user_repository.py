
from typing import Optional

from src.database.connection import get_connection


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Возвращает пользователя по его ID."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, login, full_name, is_blocked, role
            FROM Users
            WHERE id = ?
            """,
            (user_id,)
        )

        row = cursor.fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


def get_user_by_login(login: str) -> Optional[dict]:
    """Возвращает пользователя по логину."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, login, password_hash, full_name, is_blocked, role
            FROM Users
            WHERE login = ?
            """,
            (login,)
        )

        row = cursor.fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


def get_all_users() -> list[dict]:
    """Возвращает список всех пользователей."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, login, full_name, is_blocked, role
            FROM Users
            ORDER BY id
            """
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()
