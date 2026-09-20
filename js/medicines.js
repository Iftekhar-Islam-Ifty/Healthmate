/* =========================================================
   HEALTHMATE — MEDICINES PAGE LOGIC
   Comprehensive medication scheduling, past dose history logging,
   custom description, and family profile support.
========================================================= */

let medicines = window.HMStore ? HMStore.getMedicines() : [];
let pendingDeleteId = null;
let activeHistoryMedId = null;

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseDateStrToDate(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(isoStr) {
  const d = parseDateStrToDate(isoStr);
  if (!d) return isoStr;
  const todayISO = formatDateToISO(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = formatDateToISO(yesterday);

  let relative = '';
  if (isoStr === todayISO) relative = ' · Today (আজ)';
  else if (isoStr === yesterdayISO) relative = ' · Yesterday (গতকাল)';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return {
    dateFormatted: `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`,
    dayName: dayNames[d.getDay()],
    relative
  };
}

function getDaysBetween(startDateStr, endDateStr, existingHistoryKeys = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start = parseDateStrToDate(startDateStr);
  if (!start) {
    // If no start date specified, default to 7 days ago
    start = new Date(today);
    start.setDate(today.getDate() - 6);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  // End date is at least today
  let end = parseDateStrToDate(endDateStr) || today;
  end.setHours(0, 0, 0, 0);
  if (end < today) end = today;

  const dateSet = new Set();

  // If start is after today, at least include today
  if (start > today) {
    dateSet.add(formatDateToISO(today));
  } else {
    const curr = new Date(start);
    const diffDays = Math.min(Math.round((end - start) / (1000 * 60 * 60 * 24)), 180);
    for (let i = 0; i <= diffDays; i++) {
      dateSet.add(formatDateToISO(curr));
      curr.setDate(curr.getDate() + 1);
    }
  }

  // Also include any dates that already exist in history
  if (Array.isArray(existingHistoryKeys)) {
    existingHistoryKeys.forEach(k => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) dateSet.add(k);
    });
  }

  // Sort descending: today and recent dates at the top
  return Array.from(dateSet).sort().reverse();
}

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
    if (subEl) subEl.textContent = `${activeProfile.name}-এর প্রেসক্রিপশন শিডিউল ও ডোজ হিস্ট্রি।`;
  } else {
    if (titleEl) titleEl.textContent = "Medicines";
    if (subEl) subEl.textContent = "দৈনিক প্রেসক্রিপশন শিডিউল, বিবরণ ও ডোজ গ্রহণের অতীত হিস্ট্রি।";
  }
}

function renderSchedule() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  const list = getFilteredMedicines();

  if (list.length === 0) {
    el.innerHTML = `<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted);font-size:0.9rem;">আজকের জন্য কোনো ওষুধ শিডিউল করা নেই।</div>`;
    return;
  }

  el.innerHTML = list.map(m => {
    const meta = statusMeta[m.status] || statusMeta.pending;
    const isTaken = m.status === 'taken';

    const actionBtn = isTaken
      ? `<button class="btn-hm btn-ghost" style="padding:6px 12px;font-size:0.8rem;color:var(--color-success-dark);font-weight:600;border-radius:6px;background:#ECFDF5;border:1px solid #A7F3D0;" onclick="toggleTakenStatus('${m.id}')" title="Click to unmark if taken by mistake">✓ Taken</button>`
      : `<button class="btn-hm btn-primary" style="padding:6px 14px;font-size:0.8rem;box-shadow:0 2px 6px rgba(13,110,110,0.2);" onclick="markTaken('${m.id}')">Mark as taken</button>`;

    return `
      <div class="med-row" style="flex-wrap:wrap;gap:var(--space-2);background:${isTaken ? '#F0FDF4' : '#FFFFFF'};padding:12px 18px;border-bottom:1px solid ${isTaken ? '#DCFCE7' : 'var(--color-border)'};">
        <span class="today-med-time-pill">${m.time || '—'}</span>
        <div style="flex:1;min-width:160px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="med-name" style="font-weight:${isTaken ? '600' : '700'};color:${isTaken ? 'var(--color-text-secondary)' : 'var(--color-text)'};">${escapeHtml(m.name)}</span>
            <span style="font-size:0.78rem;color:var(--color-text-muted);">${escapeHtml(m.dosage || '')}</span>
            <span style="font-size:0.75rem;color:var(--color-text-muted);">• ${escapeHtml(m.meal || 'After meal')}</span>
          </div>
          ${m.description ? `<div style="font-size:0.76rem;color:var(--color-primary-dark);margin-top:3px;line-height:1.3;">${escapeHtml(m.description)}</div>` : ''}
        </div>
        <span class="badge-hm ${meta.badgeClass}" style="margin-right:var(--space-2);"><span class="dot"></span>${meta.label}</span>
        <button type="button" class="btn-hm btn-ghost" style="font-size:0.75rem;padding:5px 9px;border:1px solid var(--color-border);display:inline-flex;align-items:center;gap:4px;" onclick="openDoseHistoryModal('${m.id}')" title="বিগত দিনগুলোর ডোজ লগ ম্যানেজ করুন">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>History</span>
        </button>
        ${actionBtn}
      </div>`;
  }).join('');
}

