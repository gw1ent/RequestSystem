// ============================================================
// ticket-view.js — просмотр заявки и действия по ней
// Работает через REST API.
// ============================================================

function escHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '—';

    const normalized = String(iso).replace(' ', 'T');
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized);

    const d = new Date(
        hasTimezone ? normalized : `${normalized}Z`
    );

    if (Number.isNaN(d.getTime())) return iso;

    return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

// Бэкенд возвращает "Новая" / "В работе" / "Выполнено" / "Закрыта"
const STATUS_CODES = {
    'Новая': 'new',
    'В работе': 'in_progress',
    'Выполнено': 'completed',
    'Закрыта': 'closed'
};

const STATUS_LABELS = {
    'Новая': 'Новая',
    'В работе': 'В работе',
    'Выполнено': 'Выполнена',
    'Закрыта': 'Закрыта'
};

const ROLE_CODES = {
    'Администратор': 'admin',
    'Оператор': 'operator',
    'Исполнитель': 'executor',
    'Заявитель': 'applicant'
};

let currentUser = null;
let ticketId = null;
let ticket = null;
let categories = [];

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

        const roleCode = ROLE_CODES[currentUser.role] || 'applicant';
        document.getElementById('roleBadge').textContent = currentUser.role;
        document.getElementById('roleBadge').classList.add('role-' + roleCode);
        document.getElementById('userAvatar').textContent =
            (currentUser.full_name || '?').charAt(0);
        document.getElementById('userName').textContent =
            currentUser.full_name || '';

        if (currentUser.role === 'Администратор') {
            document.getElementById('navAdmin').style.display = 'flex';
        }

        // Toast из URL
        const toastMsg = urlParams.get('toast');
        if (toastMsg) {
            document.getElementById('toastText').textContent = decodeURIComponent(toastMsg);
            document.getElementById('toast').style.display = 'flex';
            setTimeout(() => {
                document.getElementById('toast').style.display = 'none';
            }, 4000);
            window.history.replaceState({}, '', './ticket-view.html?id=' + ticketId);
        }
        document.getElementById('toastClose').onclick = () => {
            document.getElementById('toast').style.display = 'none';
        };

        const [requestData, catsData] = await Promise.all([
            apiJson(`/api/requests/${ticketId}`),
            apiJson('/api/categories/')
        ]);

        ticket = requestData;
        categories = catsData.categories;

        render();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
        document.getElementById('content').innerHTML =
            '<div style="text-align:center;padding:3rem">' +
            '<p style="color:#6b7280">' + escHtml(error.message) + '</p>' +
            '<a href="./tickets.html" style="color:#2563eb;margin-top:1rem;display:inline-block">Вернуться к списку</a>' +
            '</div>';
    }
}

