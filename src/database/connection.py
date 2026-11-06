import sqlite3
from pathlib import Path


# Корневая папка проекта
BASE_DIR = Path(__file__).resolve().parents[2]

# Путь к существующей базе данных
DATABASE_PATH = BASE_DIR / "db" / "RequestSystem.db"


def get_connection() -> sqlite3.Connection:
    """
    Создаёт и возвращает подключение к базе данных.
    """

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=10
    )

    # Возвращаем строки в формате sqlite3.Row
    connection.row_factory = sqlite3.Row

    # Включаем проверку внешних ключей
    connection.execute("PRAGMA foreign_keys = ON")

    return connection
