
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
