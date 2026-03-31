// =============================================================
// CarNexus - Frontend App Logic (API-Connected Edition)
// =============================================================

const API_BASE = 'http://localhost:5001/api';

// ─── Utility: Session ─────────────────────────────────────
function getSession() {
    try {
        const raw = localStorage.getItem('cn_session');
        if (!raw) return { role: 'guest' };
        const s = JSON.parse(raw);
        // Clear stale sessions that have a role but no token (old format)
        if (s.role && s.role !== 'guest' && !s.token) {
            localStorage.removeItem('cn_session');
            return { role: 'guest' };
        }
        return s;
    } catch {
        return { role: 'guest' };
    }
}

function getToken() {
    const s = getSession();
    return s.token || null;
}

function setSession(data) {
    localStorage.setItem('cn_session', JSON.stringify(data));
}

function clearSession() {
    localStorage.removeItem('cn_session');
}

// ─── Utility: Auth Headers ────────────────────────────────
function authHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// ─── Utility: Handle auth errors globally ─────────────────
function handleAuthError(status) {
    if (status === 401 || status === 403) {
        clearSession();
        showToast('Session expired. Please log in again.', 'error');
        setTimeout(() => {
            const page = window.location.pathname.split('/').pop();
            if (page !== 'login.html') window.location.href = 'login.html';
        }, 1200);
        return true;
    }
    return false;
}

// ─── Utility: Toast Notifications ────────────────────────
window.showToast = function(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#c0392b' : type === 'success' ? '#27ae60' : 'var(--primary)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

// ─── API Client ───────────────────────────────────────────
const api = {
    async get(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'GET',
                headers: authHeaders()
            });
            if (handleAuthError(res.status)) throw new Error('Session expired');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error(`[GET ${endpoint}]`, e.message);
            throw e;
        }
    },

    async post(endpoint, body) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(body)
            });
            if (handleAuthError(res.status)) throw new Error('Session expired');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error(`[POST ${endpoint}]`, e.message);
            throw e;
        }
    },

    async put(endpoint, body) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(body)
            });
            if (handleAuthError(res.status)) throw new Error('Session expired');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error(`[PUT ${endpoint}]`, e.message);
            throw e;
        }
    },

    async delete(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            if (handleAuthError(res.status)) throw new Error('Session expired');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error(`[DELETE ${endpoint}]`, e.message);
            throw e;
        }
    }
};

// ─── RBAC: Page Access Control ────────────────────────────
const PAGE_ROLES = {
    'index.html':       ['guest', 'user', 'admin'],
    'cars.html':        ['guest', 'user', 'admin'],
    'contact.html':     ['guest', 'user', 'admin'],
    'login.html':       ['guest'],
    'bookings.html':    ['user', 'admin'],
    'add-car.html':     ['admin'],
    'manage-cars.html': ['admin'],
    'customers.html':   ['admin'],
    'reports.html':     ['admin'],
    'admin.html':       ['admin']
};

