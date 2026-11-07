from src.repositories import status_repository


def get_all_statuses():
    """Возвращает список всех статусов."""
    return status_repository.get_all_statuses()