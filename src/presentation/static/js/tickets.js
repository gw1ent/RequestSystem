// ===== Данные текущего пользователя с сервера =====

const ROLE_LABELS = {
    admin: 'Администратор',
    operator: 'Оператор',
    executor: 'Исполнитель',
    applicant: 'Заявитель'
};

const STATUS_LABELS = {
    new: 'Новая',
    in_progress: 'В работе',
    completed: 'Выполнена',
    closed: 'Закрыта'
};

const ROLE_CODES = {
    'Администратор': 'admin',
    'Оператор': 'operator',
    'Исполнитель': 'executor',
    'Заявитель': 'applicant'
};

// Бэкенд возвращает "Новая" / "В работе" / "Выполнено" / "Закрыта"
const STATUS_CODES = {
    'Новая': 'new',
    'В работе': 'in_progress',
    'Выполнено': 'completed',
    'Закрыта': 'closed'
};

// ===== API-хелпер =====

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

// ===== Данные, загружаемые с сервера =====

let categories = [];
let ticketsData = [];
let currentUser = null;
let deleteTargetId = null;

async function initializePage() {
    try {
        const data = await apiJson('/api/auth/me');
        const user = data.user;

        currentUser = {
            id: user.id,
            login: user.login,
            fullName: user.full_name,
            role: ROLE_CODES[user.role]
        };

        if (!currentUser.role) {
            throw new Error('Неизвестная роль пользователя');
        }

        await startPage();

    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        alert('Не удалось загрузить данные. Попробуйте обновить страницу.');
    }
}

