
from typing import Optional

from src.database.connection import get_connection


def get_request_by_id(request_id: int) -> Optional[dict]:
    """Возвращает заявку по ID со связанными данными."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT
                r.id,
                r.subject,
                r.description,
                r.applicant_id,
                applicant.full_name AS applicant_name,
                r.executor_id,
                executor.full_name AS executor_name,
                r.status_id,
                s.name AS status_name,
                r.category_id,
                c.name AS category_name,
                r.created_at
            FROM Requests r
            JOIN Users applicant ON r.applicant_id = applicant.id
            LEFT JOIN Users executor ON r.executor_id = executor.id
            JOIN Statuses s ON r.status_id = s.id
            JOIN Categories c ON r.category_id = c.id
            WHERE r.id = ?
            """,
            (request_id,)
        )

        row = cursor.fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


def get_all_requests() -> list[dict]:
    """Возвращает все заявки со связанными данными."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT
                r.id,
                r.subject,
                r.description,
                r.applicant_id,
                applicant.full_name AS applicant_name,
                r.executor_id,
                executor.full_name AS executor_name,
                r.status_id,
                s.name AS status_name,
                r.category_id,
                c.name AS category_name,
                r.created_at
            FROM Requests r
            JOIN Users applicant ON r.applicant_id = applicant.id
            LEFT JOIN Users executor ON r.executor_id = executor.id
            JOIN Statuses s ON r.status_id = s.id
            JOIN Categories c ON r.category_id = c.id
            ORDER BY r.created_at DESC, r.id DESC
            """
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


def get_requests_by_applicant(applicant_id: int) -> list[dict]:
    """Возвращает заявки конкретного заявителя."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT
                r.id,
                r.subject,
                r.description,
                r.applicant_id,
                applicant.full_name AS applicant_name,
                r.executor_id,
                executor.full_name AS executor_name,
                r.status_id,
                s.name AS status_name,
                r.category_id,
                c.name AS category_name,
                r.created_at
            FROM Requests r
            JOIN Users applicant ON r.applicant_id = applicant.id
            LEFT JOIN Users executor ON r.executor_id = executor.id
            JOIN Statuses s ON r.status_id = s.id
            JOIN Categories c ON r.category_id = c.id
            WHERE r.applicant_id = ?
            ORDER BY r.created_at DESC, r.id DESC
            """,
            (applicant_id,)
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()

def create_request(
    subject: str,
    description: str,
    applicant_id: int,
    category_id: int,
    status_id: int
) -> dict:
    """Создаёт заявку и возвращает её данные."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            INSERT INTO Requests (
                subject,
                description,
                applicant_id,
                category_id,
                status_id
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                subject,
                description,
                applicant_id,
                category_id,
                status_id
            )
        )

        request_id = cursor.lastrowid
        connection.commit()

        return get_request_by_id(request_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def get_status_id_by_name(status_name: str) -> Optional[int]:
    """Возвращает ID статуса по названию."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT id
            FROM Statuses
            WHERE name = ?
            """,
            (status_name,)
        )

        row = cursor.fetchone()
        return row["id"] if row else None

    finally:
        connection.close()

def update_request(
    request_id: int,
    subject: str,
    description: str,
    category_id: int
) -> Optional[dict]:
    """Обновляет основные данные заявки."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE Requests
            SET subject = ?,
                description = ?,
                category_id = ?
            WHERE id = ?
            """,
            (subject, description, category_id, request_id)
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_request_by_id(request_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def assign_executor(
    request_id: int,
    executor_id: int,
    new_status_id: int,
    in_progress_status_id: int
) -> Optional[dict]:
    """Назначает исполнителя и переводит заявку в работу."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            UPDATE Requests
            SET executor_id = ?,
                status_id = ?
            WHERE id = ?
              AND status_id IN (?, ?)
            """,
            (
                executor_id,
                in_progress_status_id,
                request_id,
                new_status_id,
                in_progress_status_id
            )
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_request_by_id(request_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

def update_request_status(
    request_id: int,
    new_status_id: int,
    allowed_status_ids: list[int]
) -> Optional[dict]:
    """Меняет статус заявки, если текущий статус допускает переход."""

    if not allowed_status_ids:
        return None

    placeholders = ", ".join("?" for _ in allowed_status_ids)

    connection = get_connection()

    try:
        cursor = connection.execute(
            f"""
            UPDATE Requests
            SET status_id = ?
            WHERE id = ?
              AND status_id IN ({placeholders})
            """,
            (new_status_id, request_id, *allowed_status_ids)
        )

        if cursor.rowcount == 0:
            return None

        connection.commit()

        return get_request_by_id(request_id)

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()