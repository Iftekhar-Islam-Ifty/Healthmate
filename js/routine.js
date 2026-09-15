/* =========================================================
   HEALTHMATE — DAILY ROUTINE PAGE LOGIC
   Mock data for the frontend prototype. When Laravel exists:
     - `routines` array         -> GET /api/routines
     - saveRoutineToState()     -> POST/PUT /api/routines
     - removeRoutineFromState() -> DELETE /api/routines/{id}
     - toggleToday()            -> POST /api/routines/{id}/log
   Render functions and DOM ids can stay the same.
========================================================= */

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TODAY_INDEX = 4; // Friday — demo "today" marker

let routines = [
  { id: 1, name: 'Drink water', category: 'Water', frequency: 'Daily', target: '8 glasses', reminder: true, week: [true, true, true, true, false, false, false] },
  { id: 2, name: 'Evening walk', category: 'Walking', frequency: 'Daily', target: '30 minutes', reminder: true, week: [true, true, false, true, false, false, false] },
  { id: 3, name: 'Sleep by 11 PM', category: 'Sleep', frequency: 'Daily', target: '', reminder: false, week: [true, false, true, true, false, false, false] },
];

let nextRoutineId = 4;
let pendingDeleteRoutineId = null;

const categoryIcons = {
  Water: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`,
  Walking: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1.5"/><path d="M10 22l1.5-6L9 14l1-5 3-2 3 2 1.5 4"/><path d="M11.5 16l3 2 2.5 4"/></svg>`,
  Exercise: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a4 4 0 0 0-6.8 0L12 6.6l-2-2a4 4 0 0 0-6.8 4.3C4.6 12 12 19 12 19s7.4-7 8.8-10.1a4 4 0 0 0 0-4.3z"/></svg>`,
  Sleep: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  Custom: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
};

function renderToday() {
  const el = document.getElementById('todayList');
  const emptyEl = document.getElementById('routineEmpty');
  const weeklySection = document.getElementById('weeklySection');

  if (routines.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    weeklySection.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';
  weeklySection.style.display = 'block';

  el.innerHTML = routines.map(r => {
    const done = r.week[TODAY_INDEX];
    return `
      <div class="list-row">
        <button class="task-check ${done ? 'done' : ''}" onclick="toggleToday(${r.id})" aria-label="Mark ${r.name} done">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <div class="list-row-icon">${categoryIcons[r.category] || categoryIcons.Custom}</div>
        <div class="list-row-main">
          <div class="name">${r.name}</div>
          <div class="meta">${r.target ? r.target + ' &middot; ' : ''}${r.frequency}</div>
        </div>
        <div class="list-row-side">
          <button class="icon-action" title="Edit" onclick="openEditRoutine(${r.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-action danger" title="Remove" onclick="askDeleteRoutine(${r.id})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function renderWeekly() {
  const el = document.getElementById('weeklyList');
  if (routines.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = routines.map(r => {
    const doneCount = r.week.filter(Boolean).length;
    const dots = r.week.map((done, i) => `
      <div class="d ${done ? 'done' : ''} ${i === TODAY_INDEX ? 'today' : ''}">${WEEK_LABELS[i]}</div>
    `).join('');
    return `
      <div class="list-row">
        <div class="list-row-main">
          <div class="name">${r.name}</div>
          <div class="meta">${doneCount}/7 days this week</div>
        </div>
        <div class="week-dots">${dots}</div>
      </div>`;
  }).join('');
}

function toggleToday(id) {
  const r = routines.find(x => x.id === id);
  if (!r) return;
  r.week[TODAY_INDEX] = !r.week[TODAY_INDEX];
  renderToday();
  renderWeekly();
  if (r.week[TODAY_INDEX]) showToast(`${r.name} marked done for today`);
}

function openAddRoutine() {
  document.getElementById('routineModalTitle').textContent = 'Add a routine';
  document.getElementById('routineForm').reset();
  document.getElementById('rtId').value = '';
  document.getElementById('rtReminder').checked = true;
  openModal('routineModal');
}

function openEditRoutine(id) {
  const r = routines.find(x => x.id === id);
  if (!r) return;
  document.getElementById('routineModalTitle').textContent = 'Edit routine';
  document.getElementById('rtId').value = r.id;
  document.getElementById('rtName').value = r.name;
  document.getElementById('rtCategory').value = r.category;
  document.getElementById('rtFrequency').value = r.frequency;
  document.getElementById('rtTarget').value = r.target;
  document.getElementById('rtReminder').checked = r.reminder;
  openModal('routineModal');
}

function askDeleteRoutine(id) {
  pendingDeleteRoutineId = id;
  openModal('deleteRoutineModal');
}

function confirmDeleteRoutine() {
  routines = routines.filter(r => r.id !== pendingDeleteRoutineId);
  pendingDeleteRoutineId = null;
  closeModal('deleteRoutineModal');
  renderToday();
  renderWeekly();
  showToast('Routine removed');
}

document.getElementById('routineForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const idVal = document.getElementById('rtId').value;
  const data = {
    name: document.getElementById('rtName').value.trim(),
    category: document.getElementById('rtCategory').value,
    frequency: document.getElementById('rtFrequency').value,
    target: document.getElementById('rtTarget').value.trim(),
    reminder: document.getElementById('rtReminder').checked,
  };

  if (!data.name) return;

  if (idVal) {
    const r = routines.find(x => x.id === Number(idVal));
    if (r) Object.assign(r, data);
    showToast('Routine updated');
  } else {
    routines.push({ id: nextRoutineId++, week: [false, false, false, false, false, false, false], ...data });
    showToast('Routine added');
  }

  closeModal('routineModal');
  renderToday();
  renderWeekly();
});

renderToday();
renderWeekly();
