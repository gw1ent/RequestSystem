// ============================================================
// ticket-create.js — создание заявки (только для заявителя)
// Работает через REST API.
// ============================================================

async function apiJson(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options });

    if (response.status === 401) {
        window.location.replace('./login.html');
        throw new Error('Не авторизован');
    }

    if (!response.ok) {
        let message = `Ошибка запроса (${response.status})`;
        try {
            const data = await response.json();
            if (data.detail) message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } catch (e) {}
        throw new Error(message);
    }

    return response.json();
}

let currentUser = null;

async function init() {
    try {
        const [meData, catData] = await Promise.all([
            apiJson('/api/auth/me'),
            apiJson('/api/categories/')
        ]);

        currentUser = meData.user;

        if (currentUser.role !== 'Заявитель') {
            window.location.replace('./tickets.html');
            return;
        }

        // Заголовок
        const roleBadge = document.getElementById('roleBadge');
        roleBadge.textContent = 'Заявитель';
        roleBadge.classList.add('role-applicant');
        document.getElementById('userAvatar').textContent =
            (currentUser.full_name || '?').charAt(0);
        document.getElementById('userName').textContent =
            currentUser.full_name || '';

        // Категории
        const catSelect = document.getElementById('category');
        catData.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            catSelect.appendChild(opt);
        });

        setupForm();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Попробуйте обновить страницу.');
    }
}

function setupForm() {
    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');
    const catSelect = document.getElementById('category');

    let touched = { title: false, category: false, description: false };
    let submitted = false;

    function validate() {
        const errors = {};
        const t = titleInput.value.trim();
        const d = descInput.value.trim();
        const c = catSelect.value;

        if (!t) errors.title = 'Тема заявки обязательна для заполнения';
        else if (t.length < 5) errors.title = 'Тема должна содержать не менее 5 символов';
        if (!d) errors.description = 'Описание обязательно для заполнения';
        else if (d.length < 10) errors.description = 'Описание должно содержать не менее 10 символов';
        if (!c) errors.category = 'Необходимо выбрать категорию';

        ['title', 'category', 'description'].forEach(f => {
            const show = (touched[f] || submitted) && errors[f];
            const el = document.getElementById(f);
            const errEl = document.getElementById(f + 'Error');
            el.classList.toggle('error', !!show);
            if (show) {
                errEl.querySelector('span').textContent = errors[f];
                errEl.classList.add('show');
            } else {
                errEl.classList.remove('show');
            }
        });

        return errors;
    }

    titleInput.addEventListener('blur', () => { touched.title = true; validate(); });
    descInput.addEventListener('blur', () => { touched.description = true; validate(); });
    catSelect.addEventListener('blur', () => { touched.category = true; validate(); });
    titleInput.addEventListener('input', () => { if (touched.title || submitted) validate(); });
    descInput.addEventListener('input', () => { if (touched.description || submitted) validate(); });
    catSelect.addEventListener('change', () => { touched.category = true; validate(); });

    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        submitted = true;

        const errors = validate();
        if (Object.keys(errors).length > 0) return;

        const submitBtn = e.target.querySelector('.btn-submit');
        submitBtn.disabled = true;

        try {
            const created = await apiJson('/api/requests/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: titleInput.value.trim(),
                    description: descInput.value.trim(),
                    category_id: Number(catSelect.value)
                })
            });

            window.location.href = './ticket-view.html?id=' + created.id +
                '&toast=' + encodeURIComponent('Заявка №' + created.id + ' успешно создана');

        } catch (error) {
            alert(error.message);
            submitBtn.disabled = false;
        }
    });

    function goBack() { window.location.href = './tickets.html'; }
    document.getElementById('btnBack').onclick = goBack;
    document.getElementById('btnCancel').onclick = goBack;

    document.getElementById('btnLogout').onclick = () => {
        document.getElementById('logoutModal').style.display = 'flex';
    };
    document.getElementById('logoutCancel').onclick = () => {
        document.getElementById('logoutModal').style.display = 'none';
    };
    document.getElementById('logoutConfirm').onclick = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) { console.error(e); }
        window.location.replace('./login.html');
    };
}

init();