// ============================================================
// admin.js — панель администратора
// Все операции выполняются через REST API (без localStorage).
// ============================================================

function escHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

// Маппинг код → русское имя роли (для фильтров и форм)
const ROLE_BY_CODE = {
    'admin': 'Администратор',
    'operator': 'Оператор',
    'executor': 'Исполнитель',
    'applicant': 'Заявитель'
};

// ===== API-хелперы =====

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...options
    });

    if (response.status === 401) {
        window.location.replace('./login.html');
        throw new Error('Не авторизован');
    }

    return response;
}

async function apiJson(url, options = {}) {
    const response = await apiFetch(url, options);

    if (!response.ok) {
        let message = `Ошибка запроса (${response.status})`;
        try {
            const data = await response.json();
            if (data.detail) {
                message = typeof data.detail === 'string'
                    ? data.detail
                    : JSON.stringify(data.detail);
            }
        } catch (e) { /* тело не JSON */ }
        throw new Error(message);
    }

    return response.json();
}

// ===== Состояние =====

let currentUser = null;
let editingCatId = null;
let usersData = [];
let categoriesData = [];

// ===== Инициализация =====

async function init() {
    try {
        const data = await apiJson('/api/auth/me');
        currentUser = data.user;

        if (currentUser.role !== 'Администратор') {
            window.location.replace('./tickets.html');
            return;
        }

        document.getElementById('userAvatar').textContent =
            (currentUser.full_name || '?').charAt(0);
        document.getElementById('userName').textContent =
            currentUser.full_name || '';

        await Promise.all([loadUsers(), loadCategories()]);

        renderUsers();
        renderCategories();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

async function loadUsers() {
    const data = await apiJson('/api/users/');
    usersData = data.users;
}

async function loadCategories() {
    const data = await apiJson('/api/categories/');
    categoriesData = data.categories;
}

// ===== Табы =====

function switchTab(tab) {
    document.getElementById('tabUsers').classList.toggle('active', tab === 'users');
    document.getElementById('tabCategories').classList.toggle('active', tab === 'categories');
    document.getElementById('usersSection').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('categoriesSection').style.display = tab === 'categories' ? 'block' : 'none';
}

// ===== Пользователи =====

const userSearch = document.getElementById('userSearch');
const userRoleFilter = document.getElementById('userRoleFilter');
const userStatusFilter = document.getElementById('userStatusFilter');
const userResetWrap = document.getElementById('userResetWrap');
const userResetBtn = document.getElementById('userResetBtn');
const usersTableBody = document.getElementById('usersTableBody');

function renderUsers() {
    document.getElementById('usersCount').textContent = usersData.length;

    let users = usersData.slice();

    const q = userSearch.value.trim().toLowerCase();
    if (q) {
        users = users.filter(u =>
            (u.full_name || '').toLowerCase().includes(q) ||
            (u.login || '').toLowerCase().includes(q)
        );
    }

    if (userRoleFilter.value) {
        const roleName = ROLE_BY_CODE[userRoleFilter.value];
        users = users.filter(u => u.role === roleName);
    }

    if (userStatusFilter.value === 'active') {
        users = users.filter(u => !u.is_blocked);
    } else if (userStatusFilter.value === 'blocked') {
        users = users.filter(u => !!u.is_blocked);
    }

    userResetWrap.style.display = (
        q || userRoleFilter.value || userStatusFilter.value
    ) ? 'flex' : 'none';

    if (users.length === 0) {
        usersTableBody.innerHTML =
            '<tr><td colspan="5" class="empty-msg">Пользователи не найдены</td></tr>';
        return;
    }

    usersTableBody.innerHTML = users.map(u => {
        const blocked = !!u.is_blocked;
        const isSelf = u.id === currentUser.id;

        return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-cell-avatar">${escHtml((u.full_name || '?').charAt(0))}</div>
              <span class="user-cell-name">${escHtml(u.full_name)}</span>
            </div>
          </td>
          <td class="login-cell">${escHtml(u.login)}</td>
          <td><span class="role-cell">${escHtml(u.role)}</span></td>
          <td>
            <span class="status-badge ${blocked ? 'status-blocked' : 'status-active'}">
              <span class="status-dot ${blocked ? 'dot-blocked' : 'dot-active'}"></span>
              ${blocked ? 'Заблокирован' : 'Активен'}
            </span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="act-btn ${blocked ? 'unblock' : 'block'}"
                      title="${blocked ? 'Разблокировать' : 'Заблокировать'}"
                      aria-label="${blocked ? 'Разблокировать' : 'Заблокировать'}"
                      onclick="toggleBlock(${u.id})"
                      ${isSelf ? 'disabled' : ''}>
                ${blocked
                    ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>'
                    : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>'}
              </button>
              <button class="act-btn" title="Редактировать" aria-label="Редактировать"
                      onclick="showUserModal(${u.id})">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="act-btn danger" title="Удалить" aria-label="Удалить"
                      onclick="showDeleteUserModal(${u.id})"
                      ${isSelf ? 'disabled' : ''}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
}

userSearch.addEventListener('input', renderUsers);
userRoleFilter.addEventListener('change', renderUsers);
userStatusFilter.addEventListener('change', renderUsers);
userResetBtn.addEventListener('click', () => {
    userSearch.value = '';
    userRoleFilter.value = '';
    userStatusFilter.value = '';
    renderUsers();
});

async function toggleBlock(id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;

    try {
        await apiJson(`/api/users/${id}/block`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_blocked: !user.is_blocked })
        });
        await loadUsers();
        renderUsers();
    } catch (error) {
        alert(error.message);
    }
}

function showUserModal(editId) {
    const editUser = editId ? usersData.find(u => u.id === editId) : null;
    const title = editUser ? 'Редактирование пользователя' : 'Новый пользователь';

    const roles = ['Администратор', 'Оператор', 'Исполнитель', 'Заявитель'];
    const roleOptions = roles.map(r =>
        `<option value="${r}" ${editUser && editUser.role === r ? 'selected' : ''}>${r}</option>`
    ).join('');

    // При редактировании пароль не показываем — API не поддерживает смену пароля
    const passwordBlock = editUser ? '' : `
        <div class="form-group">
          <label class="form-label">Пароль</label>
          <input type="text" class="form-input" id="ufPassword" placeholder="Пароль для входа">
          <div class="field-error" id="ufPasswordErr"></div>
        </div>`;

    const html = `
      <div class="modal-overlay" id="userModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" onclick="closeModal('userModal')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">ФИО</label>
              <input type="text" class="form-input" id="ufFullName" value="${editUser ? escHtml(editUser.full_name) : ''}" placeholder="Иванов Иван Иванович">
              <div class="field-error" id="ufFullNameErr"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Логин</label>
              <input type="text" class="form-input" id="ufLogin" value="${editUser ? escHtml(editUser.login) : ''}" placeholder="ivanov">
              <div class="field-error" id="ufLoginErr"></div>
            </div>
            ${passwordBlock}
            <div class="form-group">
              <label class="form-label">Роль</label>
              <select class="form-select" id="ufRole">${roleOptions}</select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" onclick="closeModal('userModal')">Отмена</button>
            <button class="btn-primary" id="btnSaveUser">${editUser ? 'Сохранить' : 'Создать'}</button>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnSaveUser').addEventListener('click', async () => {
        const fullName = document.getElementById('ufFullName').value.trim();
        const login = document.getElementById('ufLogin').value.trim();
        const role = document.getElementById('ufRole').value;
        const passwordEl = document.getElementById('ufPassword');
        const password = passwordEl ? passwordEl.value : null;

        let valid = true;
        const setErr = (id, msg) => {
            const err = document.getElementById(id);
            if (err) err.textContent = msg;
            const input = document.getElementById(id.replace('Err', ''));
            if (input) input.classList.toggle('error', !!msg);
            if (msg) valid = false;
        };

        setErr('ufFullNameErr', !fullName ? 'ФИО обязательно' : '');
        setErr('ufLoginErr', !login ? 'Логин обязателен' : '');
        if (!editUser) setErr('ufPasswordErr', !password ? 'Пароль обязателен' : '');

        if (!valid) return;

        try {
            if (editUser) {
                await apiJson(`/api/users/${editUser.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, full_name: fullName, role })
                });
            } else {
                await apiJson('/api/users/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, password, full_name: fullName, role })
                });
            }
            closeModal('userModal');
            await loadUsers();
            renderUsers();
        } catch (error) {
            if (/логин/i.test(error.message)) {
                setErr('ufLoginErr', 'Пользователь с таким логином уже существует');
            } else {
                alert(error.message);
            }
        }
    });
}