async function startPage() {
    const [categoriesData, requests] = await Promise.all([
        apiJson('/api/categories/'),
        apiJson('/api/requests/')
    ]);

    categories = categoriesData.categories;

    ticketsData = requests.map(request => ({
        id: request.id,
        number: request.id,
        title: request.subject,
        description: request.description,
        applicantId: request.applicant_id,
        applicantName: request.applicant_name,
        executorId: request.executor_id,
        executorName: request.executor_name,
        status: STATUS_CODES[request.status_name],
        categoryId: request.category_id,
        createdAt: request.created_at
    }));

    // Toast из URL
    const urlParams = new URLSearchParams(window.location.search);
    const toastMsg = urlParams.get('toast');
    if (toastMsg) {
        document.getElementById('toastText').textContent = decodeURIComponent(toastMsg);
        document.getElementById('toast').style.display = 'flex';
        setTimeout(() => { document.getElementById('toast').style.display = 'none'; }, 4000);
        window.history.replaceState({}, '', './tickets.html');
    }
    document.getElementById('toastClose').onclick = () => {
        document.getElementById('toast').style.display = 'none';
    };

    // Заголовок
    document.getElementById('roleBadge').textContent = ROLE_LABELS[currentUser.role];
    document.getElementById('roleBadge').classList.add('role-' + currentUser.role);
    document.getElementById('userAvatar').textContent = currentUser.fullName.charAt(0);
    document.getElementById('userName').textContent = currentUser.fullName;

    if (currentUser.role === 'admin') {
        document.getElementById('navAdmin').style.display = 'flex';
    }

    // Заголовок страницы
    const titles = { applicant: 'Мои заявки', executor: 'Назначенные заявки' };
    document.getElementById('pageTitle').textContent = titles[currentUser.role] || 'Все заявки';

    // Кнопка создания
    // Кнопка создания доступна только заявителю
    if (currentUser.role === 'applicant') {
        document.getElementById('btnCreate').style.display = 'inline-flex';
    }

    // Категории в фильтре
    const catSelect = document.getElementById('categoryFilter');
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
    });

    // DOM-элементы
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const resetWrap = document.getElementById('resetWrap');
    const btnReset = document.getElementById('btnReset');
    const ticketList = document.getElementById('ticketList');
    const emptyState = document.getElementById('emptyState');
    const pageCount = document.getElementById('pageCount');

    function formatDate(d) {
        return new Date(d).toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function getCatName(id) {
        const c = categories.find(x => x.id === id);
        return c ? c.name : 'Не указана';
    }

    function render() {
        let tickets = ticketsData.slice();

        // Фильтр по роли
        if (currentUser.role === 'applicant') {
            tickets = tickets.filter(t => t.applicantId === currentUser.id);
        } else if (currentUser.role === 'executor') {
            tickets = tickets.filter(t => t.executorId === currentUser.id);
        }

        const allRoleTickets = tickets.length;
        const hasAny = allRoleTickets > 0;

        // Поиск
        const q = searchInput.value.trim().toLowerCase();
        if (q) {
            tickets = tickets.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.number.toString().includes(q) ||
                t.applicantName.toLowerCase().includes(q)
            );
        }

        // Статус
        if (statusFilter.value) tickets = tickets.filter(t => t.status === statusFilter.value);

        // Категория
        if (categoryFilter.value) {
            tickets = tickets.filter(t => t.categoryId === Number(categoryFilter.value));
        }

        // Сортировка
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Показать/скрыть кнопку сброса
        const hasFilters = q || statusFilter.value || categoryFilter.value;
        resetWrap.style.display = hasFilters ? 'flex' : 'none';

        pageCount.textContent = 'Найдено заявок: ' + tickets.length;

        if (tickets.length === 0) {
            ticketList.style.display = 'none';
            emptyState.style.display = 'block';
            if (!hasAny && currentUser.role === 'applicant') {
                emptyState.innerHTML = `
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  <p>У вас пока нет заявок</p>
                  <button class="btn-create" onclick="window.location.href='./ticket-create.html'">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Создать заявку
                  </button>`;
            } else {
                emptyState.innerHTML = `
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  <p>Заявки не найдены</p>
                  <p class="sub">Попробуйте изменить параметры поиска</p>`;
            }
            return;
        }

        emptyState.style.display = 'none';
        ticketList.style.display = 'flex';
        ticketList.innerHTML = tickets.map(t => `
          <div class="ticket-card" data-id="${t.id}">
            <div class="ticket-card-row">
              <div class="ticket-card-body">
                <div class="ticket-top">
                  <span class="ticket-num">#${t.number}</span>
                  <span class="status-badge status-${t.status}"><span class="status-dot dot-${t.status}"></span>${STATUS_LABELS[t.status]}</span>
                </div>
                <div class="ticket-title">${escHtml(t.title)}</div>
                <div class="ticket-desc">${escHtml(t.description)}</div>
                <div class="ticket-meta">
                  <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>${getCatName(t.categoryId)}</span>
                  <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>${formatDate(t.createdAt)}</span>
                  ${t.executorName ? `<span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>${escHtml(t.executorName)}</span>` : ''}
                </div>
              </div>
              <div class="ticket-actions">
                ${currentUser.role === 'admin' ? `<button class="action-btn" title="Редактировать заявку" aria-label="Редактировать заявку" data-edit="${t.id}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>` : ''}
                ${currentUser.role === 'admin' ? `<button class="action-btn danger" title="Удалить заявку" aria-label="Удалить заявку" data-delete="${t.id}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
              </div>
            </div>
          </div>
        `).join('');

        // Слушатели событий карточек
        ticketList.querySelectorAll('.ticket-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) return;
                window.location.href = './ticket-view.html?id=' + card.dataset.id;
            });
        });
        ticketList.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = './ticket-edit.html?id=' + btn.dataset.edit;
            });
        });
        ticketList.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTargetId = btn.dataset.delete;
                document.getElementById('deleteModal').style.display = 'flex';
            });
        });
    }

    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    searchInput.addEventListener('input', render);
    statusFilter.addEventListener('change', render);
    categoryFilter.addEventListener('change', render);
    btnReset.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        categoryFilter.value = '';
        render();
    });

    // Удаление
    document.getElementById('deleteCancel').onclick = () => {
        document.getElementById('deleteModal').style.display = 'none';
        deleteTargetId = null;
    };

    document.getElementById('deleteConfirm').onclick = async () => {
        if (!deleteTargetId) {
            document.getElementById('deleteModal').style.display = 'none';
            return;
        }
        try {
            await apiJson(`/api/requests/${deleteTargetId}`, { method: 'DELETE' });

            ticketsData = ticketsData.filter(
                ticket => ticket.id !== Number(deleteTargetId)
            );

            deleteTargetId = null;
            document.getElementById('deleteModal').style.display = 'none';

            render();
        } catch (error) {
            alert(error.message);
        }
    };

    // Выход
    document.getElementById('btnLogout').onclick = () => {
        document.getElementById('logoutModal').style.display = 'flex';
    };
    document.getElementById('logoutCancel').onclick = () => {
        document.getElementById('logoutModal').style.display = 'none';
    };
    document.getElementById('logoutConfirm').onclick = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (error) {
            console.error('Ошибка выхода из аккаунта:', error);
        }
        window.location.replace('./login.html');
    };

    render();
}

initializePage();