function enforceRBAC() {
    const session = getSession();
    const currentPage = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';
    const allowedRoles = PAGE_ROLES[currentPage] || ['guest', 'user', 'admin'];

    if (!allowedRoles.includes(session.role)) {
        if (session.role === 'guest') {
            window.location.href = 'login.html';
        } else if (session.role === 'user') {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'admin.html';
        }
        return false;
    }

    // Update nav visibility
    document.querySelectorAll('.nav-item').forEach(nav => {
        const text = nav.innerText.trim();
        let show = false;

        if (['Home', 'Cars', 'Contact'].includes(text)) show = true;
        if (text === 'Login' && session.role === 'guest') show = true;
        if (session.role === 'user' && text === 'Bookings') show = true;
        if (session.role === 'admin' && text !== 'Login') show = true;

        nav.style.display = show ? '' : 'none';
    });

    // Inject Logout button
    if (session.role !== 'guest') {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu && !document.getElementById('logout-btn')) {
            const logoutLink = document.createElement('a');
            logoutLink.id = 'logout-btn';
            logoutLink.href = '#';
            logoutLink.className = 'nav-item';
            logoutLink.style.color = '#e74c3c';
            logoutLink.style.cursor = 'pointer';
            logoutLink.innerHTML = `<i data-lucide="log-out" style="width:16px;"></i> Logout (${session.name || ''})`;
            logoutLink.onclick = window.handleLogout;
            navMenu.appendChild(logoutLink);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
    return true;
}

// ─── Authentication Handlers ──────────────────────────────
window.handleLogin = async function() {
    const email    = document.getElementById('emailUser')?.value?.trim();
    const password = document.getElementById('passwordUser')?.value;
    const btn      = document.querySelector('#login-btn') || document.querySelector('button[onclick="window.handleLogin()"]');

    if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

    try {
        const data = await api.post('/auth/login', { email, password });
        setSession({ ...data.user, token: data.token });
        showToast('Login successful! Welcome, ' + data.user.name, 'success');
        setTimeout(() => {
            window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
        }, 800);
    } catch (err) {
        showToast('Invalid email or password.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
};

window.handleLogout = async function(e) {
    if (e) e.preventDefault();
    try {
        await api.post('/auth/logout', {});
    } catch { /* ignore logout errors */ }
    clearSession();
    showToast('You have been logged out.', 'info');
    setTimeout(() => window.location.href = 'login.html', 600);
};

// ─── Car List Rendering ───────────────────────────────────
window.renderCarList = async function() {
    const grid = document.getElementById('car-list-grid');
    if (!grid) return;

    const session = getSession();
    const isAdmin = session.role === 'admin';
    const isUser  = session.role === 'user';

    grid.innerHTML = `<div class="loading-placeholder" style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim);">
        <i data-lucide="loader" style="animation: spin 1s linear infinite;"></i> Loading inventory...
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const cars = await api.get('/cars');

        if (!cars.length) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-dim);">
                <i data-lucide="car" style="width:48px; height:48px; margin-bottom:10px;"></i>
                <p>No vehicles found in inventory.</p>
            </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        grid.innerHTML = cars.map(car => `
            <div class="car-card" id="car-card-${car.id}">
                <div class="car-image">
                    <img src="${car.image}" alt="${car.name}" onerror="this.src='../assets/images/car1.png'">
                    <span class="car-status status-${(car.status||'available').toLowerCase()}">${car.status}</span>
                </div>
                <div class="car-info">
                    <h3>${car.name}</h3>
                    <div class="price">${car.price}</div>
                    <div class="car-specs">
                        <span>${car.specs?.year || ''}</span>
                        <span>${car.specs?.fuel || ''}</span>
                        <span>${car.specs?.trans || ''}</span>
                        <span>${car.specs?.mileage || ''}</span>
                    </div>
                    <div class="car-actions">
                        <button class="btn btn-primary btn-sm" onclick="viewDetails(${car.id})">Details</button>
                        ${(isUser || isAdmin) && car.status !== 'sold' ? `<button class="btn btn-secondary btn-sm" onclick="openBookingModal(${car.id},'${car.name.replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${car.price}','${car.image}')">Book Now</button>` : ''}
                        ${isAdmin ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteCar(${car.id})">
                            <i data-lucide="trash-2" style="width:14px;"></i>
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#e74c3c;">
            ⚠️ Failed to load inventory. Is the server running at <strong>localhost:5001</strong>?
        </div>`;
    }
};

// ─── Delete Car ───────────────────────────────────────────
window.deleteCar = async function(id) {
    if (!confirm('Are you sure you want to remove this vehicle from inventory?')) return;
    try {
        await api.delete(`/cars/${id}`);
        showToast('Vehicle removed from inventory.', 'success');
        if (document.getElementById('car-list-grid'))    window.renderCarList();
        if (document.getElementById('manage-cars-body')) window.renderManageCars();
    } catch (err) {
        showToast('Failed to delete vehicle: ' + err.message, 'error');
    }
};

// ─── View Car Details ─────────────────────────────────────
window.viewDetails = async function(carId) {
    const currentPage = window.location.pathname.split('/').pop().split('?')[0] || 'index.html';
    if (currentPage !== 'cars.html') {
        window.location.href = `cars.html?view=${carId}`;
        return;
    }

    try {
        const car = await api.get(`/cars/${carId}`);
        const session = getSession();
        const isAdmin = session.role === 'admin';
        const isUser  = session.role === 'user';

        // Populate Modal
        document.getElementById('details-car-img').src = car.image || '../assets/images/car1.png';
        document.getElementById('details-car-brand').textContent = car.brand || 'Premium';
        document.getElementById('details-car-name').textContent = car.name;
        document.getElementById('details-car-price').textContent = car.price;
        document.getElementById('details-car-status').textContent = car.status;
        document.getElementById('details-car-status').className = `car-status status-${(car.status||'available').toLowerCase()}`;
        
        document.getElementById('details-spec-year').textContent = car.specs?.year || '2024';
        document.getElementById('details-spec-fuel').textContent = car.specs?.fuel || 'Petrol';
        document.getElementById('details-spec-trans').textContent = car.specs?.trans || 'Automatic';
        document.getElementById('details-spec-mileage').textContent = car.specs?.mileage || '18 kmpl';

        // Actions
        const actionsDiv = document.getElementById('details-actions');
        if (actionsDiv) {
            let html = '';
            if ((isUser || isAdmin) && car.status !== 'sold') {
                html += `<button class="btn btn-primary btn-lg" style="flex:2;" onclick="closeDetailsModal(); openBookingModal(${car.id}, '${car.name.replace(/'/g,"\\'").replace(/"/g,"&quot;")}', '${car.price}', '${car.image}')">
                    <i data-lucide="calendar-check" style="width:18px;"></i> Book This Vehicle
                </button>`;
            }
            if (isAdmin) {
                html += `<button class="btn btn-danger btn-lg" style="flex:1;" onclick="deleteCar(${car.id}); closeDetailsModal();">
                    <i data-lucide="trash-2" style="width:18px;"></i> Remove
                </button>`;
            }
            actionsDiv.innerHTML = html || '<p style="color:var(--text-dim);">No actions available for this vehicle.</p>';
        }

        document.getElementById('details-modal').classList.add('active');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Update URL without refreshing
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?view=${carId}`;
        window.history.pushState({path:newUrl},'',newUrl);

    } catch (err) {
        showToast('Error loading car details: ' + err.message, 'error');
    }
};

window.closeDetailsModal = function() {
    document.getElementById('details-modal').classList.remove('active');
    // Clear URL param
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({path:newUrl},'',newUrl);
};

// ─── Manage Cars Table ────────────────────────────────────
window.renderManageCars = async function() {
    const tbody = document.getElementById('manage-cars-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">Loading...</td></tr>`;

    try {
        const cars = await api.get('/cars');
        tbody.innerHTML = cars.map(car => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 15px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${car.image}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;" onerror="this.src='../assets/images/car1.png'">
                        <span>${car.name}</span>
                    </div>
                </td>
                <td>${car.price}</td>
                <td><span class="car-status status-${(car.status||'available').toLowerCase()}" style="position:static; font-size:0.7rem; padding:3px 10px;">${car.status}</span></td>
                <td>
                    <select onchange="updateStatus(${car.id}, this.value)" style="padding:5px 8px; font-size:0.8rem; background:var(--bg-surface); color:var(--text); border:1px solid var(--border); border-radius:6px;">
                        <option ${car.status==='available'?'selected':''} value="available">Available</option>
                        <option ${car.status==='sold'?'selected':''} value="sold">Sold</option>
                        <option ${car.status==='maintenance'?'selected':''} value="maintenance">Maintenance</option>
                    </select>
                </td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-danger btn-sm" onclick="deleteCar(${car.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e74c3c; padding:20px;">⚠️ Server error: ${err.message}</td></tr>`;
    }
};

// ─── Update Car Status ────────────────────────────────────
window.updateStatus = async function(id, newStatus) {
    try {
        await api.put(`/cars/${id}/status`, { status: newStatus });
        showToast('Status updated successfully.', 'success');
        if (document.getElementById('manage-cars-body')) window.renderManageCars();
    } catch (err) {
        showToast('Failed to update status: ' + err.message, 'error');
    }
};

// ─── Customers Table ──────────────────────────────────────
window.renderCustomers = async function() {
    const tbody = document.getElementById('customers-list-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">Loading...</td></tr>`;

    try {
        const customers = await api.get('/customers');
        if (!customers.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-dim);">No customer records found.</td></tr>`;
            return;
        }
        tbody.innerHTML = customers.map(c => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding:15px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; color:#000; font-weight:700; font-size:0.8rem;">
                            ${(c.name||'?')[0].toUpperCase()}
                        </div>
                        <span>${c.name}</span>
                    </div>
                </td>
                <td>${c.email}</td>
                <td>${c.phone}</td>
                <td>${c.bookings}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="showToast('Viewing ${c.name}\'s profile', 'info')">Details</button>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#e74c3c; padding:20px;">⚠️ ${err.message}</td></tr>`;
    }
};

// ─── Add Car Form Submission ──────────────────────────────
window.handleAddCar = async function() {
    const name  = document.getElementById('car-name')?.value?.trim();
    const brand = document.getElementById('car-brand')?.value?.trim();
    const price = document.getElementById('car-price')?.value?.trim();
    const year  = document.getElementById('car-year')?.value?.trim();
    const fuel  = document.getElementById('car-fuel')?.value;
    const trans = document.getElementById('car-trans')?.value;
    const mileage = document.getElementById('car-mileage')?.value?.trim();
    const image = document.getElementById('car-image')?.value?.trim() || '../assets/images/car1.png';

    if (!name || !brand || !price || !year) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    const carData = {
        name, brand, price, status: 'available', image,
        specs: { year: parseInt(year), fuel, trans, mileage }
    };

    try {
        await api.post('/cars', carData);
        showToast(`${name} added to inventory!`, 'success');
        // Reset form
        document.getElementById('add-car-form')?.reset();
    } catch (err) {
        showToast('Failed to add car: ' + err.message, 'error');
    }
};

// ─── Dashboard Stats ──────────────────────────────────────
window.loadDashboardStats = async function() {
    const totalEl = document.getElementById('stat-total-cars');
    const availEl = document.getElementById('stat-available');
    const soldEl  = document.getElementById('stat-sold');
    const maintEl = document.getElementById('stat-maintenance');
    if (!totalEl) return;

    try {
        const cars = await api.get('/cars');
        const available   = cars.filter(c => c.status === 'available').length;
        const sold        = cars.filter(c => c.status === 'sold').length;
        const maintenance = cars.filter(c => c.status === 'maintenance').length;

        if (totalEl) totalEl.textContent = cars.length;
        if (availEl) availEl.textContent = available;
        if (soldEl)  soldEl.textContent  = sold;
        if (maintEl) maintEl.textContent = maintenance;
    } catch (err) {
        console.warn('Could not load dashboard stats:', err.message);
    }
};

// ─── Sales Chart ──────────────────────────────────────────
let myChart = null;
window.initChart = function() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    try {
        if (myChart) myChart.destroy();
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#ffffff' : '#1a1a1a';

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Monthly Sales (₹ Lakhs)',
                    data: [45, 59, 48, 82, 65, 95],
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#d4af37',
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: textColor, font: { size: 13 } } } },
                scales: {
                    y: { ticks: { color: textColor }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: textColor }, grid: { display: false } }
                }
            }
        });
    } catch (err) {
        console.error('Chart initialization error:', err);
    }
};