function render() {
    if (!ticket) return;

    document.getElementById('pageTitle').textContent = 'Заявка #' + ticket.id;
    document.getElementById('headerNav').textContent = 'Заявка #' + ticket.id;

    const statusCode = STATUS_CODES[ticket.status_name] || 'new';
    const statusLabel = STATUS_LABELS[ticket.status_name] || ticket.status_name;

    const isAdmin = currentUser.role === 'Администратор';
    const isOperator = currentUser.role === 'Оператор';
    const isExecutor = currentUser.role === 'Исполнитель';

    // Права — повторяют require_roles на бэкенде
    const canEdit = isAdmin;
    const canDelete = isAdmin;
    const canAssign = (isOperator || isAdmin) && statusCode === 'new';
    const canComplete = (isExecutor || isAdmin)
        && statusCode === 'in_progress'
        && ticket.executor_id === currentUser.id;
    const canClose = (isOperator || isAdmin) && statusCode === 'completed';

    // Кнопки в шапке
    let pageActions = '';
    if (canEdit) {
        pageActions += `<button class="btn-edit" onclick="window.location.href='./ticket-edit.html?id=${ticket.id}'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Редактировать</button>`;
    }
    if (canDelete) {
        pageActions += `<button class="btn-delete" onclick="showDeleteModal()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Удалить</button>`;
    }
    document.getElementById('pageActions').innerHTML = pageActions;

    // Блок действий
    let actionsSection = '';
    if ((canAssign || canComplete || canClose) && statusCode !== 'closed') {
        let btns = '';
        if (canAssign) {
            btns += `<button class="btn-action btn-assign" onclick="showAssignModal()">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                Назначить исполнителя</button>`;
        }
        if (canComplete) {
            btns += `<button class="btn-action btn-complete" onclick="showConfirmModal('completed')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Отметить как выполненную</button>`;
        }
        if (canClose) {
            btns += `<button class="btn-action btn-close" onclick="showConfirmModal('closed')">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Закрыть заявку</button>`;
        }
        if (btns) {
            actionsSection = `<div class="card actions-card">
                <div class="actions-title">Действия</div>
                <div class="actions-row">${btns}</div></div>`;
        }
    }

    document.getElementById('content').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2>${escHtml(ticket.subject)}</h2>
            <p class="date">Создана: ${formatDate(ticket.created_at)}</p>
          </div>
          <span class="status-badge status-${statusCode}">
            <span class="status-dot dot-${statusCode}"></span>${statusLabel}
          </span>
        </div>
        <div class="card-info">
          <div>
            <div class="info-label">Категория</div>
            <div class="info-value">${escHtml(ticket.category_name || 'Не указана')}</div>
          </div>
          <div>
            <div class="info-label">Дата создания</div>
            <div class="info-value">${formatDate(ticket.created_at)}</div>
          </div>
          <div>
            <div class="info-label">Заявитель</div>
            <div class="info-value">${escHtml(ticket.applicant_name)}</div>
          </div>
          <div>
            <div class="info-label">Исполнитель</div>
            <div class="info-value ${ticket.executor_name ? '' : 'empty'}">
              ${ticket.executor_name ? escHtml(ticket.executor_name) : 'Не назначен'}
            </div>
          </div>
          <div>
            <div class="info-label">Статус</div>
            <div class="info-value">${statusLabel}</div>
          </div>
        </div>
        <div class="card-desc">
          <div class="info-label">Описание</div>
          <div class="desc-box"><p>${escHtml(ticket.description)}</p></div>
        </div>
      </div>
      ${actionsSection}
    `;
}

// ===== Назначение исполнителя =====

async function showAssignModal() {
    let executors = [];
    let loadError = null;

    try {
        // Используем специальный эндпоинт, доступный оператору и администратору
        const data = await apiJson('/api/users/executors');
        executors = data.executors;
    } catch (error) {
        loadError = error.message;
    }

    let selectedId = '';
    let query = '';

    const bodyContent = loadError
        ? `<div style="padding:0.75rem;background:#fef2f2;border:1px solid #fecaca;border-radius:0.5rem;font-size:0.875rem;color:#991b1b">
             Не удалось загрузить список исполнителей: ${escHtml(loadError)}
           </div>`
        : `<label class="form-label">Выберите исполнителя</label>
           <div class="autocomplete" id="autocompleteWrap">
             <div class="autocomplete-input-wrap">
               <svg class="ac-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               <input type="text" class="autocomplete-input" id="acInput" placeholder="Начните вводить ФИО...">
               <button class="ac-clear" id="acClear" style="display:none" aria-label="Очистить">
                 <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
               </button>
             </div>
             <div class="ac-dropdown" id="acDropdown" style="display:none"></div>
           </div>`;

    const html = `
      <div class="modal-overlay" id="assignModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Назначить исполнителя</h3>
            <button class="modal-close" onclick="closeModal('assignModal')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">${bodyContent}</div>
          <div class="modal-body modal-footer" style="border-top:1px solid #e5e7eb;padding-top:1rem">
            <button class="btn-cancel" onclick="closeModal('assignModal')">Отмена</button>
            <button class="btn-primary" id="btnAssign" disabled>Назначить</button>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    if (loadError) return;

    const acInput = document.getElementById('acInput');
    const acDropdown = document.getElementById('acDropdown');
    const acClear = document.getElementById('acClear');
    const btnAssign = document.getElementById('btnAssign');

    function renderDropdown() {
        const filtered = executors.filter(e =>
            (e.full_name || '').toLowerCase().includes(query.toLowerCase())
        );
        if (filtered.length === 0) {
            acDropdown.innerHTML = '<div class="ac-empty">Ничего не найдено</div>';
        } else {
            acDropdown.innerHTML = filtered.map(e =>
                `<button class="ac-item ${String(e.id) === String(selectedId) ? 'selected' : ''}" data-id="${e.id}">${escHtml(e.full_name)}</button>`
            ).join('');
        }
        acDropdown.style.display = 'block';
    }

    acInput.addEventListener('focus', renderDropdown);
    acInput.addEventListener('input', () => {
        query = acInput.value;
        selectedId = '';
        btnAssign.disabled = true;
        acClear.style.display = 'none';
        renderDropdown();
    });
    acClear.addEventListener('click', () => {
        selectedId = ''; query = ''; acInput.value = '';
        acClear.style.display = 'none';
        btnAssign.disabled = true;
        acDropdown.style.display = 'none';
    });

    acDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.ac-item');
        if (!item) return;
        selectedId = item.dataset.id;
        const exec = executors.find(x => String(x.id) === String(selectedId));
        acInput.value = exec ? exec.full_name : '';
        query = '';
        acClear.style.display = 'block';
        btnAssign.disabled = false;
        acDropdown.style.display = 'none';
    });

    document.addEventListener('click', function handler(e) {
        const wrap = document.getElementById('autocompleteWrap');
        if (wrap && !wrap.contains(e.target)) {
            acDropdown.style.display = 'none';
        }
    });

    btnAssign.addEventListener('click', async () => {
        if (!selectedId) return;
        try {
            const updated = await apiJson(`/api/requests/${ticketId}/executor`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ executor_id: Number(selectedId) })
            });
            ticket = updated;
            closeModal('assignModal');
            render();
        } catch (error) {
            alert(error.message);
        }
    });
}

