// ==========================================================================
// Web Application Interactive Logic - app.js
// Simulating real-time WebSocket dynamic up-sell "Ой, забыл!" feature
// Across all roles: Client -> Picker -> Courier -> Manager
// ==========================================================================

// Global state simulation
let state = {
    currentRole: 'client',
    cart: [
        { id: 1, name: 'Молоко 3.2%', emoji: '🥛', price: 90, discount: 45, qty: 1, freshness: 'До завтра (уценка)' },
        { id: 2, name: 'Клубника 250г', emoji: '🍓', price: 300, discount: 150, qty: 1, freshness: 'До завтра (уценка)' }
    ],
    orderStatus: 'shopping', // shopping -> assembling -> pick_done -> delivering -> delivered
    pickerItems: [
        { id: 1, name: 'Молоко 3.2%', emoji: '🥛', aisle: 'Ряд 2, Полка 3', collected: true, label: 'Уценка 50%' },
        { id: 2, name: 'Клубника 250г', emoji: '🍓', aisle: 'Ряд 1, Контейнер 4', collected: false, label: 'Уценка 50%' }
    ],
    stats: {
        savedKg: 342.8,
        discounts: 45180,
        completedCount: 2
    },
    ohForgotTriggered: false
};

// Play premium web-synthesized sound notification (WebSocket alert)
function playBeepAlert() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, delay, duration) => {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + duration);
            }, delay);
        };
        
        playTone(523.25, 0, 0.45); // C5
        playTone(659.25, 120, 0.6); // E5
    } catch (e) {
        console.warn('AudioContext beep blocked by browser autoplay policy.');
    }
}

// Show smooth notification toast
function showToast(text, type = 'success') {
    const toast = document.getElementById('toast-notif');
    const toastText = document.getElementById('toast-text');
    
    toastText.innerHTML = text;
    toast.className = `toast-notification show ${type}`;
    
    const icon = toast.querySelector('i');
    if (type === 'success') icon.className = 'fa-solid fa-circle-check text-white';
    else if (type === 'info') icon.className = 'fa-solid fa-bell text-white';
    else if (type === 'warning') icon.className = 'fa-solid fa-triangle-exclamation text-white';
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Role switching function
function setRole(role) {
    state.currentRole = role;
    
    // Toggle active tabs in nav
    document.querySelectorAll('.role-btn').forEach(btn => {
        if (btn.getAttribute('data-role') === role) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
        if (sec.id === `${role}-view`) sec.classList.add('active');
        else sec.classList.remove('active');
    });
    
    // Update profile text
    const indicator = document.getElementById('current-role-indicator');
    if (role === 'client') indicator.innerText = 'Покупатель';
    else if (role === 'picker') indicator.innerText = 'Сборщик магазина';
    else if (role === 'courier') indicator.innerText = 'Курьер доставки';
    else if (role === 'manager') indicator.innerText = 'Управляющий';
    
    showToast(`Имитация роли: ${role === 'client' ? 'Покупатель' : role === 'picker' ? 'Сборщик' : role === 'courier' ? 'Курьер' : 'Управляющий'}`, 'info');
}

// Calculate cart totals
function updateCartTotals() {
    let originalTotal = 0;
    let savings = 0;
    
    state.cart.forEach(item => {
        originalTotal += item.price * item.qty;
        savings += item.discount * item.qty;
    });
    
    const finalTotal = originalTotal - savings;
    
    const itemsTotalDom = document.getElementById('price-items-total');
    const savingsDom = document.getElementById('price-savings-total');
    const finalTotalDom = document.getElementById('price-final-total');
    
    if (itemsTotalDom) itemsTotalDom.innerText = `${originalTotal} ₽`;
    if (savingsDom) savingsDom.innerText = `-${savings} ₽`;
    if (finalTotalDom) finalTotalDom.innerText = `${finalTotal} ₽`;
}

// Simulate client Checkout
function checkoutOrder() {
    if (state.cart.length === 0) {
        showToast('Ваша корзина пуста!', 'warning');
        return;
    }
    
    state.orderStatus = 'assembling';
    
    document.getElementById('cart-items-container').innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin text-cyan" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
            <p style="font-weight: 700; font-size: 0.9rem;">Заказ отправлен сборщику</p>
            <p style="font-size: 0.75rem;">Статус: Собирается на полках</p>
        </div>
    `;
    
    document.getElementById('checkout-action-btn').style.display = 'none';
    document.getElementById('oh-forgot-addon-block').style.display = 'block';
    document.getElementById('order-status-tracker').style.display = 'block';
    
    showToast('Заказ оформлен! Открыта сборка.', 'success');
    updateManagerDashboardTable();
}

// TRIGGER DYNAMIC UP-SELL FEATURE: "Ой, забыл!" (Oh, I forgot!)
function addForgottenItem() {
    if (state.ohForgotTriggered) {
        showToast('Вы уже отправили дозаказ для этой сборки!', 'warning');
        return;
    }
    
    state.ohForgotTriggered = true;
    
    // Sound beep notifying simulated picker
    playBeepAlert();
    
    // 1. Add item to picker checklist
    const forgottenProduct = {
        id: 3,
        name: 'Круассан с миндалем',
        emoji: '🥐',
        aisle: 'Выпечка, Полка 1',
        collected: false,
        label: 'Дозаказ («Ой, забыл!»)',
        isNewAddon: true
    };
    state.pickerItems.push(forgottenProduct);
    
    // Update active badges in Navbar (notification badge on Picker button)
    const pickerBadge = document.getElementById('picker-tasks-badge');
    if (pickerBadge) {
        pickerBadge.style.display = 'flex';
        pickerBadge.innerText = '1';
    }
    
    // 2. Reflect in Client Cart sidebar
    const addonDetails = document.getElementById('oh-forgot-addon-block');
    addonDetails.innerHTML = `
        <div style="background-color: var(--sage-bg); border: 1px solid var(--sage-primary); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--sage-primary); text-align: center;">
            <i class="fa-solid fa-circle-check animate-bounce"></i> <strong>Дозаказ отправлен!</strong><br>
            Круассан 🥐 добавлен в текущую сборку.
        </div>
    `;
    
    // Client Status Tracker updates
    document.getElementById('tracker-step-addon').className = 'timeline-step active';
    document.getElementById('tracker-step-addon').querySelector('.step-desc').innerText = 'Дозаказ «Ой, забыл!» принят сборщиком';
    
    // 3. Render in Picker View Checklist
    renderPickerChecklist();
    
    // 4. Update Manager metrics
    state.stats.discounts += 40; 
    document.getElementById('manager-stat-discounts').innerText = `${state.stats.discounts} ₽`;
    
    // Add real-time activity log entry
    const activityLog = document.getElementById('dashboard-activity-log');
    if (activityLog) {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString().slice(0,5)}</span>
            <span class="log-text" style="color: var(--coral-primary); font-weight: 600;">[WebSocket] Клиент добавил забытый товар 🥐 к заказу #1082!</span>
        `;
        activityLog.insertBefore(item, activityLog.firstChild);
    }
    
    showToast('Синхронизация WebSocket: Дозаказ добавлен в сборку сборщика!', 'success');
}

