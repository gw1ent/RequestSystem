-- Демонстрационные SQL-запросы для схемы RequestSystem.
-- Файл содержит INSERT/UPDATE/DELETE и SELECT.
-- run_queries.py выполняет этот файл только с параметром --demo,
-- внутри отдельной транзакции с последующим ROLLBACK.
-- Поэтому демонстрационные изменения не сохраняются в базе данных.

-- ============================================================================
-- БЛОК 1: INSERT
-- ============================================================================

-- 1.1. Добавление демонстрационного пользователя.
-- Хеш действителен как Argon2id; демонстрационный пароль: DemoUser123!
INSERT INTO Users (login, password_hash, full_name, role)
VALUES (
    'new_user',
    '$argon2id$v=19$m=65536,t=3,p=4$8S5UCKPjT8jLdtmOdjZo9w$8ODFLViCFm85IIR/UI9BQDa1jlyqtk8X35V7gka2Xm4',
    'Новиков Петр',
    'Заявитель'
);

-- 1.2. Добавление заявки с поиском связанных ID по названиям.
INSERT INTO Requests (subject, description, applicant_id, status_id, category_id)
VALUES (
    'Не работает мышь',
    'Курсор не двигается, перезагрузка не помогла.',
    (SELECT id FROM Users WHERE login = 'new_user'),
    (SELECT id FROM Statuses WHERE name = 'Новая'),
    (SELECT id FROM Categories WHERE name = 'Техническая неисправность')
);

-- 1.3. Добавление комментария к созданной заявке.
INSERT INTO Comments (author_id, request_id, text)
VALUES (
    (SELECT id FROM Users WHERE login = 'operator'),
    (SELECT id FROM Requests WHERE subject = 'Не работает мышь'
       AND applicant_id = (SELECT id FROM Users WHERE login = 'new_user')),
    'Принято в обработку, ожидайте звонка.'
);

-- 1.4. Массовое добавление категорий.
INSERT INTO Categories (name) VALUES
    ('Оборудование'),
    ('Сеть и интернет'),
    ('Права доступа');

-- 1.5. Добавление исполнителя на основе существующего Argon2-хеша.
INSERT INTO Users (login, password_hash, full_name, role)
SELECT 'exec3', password_hash, 'Морозов Дмитрий (Новый)', 'Исполнитель'
FROM Users
WHERE login = 'exec1';

-- ============================================================================
-- БЛОК 2: SELECT
-- ============================================================================

-- 2.1. Карточки заявок со статусом, категорией, заявителем и исполнителем.
SELECT
    r.id AS request_id,
    r.subject,
    s.name AS status_name,
    c.name AS category_name,
    applicant.full_name AS applicant_name,
    COALESCE(executor.full_name, 'Не назначен') AS executor_name,
    r.created_at
FROM Requests AS r
JOIN Statuses AS s ON r.status_id = s.id
JOIN Categories AS c ON r.category_id = c.id
JOIN Users AS applicant ON r.applicant_id = applicant.id
LEFT JOIN Users AS executor ON r.executor_id = executor.id
ORDER BY r.created_at DESC, r.id DESC;

-- 2.2. Статистика по исполнителям.
SELECT
    u.full_name AS executor_name,
    COUNT(r.id) AS total_assigned,
    SUM(CASE WHEN s.name = 'Выполнено' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN s.name = 'В работе' THEN 1 ELSE 0 END) AS in_progress_count
FROM Users AS u
JOIN Requests AS r ON u.id = r.executor_id
JOIN Statuses AS s ON r.status_id = s.id
WHERE u.role = 'Исполнитель'
GROUP BY u.id, u.full_name
ORDER BY completed_count DESC;

-- 2.3. Заявки с комментариями, их количество и дата последнего комментария.
SELECT
    r.id,
    r.subject,
    COUNT(c.id) AS comments_count,
    MAX(c.created_at) AS last_comment_date
FROM Requests AS r
LEFT JOIN Comments AS c ON r.id = c.request_id
GROUP BY r.id, r.subject
HAVING COUNT(c.id) > 0
ORDER BY comments_count DESC;

-- 2.4. Три исполнителя с наибольшим количеством закрытых заявок.
SELECT
    u.full_name,
    COUNT(r.id) AS closed_requests
FROM Users AS u
JOIN Requests AS r ON u.id = r.executor_id
JOIN Statuses AS s ON r.status_id = s.id
WHERE s.name = 'Закрыта'
GROUP BY u.id, u.full_name
ORDER BY closed_requests DESC
LIMIT 3;

