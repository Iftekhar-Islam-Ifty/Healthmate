/* =========================================================
   HEALTHMATE — MEDICINES PAGE LOGIC (PHASE 3)
   Comprehensive medication scheduling, stock & refill alerts,
   and caregiver family assignment.
========================================================= */

let medicines = window.HMStore ? HMStore.getMedicines() : [];
let pendingDeleteId = null;

function persistMedicines() {
  if (window.HMStore) HMStore.saveMedicines(medicines);
}

const statusMeta = {
  taken:    { label: 'Taken',    badgeClass: 'badge-success' },
  pending:  { label: 'Pending',  badgeClass: 'badge-warning' },
  upcoming: { label: 'Upcoming', badgeClass: 'badge-info' },
  missed:   { label: 'Missed',   badgeClass: 'badge-error' },
};

const pillIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/></svg>`;

function getFilteredMedicines() {
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';
  return medicines.filter(m => (m.memberId || 'owner') === currentProfileId);
}

function initPageHeader() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const titleEl = document.getElementById('medsPageTitle') || document.querySelector('h1');
  const subEl = document.getElementById('medsPageSub');

  if (activeProfile && !activeProfile.isOwner) {
    if (titleEl) titleEl.textContent = `${activeProfile.name}'s Medicines`;
    if (subEl) subEl.textContent = `Today's schedule and medicine inventory for ${activeProfile.name}.`;
  } else {
    if (titleEl) titleEl.textContent = "Medicines";
    if (subEl) subEl.textContent = "Today's schedule and your medicine list.";
  }
}

