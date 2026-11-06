import os


# Секретный ключ для подписи пользовательских сессий
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "")

# Использовать защищённые cookie только при работе через HTTPS
SESSION_HTTPS_ONLY = (
    os.getenv("SESSION_HTTPS_ONLY", "false").lower() == "true"
)

# Срок жизни сессии — 8 часов
SESSION_MAX_AGE = 8 * 60 * 60