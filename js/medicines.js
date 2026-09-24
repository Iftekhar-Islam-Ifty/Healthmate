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

function normalizeDateStr(str) {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return formatDateToISO(d);
  }
  return '';
}

function parseDateStrToDate(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.slice(0, 10).split('-').map(Number);
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
  const todayISO = formatDateToISO(today);

  const startNormalized = normalizeDateStr(startDateStr);
  const endNormalized = normalizeDateStr(endDateStr);

  let start = parseDateStrToDate(startNormalized);
  if (!start) {
    start = new Date(today);
    start.setDate(today.getDate() - 6);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  // Calculate the effective end boundary:
  // 1. If an end date is set, the date list MUST NEVER exceed endNormalized!
  // 2. The date list also does not show future unreached dates beyond today.
  let end;
  if (endNormalized) {
    const parsedEnd = parseDateStrToDate(endNormalized);
    if (parsedEnd) {
      parsedEnd.setHours(0, 0, 0, 0);
      // If end date is in the past, stop strictly at end date. If end date is in future, stop at today.
      end = parsedEnd < today ? parsedEnd : today;
    } else {
      end = today;
    }
  } else {
    end = today;
  }

  const dateSet = new Set();

  if (start > end) {
    const sISO = formatDateToISO(start);
    if (!endNormalized || sISO <= endNormalized) {
      dateSet.add(sISO);
    }
  } else {
    const curr = new Date(start);
    const diffDays = Math.min(Math.round((end - start) / (1000 * 60 * 60 * 24)), 180);
    for (let i = 0; i <= diffDays; i++) {
      const cISO = formatDateToISO(curr);
      // Strictly enforce that no date after end date is included!
      if (!endNormalized || cISO <= endNormalized) {
        dateSet.add(cISO);
      }
      curr.setDate(curr.getDate() + 1);
    }
  }

  // Also include any dates that already exist in history, BUT NEVER past endNormalized!
  if (Array.isArray(existingHistoryKeys)) {
    existingHistoryKeys.forEach(k => {
      const kNorm = normalizeDateStr(k);
      if (kNorm && /^\d{4}-\d{2}-\d{2}$/.test(kNorm)) {
        if (!endNormalized || kNorm <= endNormalized) {
          dateSet.add(kNorm);
        }
      }
    });
  }

  // Sort descending: today/recent dates at the top
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

let currentMedFilter = 'all'; // 'all' | 'active' | 'completed'
let currentSearchQuery = '';

function setMedicineFilter(filter) {
  currentMedFilter = filter;
  ['All', 'Active', 'Completed'].forEach(tab => {
    const btn = document.getElementById(`tabFilter${tab}`);
    if (btn) {
      if (tab.toLowerCase() === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
  renderMedicineList();
}

function handleMedicineSearch(query) {
  currentSearchQuery = (query || '').trim().toLowerCase();
  renderMedicineList();
}

function renderSchedule() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  const allFiltered = getFilteredMedicines();
  // Filter out completed medicines from today's schedule
  const list = allFiltered.filter(m => !HMStore.isMedicineCompleted(m));

  if (list.length === 0) {
    el.innerHTML = `
      <div style="padding:24px 16px;text-align:center;background:#FFFFFF;border:1px dashed var(--color-border);border-radius:12px;">
        <div style="color:var(--color-primary);font-size:1.5rem;margin-bottom:6px;">✨</div>
        <div style="font-weight:700;font-size:0.95rem;color:var(--color-text);">আজকের জন্য কোনো সক্রিয় ওষুধ শিডিউল করা নেই</div>
        <div style="color:var(--color-text-muted);font-size:0.82rem;margin-top:4px;">নতুন ওষুধ যোগ করতে উপরের "+ Add medicine" বাটনে ক্লিক করুন।</div>
      </div>
    `;
    return;
  }

  el.innerHTML = list.map(m => {
    const todayStr = formatDateToISO(new Date());
    const isTaken = HMStore.isMedicineTakenToday ? HMStore.isMedicineTakenToday(m, todayStr) : (m.status === 'taken');
    const todayStatus = isTaken ? 'taken' : (m.status === 'missed' ? 'missed' : 'upcoming');
    const meta = statusMeta[todayStatus] || statusMeta.pending;

    const actionBtn = isTaken
      ? `<button type="button" class="btn-hm btn-ghost" style="padding:8px 14px;font-size:0.84rem;color:#047857;font-weight:700;border-radius:8px;background:#ECFDF5;border:1px solid #A7F3D0;display:inline-flex;align-items:center;gap:6px;" onclick="toggleTakenStatus('${m.id}')" title="ভুলবশত ক্লিক হয়ে থাকলে আনমার্ক করুন">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>✓ Taken (খাওয়া হয়েছে)</span>
        </button>`
      : `<button type="button" class="btn-hm btn-primary" style="padding:8px 18px;font-size:0.84rem;font-weight:600;box-shadow:0 3px 8px rgba(13,110,110,0.22);display:inline-flex;align-items:center;gap:6px;" onclick="markTaken('${m.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>Mark as taken</span>
        </button>`;

    return `
      <div class="today-med-card ${isTaken ? 'is-taken' : ''}">
        <div class="today-med-header">
          <div class="today-med-title-wrap">
            <h3 class="today-med-name">${escapeHtml(m.name)}</h3>
            <div class="med-meta-chips">
              <span class="med-chip time-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>${escapeHtml(m.time || 'Time not set')}</span>
              </span>
              <span class="med-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/></svg>
                <span>${escapeHtml(m.dosage || '1 tablet')}</span>
              </span>
              <span class="med-chip meal-chip">
                <span>🍽️ ${escapeHtml(m.meal || 'After meal')}</span>
              </span>
            </div>
          </div>
          <span class="badge-hm ${meta.badgeClass}" style="font-size:0.75rem;padding:3px 10px;flex-shrink:0;">
            <span class="dot"></span>${meta.label}
          </span>
        </div>

        ${m.description ? `
          <div class="med-desc-box">
            <span style="font-weight:700;color:var(--color-primary-dark);">বিবরণ:</span> ${escapeHtml(m.description)}
          </div>
        ` : ''}

        ${m.instructions ? `
          <div style="font-size:0.78rem;color:var(--color-text-secondary);padding-left:2px;">
            <span style="font-weight:600;color:var(--color-text);">নির্দেশনা:</span> ${escapeHtml(m.instructions)}
          </div>
        ` : ''}

        <div class="today-med-actions">
          <button type="button" class="btn-hm btn-ghost" style="font-size:0.78rem;padding:6px 12px;border:1px solid #CBD5E1;background:#FFFFFF;display:inline-flex;align-items:center;gap:6px;font-weight:600;" onclick="openDoseHistoryModal('${m.id}')" title="বিগত দিনগুলোর ডোজ লগ পরিবর্তন করুন">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Dose History</span>
          </button>
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

function renderMedicineList() {
  const el = document.getElementById('medicineList');
  const emptyEl = document.getElementById('medicinesEmpty');
  const emptyMsgEl = document.getElementById('emptyStateMsg');
  if (!el || !emptyEl) return;

  const allFiltered = getFilteredMedicines();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Update count badges
  const totalCount = allFiltered.length;
  const activeCount = allFiltered.filter(m => !HMStore.isMedicineCompleted(m)).length;
  const completedCount = allFiltered.filter(m => HMStore.isMedicineCompleted(m)).length;

  const cAllEl = document.getElementById('countFilterAll');
  const cActEl = document.getElementById('countFilterActive');
  const cCompEl = document.getElementById('countFilterCompleted');
  if (cAllEl) cAllEl.textContent = totalCount;
  if (cActEl) cActEl.textContent = activeCount;
  if (cCompEl) cCompEl.textContent = completedCount;

  // Filter by tab
  let list = allFiltered;
  if (currentMedFilter === 'active') {
    list = list.filter(m => !HMStore.isMedicineCompleted(m));
  } else if (currentMedFilter === 'completed') {
    list = list.filter(m => HMStore.isMedicineCompleted(m));
  }

  // Filter by search query
  if (currentSearchQuery) {
    list = list.filter(m => {
      const name = (m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      const inst = (m.instructions || '').toLowerCase();
      const meal = (m.meal || '').toLowerCase();
      const dosage = (m.dosage || '').toLowerCase();
      return name.includes(currentSearchQuery) || 
             desc.includes(currentSearchQuery) || 
             inst.includes(currentSearchQuery) || 
             meal.includes(currentSearchQuery) || 
             dosage.includes(currentSearchQuery);
    });
  }

  if (list.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    if (emptyMsgEl) {
      if (currentSearchQuery) {
        emptyMsgEl.textContent = `"${currentSearchQuery}" দিয়ে কোনো ওষুধ খুঁজে পাওয়া যায়নি।`;
      } else if (currentMedFilter === 'completed') {
        emptyMsgEl.textContent = `কোনো সম্পূর্ণ (Completed) ওষুধ নেই।`;
      } else if (currentMedFilter === 'active') {
        emptyMsgEl.textContent = `কোনো চলমান সক্রিয় ওষুধ নেই।`;
      } else {
        emptyMsgEl.textContent = `আপনার অ্যাকাউন্টে কোনো ওষুধ নেই। নতুন ওষুধ যোগ করতে বাটনে চাপুন।`;
      }
    }
    return;
  }

  el.style.display = 'block';
  emptyEl.style.display = 'none';

  el.innerHTML = list.map(m => {
    const isCompleted = HMStore.isMedicineCompleted(m);
    const isExpired = m.end && todayStr > m.end;

    const datesInfo = [];
    if (m.start) datesInfo.push(`Started: ${m.start}`);
    if (m.end) datesInfo.push(`Ends: ${m.end}`);
    const datesText = datesInfo.join(' · ');

    let statusBadgeHtml = '';
    if (isCompleted) {
      statusBadgeHtml = `
        <span class="badge-hm" style="background:#EDE9FE;color:#6D28D9;border:1px solid #DDD6FE;font-size:0.75rem;padding:3px 10px;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:20px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          Complete (সম্পূর্ণ)
        </span>
      `;
    } else {
      const meta = statusMeta[m.status] || statusMeta.pending;
      statusBadgeHtml = `
        <span class="badge-hm ${meta.badgeClass}" style="font-size:0.72rem;padding:2px 8px;">
          <span class="dot"></span>${meta.label}
        </span>
      `;
    }

    return `
      <div class="inventory-card ${isCompleted ? 'is-completed' : ''}">
        <div class="inventory-top-row">
          <div class="inventory-name-section">
            <div class="inventory-icon-box">
              ${pillIcon}
            </div>
            <div class="inventory-title-wrap">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <h3 class="inventory-name">${escapeHtml(m.name)}</h3>
                ${statusBadgeHtml}
              </div>
              <div class="med-meta-chips" style="margin-top:6px;">
                <span class="med-chip time-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>${escapeHtml(m.time || '—')}</span>
                </span>
                <span class="med-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/></svg>
                  <span>${escapeHtml(m.dosage || '1 tablet')}</span>
                </span>
                <span class="med-chip">
                  <span>${escapeHtml(m.frequency || 'Once daily')}</span>
                </span>
                <span class="med-chip meal-chip">
                  <span>🍽️ ${escapeHtml(m.meal || 'After meal')}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="inventory-controls">
            <button type="button" class="icon-action" title="Edit" onclick="openEditMedicine('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button type="button" class="icon-action danger" title="Remove" onclick="askDeleteMedicine('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>

        ${datesText ? `
          <div style="font-size:0.78rem;color:var(--color-text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${escapeHtml(datesText)}</span>
            ${isCompleted ? (isExpired ? `<span style="background:#EDE9FE;color:#6D28D9;padding:2px 8px;border-radius:4px;font-weight:700;font-size:0.72rem;">📅 মেয়াদ অতিক্রান্ত (${m.end})</span>` : `<span style="background:#EDE9FE;color:#6D28D9;padding:2px 8px;border-radius:4px;font-weight:700;font-size:0.72rem;">✓ সমাপ্ত চিহ্নিত</span>`) : ''}
          </div>
        ` : ''}

        ${m.instructions ? `
          <div style="font-size:0.8rem;color:var(--color-text-secondary);">
            <span style="font-weight:600;color:var(--color-text);">Instructions:</span> ${escapeHtml(m.instructions)}
          </div>
        ` : ''}

        ${m.description ? `
          <div class="med-desc-box">
            <span style="font-weight:700;color:var(--color-primary-dark);">বিবরণ:</span> ${escapeHtml(m.description)}
          </div>
        ` : ''}

        <div class="inventory-footer">
          <button type="button" class="btn-hm btn-ghost" style="font-size:0.78rem;padding:5px 12px;border:1px solid #CBD5E1;background:#FFFFFF;display:inline-flex;align-items:center;gap:6px;font-weight:600;" onclick="openDoseHistoryModal('${m.id}')" title="শুরুর তারিখ থেকে আজ পর্যন্ত প্রতিদিনের ডোজ লগ পরিবর্তন করুন">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Dose History</span>
          </button>

          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.78rem;color:var(--color-text-muted);font-weight:500;">Reminder</span>
            <label class="toggle" title="Reminder">
              <input type="checkbox" ${m.reminder !== false && !isCompleted ? 'checked' : ''} ${isCompleted ? 'disabled' : ''} onchange="toggleReminder('${m.id}', this.checked)">
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleCompleteStatus(id, forceStatus) {
  const med = await HMStore.toggleMedicineCompletion(id, forceStatus);
  if (!med) return;
  medicines = HMStore.getMedicines();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
  const isComp = HMStore.isMedicineCompleted(med);
  showToast(isComp ? `${med.name} marked as Complete (সম্পূর্ণ)` : `${med.name} marked as Active (সক্রিয়)`);
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

  const todayStr = formatDateToISO(new Date());
  const isTaken = HMStore.isMedicineTakenToday ? HMStore.isMedicineTakenToday(med, todayStr) : (med.status === 'taken');

  if (isTaken) {
    await HMStore.markMedicinePending(id, todayStr);
    showToast(`${med.name} reset to upcoming`);
  } else {
    await HMStore.markMedicineTaken(id, todayStr);
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
    const endStr = med.end ? ` · Ends: ${med.end}` : '';
    subEl.textContent = `${startStr}${endStr} · শুরুর তারিখ থেকে শেষ তারিখ পর্যন্ত প্রতিদিনের ওষুধ খাওয়ার স্ট্যাটাস`;
  }

  const customDateInput = document.getElementById('customLogDate');
  if (customDateInput) {
    const todayStr = formatDateToISO(new Date());
    const maxDate = med.end && med.end < todayStr ? med.end : todayStr;
    customDateInput.max = maxDate;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToISO(yesterday);
    customDateInput.value = maxDate < yesterdayStr ? maxDate : yesterdayStr;
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

    const actionButtons = `
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
    `;

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
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

async function setDayStatus(dateStr, status) {
  if (!activeHistoryMedId) return;
  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(activeHistoryMedId));
  if (med && med.end && dateStr > med.end && (status === 'taken' || status === 'missed')) {
    showToast('Cannot mark doses after the last date (শেষ তারিখের পর প্রযোজ্য নয়)');
    return;
  }

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
    if (!med.end || d <= med.end) {
      await HMStore.setMedicineHistoryStatus(activeHistoryMedId, d, status);
    }
  }

  medicines = HMStore.getMedicines();
  renderDoseHistoryModalList();
  renderSchedule();
  renderMedicineList();
  if (window.initAppShell) initAppShell();
  showToast(`All active course days marked as ${status === 'taken' ? 'Taken' : 'Missed'}`);
}

async function addCustomLogDate() {
  const input = document.getElementById('customLogDate');
  if (!input || !input.value) {
    showToast('Please select a valid date');
    return;
  }
  const dateStr = normalizeDateStr(input.value);
  if (!activeHistoryMedId) return;

  medicines = HMStore.getMedicines();
  const med = medicines.find(m => String(m.id) === String(activeHistoryMedId));
  if (med && med.end && dateStr > med.end) {
    showToast('Selected date is after the medicine end date (শেষ তারিখের পরের তারিখ প্রযোজ্য নয়)');
    return;
  }

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

    const actionButtons = `
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
    `;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;gap:6px;">
        <div>
          <span style="font-weight:600;font-size:0.8rem;">${info.dateFormatted}</span>
          <span style="font-size:0.72rem;color:var(--color-text-muted);">(${info.dayName}${info.relative})</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

async function setInlineModalDayStatus(medId, dateStr, status) {
  const med = medicines.find(m => String(m.id) === String(medId));
  if (med && med.end && dateStr > med.end) {
    showToast('Cannot set status after medicine end date');
    return;
  }
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
    if (!med.end || d <= med.end) {
      await HMStore.setMedicineHistoryStatus(med.id, d, status);
    }
  }
  medicines = HMStore.getMedicines();
  renderModalHistory(med.id);
  renderSchedule();
  renderMedicineList();
  showToast(`All active days marked as ${status === 'taken' ? 'Taken' : 'Missed'}`);
}

/* =========================================================
   DATE QUICK PRESETS & MODAL HELPERS
========================================================= */

function setQuickStartDate(type) {
  const startInput = document.getElementById('medStart');
  if (!startInput) return;
  const d = new Date();
  if (type === 'yesterday') {
    d.setDate(d.getDate() - 1);
  }
  startInput.value = formatDateToISO(d);
  updateModalDateSummary();
}

function setQuickEndDate(days) {
  const startInput = document.getElementById('medStart');
  const endInput = document.getElementById('medEnd');
  if (!endInput) return;

  const baseDate = startInput && startInput.value ? parseDateStrToDate(startInput.value) : new Date();
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setDate(d.getDate() + (Number(days) - 1));
  endInput.value = formatDateToISO(d);
  updateModalDateSummary();
}

function clearEndDate() {
  const endInput = document.getElementById('medEnd');
  if (endInput) {
    endInput.value = '';
    updateModalDateSummary();
  }
}

function updateModalDateSummary() {
  const startVal = normalizeDateStr(document.getElementById('medStart')?.value);
  const endVal = normalizeDateStr(document.getElementById('medEnd')?.value);
  const summaryBox = document.getElementById('medModalDateSummaryBox');
  const alertBox = document.getElementById('medModalCompletedAlert');
  const alertText = document.getElementById('medModalCompletedAlertText');
  const completedCheckbox = document.getElementById('medCompleted');
  if (!summaryBox) return;

  const todayStr = formatDateToISO(new Date());

  if (startVal && endVal) {
    const sDate = parseDateStrToDate(startVal);
    const eDate = parseDateStrToDate(endVal);
    if (sDate && eDate) {
      const diffTime = eDate.getTime() - sDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const daysCount = diffDays > 0 ? diffDays : 1;
      summaryBox.style.display = 'block';
      summaryBox.textContent = `📅 নির্ধারিত কোর্স: ${daysCount} দিন (${startVal} থেকে ${endVal})`;
    } else {
      summaryBox.style.display = 'none';
    }
  } else if (startVal && !endVal) {
    summaryBox.style.display = 'block';
    summaryBox.textContent = `📅 চলমান কোর্স (শুরু: ${startVal} · কোনো শেষ তারিখ নেই)`;
  } else {
    summaryBox.style.display = 'none';
  }

  // If end date is in the past, update the modal alert
  if (endVal && todayStr > endVal) {
    if (alertBox) alertBox.style.display = 'block';
    if (alertText) alertText.textContent = `এই ওষুধের শেষ তারিখ (${endVal}) অতিক্রান্ত হয়েছে। কোর্সটি স্বয়ংক্রিয়ভাবে Completed হিসেবে গণ্য হবে।`;
    if (completedCheckbox) completedCheckbox.checked = true;
  } else if (!completedCheckbox?.checked) {
    if (alertBox) alertBox.style.display = 'none';
  }
}

function onMedCompletedCheckboxChange(checked) {
  const alertBox = document.getElementById('medModalCompletedAlert');
  const alertText = document.getElementById('medModalCompletedAlertText');
  if (alertBox) {
    if (checked) {
      alertBox.style.display = 'block';
      if (alertText) alertText.textContent = 'ওষুধটি ব্যবহারকারী কর্তৃক সম্পূর্ণ (Completed) চিহ্নিত করা হয়েছে।';
    } else {
      const endVal = normalizeDateStr(document.getElementById('medEnd')?.value);
      const todayStr = formatDateToISO(new Date());
      if (endVal && todayStr > endVal) {
        alertBox.style.display = 'block';
        if (alertText) alertText.textContent = `এই ওষুধের শেষ তারিখ (${endVal}) অতিক্রান্ত হয়েছে।`;
      } else {
        alertBox.style.display = 'none';
      }
    }
  }
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
  document.getElementById('medEnd').value = '';
  document.getElementById('medDescription').value = '';
  document.getElementById('medCompleted').checked = false;
  document.getElementById('medReminder').checked = true;

  const alertBox = document.getElementById('medModalCompletedAlert');
  if (alertBox) alertBox.style.display = 'none';

  const historyContainer = document.getElementById('medModalHistoryContainer');
  if (historyContainer) historyContainer.style.display = 'none';

  updateModalDateSummary();
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
  document.getElementById('medFrequency').value = med.frequency || med.period || 'Once daily';
  document.getElementById('medMeal').value = med.meal || med.condition || 'After meal';
  
  const cleanStart = normalizeDateStr(med.start || med.start_date);
  const cleanEnd = normalizeDateStr(med.end || med.end_date);
  document.getElementById('medStart').value = cleanStart;
  document.getElementById('medEnd').value = cleanEnd;
  
  document.getElementById('medInstructions').value = med.instructions || '';
  document.getElementById('medDescription').value = med.description || '';
  
  const isCompleted = HMStore.isMedicineCompleted(med);
  document.getElementById('medCompleted').checked = isCompleted;
  document.getElementById('medReminder').checked = med.reminder !== false && !isCompleted;

  const alertBox = document.getElementById('medModalCompletedAlert');
  const alertText = document.getElementById('medModalCompletedAlertText');
  const todayStr = formatDateToISO(new Date());

  if (alertBox) {
    if (isCompleted || (cleanEnd && todayStr > cleanEnd)) {
      alertBox.style.display = 'block';
      if (cleanEnd && todayStr > cleanEnd) {
        if (alertText) alertText.textContent = `এই ওষুধের শেষ তারিখ (${cleanEnd}) অতিক্রান্ত হওয়ায় কোর্সটি সমাপ্ত হয়েছে।`;
      } else {
        if (alertText) alertText.textContent = 'এই ওষুধটি ব্যবহারকারী কর্তৃক সম্পূর্ণ (Completed) চিহ্নিত করা হয়েছে।';
      }
    } else {
      alertBox.style.display = 'none';
    }
  }

  updateModalDateSummary();
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
  const startVal = normalizeDateStr(document.getElementById('medStart').value);
  const endVal = normalizeDateStr(document.getElementById('medEnd').value);
  const todayStr = formatDateToISO(new Date());

  // Strict completion condition: checkbox is checked OR end date has passed today
  let isCompletedVal = document.getElementById('medCompleted').checked;
  if (endVal && todayStr > endVal) {
    isCompletedVal = true;
  }

  const data = {
    name: document.getElementById('medName').value.trim(),
    memberId: currentProfileId,
    dosage: document.getElementById('medDosage').value.trim() || '1 tablet',
    time: document.getElementById('medTime').value.trim() || '08:00 AM',
    unit: 'tablets',
    frequency: document.getElementById('medFrequency').value,
    meal: document.getElementById('medMeal').value,
    start: startVal,
    start_date: startVal,
    end: endVal,
    end_date: endVal,
    instructions: document.getElementById('medInstructions').value.trim(),
    description: document.getElementById('medDescription').value.trim(),
    completed: isCompletedVal,
    isCompleted: isCompletedVal,
    status: isCompletedVal ? 'completed' : 'upcoming',
    reminder: !isCompletedVal && document.getElementById('medReminder').checked,
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
    savedMed = await HMStore.saveMedicine(data);
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