-- 2.5. Активность пользователей.
SELECT
    u.full_name,
    u.role,
    (SELECT COUNT(*) FROM Requests WHERE applicant_id = u.id) AS created_requests,
    (SELECT COUNT(*) FROM Comments WHERE author_id = u.id) AS left_comments
FROM Users AS u
ORDER BY created_requests DESC, left_comments DESC;

-- ============================================================================
-- БЛОК 3: UPDATE
-- ============================================================================

-- 3.1. Назначение исполнителя и перевод заявки в работу.
UPDATE Requests
SET
    executor_id = (SELECT id FROM Users WHERE login = 'exec2'),
    status_id = (SELECT id FROM Statuses WHERE name = 'В работе')
WHERE id = (
    SELECT id FROM Requests
    WHERE subject = 'Не включается компьютер'
    ORDER BY id
    LIMIT 1
)
AND status_id = (SELECT id FROM Statuses WHERE name = 'Новая');

-- 3.2. Блокировка пользователя при отсутствии активных заявок.
UPDATE Users
SET is_blocked = 1
WHERE login = 'user2'
  AND id NOT IN (
      SELECT applicant_id
      FROM Requests
      WHERE status_id IN (
          SELECT id FROM Statuses WHERE name IN ('Новая', 'В работе')
      )
  );

-- ============================================================================
-- БЛОК 4: DELETE
-- ============================================================================

-- 4.1. Удаление комментариев заблокированных пользователей к незакрытым заявкам.
DELETE FROM Comments
WHERE author_id IN (SELECT id FROM Users WHERE is_blocked = 1)
  AND request_id IN (
      SELECT id FROM Requests
      WHERE status_id != (SELECT id FROM Statuses WHERE name = 'Закрыта')
  );

-- 4.2. Удаление старых новых заявок без исполнителя.
DELETE FROM Requests
WHERE executor_id IS NULL
  AND status_id = (SELECT id FROM Statuses WHERE name = 'Новая')
  AND created_at < datetime('now', '-30 days');

-- ============================================================================
-- БЛОК 5: SELECT с WHERE
-- ============================================================================

-- 5.1. Поиск активных заявок по ключевому слову.
SELECT id, subject, description, created_at
FROM Requests
WHERE (subject LIKE '%компьютер%' OR description LIKE '%компьютер%')
  AND status_id IN (
      SELECT id FROM Statuses WHERE name IN ('Новая', 'В работе')
  )
ORDER BY created_at DESC;

-- 5.2. Исполнители без активных назначенных задач.
SELECT u.id, u.full_name
FROM Users AS u
WHERE u.role = 'Исполнитель'
  AND u.is_blocked = 0
  AND u.id NOT IN (
      SELECT executor_id
      FROM Requests
      WHERE status_id IN (
          SELECT id FROM Statuses WHERE name IN ('Новая', 'В работе')
      )
      AND executor_id IS NOT NULL
  );

-- 5.3. Заявки за последние семь дней от незаблокированных пользователей.
SELECT
    r.id,
    r.subject,
    r.created_at,
    u.full_name AS applicant_name
FROM Requests AS r
JOIN Users AS u ON r.applicant_id = u.id
WHERE r.created_at >= datetime('now', '-7 days')
  AND r.status_id != (SELECT id FROM Statuses WHERE name = 'Закрыта')
  AND u.is_blocked = 0;

-- ============================================================================
-- БЛОК 6: SELECT с JOIN
-- ============================================================================

-- 6.1. Заявки и связанные с ними комментарии.
SELECT
    r.id AS request_id,
    r.subject,
    c.text AS comment_text,
    u.full_name AS comment_author,
    c.created_at AS comment_date
FROM Requests AS r
LEFT JOIN Comments AS c ON r.id = c.request_id
LEFT JOIN Users AS u ON c.author_id = u.id
ORDER BY r.id, c.created_at;

-- 6.2. Заявки, где заявитель и исполнитель — разные пользователи.
SELECT
    r.id AS request_id,
    r.subject,
    applicant.full_name AS applicant_name,
    applicant.role AS applicant_role,
    executor.full_name AS executor_name,
    executor.role AS executor_role
FROM Requests AS r
JOIN Users AS applicant ON r.applicant_id = applicant.id
JOIN Users AS executor ON r.executor_id = executor.id
WHERE applicant.id != executor.id;
