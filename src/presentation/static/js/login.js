
// ===== Проверка существующей серверной сессии =====

const form = document.getElementById('loginForm');
const loginInput = document.getElementById('login');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const passwordError = document.getElementById('passwordError');
const alertBox = document.getElementById('alertBox');
const alertText = document.getElementById('alertText');
const submitBtn = document.getElementById('submitBtn');

let touched = { login: false, password: false };
let submitted = false;

async function checkExistingSession() {
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (response.ok) {
            window.location.href = './tickets.html';
        }
    } catch (error) {
        console.error('Не удалось проверить сессию:', error);
    }
}

checkExistingSession();

// ===== Валидация формы =====

function validate() {
    const l = !loginInput.value.trim();
    const p = !passwordInput.value.trim();

    const showL = (touched.login || submitted) && l;
    const showP = (touched.password || submitted) && p;

    loginInput.classList.toggle('error', showL);
    passwordInput.classList.toggle('error', showP);

    loginError.style.display = showL ? 'flex' : 'none';
    passwordError.style.display = showP ? 'flex' : 'none';

    return !l && !p;
}

loginInput.addEventListener('blur', () => {
    touched.login = true;
    validate();
});

passwordInput.addEventListener('blur', () => {
    touched.password = true;
    validate();
});

loginInput.addEventListener('input', () => {
    if (touched.login || submitted) validate();
});

passwordInput.addEventListener('input', () => {
    if (touched.password || submitted) validate();
});

// ===== Серверная авторизация =====

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitted = true;
    alertBox.style.display = 'none';

    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div> Вход...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                login: loginInput.value.trim(),
                password: passwordInput.value
            })
        });

        if (response.ok) {
            window.location.href = './tickets.html';
            return;
        }

        if (response.status === 401) {
            alertText.textContent = 'Неверный логин или пароль';
        } else if (response.status === 422) {
            alertText.textContent = 'Проверьте правильность введённых данных';
        } else {
            alertText.textContent = 'Ошибка сервера. Попробуйте позже';
        }

        alertBox.style.display = 'flex';

    } catch (error) {
        console.error('Ошибка авторизации:', error);
        alertText.textContent = 'Не удалось связаться с сервером';
        alertBox.style.display = 'flex';

    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Войти в систему';
    }
});
