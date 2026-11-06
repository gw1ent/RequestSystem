from fastapi import APIRouter, Depends, HTTPException, status

from src.controllers.auth_dependency import (
    get_current_user,
    require_roles
)
from src.schemas.request_schema import (
    RequestCreate,
    RequestUpdate,
    ExecutorAssign
)
from src.services import request_service


router = APIRouter(
    prefix="/api/requests",
    tags=["Заявки"]
)


@router.get("/")
def get_requests(
    user: dict = Depends(get_current_user)
):
    """Возвращает список заявок в зависимости от роли пользователя."""

    role = user["role"]

    if role == "Заявитель":
        return request_service.get_requests_by_applicant(user["id"])

    if role == "Исполнитель":
        return request_service.get_requests_by_executor(user["id"])

    if role in ("Оператор", "Администратор"):
        return request_service.get_all_requests()

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Недостаточно прав для просмотра заявок"
    )

@router.get("/{request_id}")
def get_request(
    request_id: int,
    user: dict = Depends(get_current_user)
):
    """Возвращает заявку с проверкой прав доступа."""

    request = request_service.get_request(request_id)

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )

    role = user["role"]

    if role == "Заявитель":
        if request["applicant_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к этой заявке"
            )

    elif role == "Исполнитель":
        if request["executor_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Эта заявка вам не назначена"
            )

    elif role not in ("Оператор", "Администратор"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра заявки"
        )

    return request

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_request(
    data: RequestCreate,
    user: dict = Depends(require_roles("Заявитель"))
):
    """Создаёт новую заявку от имени текущего заявителя."""

    try:
        request = request_service.create_request(
            subject=data.subject,
            description=data.description,
            applicant_id=user["id"],
            category_id=data.category_id
        )

        return request

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        ) from error

@router.patch("/{request_id}")
def update_request(
    request_id: int,
    data: RequestUpdate,
    user: dict = Depends(require_roles("Администратор"))
):
    """Изменяет данные заявки."""

    try:
        request = request_service.update_request(
            request_id=request_id,
            subject=data.subject,
            description=data.description,
            category_id=data.category_id
        )

        return request

    except ValueError as error:
        message = str(error)

        error_status = (
            status.HTTP_404_NOT_FOUND
            if message == "Заявка не найдена"
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=error_status,
            detail=message
        ) from error

@router.patch("/{request_id}/executor")
def assign_executor(
    request_id: int,
    data: ExecutorAssign,
    user: dict = Depends(
        require_roles("Оператор", "Администратор")
    )
):
    """Назначает исполнителя на заявку."""

    try:
        return request_service.assign_executor(
            request_id=request_id,
            executor_id=data.executor_id
        )

    except ValueError as error:
        message = str(error)

        error_status = (
            status.HTTP_404_NOT_FOUND
            if message in (
                "Заявка не найдена",
                "Исполнитель не найден"
            )
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=error_status,
            detail=message
        ) from error

@router.patch("/{request_id}/status")
def complete_request(
    request_id: int,
    user: dict = Depends(require_roles("Исполнитель"))
):
    """Завершает заявку текущего исполнителя."""

    try:
        return request_service.complete_request(
            request_id=request_id,
            executor_id=user["id"]
        )

    except ValueError as error:
        message = str(error)

        error_status = (
            status.HTTP_404_NOT_FOUND
            if message in (
                "Заявка не найдена",
                "Исполнитель не найден"
            )
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=error_status,
            detail=message
        ) from error

@router.patch("/{request_id}/close")
def close_request(
    request_id: int,
    user: dict = Depends(
        require_roles("Оператор", "Администратор")
    )
):
    """Закрывает заявку от имени оператора или администратора."""

    try:
        return request_service.close_request(
            request_id=request_id,
            actor_id=user["id"]
        )

    except ValueError as error:
        message = str(error)

        error_status = (
            status.HTTP_404_NOT_FOUND
            if message in (
                "Заявка не найдена",
                "Пользователь не найден"
            )
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=error_status,
            detail=message
        ) from error

@router.delete("/{request_id}")
def delete_request(
    request_id: int,
    user: dict = Depends(require_roles("Администратор"))
):
    """Удаляет заявку."""

    try:
        request_service.delete_request(request_id)

        return {
            "message": "Заявка успешно удалена"
        }

    except ValueError as error:
        message = str(error)

        error_status = (
            status.HTTP_404_NOT_FOUND
            if message == "Заявка не найдена"
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=error_status,
            detail=message
        ) from error