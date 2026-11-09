-- Начальные справочные и демонстрационные данные.
-- Скрипт идемпотентен: повторный запуск не очищает таблицы и не дублирует записи.
-- Пароли демонстрационных пользователей:
-- admin     : Admin123!
-- operator  : Operator123!
-- exec1     : Exec123!
-- exec2     : Exec123!
-- user1     : User123!
-- user2     : User123!
-- Хеши сформированы Argon2id и совместимы с PasswordHasher из argon2-cffi.

PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;

INSERT OR IGNORE INTO Statuses (name) VALUES
    ('Новая'),
    ('В работе'),
    ('Выполнено'),
    ('Закрыта');

INSERT OR IGNORE INTO Categories (name) VALUES
    ('Техническая неисправность'),
    ('Проблема с ПО'),
    ('Проблема с доступом'),
    ('Другое');

INSERT OR IGNORE INTO Users
    (login, password_hash, full_name, role, is_blocked)
VALUES
    ('admin',
     '$argon2id$v=19$m=65536,t=3,p=4$ayIbPIG0ucR6jCorp5HiHw$zUCIvPKktdez6q8VXrccmkOhrgINdUQAsIEdG5DoMLQ',
     'Иванов Иван', 'Администратор', 0),
    ('operator',
     '$argon2id$v=19$m=65536,t=3,p=4$7hRY8xORN7peikUb/Tc5TA$iwuhJWwwhL6XmlEgfU5PBqPJBEgmZUmLWk795fNdaGI',
     'Петрова Анна', 'Оператор', 0),
    ('exec1',
     '$argon2id$v=19$m=65536,t=3,p=4$uZTnXVsWbhglN6ASN7zJvw$Q0y9CmVP+AX10jza75J86gy6cr6is+iPaw8PY+h7Exk',
     'Сидоров Алексей', 'Исполнитель', 0),
    ('exec2',
     '$argon2id$v=19$m=65536,t=3,p=4$lQp2MkDqgH8Qq2dWK0Rs5Q$5WCMSaoZ6+67kwTywTyhwl8m3eGnHgrsDAHJQVctO6Y',
     'Кузнецова Мария', 'Исполнитель', 0),
    ('user1',
     '$argon2id$v=19$m=65536,t=3,p=4$p1630tRJezeWPT/Umr34nw$4dI1gAy+EV9nrJebI4q4INZvizgZIj7o93osk1hjCrQ',
     'Смирнов Олег', 'Заявитель', 0),
    ('user2',
     '$argon2id$v=19$m=65536,t=3,p=4$yfxdD52xp9yiFcnrOfC+lw$CDOa2DqvmA8DW92kdIGN9uJ2FhG+bIUhmWzsMnapF3c',
     'Васильева Дарья', 'Заявитель', 1);

-- Заявки добавляются через SELECT по логинам и названиям справочников:
-- поэтому скрипт не зависит от конкретных числовых ID.
INSERT INTO Requests
    (subject, description, applicant_id, executor_id, status_id, category_id, created_at)
SELECT
    'Не включается компьютер',
    'При нажатии на кнопку питания ничего не происходит.',
    applicant.id,
    NULL,
    status.id,
    category.id,
    datetime('now', '-2 days')
FROM Users AS applicant
JOIN Statuses AS status ON status.name = 'Новая'
JOIN Categories AS category ON category.name = 'Техническая неисправность'
WHERE applicant.login = 'user1'
  AND NOT EXISTS (
      SELECT 1 FROM Requests
      WHERE subject = 'Не включается компьютер'
        AND applicant_id = applicant.id
  );

INSERT INTO Requests
    (subject, description, applicant_id, executor_id, status_id, category_id, created_at)
SELECT
    'Не работает корпоративная почта',
    'Выдает ошибку авторизации при входе в Outlook.',
    applicant.id,
    executor.id,
    status.id,
    category.id,
    datetime('now', '-1 day')
