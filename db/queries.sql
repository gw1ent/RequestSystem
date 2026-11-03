-- ============================================================================
-- БЛОК 1: INSERT (5 запросов)
-- ============================================================================

-- 1.1. Вставка нового пользователя
INSERT INTO users (login, password_hash, full_name, role)
VALUES ('new_user', 'hash_new_123', 'Новиков Петр', 'Заявитель');

-- 1.2. Вставка новой заявки с автоматическим определением статуса и категории по их названиям
INSERT INTO requests (subject, description, applicant_id, status_id, category_id)
VALUES (
    'Не работает мышь',
    'Курсор не двигается, перезагрузка не помогла.',
    (SELECT id FROM users WHERE login = 'new_user'),
    (SELECT id FROM statuses WHERE name = 'Новая'),
    (SELECT id FROM categories WHERE name = 'Техническая неисправность')
);

-- 1.3. Вставка комментария к последней созданной заявке от имени оператора
INSERT INTO comments (author_id, request_id, text)
VALUES (
    (SELECT id FROM users WHERE login = 'operator'),
    (SELECT MAX(id) FROM requests),
    'Принято в обработку, ожидайте звонка.'
);

-- 1.4. Массовая вставка новых категорий
INSERT INTO categories (name) VALUES
('Оборудование'),
('Сеть и интернет'),
('Права доступа');

-- 1.5. Вставка нового исполнителя с копированием хеша пароля от существующего (INSERT ... SELECT)
INSERT INTO users (login, password_hash, full_name, role)
SELECT 'exec3', password_hash, 'Морозов Дмитрий (Новый)', 'Исполнитель'
FROM users WHERE login = 'exec1';


-- ============================================================================
-- БЛОК 2: SELECT (5 сложных запросов)
-- ============================================================================

-- 2.1. Полная карточка всех заявок: тема, статус, категория, ФИО заявителя и исполнителя (с обработкой NULL)
SELECT
    r.id AS request_id,
    r.subject,
    s.name AS status_name,
    c.name AS category_name,
    applicant.full_name AS applicant_name,
    COALESCE(executor.full_name, 'Не назначен') AS executor_name,
    r.created_at
FROM requests r
JOIN statuses s ON r.status_id = s.id
JOIN categories c ON r.category_id = c.id
JOIN users applicant ON r.applicant_id = applicant.id
LEFT JOIN users executor ON r.executor_id = executor.id
ORDER BY r.created_at DESC;

-- 2.2. Статистика по исполнителям: сколько всего заявок назначено, сколько в работе и сколько выполнено
SELECT
    u.full_name AS executor_name,
    COUNT(r.id) AS total_assigned,
    SUM(CASE WHEN s.name = 'Выполнено' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN s.name = 'В работе' THEN 1 ELSE 0 END) AS in_progress_count
FROM users u
JOIN requests r ON u.id = r.executor_id
JOIN statuses s ON r.status_id = s.id
WHERE u.role = 'Исполнитель'
GROUP BY u.id, u.full_name
ORDER BY completed_count DESC;

-- 2.3. Заявки, у которых есть комментарии, с подсчетом их количества и датой последнего комментария
SELECT
    r.id,
    r.subject,
    COUNT(c.id) AS comments_count,
    MAX(c.created_at) AS last_comment_date
FROM requests r
LEFT JOIN comments c ON r.id = c.request_id
GROUP BY r.id, r.subject
HAVING COUNT(c.id) > 0
ORDER BY comments_count DESC;

-- 2.4. Топ-3 исполнителя по количеству закрытых заявок
SELECT
    u.full_name,
    COUNT(r.id) AS closed_requests
FROM users u
JOIN requests r ON u.id = r.executor_id
JOIN statuses s ON r.status_id = s.id
WHERE s.name = 'Закрыта'
GROUP BY u.id, u.full_name
ORDER BY closed_requests DESC
LIMIT 3;

-- 2.5. Активность пользователей (сколько заявок создали и сколько комментариев оставили)
SELECT
    u.full_name,
    u.role,
    (SELECT COUNT(*) FROM requests WHERE applicant_id = u.id) AS created_requests,
    (SELECT COUNT(*) FROM comments WHERE author_id = u.id) AS left_comments