// ===== Завершение / закрытие =====

function showConfirmModal(action) {
    const isComplete = action === 'completed';
    const title = isComplete ? 'Завершить заявку' : 'Закрыть заявку';
    const text = isComplete
        ? 'Вы уверены, что хотите отметить заявку как выполненную?'
        : 'Вы уверены, что хотите закрыть эту заявку?';

    const html = `
      <div class="modal-overlay" id="confirmModal">
        <div class="modal-box">
          <div class="confirm-box">
            <div class="confirm-icon info">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="confirm-title">${title}</div>
            <div class="confirm-text">${text}</div>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeModal('confirmModal')">Отмена</button>
              <button class="btn-info" id="btnConfirmAction">Подтвердить</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnConfirmAction').addEventListener('click', async () => {
        const url = isComplete
            ? `/api/requests/${ticketId}/status`
            : `/api/requests/${ticketId}/close`;
        try {
            const updated = await apiJson(url, { method: 'PATCH' });
            ticket = updated;
            closeModal('confirmModal');
            render();
        } catch (error) {
            alert(error.message);
        }
    });
}

// ===== Удаление =====

function showDeleteModal() {
    const html = `
      <div class="modal-overlay" id="deleteModal">
        <div class="modal-box">
          <div class="confirm-box">
            <div class="confirm-icon danger">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div class="confirm-title">Удаление заявки</div>
            <div class="confirm-text">Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить.</div>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeModal('deleteModal')">Отмена</button>
              <button class="btn-danger" id="btnConfirmDelete">Удалить</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
        try {
            await apiJson(`/api/requests/${ticketId}`, { method: 'DELETE' });
            window.location.href = './tickets.html?toast=' +
                encodeURIComponent('Заявка удалена');
        } catch (error) {
            alert(error.message);
        }
    });
}

// ===== Общее =====

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

document.getElementById('btnLogout').onclick = () => {
    const html = `
      <div class="modal-overlay" id="logoutModal">
        <div class="modal-box">
          <div class="confirm-box">
            <div class="confirm-icon" style="background:#fef3c7;color:#d97706">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div class="confirm-title">Выход из системы</div>
            <div class="confirm-text">Вы уверены, что хотите выйти?</div>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeModal('logoutModal')">Остаться</button>
              <button class="btn-warning" id="btnConfirmLogout">Выйти</button>
            </div>
          </div>
        </div>
      </div>`;
    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnConfirmLogout').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (e) { console.error(e); }
        window.location.replace('./login.html');
    });
};

init();