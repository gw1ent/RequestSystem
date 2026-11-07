from src.database.connection import get_connection


def get_all_statuses() -> list[dict]:
    """Возвращает список всех статусов."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id, name
            FROM Statuses
            ORDER BY id
            """
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()