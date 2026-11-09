-- Схема базы данных RequestSystem.
-- Скрипт безопасен для повторного запуска: существующие таблицы и данные не удаляются.

PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_blocked INTEGER NOT NULL DEFAULT 0 CHECK (is_blocked IN (0, 1)),
    role TEXT NOT NULL CHECK (
        role IN ('Заявитель', 'Оператор', 'Исполнитель', 'Администратор')
    )
);

CREATE TABLE IF NOT EXISTS Statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    applicant_id INTEGER NOT NULL,
    executor_id INTEGER,
    status_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (applicant_id) REFERENCES Users(id) ON DELETE RESTRICT,
    FOREIGN KEY (executor_id) REFERENCES Users(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES Statuses(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE RESTRICT
);

-- Таблица сохраняется согласно ранее согласованной ER-диаграмме.
-- Текущий backend пока не реализует операции с комментариями.
CREATE TABLE IF NOT EXISTS Comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    request_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES Users(id) ON DELETE RESTRICT,
    FOREIGN KEY (request_id) REFERENCES Requests(id) ON DELETE CASCADE
);

-- Индексы для фильтрации и сортировки заявок в request_repository.py.
CREATE INDEX IF NOT EXISTS idx_requests_applicant_id
    ON Requests(applicant_id);

CREATE INDEX IF NOT EXISTS idx_requests_executor_id
    ON Requests(executor_id);

CREATE INDEX IF NOT EXISTS idx_requests_status_id
    ON Requests(status_id);

CREATE INDEX IF NOT EXISTS idx_requests_category_id
    ON Requests(category_id);

CREATE INDEX IF NOT EXISTS idx_requests_created_at
    ON Requests(created_at);

-- Индексы для внешних ключей и демонстрационных запросов по комментариям.
CREATE INDEX IF NOT EXISTS idx_comments_author_id
    ON Comments(author_id);

CREATE INDEX IF NOT EXISTS idx_comments_request_id
    ON Comments(request_id);

COMMIT;
