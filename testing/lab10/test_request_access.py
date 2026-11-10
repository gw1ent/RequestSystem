def test_applicant_cannot_view_another_users_request(client, login, test_data):
    """Заявитель не может просматривать чужую заявку."""
    login("user1", "User123!")

    request_id = test_data["requests"][
        'Нужен доступ к папке "Отчеты"'
    ]

    response = client.get(f"/api/requests/{request_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Нет доступа к этой заявке"


def test_executor_cannot_complete_another_executors_request(
    client, login, test_data
):
    """Исполнитель не может завершить чужую назначенную заявку."""
    login("exec1", "Exec123!")

    request_id = test_data["requests"][
        "Нужен доступ к папке \"Отчеты\""
    ]

    response = client.patch(
        f"/api/requests/{request_id}/status"
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Можно завершать только назначенные вам заявки"
    )