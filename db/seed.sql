PRAGMA foreign_keys = OFF;

DELETE FROM comments;
DELETE FROM requests;
DELETE FROM users;
DELETE FROM statuses;
DELETE FROM categories;

DELETE FROM sqlite_sequence;


PRAGMA foreign_keys = ON;


INSERT INTO statuses (name) VALUES
('Новая'),
('В работе'),
('Выполнено'),
('Закрыта');


INSERT INTO categories (name) VALUES
('Техническая неисправность'),
('Проблема с ПО'),
('Проблема с доступом'),
('Другое');

INSERT INTO users (login, password_hash, full_name, role, is_blocked) VALUES
('admin', 'hash_admin_123','Иванов Иван','Администратор', 0),
('operator', 'hash_op_123','Петрова Анна','Оператор', 0),
('exec1', 'hash_exec1_123', 'Сидоров Алексей', 'Исполнитель', 0),
('exec2', 'hash_exec2_123', 'Кузнецова Мария', 'Исполнитель', 0),
('user1', 'hash_user1_123', 'Смирнов Олег', 'Заявитель', 0),
('user2', 'hash_user2_123', 'Васильева Дарья', 'Заявитель', 1);


INSERT INTO requests (subject, description, applicant_id, executor_id, status_id, category_id, created_at) VALUES

('Не включается компьютер', 'При нажатии на кнопку питания ничего не происходит.', 5, NULL, 1, 1, datetime('now', '-2 days')),


('Не работает корпоративная почта', 'Выдает ошибку авторизации при входе в Outlook.', 5, 3, 2, 2, datetime('now', '-1 day')),


('Нужен доступ к папке "Отчеты"', 'Прошу предоставить права на чтение папки.', 6, 4, 3, 3, datetime('now', '-5 hours')),


('Как настроить VPN?', 'Подскажите инструкцию для подключения из дома.', 5, NULL, 4, 4, datetime('now', '-10 days'));


INSERT INTO comments (author_id, request_id, text, created_at) VALUES

(2, 1, 'Передал задачу в отдел техподдержки.', datetime('now', '-1 day')),

(3, 2, 'Проблема на стороне сервера. Чиню.', datetime('now', '-12 hours')),

(5, 2, 'Хорошо, жду. Спасибо!', datetime('now', '-10 hours')),

(4, 3, 'Права выданы. Проверяйте.', datetime('now', '-4 hours'));