// Render Picker Checklist dynamically
function renderPickerChecklist() {
    const container = document.getElementById('picker-checklist-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.pickerItems.forEach(item => {
        const div = document.createElement('div');
        div.className = `checklist-item ${item.collected ? 'collected' : ''} ${item.isNewAddon ? 'active-ws' : ''}`;
        
        div.innerHTML = `
            <div class="checklist-left">
                <div class="check-indicator" onclick="togglePickItem(${item.id})">
                    ${item.collected ? '<i class="fa-solid fa-check" style="color: white; display: block; text-align: center; margin-top: 3px; font-size: 0.75rem;"></i>' : ''}
                </div>
                <div class="picker-prod-details">
                    <span class="picker-prod-title">${item.emoji} ${item.name}</span>
                    <span class="picker-prod-aisle"><i class="fa-solid fa-map-pin"></i> ${item.aisle}</span>
                </div>
            </div>
            <div class="checklist-right">
                <span class="picker-target-label">${item.label}</span>
                <i class="fa-solid ${item.collected ? 'fa-circle-check text-green' : 'fa-circle-question text-muted'} picker-status-icon"></i>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    setTimeout(() => {
        document.querySelectorAll('.active-ws').forEach(el => el.classList.remove('active-ws'));
    }, 3000);
    
    updatePickerProgress();
}

// Picker item check trigger
function togglePickItem(id) {
    const item = state.pickerItems.find(p => p.id === id);
    if (!item) return;
    
    item.collected = !item.collected;
    if (item.isNewAddon) delete item.isNewAddon; 
    
    renderPickerChecklist();
    showToast(`Товар ${item.name} ${item.collected ? 'собран' : 'вернут на полку'}!`, 'info');
}

// Update picker progress metrics
function updatePickerProgress() {
    const collectedCount = state.pickerItems.filter(p => p.collected).length;
    const totalCount = state.pickerItems.length;
    
    const progressText = document.getElementById('picker-progress-text');
    const progressBarFill = document.getElementById('picker-progress-fill');
    const finishBtn = document.getElementById('btn-picker-finish');
    
    if (progressText) progressText.innerText = `Собрано: ${collectedCount} из ${totalCount} товаров`;
    if (progressBarFill) {
        const pct = (collectedCount / totalCount) * 100;
        progressBarFill.style.width = `${pct}%`;
    }
    
    if (finishBtn) {
        if (collectedCount === totalCount) {
            finishBtn.removeAttribute('disabled');
            finishBtn.style.opacity = '1';
            finishBtn.style.cursor = 'pointer';
        } else {
            finishBtn.setAttribute('disabled', 'true');
            finishBtn.style.opacity = '0.5';
            finishBtn.style.cursor = 'not-allowed';
        }
    }
}

// Complete Picking Assembling -> Assigning Delivery
function finishAssembly() {
    state.orderStatus = 'pick_done';
    
    // Play WebSocket sound for courier notification
    playBeepAlert();
    
    // Clear picker badge, light up Courier badge
    const pickerBadge = document.getElementById('picker-tasks-badge');
    if (pickerBadge) pickerBadge.style.display = 'none';
    
    const courierBadge = document.getElementById('courier-tasks-badge');
    if (courierBadge) {
        courierBadge.style.display = 'flex';
        courierBadge.innerText = '1';
    }
    
    // Client Status Tracker updates
    const trackerStepAssembling = document.getElementById('tracker-step-assembling');
    const trackerStepAddon = document.getElementById('tracker-step-addon');
    const trackerStepDelivering = document.getElementById('tracker-step-delivering');
    
    if (trackerStepAssembling) {
        trackerStepAssembling.className = 'timeline-step completed';
        trackerStepAssembling.querySelector('.step-indicator').style.backgroundColor = 'var(--text-muted)';
    }
    if (trackerStepAddon) {
        trackerStepAddon.className = 'timeline-step completed';
        trackerStepAddon.querySelector('.step-indicator').style.backgroundColor = 'var(--text-muted)';
    }
    if (trackerStepDelivering) {
        trackerStepDelivering.className = 'timeline-step active';
    }
    
    // Render Courier Task and goods list in Courier view (with perfect correction sync!)
    renderCourierTask();
    
    showToast('Сборка завершена! Заказ передан в доставку курьеру.', 'success');
    updateManagerDashboardTable();
}

// Render Courier active task (Dynamic sync "правка по товарам")
function renderCourierTask() {
    const courierItemsContainer = document.getElementById('courier-task-goods-list');
    if (!courierItemsContainer) return;
    
    courierItemsContainer.innerHTML = '';
    
    // Render each picked item including any forgotten items dynamically added!
    state.pickerItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'courier-good-item';
        div.style = 'display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background-color: var(--bg-main); border-radius: var(--radius-sm); border: 1px solid var(--border-color);';
        
        // Mark forgotten add-on item visual label
        let addonLabel = (item.id === 3) ? '<span style="font-size: 0.65rem; background-color: var(--coral-bg); color: var(--coral-primary); padding: 0.1rem 0.3rem; border-radius: 4px; border: 1px solid var(--coral-border); font-weight:700;">«Ой, забыл!»</span>' : '';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${item.emoji}</span>
                <span style="font-size: 0.8rem; font-weight: 600;">${item.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${addonLabel}
                <span style="font-size: 0.8rem; font-weight: 700;">1 шт.</span>
            </div>
        `;
        
        courierItemsContainer.appendChild(div);
    });
    
    // Show delivery details card
    document.getElementById('courier-active-task-card').style.display = 'block';
    document.getElementById('courier-empty-state').style.display = 'none';
}

