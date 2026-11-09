"""Безопасная инициализация SQLite для RequestSystem.

По умолчанию:
1. Использует DATABASE_PATH, как src/database/connection.py.
2. Создаёт отсутствующие таблицы и индексы.
3. Добавляет демонстрационные данные без очистки существующих таблиц.

Параметр --demo запускает db/queries.sql в SAVEPOINT и затем откатывает
все его изменения. Таким образом, демонстрационные INSERT/UPDATE/DELETE
не сохраняются в рабочей базе.
"""

import argparse
import os
import sqlite3
from typing import Optional
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DB_DIR = Path(__file__).resolve().parent
SCHEMA_FILE = DB_DIR / "schema.sql"
SEED_FILE = DB_DIR / "seed.sql"
QUERIES_FILE = DB_DIR / "queries.sql"

REQUIRED_COLUMNS = {
    "Users": {
        "id", "login", "password_hash", "full_name", "is_blocked", "role"
    },
    "Statuses": {"id", "name"},
    "Categories": {"id", "name"},
    "Requests": {
        "id", "subject", "description", "applicant_id", "executor_id",
        "status_id", "category_id", "created_at"
    },
    "Comments": {"id", "author_id", "request_id", "text", "created_at"},
}


def resolve_database_path(cli_path: Optional[str]) -> Path:
    """Повторяет правила разрешения DATABASE_PATH из backend."""

    configured_path = cli_path or os.getenv(
        "DATABASE_PATH", "db/RequestSystem.db"
    )
    database_path = Path(configured_path)

    if not database_path.is_absolute():
        database_path = BASE_DIR / database_path

    return database_path.resolve()


def execute_sql_file(connection: sqlite3.Connection, path: Path) -> None:
    """Выполняет SQL-файл целиком; скрипты содержат собственные транзакции."""

    if not path.is_file():
        raise FileNotFoundError(f"SQL-файл не найден: {path}")

    connection.executescript(path.read_text(encoding="utf-8"))


def validate_schema(connection: sqlite3.Connection) -> None:
    """Проверяет наличие таблиц и столбцов, используемых backend."""

    for table_name, expected_columns in REQUIRED_COLUMNS.items():
        rows = connection.execute(
            f"PRAGMA table_info('{table_name}')"
        ).fetchall()
        actual_columns = {row[1] for row in rows}

        if not actual_columns:
            raise RuntimeError(
                f"После инициализации отсутствует таблица {table_name}."
            )

        missing_columns = expected_columns - actual_columns
        if missing_columns:
            missing = ", ".join(sorted(missing_columns))
            raise RuntimeError(
                f"Несовместимая структура таблицы {table_name}. "
                f"Отсутствуют столбцы: {missing}. "
                "Автоматическая миграция существующих таблиц не выполняется."
            )


def validate_foreign_keys(connection: sqlite3.Connection) -> None:
    """Проверяет, что SQLite не обнаруживает нарушений внешних ключей."""

    violations = connection.execute("PRAGMA foreign_key_check").fetchall()
    if violations:
        details = "; ".join(str(tuple(row)) for row in violations[:10])
        raise RuntimeError(
            "Обнаружены нарушения внешних ключей в базе данных: " + details
        )


def iter_sql_statements(sql_text: str):
    """Разбирает SQL по завершённым инструкциям, учитывая строки и комментарии."""

    statement_lines = []

    for line in sql_text.splitlines(keepends=True):
        statement_lines.append(line)
        candidate = "".join(statement_lines)

        if sqlite3.complete_statement(candidate):
            statement = candidate.strip()
            statement_lines = []

            if statement:
                yield statement

    remainder = "".join(statement_lines).strip()
    if remainder and any(
        line.strip() and not line.lstrip().startswith("--")
        for line in remainder.splitlines()
    ):
        raise ValueError(
            "В queries.sql обнаружен незавершённый SQL-оператор."
        )


def run_demo_queries(connection: sqlite3.Connection) -> None:
    """Выполняет демонстрационные запросы и откатывает все изменения."""

    if not QUERIES_FILE.is_file():
        raise FileNotFoundError(f"SQL-файл не найден: {QUERIES_FILE}")

    print("\nЗапуск демонстрационных запросов в режиме отката (--demo).")
    connection.execute("SAVEPOINT demo_queries")

    try:
        for number, statement in enumerate(
            iter_sql_statements(QUERIES_FILE.read_text(encoding="utf-8")),
            start=1,
        ):
            cursor = connection.execute(statement)

            if cursor.description is not None:
                columns = [item[0] for item in cursor.description]
                rows = cursor.fetchall()

                print(f"\n[SELECT {number}] {len(rows)} строк")
                print(" | ".join(columns))
                for row in rows:
                    print(" | ".join(
                        "" if value is None else str(value)
                        for value in row
                    ))
            else:
                print(
                    f"[{number}] Изменено строк: {cursor.rowcount}"
                )

    except Exception:
        connection.execute("ROLLBACK TO demo_queries")
        connection.execute("RELEASE demo_queries")
        raise
    else:
        connection.execute("ROLLBACK TO demo_queries")
        connection.execute("RELEASE demo_queries")
        print(
            "\nДемонстрационные изменения отменены. "
            "Данные в базе не изменены запросами из queries.sql."
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Безопасная инициализация базы данных RequestSystem."
    )
    parser.add_argument(
        "--database",
        help=(
            "Путь к SQLite-файлу. Если не указан, используется "
            "DATABASE_PATH или db/RequestSystem.db."
        ),
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help=(
            "Дополнительно выполнить queries.sql в транзакции "
            "с обязательным откатом изменений."
        ),
    )
    args = parser.parse_args()

    database_path = resolve_database_path(args.database)
    database_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"База данных: {database_path}")

    connection = sqlite3.connect(database_path, timeout=10)

    try:
        connection.execute("PRAGMA foreign_keys = ON")

        execute_sql_file(connection, SCHEMA_FILE)
        validate_schema(connection)

        execute_sql_file(connection, SEED_FILE)
        validate_schema(connection)
        validate_foreign_keys(connection)

        print("Схема проверена; начальные данные добавлены.")
        print("Существующие таблицы и записи не удалялись.")

        if args.demo:
            run_demo_queries(connection)

    finally:
        connection.close()

    print("\nГотово.")


if __name__ == "__main__":
    main()