// ─── Theme Toggle ─────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle-btn');
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        themeBtn.innerHTML = newTheme === 'dark'
            ? '<i data-lucide="sun"></i>'
            : '<i data-lucide="moon"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (myChart) window.initChart();
    });
}

// ─── Search Functionality ─────────────────────────────────
const searchInput = document.querySelector('.search-box input');
if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = searchInput.value.toLowerCase().trim();
            const grid = document.getElementById('car-list-grid');
            if (!grid) return;
            try {
                const cars = await api.get('/cars');
                const filtered = query ? cars.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    c.brand.toLowerCase().includes(query) ||
                    c.price.toLowerCase().includes(query)
                ) : cars;

                if (!filtered.length) {
                    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-dim);">No vehicles match your search.</div>`;
                    return;
                }
                window.renderCarList(); // Re-render with results
            } catch { /* fail silently */ }
        }, 350);
    });
}

// ─── Bookings: Open Modal ─────────────────────────────────
window.openBookingModal = function(carId, carName, carPrice, carImg) {
    const session = getSession();
    if (session.role === 'guest') {
        showToast('Please log in to book a vehicle.', 'error');
        setTimeout(() => window.location.href = 'login.html', 1000);
        return;
    }
    document.getElementById('booking-car-id').value    = carId;
    document.getElementById('modal-car-name').textContent = carName;
    document.getElementById('modal-car-price').textContent = carPrice;
    document.getElementById('modal-car-img').src       = carImg || '../assets/images/car1.png';
    document.getElementById('booking-name').value      = session.name || '';
    document.getElementById('booking-phone').value     = '';
    const dateInput = document.getElementById('booking-date');
    dateInput.value = '';
    dateInput.min   = new Date().toISOString().split('T')[0];
    document.getElementById('booking-modal').classList.add('active');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeBookingModal = function() {
    document.getElementById('booking-modal').classList.remove('active');
};

// ─── Bookings: Submit ─────────────────────────────────────
window.submitBooking = async function() {
    const carId  = document.getElementById('booking-car-id').value;
    const name   = document.getElementById('booking-name').value.trim();
    const phone  = document.getElementById('booking-phone').value.trim();
    const date   = document.getElementById('booking-date').value;
    const btn    = document.getElementById('confirm-booking-btn');

    if (!date) {
        showToast('Please select a preferred date.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Confirming...';

    try {
        await api.post('/bookings', { carId, customerName: name, customerPhone: phone, date });
        showToast('Booking confirmed! You will be contacted shortly.', 'success');
        window.closeBookingModal();
        if (document.getElementById('bookings-table-body')) window.renderBookings();
        if (document.getElementById('car-list-grid')) window.renderCarList();
    } catch (err) {
        showToast(err.message || 'Booking failed. Please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="calendar-check" style="width:16px;"></i> Confirm Booking';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// ─── Bookings: Render Table ───────────────────────────────
let allBookings = [];

window.renderBookings = async function() {
    const tbody    = document.getElementById('bookings-table-body');
    const statsDiv = document.getElementById('booking-stats');
    if (!tbody) return;

    const session = getSession();
    const isAdmin = session.role === 'admin';

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-dim);">Loading...</td></tr>`;

    try {
        allBookings = await api.get('/bookings');

        // Update subtitle
        const subtitle = document.getElementById('bookings-subtitle');
        if (subtitle) subtitle.textContent = isAdmin
            ? `${allBookings.length} total booking(s) across all users`
            : `Your reserved vehicles (${allBookings.length})`;

        // Show admin stats
        if (isAdmin && statsDiv) {
            const pending   = allBookings.filter(b => b.status === 'pending').length;
            const confirmed = allBookings.filter(b => b.status === 'confirmed').length;
            const cancelled = allBookings.filter(b => b.status === 'cancelled').length;
            statsDiv.style.display = 'grid';
            statsDiv.innerHTML = `
                <div class="stat-card"><h3>Total Bookings</h3><div class="number">${allBookings.length}</div></div>
                <div class="stat-card"><h3>Pending Review</h3><div class="number" style="color:#ffc107">${pending}</div></div>
                <div class="stat-card"><h3>Confirmed</h3><div class="number" style="color:#28a745">${confirmed}</div></div>
                <div class="stat-card"><h3>Cancelled</h3><div class="number" style="color:#dc3545">${cancelled}</div></div>
            `;
        }

        renderBookingRows(allBookings);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e74c3c;padding:30px;">⚠️ ${err.message}</td></tr>`;
    }
};

function renderBookingRows(bookings) {
    const tbody   = document.getElementById('bookings-table-body');
    const session = getSession();
    const isAdmin = session.role === 'admin';

    if (!bookings.length) {
        tbody.innerHTML = `
            <tr><td colspan="5">
                <div class="empty-state">
                    <i data-lucide="calendar-x"></i>
                    <p style="font-size:1.1rem;margin-bottom:8px;">No bookings found</p>
                    <a href="cars.html" class="btn btn-primary" style="text-decoration:none;display:inline-flex;">Browse Vehicles</a>
                </div>
            </td></tr>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    tbody.innerHTML = bookings.map(b => {
        const statusClass = `status-${b.status}`;
        const initials = (b.customerName || '?')[0].toUpperCase();
        const dateStr  = new Date(b.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

        let actions = '';
        if (isAdmin) {
            if (b.status === 'pending') {
                actions = `
                    <button class="btn btn-primary btn-sm" onclick="updateBooking(${b.id},'confirmed')">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="updateBooking(${b.id},'cancelled')">Reject</button>`;
            } else {
                actions = `<button class="btn btn-secondary btn-sm" onclick="deleteBookingEntry(${b.id})"><i data-lucide="trash-2" style="width:14px;"></i></button>`;
            }
        } else {
            if (b.status === 'pending') {
                actions = `<button class="btn btn-danger btn-sm" onclick="updateBooking(${b.id},'cancelled')">Cancel</button>`;
            } else {
                actions = `<span style="color:var(--text-dim);font-size:0.85rem;">${b.status}</span>`;
            }
        }

        return `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:14px 20px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:0.85rem;flex-shrink:0;">${initials}</div>
                        <div>
                            <div style="font-weight:600;">${b.customerName}</div>
                            <div style="font-size:0.8rem;color:var(--text-dim);">${b.customerEmail}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:14px 12px;">
                    <div style="font-weight:500;">${b.carName}</div>
                    ${b.customerPhone ? `<div style="font-size:0.8rem;color:var(--text-dim);">${b.customerPhone}</div>` : ''}
                </td>
                <td style="padding:14px 12px; white-space:nowrap;">${dateStr}</td>
                <td style="padding:14px 12px;"><span class="booking-status-badge ${statusClass}">${b.status}</span></td>
                <td style="padding:14px 12px;">
                    <div style="display:flex;gap:6px;align-items:center;">${actions}</div>
                </td>
            </tr>`;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Bookings: Update Status ──────────────────────────────
window.updateBooking = async function(id, status) {
    try {
        await api.put(`/bookings/${id}`, { status });
        const msg = status === 'confirmed' ? 'Booking approved! Car marked as sold.' :
                    status === 'cancelled' ? 'Booking cancelled.' : 'Status updated.';
        showToast(msg, status === 'confirmed' ? 'success' : 'info');
        window.renderBookings();
    } catch (err) {
        showToast('Failed to update booking: ' + err.message, 'error');
    }
};

window.deleteBookingEntry = async function(id) {
    if (!confirm('Delete this booking record?')) return;
    try {
        await api.delete(`/bookings/${id}`);
        showToast('Booking record deleted.', 'info');
        window.renderBookings();
    } catch (err) {
        showToast('Failed to delete: ' + err.message, 'error');
    }
};

// ─── Bookings: Filter ─────────────────────────────────────
window.applyFilter = function() {
    const val = document.getElementById('booking-filter')?.value;
    if (!val || val === 'all') return renderBookingRows(allBookings);
    renderBookingRows(allBookings.filter(b => b.status === val));
};

// ─── App Bootstrap ────────────────────────────────────────
window.addEventListener('load', () => {
    // Enforce authentication/access control first
    const accessOk = enforceRBAC();
    if (!accessOk) return;

    // Page-specific initializations
    if (document.getElementById('salesChart'))          window.initChart();
    if (document.getElementById('car-list-grid'))       window.renderCarList();
    if (document.getElementById('manage-cars-body'))    window.renderManageCars();
    if (document.getElementById('customers-list-body')) window.renderCustomers();
    if (document.getElementById('stat-total-cars'))     window.loadDashboardStats();
    if (document.getElementById('bookings-table-body')) window.renderBookings();

    // Check for "view" parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId && document.getElementById('details-modal')) {
        window.viewDetails(viewId);
    }
});
