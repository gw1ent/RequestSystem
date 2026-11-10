
import pytest

from src.services import request_service


def test_create_request_success(test_data):
    """Заявитель может создать новую заявку."""

    result = request_service.create_request(
        subject="  Проверка автоматического теста  ",
        description="  Тестовое описание заявки  ",
        applicant_id=test_data["users"]["user1"],
        category_id=test_data["categories"]["Другое"]
    )

    assert result is not None
    assert result["subject"] == "Проверка автоматического теста"
    assert result["description"] == "Тестовое описание заявки"
    assert result["applicant_id"] == test_data["users"]["user1"]
    assert result["status_name"] == "Новая"


def test_blocked_user_cannot_create_request(test_data):
    """Заблокированный заявитель не может создать заявку."""

    with pytest.raises(
        ValueError,
        match="Заблокированный пользователь"
    ):
        request_service.create_request(
            subject="Тестовая заявка",
            description="Описание тестовой заявки",
            applicant_id=test_data["users"]["user2"],
            category_id=test_data["categories"]["Другое"]
        )


def test_assign_executor_success(test_data):
    """Назначение исполнителя переводит заявку в работу."""

    request_id = test_data["requests"]["Не включается компьютер"]
    executor_id = test_data["users"]["exec1"]

    result = request_service.assign_executor(
        request_id=request_id,
        executor_id=executor_id
    )

    assert result is not None
    assert result["executor_id"] == executor_id
    assert result["status_name"] == "В работе"


def test_complete_assigned_request_success(test_data):
    """Назначенный исполнитель может выполнить заявку."""

    request_id = test_data["requests"][
        "Не работает корпоративная почта"
    ]
    executor_id = test_data["users"]["exec1"]

    result = request_service.complete_request(
        request_id=request_id,
        executor_id=executor_id
    )

    assert result is not None
    assert result["executor_id"] == executor_id
    assert result["status_name"] == "Выполнено"