// Courier start transit
function courierStartDelivery() {
    state.orderStatus = 'delivering';
    
    document.getElementById('btn-courier-action').style.display = 'none';
    document.getElementById('btn-courier-complete').style.display = 'flex';
    document.getElementById('courier-transit-status').innerText = 'Курьер едет к клиенту';
    document.getElementById('courier-transit-status').style.color = 'var(--coral-primary)';
    
    // Update map marker style
    document.getElementById('courier-map-marker').style.color = 'var(--coral-primary)';
    document.getElementById('courier-map-marker').classList.add('fa-bounce');
    
    showToast('Курьер начал доставку! Маршрут активирован.', 'success');
    updateManagerDashboardTable();
}

// Courier deliver order to client
function courierCompleteDelivery() {
    state.orderStatus = 'delivered';
    
    // Hide Courier Badge
    const courierBadge = document.getElementById('courier-tasks-badge');
    if (courierBadge) courierBadge.style.display = 'none';
    
    // Hide task details
    document.getElementById('courier-active-task-card').style.display = 'none';
    document.getElementById('courier-empty-state').style.display = 'block';
    
    // Client Status Tracker updates
    const trackerStepDelivering = document.getElementById('tracker-step-delivering');
    const trackerStepDelivered = document.getElementById('tracker-step-delivered');
    
    if (trackerStepDelivering) {
        trackerStepDelivering.className = 'timeline-step completed';
        trackerStepDelivering.querySelector('.step-indicator').style.backgroundColor = 'var(--text-muted)';
    }
    if (trackerStepDelivered) {
        trackerStepDelivered.className = 'timeline-step active';
        trackerStepDelivered.querySelector('.step-desc').innerText = 'Продукты выданы клиенту. Спасибо за покупку!';
    }
    
    // Update Manager statistics
    state.stats.completedCount += 1;
    state.stats.savedKg += 1.8;
    
    document.getElementById('manager-stat-saved-kg').innerText = `${state.stats.savedKg.toFixed(1)} кг`;
    
    // Add activity log
    const activityLog = document.getElementById('dashboard-activity-log');
    if (activityLog) {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString().slice(0,5)}</span>
            <span class="log-text" style="color: var(--sage-primary); font-weight: 600;">Заказ #1082 успешно доставлен курьером! Выдано товаров: ${state.pickerItems.length} шт.</span>
        `;
        activityLog.insertBefore(item, activityLog.firstChild);
    }
    
    showToast('Заказ #1082 успешно доставлен клиенту!', 'success');
    updateManagerDashboardTable();
}

// Update Active/Completed orders table in Manager dashboard
function updateManagerDashboardTable() {
    const tableBody = document.getElementById('manager-orders-table-body');
    if (!tableBody) return;
    
    let addonBadge = state.ohForgotTriggered ? '<span class="badge" style="background-color: var(--coral-bg); color: var(--coral-primary); border: 1px solid var(--coral-border); font-size: 0.65rem; font-weight:700;">+🥐 Дозаказ</span>' : '';
    
    let statusPill = '';
    if (state.orderStatus === 'assembling') {
        statusPill = '<span class="status-pill assembling"><i class="fa-solid fa-spinner fa-spin"></i> Сборка на полках</span>';
    } else if (state.orderStatus === 'pick_done') {
        statusPill = '<span class="status-pill assembling" style="background-color: var(--sage-bg); color: var(--sage-primary);"><i class="fa-solid fa-check"></i> Сборка завершена</span>';
    } else if (state.orderStatus === 'delivering') {
        statusPill = '<span class="status-pill assembling" style="background-color: var(--blue-bg); color: var(--blue-primary);"><i class="fa-solid fa-truck-ramp-box fa-bounce"></i> Доставка</span>';
    } else if (state.orderStatus === 'delivered') {
        statusPill = '<span class="status-pill delivered"><i class="fa-solid fa-circle-check"></i> Выдан клиенту</span>';
    } else {
        statusPill = '<span class="status-pill" style="background-color: #f1f5f9; color: var(--text-secondary);">Покупки</span>';
    }
    
    let sumTotal = state.ohForgotTriggered ? '315 ₽' : '195 ₽';
    
    tableBody.innerHTML = `
        <tr class="${state.orderStatus !== 'delivered' && state.orderStatus !== 'shopping' ? 'active-tr' : ''}">
            <td><strong>#1082</strong></td>
            <td>10:15</td>
            <td>Алексей К.</td>
            <td><span class="picker-rule-badge">Дозаказ включен</span></td>
            <td>Иван С. (Сборщик)</td>
            <td>Сергей В. (Курьер)</td>
            <td>${statusPill}</td>
            <td>${addonBadge}</td>
            <td><strong>${sumTotal}</strong></td>
        </tr>
        <tr>
            <td><strong>#1081</strong></td>
            <td>09:30</td>
            <td>Константин В.</td>
            <td><span class="picker-rule-badge" style="background-color:#f1f5f9; color:var(--text-secondary); border-color:#e2e8f0;">Стандарт</span></td>
            <td>Мария К.</td>
            <td>Дмитрий К.</td>
            <td><span class="status-pill delivered"><i class="fa-solid fa-circle-check"></i> Выдан клиенту</span></td>
            <td>—</td>
            <td><strong>1,450 ₽</strong></td>
        </tr>
        <tr>
            <td><strong>#1080</strong></td>
            <td>09:05</td>
            <td>Ирина Л.</td>
            <td><span class="picker-rule-badge">Дозаказ включен</span></td>
            <td>Иван С.</td>
            <td>Сергей В.</td>
            <td><span class="status-pill delivered"><i class="fa-solid fa-circle-check"></i> Выдан клиенту</span></td>
            <td><span class="badge" style="background-color: var(--coral-bg); color: var(--coral-primary); border: 1px solid var(--coral-border); font-size: 0.65rem; font-weight:700;">+🥛 Дозаказ</span></td>
            <td><strong>890 ₽</strong></td>
        </tr>
    `;
}

// Attach event listeners when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.getAttribute('data-role');
            setRole(role);
        });
    });
    
    updateCartTotals();
    renderPickerChecklist();
    updateManagerDashboardTable();
});
