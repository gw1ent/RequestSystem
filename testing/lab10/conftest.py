
import os
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


# Настройки тестового окружения.
# Они действуют только в процессе запуска pytest.
os.environ["SESSION_SECRET_KEY"] = "lab10-test-secret-key"
os.environ["SESSION_HTTPS_ONLY"] = "false"


# Корневая папка проекта.
BASE_DIR = Path(__file__).resolve().parents[2]

SCHEMA_FILE = BASE_DIR / "db" / "schema.sql"
SEED_FILE = BASE_DIR / "db" / "seed.sql"


# Импортируем приложение после настройки окружения.
from src.main import app
from src.database import connection as database_connection


@pytest.fixture
def test_database(tmp_path, monkeypatch):
    """Создаёт отдельную временную SQLite-базу для каждого теста."""

    database_path = tmp_path / "RequestSystem_test.db"

    # Перенаправляем подключения приложения на временную БД.
    monkeypatch.setattr(
        database_connection,
        "DATABASE_PATH",
        database_path
    )

    connection = sqlite3.connect(database_path)

    try:
        connection.execute("PRAGMA foreign_keys = ON")

        # Создаём таблицы и индексы.
        connection.executescript(
            SCHEMA_FILE.read_text(encoding="utf-8")
        )

        # Добавляем демонстрационные данные.
        connection.executescript(
            SEED_FILE.read_text(encoding="utf-8")
        )

    finally:
        connection.close()

    return database_path


@pytest.fixture
def db_connection(test_database):
    """Предоставляет прямое подключение к тестовой БД."""

    connection = sqlite3.connect(test_database)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    yield connection

    connection.close()


@pytest.fixture
def client(test_database):
    """Создаёт HTTP-клиент для тестирования FastAPI."""

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def login(client):
    """Авторизует тестового пользователя."""

    def _login(username, password):
        response = client.post(
            "/api/auth/login",
            json={
                "login": username,
                "password": password
            }
        )

        assert response.status_code == 200

        return response

    return _login


@pytest.fixture
def test_data(db_connection):
    """Возвращает ID демонстрационных пользователей и справочников."""

    users = {
        row["login"]: row["id"]
        for row in db_connection.execute(
            "SELECT id, login FROM Users"
        ).fetchall()
    }

    statuses = {
        row["name"]: row["id"]
        for row in db_connection.execute(
            "SELECT id, name FROM Statuses"
        ).fetchall()
    }

    categories = {
        row["name"]: row["id"]
        for row in db_connection.execute(
            "SELECT id, name FROM Categories"
        ).fetchall()
    }

    requests = {
        row["subject"]: row["id"]
        for row in db_connection.execute(
            "SELECT id, subject FROM Requests"
        ).fetchall()
    }

    return {
        "users": users,
        "statuses": statuses,
        "categories": categories,
        "requests": requests
    }
