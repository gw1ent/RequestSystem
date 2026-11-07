from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from src.controllers.auth_controller import router as auth_router
from src.controllers.user_controller import router as user_router
from src.controllers.category_controller import router as category_router
from src.controllers.request_controller import router as request_router
from src.controllers.status_controller import router as status_router
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.config.settings import (
    SESSION_SECRET_KEY,
    SESSION_HTTPS_ONLY,
    SESSION_MAX_AGE
)


if not SESSION_SECRET_KEY:
    raise RuntimeError(
        "Не задан секретный ключ SESSION_SECRET_KEY"
    )


app = FastAPI(
    title="Система учёта заявок",
    description="Веб-приложение для работы с заявками",
    version="1.0.0"
)

# Пути к HTML-страницам и статическим файлам
PRESENTATION_DIR = Path(__file__).resolve().parent / "presentation"
TEMPLATES_DIR = PRESENTATION_DIR / "templates"
STATIC_DIR = PRESENTATION_DIR / "static"

# Подключение CSS и JavaScript
app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    max_age=SESSION_MAX_AGE,
    same_site="lax",
    https_only=SESSION_HTTPS_ONLY
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(category_router)
app.include_router(request_router)
app.include_router(status_router)

# Главная страница
@app.get("/", include_in_schema=False)
def index_page():
    return FileResponse(TEMPLATES_DIR / "index.html")


# Страница входа
@app.get("/login.html", include_in_schema=False)
def login_page():
    return FileResponse(TEMPLATES_DIR / "login.html")


# Список заявок
@app.get("/tickets.html", include_in_schema=False)
def tickets_page():
    return FileResponse(TEMPLATES_DIR / "tickets.html")


# Создание заявки
@app.get("/ticket-create.html", include_in_schema=False)
def ticket_create_page():
    return FileResponse(TEMPLATES_DIR / "ticket-create.html")


# Просмотр заявки
@app.get("/ticket-view.html", include_in_schema=False)
def ticket_view_page():
    return FileResponse(TEMPLATES_DIR / "ticket-view.html")


# Редактирование заявки
@app.get("/ticket-edit.html", include_in_schema=False)
def ticket_edit_page():
    return FileResponse(TEMPLATES_DIR / "ticket-edit.html")


# Панель администратора
@app.get("/admin.html", include_in_schema=False)
def admin_page():
    return FileResponse(TEMPLATES_DIR / "admin.html")