function showDeleteUserModal(id) {
    const html = `
      <div class="modal-overlay" id="deleteUserModal">
        <div class="modal-box">
          <div class="confirm-box">
            <div class="confirm-icon danger">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div class="confirm-title">Удаление пользователя</div>
            <div class="confirm-text">Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.</div>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeModal('deleteUserModal')">Отмена</button>
              <button class="btn-danger" id="btnConfirmDelUser">Удалить</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnConfirmDelUser').addEventListener('click', async () => {
        try {
            await apiJson(`/api/users/${id}`, { method: 'DELETE' });
            closeModal('deleteUserModal');
            await loadUsers();
            renderUsers();
        } catch (error) {
            alert(error.message);
        }
    });
}

// ===== Категории =====

const catSearch = document.getElementById('catSearch');
const catList = document.getElementById('catList');

function renderCategories() {
    document.getElementById('catsCount').textContent = categoriesData.length;

    let cats = categoriesData.slice();
    const q = catSearch.value.trim().toLowerCase();
    if (q) cats = cats.filter(c => c.name.toLowerCase().includes(q));

    if (cats.length === 0) {
        catList.innerHTML = '<div class="empty-msg">Категории не найдены</div>';
        return;
    }

    catList.innerHTML = cats.map(c => {
        if (editingCatId === c.id) {
            return `
              <div class="cat-item">
                <div class="cat-left">
                  <div class="cat-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg></div>
                  <div class="cat-edit-btns">
                    <input type="text" class="cat-edit-input" id="catEditInput" value="${escHtml(c.name)}">
                    <button class="cat-save-btn" onclick="saveCatEdit(${c.id})" aria-label="Сохранить">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    </button>
                    <button class="cat-cancel-btn" onclick="cancelCatEdit()" aria-label="Отмена">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              </div>`;
        }

        return `
          <div class="cat-item">
            <div class="cat-left">
              <div class="cat-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg></div>
              <span class="cat-name">${escHtml(c.name)}</span>
            </div>
            <div class="cat-actions">
              <button class="act-btn" onclick="startCatEdit(${c.id})" aria-label="Редактировать">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="act-btn danger" onclick="showDeleteCatModal(${c.id})" aria-label="Удалить">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>`;
    }).join('');

    if (editingCatId) {
        const input = document.getElementById('catEditInput');
        if (input) {
            input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveCatEdit(editingCatId);
                if (e.key === 'Escape') cancelCatEdit();
            });
        }
    }
}

catSearch.addEventListener('input', renderCategories);

function startCatEdit(id) { editingCatId = id; renderCategories(); }
function cancelCatEdit() { editingCatId = null; renderCategories(); }

async function saveCatEdit(id) {
    const input = document.getElementById('catEditInput');
    if (!input || !input.value.trim()) {
        editingCatId = null;
        renderCategories();
        return;
    }
    try {
        await apiJson(`/api/categories/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: input.value.trim() })
        });
        editingCatId = null;
        await loadCategories();
        renderCategories();
    } catch (error) {
        alert(error.message);
    }
}