function renderMedicineList() {
  const el = document.getElementById('medicineList');
  const emptyEl = document.getElementById('medicinesEmpty');
  if (!el || !emptyEl) return;
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
    const datesInfo = [];
    if (m.start) datesInfo.push(`Started: ${m.start}`);
    if (m.end) datesInfo.push(`Ends: ${m.end}`);
    const datesText = datesInfo.join(' · ');

    return `
      <div class="list-row" style="align-items:flex-start;padding:14px var(--space-3);">
        <div class="list-row-icon" style="margin-top:2px;">${pillIcon}</div>
        <div class="list-row-main">
          <div class="name" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:0.96rem;">${escapeHtml(m.name)}</span>
            <span class="badge-hm ${statusMeta[m.status]?.badgeClass || 'badge-info'}" style="font-size:0.72rem;padding:2px 8px;">
              <span class="dot"></span>${statusMeta[m.status]?.label || 'Upcoming'}
            </span>
          </div>
          
          <div class="meta" style="margin-top:3px;font-size:0.8rem;color:var(--color-text-secondary);">
            ${escapeHtml(m.dosage || '1 tablet')} &middot; ${escapeHtml(m.frequency || 'Once daily')} &middot; ${escapeHtml(m.meal || 'After meal')} &middot; ${escapeHtml(m.time || '—')}
          </div>

          ${datesText ? `<div style="font-size:0.76rem;color:var(--color-text-muted);margin-top:3px;display:flex;align-items:center;gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${escapeHtml(datesText)}</span>
          </div>` : ''}

          ${m.instructions ? `
            <div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:4px;">
              <span style="font-weight:600;color:var(--color-text);">Instructions:</span> ${escapeHtml(m.instructions)}
            </div>
          ` : ''}

          ${m.description ? `
            <div style="font-size:0.8rem;color:var(--color-primary-dark);margin-top:6px;background:#F0FDFA;padding:6px 10px;border-radius:6px;border-left:3px solid var(--color-primary);line-height:1.4;">
              <span style="font-weight:600;color:var(--color-text);">বিবরণ:</span> ${escapeHtml(m.description)}
            </div>
          ` : ''}

          <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-hm btn-ghost" style="font-size:0.76rem;padding:4px 10px;border:1px solid #CBD5E1;background:#F8FAFC;display:inline-flex;align-items:center;gap:5px;font-weight:600;" onclick="openDoseHistoryModal('${m.id}')" title="শুরুর তারিখ থেকে আজ পর্যন্ত প্রতিদিনের ডোজ লগ পরিবর্তন করুন">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Dose History</span>
            </button>
          </div>
        </div>

        <div class="list-row-side" style="margin-top:2px;">
          <label class="toggle" title="Reminder">
            <input type="checkbox" ${m.reminder !== false ? 'checked' : ''} onchange="toggleReminder('${m.id}', this.checked)">
            <span class="toggle-track"></span>
          </label>
          <button class="icon-action" title="Edit" onclick="openEditMedicine('${m.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-action danger" title="Remove" onclick="askDeleteMedicine('${m.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function markTaken(id) {
  const med = await HMStore.markMedicineTaken(id);
  if (!med) return;
  medicines = HMStore.getMedicines();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
  showToast(`${med.name} marked as taken`);
}

async function toggleTakenStatus(id) {
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(id));
  if (!med) return;

  if (med.status === 'taken') {
    await HMStore.markMedicinePending(id);
    showToast(`${med.name} reset to upcoming`);
  } else {
    await HMStore.markMedicineTaken(id);
    showToast(`${med.name} marked as taken`);
  }
  medicines = HMStore.getMedicines();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
}

async function toggleReminder(id, checked) {
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(id));
  if (!med) return;
  med.reminder = checked;
  await HMStore.saveMedicine(med);
  medicines = HMStore.getMedicines();
  showToast(`Reminder ${checked ? 'enabled' : 'disabled'} for ${med.name}`);
}

/* =========================================================
   DOSE HISTORY MANAGEMENT (PAST INTAKE EDITING)
========================================================= */

function openDoseHistoryModal(medId) {
  activeHistoryMedId = medId;
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(medId));
  if (!med) return;

  const titleEl = document.getElementById('doseHistoryModalTitle');
  const subEl = document.getElementById('doseHistoryModalSub');
  if (titleEl) titleEl.textContent = `Dose History: ${med.name}`;
  if (subEl) {
    const startStr = med.start ? `Starting: ${med.start}` : 'Recent doses';
    subEl.textContent = `${startStr} · শুরুর তারিখ থেকে আজ পর্যন্ত প্রতিদিনের ওষুধ খাওয়ার স্ট্যাটাস পরিবর্তন করুন`;
  }

  const customDateInput = document.getElementById('customLogDate');
  if (customDateInput) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    customDateInput.value = formatDateToISO(yesterday);
  }

  renderDoseHistoryModalList();
  openModal('doseHistoryModal');
}

function renderDoseHistoryModalList() {
  const container = document.getElementById('doseHistoryItemsContainer');
  if (!container || !activeHistoryMedId) return;

  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(activeHistoryMedId));
  if (!med) return;

  const history = med.history || {};
  const dates = getDaysBetween(med.start, med.end, Object.keys(history));

  if (dates.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--color-text-muted);font-size:0.85rem;">No history days found.</div>`;
    return;
  }

  container.innerHTML = dates.map(dateStr => {
    const info = formatDisplayDate(dateStr);
    const status = history[dateStr]; // 'taken' | 'missed' | undefined

    let badgeHtml = `<span style="font-size:0.75rem;padding:3px 8px;border-radius:12px;background:#F1F5F9;color:#64748B;font-weight:600;">— Not set</span>`;
    if (status === 'taken') {
      badgeHtml = `<span style="font-size:0.75rem;padding:3px 8px;border-radius:12px;background:#ECFDF5;color:#059669;font-weight:700;">✓ Taken</span>`;
    } else if (status === 'missed') {
      badgeHtml = `<span style="font-size:0.75rem;padding:3px 8px;border-radius:12px;background:#FEF2F2;color:#DC2626;font-weight:700;">✗ Missed</span>`;
    }

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;gap:8px;flex-wrap:wrap;">
        <div style="min-width:130px;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--color-text);">${info.dateFormatted}</div>
          <div style="font-size:0.75rem;color:var(--color-text-muted);">${info.dayName}${info.relative}</div>
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          ${badgeHtml}
        </div>

        <div style="display:flex;align-items:center;gap:4px;">
          <button type="button" class="btn-hm btn-ghost" 
            style="font-size:0.75rem;padding:4px 8px;border:1px solid ${status === 'taken' ? '#059669' : '#CBD5E1'};background:${status === 'taken' ? '#ECFDF5' : '#FFFFFF'};color:${status === 'taken' ? '#047857' : 'var(--color-text)'};font-weight:${status === 'taken' ? '700' : '500'};"
            onclick="setDayStatus('${dateStr}', 'taken')">
            ✓ Taken
          </button>
          <button type="button" class="btn-hm btn-ghost" 
            style="font-size:0.75rem;padding:4px 8px;border:1px solid ${status === 'missed' ? '#DC2626' : '#CBD5E1'};background:${status === 'missed' ? '#FEF2F2' : '#FFFFFF'};color:${status === 'missed' ? '#B91C1C' : 'var(--color-text)'};font-weight:${status === 'missed' ? '700' : '500'};"
            onclick="setDayStatus('${dateStr}', 'missed')">
            ✗ Missed
          </button>
          <button type="button" class="btn-hm btn-ghost" 
            style="font-size:0.75rem;padding:4px 8px;border:1px solid #E2E8F0;background:#F8FAFC;color:var(--color-text-muted);"
            onclick="setDayStatus('${dateStr}', 'unrecorded')" title="Clear record">
            Clear
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function setDayStatus(dateStr, status) {
  if (!activeHistoryMedId) return;
  await HMStore.setMedicineHistoryStatus(activeHistoryMedId, dateStr, status);
  medicines = HMStore.getMedicines();
  renderDoseHistoryModalList();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();

  const statusLabel = status === 'taken' ? 'Taken (খাওয়া হয়েছে)' : (status === 'missed' ? 'Missed (খাওয়া হয়নি)' : 'Cleared');
  showToast(`${dateStr}: ${statusLabel}`);
}

async function quickMarkAllHistory(status) {
  if (!activeHistoryMedId) return;
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(activeHistoryMedId));
  if (!med) return;

  const dates = getDaysBetween(med.start, med.end, Object.keys(med.history || {}));
  for (const d of dates) {
    await HMStore.setMedicineHistoryStatus(activeHistoryMedId, d, status);
  }

  medicines = HMStore.getMedicines();
  renderDoseHistoryModalList();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
  showToast(`All days marked as ${status === 'taken' ? 'Taken' : 'Missed'}`);
}

async function addCustomLogDate() {
  const input = document.getElementById('customLogDate');
  if (!input || !input.value) {
    showToast('Please select a valid date');
    return;
  }
  const dateStr = input.value.trim();
  if (!activeHistoryMedId) return;

  await HMStore.setMedicineHistoryStatus(activeHistoryMedId, dateStr, 'taken');
  medicines = HMStore.getMedicines();
  renderDoseHistoryModalList();
  renderSchedule();
  renderMedicineList();
  showToast(`Added ${dateStr} as Taken`);
}

/* =========================================================
   INLINE PAST DOSE HISTORY (INSIDE EDIT MEDICINE MODAL)
========================================================= */

function renderModalHistory(medId) {
  const listEl = document.getElementById('medModalHistoryList');
  const container = document.getElementById('medModalHistoryContainer');
  if (!listEl || !container) return;

  const med = medicines.find(m => String(m.id) === String(medId));
  if (!med) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const history = med.history || {};
  const dates = getDaysBetween(med.start, med.end, Object.keys(history));

  if (dates.length === 0) {
    listEl.innerHTML = `<div style="font-size:0.75rem;color:var(--color-text-muted);text-align:center;padding:8px;">No past days to display.</div>`;
    return;
  }

  listEl.innerHTML = dates.map(dateStr => {
    const info = formatDisplayDate(dateStr);
    const status = history[dateStr];

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;gap:6px;">
        <div>
          <span style="font-weight:600;font-size:0.8rem;">${info.dateFormatted}</span>
          <span style="font-size:0.72rem;color:var(--color-text-muted);">(${info.dayName}${info.relative})</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button type="button" class="btn-hm btn-ghost" 
            style="font-size:0.72rem;padding:3px 7px;border:1px solid ${status === 'taken' ? '#059669' : '#CBD5E1'};background:${status === 'taken' ? '#ECFDF5' : '#FFFFFF'};color:${status === 'taken' ? '#047857' : 'var(--color-text)'};"
            onclick="setInlineModalDayStatus('${med.id}', '${dateStr}', 'taken')">
            ✓ Taken
          </button>
          <button type="button" class="btn-hm btn-ghost" 
            style="font-size:0.72rem;padding:3px 7px;border:1px solid ${status === 'missed' ? '#DC2626' : '#CBD5E1'};background:${status === 'missed' ? '#FEF2F2' : '#FFFFFF'};color:${status === 'missed' ? '#B91C1C' : 'var(--color-text)'};"
            onclick="setInlineModalDayStatus('${med.id}', '${dateStr}', 'missed')">
            ✗ Missed
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function setInlineModalDayStatus(medId, dateStr, status) {
  await HMStore.setMedicineHistoryStatus(medId, dateStr, status);
  medicines = HMStore.getMedicines();
  renderModalHistory(medId);
  renderSchedule();
  renderMedicineList();
}

async function markAllHistoryInModal(status) {
  const medId = document.getElementById('medId').value;
  if (!medId) return;
  const med = medicines.find(m => String(m.id) === String(medId));
  if (!med) return;

  const dates = getDaysBetween(med.start, med.end, Object.keys(med.history || {}));
  for (const d of dates) {
    await HMStore.setMedicineHistoryStatus(med.id, d, status);
  }
  medicines = HMStore.getMedicines();
  renderModalHistory(med.id);
  renderSchedule();
  renderMedicineList();
  showToast(`All days marked as ${status === 'taken' ? 'Taken' : 'Missed'}`);
}

/* =========================================================
   ADD / EDIT MODALS
========================================================= */

function openAddMedicine() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const who = activeProfile && !activeProfile.isOwner ? ` (${activeProfile.name})` : '';
  document.getElementById('medicineModalTitle').textContent = `Add a medicine${who}`;
  document.getElementById('medicineForm').reset();
  document.getElementById('medId').value = '';
  document.getElementById('medStart').value = formatDateToISO(new Date());
  document.getElementById('medDescription').value = '';
  document.getElementById('medReminder').checked = true;

  const historyContainer = document.getElementById('medModalHistoryContainer');
  if (historyContainer) historyContainer.style.display = 'none';

  openModal('medicineModal');
}

function openEditMedicine(id) {
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(id));
  if (!med) return;
  document.getElementById('medicineModalTitle').textContent = 'Edit medicine';
  document.getElementById('medId').value = med.id;
  document.getElementById('medName').value = med.name || '';
  document.getElementById('medDosage').value = med.dosage || '';
  document.getElementById('medTime').value = med.time || '';
  document.getElementById('medFrequency').value = med.frequency || 'Once daily';
  document.getElementById('medMeal').value = med.meal || 'After meal';
  document.getElementById('medStart').value = med.start || '';
  document.getElementById('medEnd').value = med.end || '';
  document.getElementById('medInstructions').value = med.instructions || '';
  document.getElementById('medDescription').value = med.description || '';
  document.getElementById('medReminder').checked = med.reminder !== false;

  renderModalHistory(med.id);
  openModal('medicineModal');
}

function askDeleteMedicine(id) {
  pendingDeleteId = id;
  openModal('deleteMedModal');
}

async function confirmDeleteMedicine() {
  if (pendingDeleteId) {
    await HMStore.deleteMedicine(pendingDeleteId);
    medicines = HMStore.getMedicines();
    pendingDeleteId = null;
  }
  closeModal('deleteMedModal');
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
  showToast('Medicine removed');
}

/* =========================================================
   FORM SUBMISSION
========================================================= */

document.getElementById('medicineForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idVal = document.getElementById('medId').value;
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';

  const data = {
    name: document.getElementById('medName').value.trim(),
    memberId: currentProfileId,
    dosage: document.getElementById('medDosage').value.trim() || '1 tablet',
    time: document.getElementById('medTime').value.trim() || '08:00 AM',
    unit: 'tablets',
    frequency: document.getElementById('medFrequency').value,
    meal: document.getElementById('medMeal').value,
    start: document.getElementById('medStart').value.trim(),
    end: document.getElementById('medEnd').value.trim(),
    instructions: document.getElementById('medInstructions').value.trim(),
    description: document.getElementById('medDescription').value.trim(),
    reminder: document.getElementById('medReminder').checked,
  };

  if (!data.name) return;

  let savedMed = null;
  if (idVal) {
    medicines = HMStore.getMedicines();
    const existing = medicines.find(m => String(m.id) === String(idVal));
    const merged = { ...(existing || {}), ...data, id: idVal };
    savedMed = await HMStore.saveMedicine(merged);
    showToast('Medicine updated in cloud');
  } else {
    savedMed = await HMStore.saveMedicine({ status: 'upcoming', ...data });
    showToast('Medicine saved to cloud');
  }

  medicines = HMStore.getMedicines();
  closeModal('medicineModal');
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();

  // If start date was in the past and added as new medicine, give quick option to log past doses
  if (!idVal && data.start) {
    const startDate = parseDateStrToDate(data.start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate && startDate < today && savedMed) {
      setTimeout(() => {
        openDoseHistoryModal(savedMed.id);
      }, 400);
    }
  }
});

// Initialization
initPageHeader();
renderSchedule();
renderMedicineList();

if (window.HMStore && typeof HMStore.fetchMedicinesAndRoutines === 'function') {
  HMStore.fetchMedicinesAndRoutines().then(() => {
    medicines = HMStore.getMedicines();
    renderSchedule();
    renderMedicineList();
    if (window.initAppShell) initAppShell();
  });
}

// Auto-refresh when cloud sync completes
window.addEventListener('hm:cloud-synced', () => {
  if (window.HMStore) {
    medicines = HMStore.getMedicines();
    renderSchedule();
    renderMedicineList();
  }
});