FROM users u
ORDER BY created_requests DESC, left_comments DESC;


-- ============================================================================
-- БЛОК 3: UPDATE (2 запроса)
-- ============================================================================

-- 3.1. Назначение исполнителя на новую заявку и перевод её в статус «в работе»
UPDATE requests
SET
    executor_id = (SELECT id FROM users WHERE login = 'exec2'),
    status_id = (SELECT id FROM statuses WHERE name = 'В работе')
WHERE id = 1
  AND status_id = (SELECT id FROM statuses WHERE name = 'Новая');

-- 3.2. Блокировка пользователя, но только если у него нет незакрытых заявок (защита от «подвешивания» задач)
UPDATE users
SET is_blocked = 1
WHERE login = 'user2'
  AND id NOT IN (
      SELECT applicant_id FROM requests
      WHERE status_id IN (SELECT id FROM statuses WHERE name IN ('Новая', 'В работе'))
  );


-- ============================================================================
-- БЛОК 4: DELETE (2 запроса)
-- ============================================================================

-- 4.1. Удаление всех комментариев, оставленных заблокированными пользователями к незакрытым заявкам
DELETE FROM comments
WHERE author_id IN (SELECT id FROM users WHERE is_blocked = 1)
  AND request_id IN (
      SELECT id FROM requests
      WHERE status_id != (SELECT id FROM statuses WHERE name = 'Закрыта')
  );

-- 4.2. Удаление «зависших» заявок: без исполнителя, в статусе «Новая», созданных более 30 дней назад
DELETE FROM requests
WHERE executor_id IS NULL
  AND status_id = (SELECT id FROM statuses WHERE name = 'Новая')
  AND created_at < datetime('now', '-30 days');


-- ============================================================================
-- БЛОК 5: SELECT с WHERE (3 запроса)
-- ============================================================================

-- 5.1. Поиск заявок по ключевому слову в теме или описании, находящихся в активных статусах
SELECT id, subject, description, created_at
FROM requests
WHERE (subject LIKE '%компьютер%' OR description LIKE '%компьютер%')
  AND status_id IN (SELECT id FROM statuses WHERE name IN ('Новая', 'В работе'))
ORDER BY created_at DESC;

-- 5.2. Список «свободных» исполнителей, у которых нет активных задач в работе
SELECT u.id, u.full_name
FROM users u
WHERE u.role = 'Исполнитель'
  AND u.is_blocked = 0
  AND u.id NOT IN (
      SELECT executor_id FROM requests
      WHERE status_id IN (SELECT id FROM statuses WHERE name IN ('Новая', 'В работе'))
        AND executor_id IS NOT NULL
  );

-- 5.3. Заявки за последние 7 дней от конкретных заявителей (не заблокированных), кроме закрытых
SELECT r.id, r.subject, r.created_at, u.full_name AS applicant_name
FROM requests r
JOIN users u ON r.applicant_id = u.id
WHERE r.created_at >= datetime('now', '-7 days')
  AND r.status_id != (SELECT id FROM statuses WHERE name = 'Закрыта')
  AND u.is_blocked = 0;


-- ============================================================================
-- БЛОК 6: SELECT с JOIN (2 запроса)
-- ============================================================================

-- 6.1. Вывод всех заявок вместе с комментариями (LEFT JOIN, чтобы показать заявки и без комментариев)
SELECT
    r.id AS request_id,
    r.subject,
    c.text AS comment_text,
    u.full_name AS comment_author,
    c.created_at AS comment_date
FROM requests r
LEFT JOIN comments c ON r.id = c.request_id
LEFT JOIN users u ON c.author_id = u.id
ORDER BY r.id, c.created_at;

-- 6.2. Список заявок, где заявитель и исполнитель — разные люди, с указанием их ролей (двойной JOIN)
SELECT
    r.id AS request_id,
    r.subject,
    applicant.full_name AS applicant_name,
    applicant.role AS applicant_role,
    executor.full_name AS executor_name,
    executor.role AS executor_role
FROM requests r
JOIN users applicant ON r.applicant_id = applicant.id
JOIN users executor ON r.executor_id = executor.id
WHERE applicant.id != executor.id;