function renderRefillBanner() {
  const banner = document.getElementById('medsRefillBanner');
  const textEl = document.getElementById('medsRefillBannerText');
  const actionsEl = document.getElementById('medsRefillBannerActions');
  if (!banner) return;

  const currentMeds = getFilteredMedicines();
  const lowStock = currentMeds.filter(m => typeof m.stock === 'number' && m.stock <= (m.refillThreshold || 5));
  if (lowStock.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  banner.style.display = 'block';

  const names = lowStock.map(m => {
    return `<b>${m.name}</b>: ${m.stock} ${m.unit || 'pills'} remaining (Threshold: ${m.refillThreshold || 5})`;
  }).join(' &middot; ');

  if (textEl) {
    textEl.innerHTML = `⚠️ Low supply for ${activeProfile ? activeProfile.name : 'you'}: ${names}`;
  }
  if (actionsEl) {
    actionsEl.innerHTML = lowStock.map(m => `
      <button type="button" class="btn-hm btn-primary" style="font-size:0.8rem;padding:6px 12px;background:var(--color-warning,#D97706);border-color:var(--color-warning,#D97706);" onclick="quickRefill(${m.id})">
        Refill ${m.name.split(' ')[0]} (+30)
      </button>
    `).join('');
  }
}

function renderSchedule() {
  const el = document.getElementById('scheduleList');
  const list = getFilteredMedicines();

  if (list.length === 0) {
    el.innerHTML = `<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted);font-size:0.9rem;">No medicines scheduled today.</div>`;
    return;
  }

  el.innerHTML = list.map(m => {
    const meta = statusMeta[m.status] || statusMeta.pending;
    const isLow = typeof m.stock === 'number' && m.stock <= (m.refillThreshold || 5);

    const stockBadge = isLow
      ? `<span class="badge-hm badge-warning" style="margin-right:var(--space-2);font-size:0.75rem;" title="Threshold: ${m.refillThreshold || 5}"><span class="dot"></span>Refill needed (${m.stock} left)</span>`
      : `<span style="font-size:0.78rem;color:var(--color-text-muted);margin-right:var(--space-2);">${m.stock || 0} left</span>`;

    const actionBtn = m.status === 'taken'
      ? `<span style="font-size:0.8rem;color:var(--color-success);font-weight:500;">✓ Completed</span>`
      : `<button class="btn-hm btn-secondary" style="padding:6px 14px;font-size:0.8rem;" onclick="markTaken(${m.id})">Mark as taken</button>`;

    return `
      <div class="med-row" style="flex-wrap:wrap;gap:var(--space-2);">
        <span class="med-time">${m.time}</span>
        <div style="flex:1;min-width:140px;display:flex;align-items:center;">
          <span class="med-name">${m.name}</span>
        </div>
        ${stockBadge}
        <span class="badge-hm ${meta.badgeClass}" style="margin-right:var(--space-2);"><span class="dot"></span>${meta.label}</span>
        ${actionBtn}
      </div>`;
  }).join('');
}

function renderMedicineList() {
  const el = document.getElementById('medicineList');
  const emptyEl = document.getElementById('medicinesEmpty');
  const list = getFilteredMedicines();

  if (list.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';

  el.innerHTML = list.map(m => {
    const isLow = typeof m.stock === 'number' && m.stock <= (m.refillThreshold || 5);

    const stockInfo = isLow
      ? `<span class="badge-hm badge-warning" style="font-size:0.75rem;"><span class="dot"></span>Stock: ${m.stock} pills (Refill needed)</span>`
      : `<span style="font-size:0.78rem;color:var(--color-text-muted);">Stock: ${m.stock || 0} pills</span>`;

    return `
      <div class="list-row">
        <div class="list-row-icon">${pillIcon}</div>
        <div class="list-row-main">
          <div class="name">
            <span>${m.name}</span>
          </div>
          <div class="meta">${m.dosage || '1 tablet'} &middot; ${m.frequency} &middot; ${m.meal} &middot; ${m.time}</div>
          <div style="margin-top:4px;display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
            ${stockInfo}
            <button type="button" class="btn-hm btn-ghost" style="font-size:0.75rem;padding:2px 8px;border:1px solid var(--color-border);" onclick="quickRefill(${m.id})">
              + Refill stock
            </button>
          </div>
        </div>
        <div class="list-row-side">
          <label class="toggle" title="Reminder">
            <input type="checkbox" ${m.reminder ? 'checked' : ''} onchange="toggleReminder(${m.id}, this.checked)">
            <span class="toggle-track"></span>
          </label>
          <button class="icon-action" title="Edit" onclick="openEditMedicine(${m.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-action danger" title="Remove" onclick="askDeleteMedicine(${m.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function markTaken(id) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  med.status = 'taken';
  if (typeof med.stock === 'number' && med.stock > 0) {
    med.stock -= 1;
  }
  persistMedicines();
  renderSchedule();
  renderMedicineList();
  renderRefillBanner();
  if (window.initAppShell) initAppShell();

  if (med.stock <= (med.refillThreshold || 5)) {
    showToast(`${med.name} taken. Alert: only ${med.stock} pills remaining!`);
  } else {
    showToast(`${med.name} marked as taken (${med.stock} left)`);
  }
}

function quickRefill(id, amount = 30) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  med.stock = (med.stock || 0) + amount;
  persistMedicines();
  renderSchedule();
  renderMedicineList();
  renderRefillBanner();
  if (window.initAppShell) initAppShell();
  showToast(`Refilled +${amount} pills for ${med.name} (Total: ${med.stock})`);
}

function toggleReminder(id, checked) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  med.reminder = checked;
  persistMedicines();
  showToast(`Reminder ${checked ? 'enabled' : 'disabled'} for ${med.name}`);
}

function openAddMedicine() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const who = activeProfile && !activeProfile.isOwner ? ` (${activeProfile.name})` : '';
  document.getElementById('medicineModalTitle').textContent = `Add a medicine${who}`;
  document.getElementById('medicineForm').reset();
  document.getElementById('medId').value = '';
  document.getElementById('medStock').value = 20;
  document.getElementById('medRefillThreshold').value = 5;
  document.getElementById('medReminder').checked = true;

  openModal('medicineModal');
}

function openEditMedicine(id) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  document.getElementById('medicineModalTitle').textContent = 'Edit medicine';
  document.getElementById('medId').value = med.id;
  document.getElementById('medName').value = med.name;
  document.getElementById('medDosage').value = med.dosage || '';
  document.getElementById('medTime').value = med.time || '';
  document.getElementById('medStock').value = med.stock ?? 20;
  document.getElementById('medRefillThreshold').value = med.refillThreshold ?? 5;
  document.getElementById('medFrequency').value = med.frequency || 'Once daily';
  document.getElementById('medMeal').value = med.meal || 'After meal';
  document.getElementById('medStart').value = med.start || '';
  document.getElementById('medEnd').value = med.end || '';
  document.getElementById('medInstructions').value = med.instructions || '';
  document.getElementById('medReminder').checked = !!med.reminder;

  openModal('medicineModal');
}

function askDeleteMedicine(id) {
  pendingDeleteId = id;
  openModal('deleteMedModal');
}

function confirmDeleteMedicine() {
  medicines = medicines.filter(m => m.id !== pendingDeleteId);
  pendingDeleteId = null;
  persistMedicines();
  closeModal('deleteMedModal');
  renderSchedule();
  renderMedicineList();
  renderRefillBanner();
  if (window.initAppShell) initAppShell();
  showToast('Medicine removed');
}

document.getElementById('medicineForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const idVal = document.getElementById('medId').value;
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';
  const stockVal = parseInt(document.getElementById('medStock').value, 10) || 0;
  const thresholdVal = parseInt(document.getElementById('medRefillThreshold').value, 10) || 5;

  const data = {
    name: document.getElementById('medName').value.trim(),
    memberId: currentProfileId,
    dosage: document.getElementById('medDosage').value.trim() || '1 tablet',
    time: document.getElementById('medTime').value.trim() || '—',
    stock: stockVal,
    refillThreshold: thresholdVal,
    unit: 'tablets',
    frequency: document.getElementById('medFrequency').value,
    meal: document.getElementById('medMeal').value,
    start: document.getElementById('medStart').value.trim(),
    end: document.getElementById('medEnd').value.trim(),
    instructions: document.getElementById('medInstructions').value.trim(),
    reminder: document.getElementById('medReminder').checked,
  };

  if (!data.name) return;

  if (idVal) {
    const med = medicines.find(m => m.id === Number(idVal));
    if (med) Object.assign(med, data);
    persistMedicines();
    showToast('Medicine updated');
  } else {
    const nextMedId = medicines.length > 0 ? Math.max(...medicines.map(m => m.id)) + 1 : 1;
    medicines.push({ id: nextMedId, status: 'upcoming', ...data });
    persistMedicines();
    showToast('Medicine added');
  }

  closeModal('medicineModal');
  renderSchedule();
  renderMedicineList();
  renderRefillBanner();
  if (window.initAppShell) initAppShell();
});

// Initialization
initPageHeader();
renderRefillBanner();
renderSchedule();
renderMedicineList();
