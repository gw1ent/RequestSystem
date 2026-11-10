def test_create_request_api_success(client, login, test_data):
    """API успешно создаёт заявку авторизованного заявителя."""
    login("user1", "User123!")

    response = client.post(
        "/api/requests/",
        json={
            "subject": "API-тестирование",
            "description": "Проверка успешного создания заявки через API",
            "category_id": test_data["categories"]["Другое"]
        }
    )

    assert response.status_code == 201

    data = response.json()
    assert data["subject"] == "API-тестирование"
    assert data["description"] == "Проверка успешного создания заявки через API"
    assert data["status_name"] == "Новая"


def test_create_request_api_invalid_data(client, login, test_data):
    """API отклоняет заявку с некорректными данными."""
    login("user1", "User123!")

    response = client.post(
        "/api/requests/",
        json={
            "subject": "",
            "description": "Проверка некорректных данных",
            "category_id": test_data["categories"]["Другое"]
        }
    )

    assert response.status_code == 422


def test_create_request_api_invalid_category(client, login):
    """API отклоняет заявку с недопустимым ID категории."""
    login("user1", "User123!")

    response = client.post(
        "/api/requests/",
        json={
            "subject": "Проверка категории",
            "description": "Проверка недопустимого идентификатора категории",
            "category_id": 0
        }
    )

    assert response.status_code == 422


def test_get_nonexistent_request_api(client, login):
    """API возвращает 404 при запросе несуществующей заявки."""
    login("user1", "User123!")

    response = client.get("/api/requests/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Заявка не найдена"