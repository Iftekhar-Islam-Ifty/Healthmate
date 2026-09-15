/* =========================================================
   HEALTHMATE — MEDICINES PAGE LOGIC
   All data below is in-memory mock data for the frontend
   prototype. When Laravel exists, replace:
     - `medicines` array          -> data loaded from GET /api/medicines
     - saveMedicineToState()      -> POST/PUT /api/medicines
     - removeMedicineFromState()  -> DELETE /api/medicines/{id}
     - markTaken()                -> POST /api/medicines/{id}/log
   The render functions and DOM ids can stay the same.
========================================================= */

let medicines = [
  { id: 1, name: 'Medicine A', dosage: '1 tablet', time: '8:00 AM', frequency: 'Once daily', meal: 'After meal', start: '1 Sep 2026', end: '', instructions: 'Take after breakfast', reminder: true, status: 'taken' },
  { id: 2, name: 'Medicine B', dosage: '1 tablet', time: '2:00 PM', frequency: 'Twice daily', meal: 'Before meal', start: '1 Sep 2026', end: '', instructions: '', reminder: true, status: 'pending' },
  { id: 3, name: 'Medicine C — Blood pressure', dosage: '1 tablet', time: '9:00 PM', frequency: 'Once daily', meal: 'With meal', start: '15 Aug 2026', end: '', instructions: 'Do not skip, even if feeling well', reminder: true, status: 'upcoming' },
];

let nextMedId = 4;
let pendingDeleteId = null;

const statusMeta = {
  taken:    { label: 'Taken',    badgeClass: 'badge-success' },
  pending:  { label: 'Pending',  badgeClass: 'badge-warning' },
  upcoming: { label: 'Upcoming', badgeClass: 'badge-info' },
  missed:   { label: 'Missed',   badgeClass: 'badge-error' },
};

const pillIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3"/></svg>`;

function renderSchedule() {
  const el = document.getElementById('scheduleList');
  el.innerHTML = medicines.map(m => {
    const meta = statusMeta[m.status];
    const actionBtn = m.status === 'taken'
      ? ''
      : `<button class="btn-hm btn-secondary" style="padding:6px 14px;font-size:0.8rem;" onclick="markTaken(${m.id})">Mark as taken</button>`;
    return `
      <div class="med-row">
        <span class="med-time">${m.time}</span>
        <span class="med-name">${m.name}</span>
        <span class="badge-hm ${meta.badgeClass}" style="margin-right:var(--space-2);"><span class="dot"></span>${meta.label}</span>
        ${actionBtn}
      </div>`;
  }).join('');
}

function renderMedicineList() {
  const el = document.getElementById('medicineList');
  const emptyEl = document.getElementById('medicinesEmpty');

  if (medicines.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';

  el.innerHTML = medicines.map(m => `
    <div class="list-row">
      <div class="list-row-icon">${pillIcon}</div>
      <div class="list-row-main">
        <div class="name">${m.name}</div>
        <div class="meta">${m.dosage || 'No dosage set'} &middot; ${m.frequency} &middot; ${m.meal} &middot; ${m.time}</div>
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
  `).join('');
}

function markTaken(id) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  med.status = 'taken';
  renderSchedule();
  showToast(`${med.name} marked as taken`);
}

function toggleReminder(id, checked) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  med.reminder = checked;
}

function openAddMedicine() {
  document.getElementById('medicineModalTitle').textContent = 'Add a medicine';
  document.getElementById('medicineForm').reset();
  document.getElementById('medId').value = '';
  document.getElementById('medReminder').checked = true;
  openModal('medicineModal');
}

function openEditMedicine(id) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  document.getElementById('medicineModalTitle').textContent = 'Edit medicine';
  document.getElementById('medId').value = med.id;
  document.getElementById('medName').value = med.name;
  document.getElementById('medDosage').value = med.dosage;
  document.getElementById('medTime').value = med.time;
  document.getElementById('medFrequency').value = med.frequency;
  document.getElementById('medMeal').value = med.meal;
  document.getElementById('medStart').value = med.start;
  document.getElementById('medEnd').value = med.end;
  document.getElementById('medInstructions').value = med.instructions;
  document.getElementById('medReminder').checked = med.reminder;
  openModal('medicineModal');
}

function askDeleteMedicine(id) {
  pendingDeleteId = id;
  openModal('deleteMedModal');
}

function confirmDeleteMedicine() {
  medicines = medicines.filter(m => m.id !== pendingDeleteId);
  pendingDeleteId = null;
  closeModal('deleteMedModal');
  renderSchedule();
  renderMedicineList();
  showToast('Medicine removed');
}

document.getElementById('medicineForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const idVal = document.getElementById('medId').value;
  const data = {
    name: document.getElementById('medName').value.trim(),
    dosage: document.getElementById('medDosage').value.trim(),
    time: document.getElementById('medTime').value.trim() || '—',
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
    showToast('Medicine updated');
  } else {
    medicines.push({ id: nextMedId++, status: 'upcoming', ...data });
    showToast('Medicine added');
  }

  closeModal('medicineModal');
  renderSchedule();
  renderMedicineList();
});

renderSchedule();
renderMedicineList();
