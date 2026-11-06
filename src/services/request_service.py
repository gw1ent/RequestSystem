from src.repositories import request_repository
from src.repositories import user_repository
from src.repositories import category_repository


def get_request(request_id: int):
    """Возвращает заявку по её ID."""
    return request_repository.get_request_by_id(request_id)


def get_all_requests():
    """Возвращает список всех заявок."""
    return request_repository.get_all_requests()


def get_requests_by_applicant(applicant_id: int):
    """Возвращает заявки указанного заявителя."""
    return request_repository.get_requests_by_applicant(applicant_id)


def request_exists(request_id: int) -> bool:
    """Проверяет, существует ли заявка."""
    return get_request(request_id) is not None


def create_request(
    subject: str,
    description: str,
    applicant_id: int,
    category_id: int
):
    """Проверяет данные и создаёт новую заявку."""

    if not subject or not subject.strip():
        raise ValueError("Тема заявки не может быть пустой")

    if not description or not description.strip():
        raise ValueError("Описание заявки не может быть пустым")

    applicant = user_repository.get_user_by_id(applicant_id)

    if applicant is None:
        raise ValueError("Заявитель не найден")

    if applicant["role"] != "Заявитель":
        raise ValueError("Создавать заявки может только заявитель")

    if applicant["is_blocked"]:
        raise ValueError("Заблокированный пользователь не может создавать заявки")

    if category_repository.get_category_by_id(category_id) is None:
        raise ValueError("Категория не найдена")

    status_id = request_repository.get_status_id_by_name("Новая")

    if status_id is None:
        raise ValueError("Статус «Новая» не найден")

    return request_repository.create_request(
        subject=subject.strip(),
        description=description.strip(),
        applicant_id=applicant_id,
        category_id=category_id,
        status_id=status_id
    )

def update_request(
    request_id: int,
    subject: str,
    description: str,
    category_id: int
):
    """Проверяет данные и обновляет заявку."""

    if not subject or not subject.strip():
        raise ValueError("Тема заявки не может быть пустой")

    if not description or not description.strip():
        raise ValueError("Описание заявки не может быть пустым")

    if request_repository.get_request_by_id(request_id) is None:
        raise ValueError("Заявка не найдена")

    if category_repository.get_category_by_id(category_id) is None:
        raise ValueError("Категория не найдена")

    updated = request_repository.update_request(
        request_id=request_id,
        subject=subject.strip(),
        description=description.strip(),
        category_id=category_id
    )

    if updated is None:
        raise ValueError("Заявка не найдена")

    return updated

def assign_executor(request_id: int, executor_id: int):
    """Проверяет исполнителя и назначает его на заявку."""

    request = request_repository.get_request_by_id(request_id)

    if request is None:
        raise ValueError("Заявка не найдена")

    new_status_id = request_repository.get_status_id_by_name("Новая")
    in_progress_status_id = request_repository.get_status_id_by_name(
        "В работе"
    )

    if new_status_id is None or in_progress_status_id is None:
        raise ValueError("Не найдены необходимые статусы")

    if request["status_id"] not in (
        new_status_id,
        in_progress_status_id
    ):
        raise ValueError("Нельзя назначить исполнителя на эту заявку")

    executor = user_repository.get_user_by_id(executor_id)

    if executor is None:
        raise ValueError("Исполнитель не найден")

    if executor["role"] != "Исполнитель":
        raise ValueError("Пользователь не является исполнителем")

    if executor["is_blocked"]:
        raise ValueError("Нельзя назначить заблокированного исполнителя")

    assigned = request_repository.assign_executor(
        request_id=request_id,
        executor_id=executor_id,
        new_status_id=new_status_id,
        in_progress_status_id=in_progress_status_id
    )

    if assigned is None:
        raise ValueError("Не удалось назначить исполнителя")

    return assigned

def complete_request(request_id: int, executor_id: int):
    """Завершает заявку от имени назначенного исполнителя."""

    request = request_repository.get_request_by_id(request_id)

    if request is None:
        raise ValueError("Заявка не найдена")

    executor = user_repository.get_user_by_id(executor_id)

    if executor is None:
        raise ValueError("Исполнитель не найден")

    if executor["role"] != "Исполнитель":
        raise ValueError("Только исполнитель может завершить заявку")

    if executor["is_blocked"]:
        raise ValueError("Заблокированный пользователь не может завершить заявку")

    if request["executor_id"] != executor_id:
        raise ValueError("Можно завершать только назначенные вам заявки")

    in_progress_status_id = request_repository.get_status_id_by_name(
        "В работе"
    )
    completed_status_id = request_repository.get_status_id_by_name(
        "Выполнено"
    )

    if in_progress_status_id is None or completed_status_id is None:
        raise ValueError("Не найдены необходимые статусы")

    if request["status_id"] != in_progress_status_id:
        raise ValueError("Завершить можно только заявку со статусом «В работе»")

    updated = request_repository.update_request_status(
        request_id=request_id,
        new_status_id=completed_status_id,
        allowed_status_ids=[in_progress_status_id]
    )

    if updated is None:
        raise ValueError("Не удалось завершить заявку")

    return updated


def close_request(request_id: int, actor_id: int):
    """Закрывает новую или выполненную заявку."""

    request = request_repository.get_request_by_id(request_id)

    if request is None:
        raise ValueError("Заявка не найдена")

    actor = user_repository.get_user_by_id(actor_id)

    if actor is None:
        raise ValueError("Пользователь не найден")

    if actor["role"] not in ("Оператор", "Администратор"):
        raise ValueError("Закрывать заявки может только оператор или администратор")

    if actor["is_blocked"]:
        raise ValueError("Заблокированный пользователь не может закрывать заявки")

    new_status_id = request_repository.get_status_id_by_name("Новая")
    completed_status_id = request_repository.get_status_id_by_name(
        "Выполнено"
    )
    closed_status_id = request_repository.get_status_id_by_name("Закрыта")

    if (
        new_status_id is None
        or completed_status_id is None
        or closed_status_id is None
    ):
        raise ValueError("Не найдены необходимые статусы")

    if request["status_id"] not in (new_status_id, completed_status_id):
        raise ValueError("Можно закрыть только новую или выполненную заявку")

    updated = request_repository.update_request_status(
        request_id=request_id,
        new_status_id=closed_status_id,
        allowed_status_ids=[new_status_id, completed_status_id]
    )

    if updated is None:
        raise ValueError("Не удалось закрыть заявку")

    return updated