function showCategoryModal() {
    const html = `
      <div class="modal-overlay" id="catModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Новая категория</h3>
            <button class="modal-close" onclick="closeModal('catModal')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Название категории</label>
              <input type="text" class="form-input" id="newCatName" placeholder="Введите название категории">
              <div class="field-error" id="catNameErr"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" onclick="closeModal('catModal')">Отмена</button>
            <button class="btn-primary" id="btnAddCat">Добавить</button>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;
    document.getElementById('newCatName').focus();

    document.getElementById('btnAddCat').addEventListener('click', async () => {
        const name = document.getElementById('newCatName').value.trim();
        const errEl = document.getElementById('catNameErr');
        if (!name) {
            errEl.textContent = 'Название категории обязательно';
            return;
        }
        try {
            await apiJson('/api/categories/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            closeModal('catModal');
            await loadCategories();
            renderCategories();
        } catch (error) {
            errEl.textContent = error.message;
        }
    });
}

function showDeleteCatModal(id) {
    const html = `
      <div class="modal-overlay" id="deleteCatModal">
        <div class="modal-box">
          <div class="confirm-box">
            <div class="confirm-icon danger">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            </div>
            <div class="confirm-title">Удаление категории</div>
            <div class="confirm-text">Вы уверены, что хотите удалить эту категорию? Заявки, связанные с ней, останутся.</div>
            <div class="confirm-actions">
              <button class="btn-cancel" onclick="closeModal('deleteCatModal')">Отмена</button>
              <button class="btn-danger" id="btnConfirmDelCat">Удалить</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('modalsContainer').innerHTML = html;

    document.getElementById('btnConfirmDelCat').addEventListener('click', async () => {
        try {
            await apiJson(`/api/categories/${id}`, { method: 'DELETE' });
            closeModal('deleteCatModal');
            await loadCategories();
            renderCategories();
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

// Logout

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

// ===== Запуск =====

init();