FROM Users AS applicant
JOIN Users AS executor ON executor.login = 'exec1'
JOIN Statuses AS status ON status.name = 'В работе'
JOIN Categories AS category ON category.name = 'Проблема с ПО'
WHERE applicant.login = 'user1'
  AND NOT EXISTS (
      SELECT 1 FROM Requests
      WHERE subject = 'Не работает корпоративная почта'
        AND applicant_id = applicant.id
  );

INSERT INTO Requests
    (subject, description, applicant_id, executor_id, status_id, category_id, created_at)
SELECT
    'Нужен доступ к папке "Отчеты"',
    'Прошу предоставить права на чтение папки.',
    applicant.id,
    executor.id,
    status.id,
    category.id,
    datetime('now', '-5 hours')
FROM Users AS applicant
JOIN Users AS executor ON executor.login = 'exec2'
JOIN Statuses AS status ON status.name = 'Выполнено'
JOIN Categories AS category ON category.name = 'Проблема с доступом'
WHERE applicant.login = 'user2'
  AND NOT EXISTS (
      SELECT 1 FROM Requests
      WHERE subject = 'Нужен доступ к папке "Отчеты"'
        AND applicant_id = applicant.id
  );

INSERT INTO Requests
    (subject, description, applicant_id, executor_id, status_id, category_id, created_at)
SELECT
    'Как настроить VPN?',
    'Подскажите инструкцию для подключения из дома.',
    applicant.id,
    NULL,
    status.id,
    category.id,
    datetime('now', '-10 days')
FROM Users AS applicant
JOIN Statuses AS status ON status.name = 'Закрыта'
JOIN Categories AS category ON category.name = 'Другое'
WHERE applicant.login = 'user1'
  AND NOT EXISTS (
      SELECT 1 FROM Requests
      WHERE subject = 'Как настроить VPN?'
        AND applicant_id = applicant.id
  );

-- Демонстрационные комментарии оставлены для согласованной структуры БД.
INSERT INTO Comments (author_id, request_id, text, created_at)
SELECT
    author.id,
    request.id,
    'Передал задачу в отдел техподдержки.',
    datetime('now', '-1 day')
FROM Users AS author
JOIN Requests AS request
    ON request.subject = 'Не включается компьютер'
WHERE author.login = 'operator'
  AND NOT EXISTS (
      SELECT 1 FROM Comments
      WHERE author_id = author.id
        AND request_id = request.id
        AND text = 'Передал задачу в отдел техподдержки.'
  );

INSERT INTO Comments (author_id, request_id, text, created_at)
SELECT
    author.id,
    request.id,
    'Проблема на стороне сервера. Чиню.',
    datetime('now', '-12 hours')
FROM Users AS author
JOIN Requests AS request
    ON request.subject = 'Не работает корпоративная почта'
WHERE author.login = 'exec1'
  AND NOT EXISTS (
      SELECT 1 FROM Comments
      WHERE author_id = author.id
        AND request_id = request.id
        AND text = 'Проблема на стороне сервера. Чиню.'
  );

INSERT INTO Comments (author_id, request_id, text, created_at)
SELECT
    author.id,
    request.id,
    'Хорошо, жду. Спасибо!',
    datetime('now', '-10 hours')
FROM Users AS author
JOIN Requests AS request
    ON request.subject = 'Не работает корпоративная почта'
WHERE author.login = 'user1'
  AND NOT EXISTS (
      SELECT 1 FROM Comments
      WHERE author_id = author.id
        AND request_id = request.id
        AND text = 'Хорошо, жду. Спасибо!'
  );

INSERT INTO Comments (author_id, request_id, text, created_at)
SELECT
    author.id,
    request.id,
    'Права выданы. Проверяйте.',
    datetime('now', '-4 hours')
FROM Users AS author
JOIN Requests AS request
    ON request.subject = 'Нужен доступ к папке "Отчеты"'
WHERE author.login = 'exec2'
  AND NOT EXISTS (
      SELECT 1 FROM Comments
      WHERE author_id = author.id
        AND request_id = request.id
        AND text = 'Права выданы. Проверяйте.'
  );

COMMIT;
