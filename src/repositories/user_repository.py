
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

def create_user(
    login: str,
    password_hash: str,
    full_name: str,
    role: str
) -> dict:
    """Создаёт пользователя и возвращает его данные."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO Users (login, password_hash, full_name, is_blocked, role)
            VALUES (?, ?, ?, 0, ?)
            """,
            (login, password_hash, full_name, role)
        )

        user_id = cursor.lastrowid
        connection.commit()

        return get_user_by_id(user_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def update_user(
    user_id: int,
    login: str,
    full_name: str,
    role: str
) -> Optional[dict]:
    """Обновляет основные данные пользователя."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE Users
            SET login = ?, full_name = ?, role = ?
            WHERE id = ?
            """,
            (login, full_name, role, user_id)
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_user_by_id(user_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def set_user_blocked(user_id: int, is_blocked: bool) -> Optional[dict]:
    """Блокирует или разблокирует пользователя."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE Users
            SET is_blocked = ?
            WHERE id = ?
            """,
            (int(is_blocked), user_id)
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_user_by_id(user_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def delete_user(user_id: int) -> bool:
    """Удаляет пользователя по ID."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            DELETE FROM Users
            WHERE id = ?
            """,
            (user_id,)
        )

        connection.commit()

        return cursor.rowcount > 0

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()