// ============================================================
// ticket-edit.js — редактирование заявки (только администратор)
// ============================================================

function escHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

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
let ticketId = null;

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    ticketId = Number(urlParams.get('id'));

    if (!ticketId || Number.isNaN(ticketId)) {
        window.location.replace('./tickets.html');
        return;
    }

    try {
        const meData = await apiJson('/api/auth/me');
        currentUser = meData.user;

        if (currentUser.role !== 'Администратор') {
            window.location.replace('./ticket-view.html?id=' + ticketId);
            return;
        }

        document.getElementById('roleBadge').textContent = 'Администратор';
        document.getElementById('roleBadge').classList.add('role-admin');
        document.getElementById('userAvatar').textContent =
            (currentUser.full_name || '?').charAt(0);
        document.getElementById('userName').textContent =
            currentUser.full_name || '';
        document.getElementById('navAdmin').style.display = 'flex';

        const [request, catsData] = await Promise.all([
            apiJson(`/api/requests/${ticketId}`),
            apiJson('/api/categories/')
        ]);

        setupForm(request, catsData);

    } catch (error) {
        console.error('Ошибка инициализации:', error);
        document.querySelector('.content-wrap').innerHTML =
            '<div style="text-align:center;padding:3rem">' +
            '<p style="color:#6b7280">' + escHtml(error.message) + '</p>' +
            '<a href="./tickets.html" style="color:#2563eb;margin-top:1rem;display:inline-block">Вернуться к списку</a>' +
            '</div>';
    }
}

function setupForm(ticket, categories) {
    document.getElementById('pageTitle').textContent = 'Редактирование #' + ticket.id;
    document.getElementById('infoBox').innerHTML =
        '<strong>Информация:</strong> Заявитель (' + escHtml(ticket.applicant_name) +
        ') и номер заявки не могут быть изменены.';

    const catSelect = document.getElementById('category');
    const optEmpty = document.createElement('option');
    optEmpty.value = '';
    optEmpty.textContent = 'Выберите категорию';
    catSelect.appendChild(optEmpty);

    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
    });

    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');

    titleInput.value = ticket.subject;
    descInput.value = ticket.description;
    catSelect.value = String(ticket.category_id);

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

    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        submitted = true;

        const errors = validate();
        if (Object.keys(errors).length > 0) return;

        const submitBtn = e.target.querySelector('.btn-submit');
        submitBtn.disabled = true;

        try {
            await apiJson(`/api/requests/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: titleInput.value.trim(),
                    description: descInput.value.trim(),
                    category_id: Number(catSelect.value)
                })
            });

            document.getElementById('successBox').style.display = 'flex';
            setTimeout(() => {
                window.location.href = './ticket-view.html?id=' + ticketId;
            }, 1000);

        } catch (error) {
            alert(error.message);
            submitBtn.disabled = false;
        }
    });

    function goBack() {
        window.location.href = './ticket-view.html?id=' + ticketId;
    }
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