/* =========================================================
   HEALTHMATE — DAILY ROUTINE PAGE LOGIC
   Daily habit tracking isolated strictly to the active profile.
========================================================= */

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TODAY_INDEX = 4; // Friday — demo "today" marker

let routines = window.HMStore ? HMStore.getRoutines() : [];
let pendingDeleteRoutineId = null;

function persistRoutines() {
  if (window.HMStore) {
    HMStore.saveRoutines(routines);
    syncMemberRoutinePct();
  }
}

// Keep members' routinePct in sync with their active routines
function syncMemberRoutinePct() {
  if (!window.HMStore) return;
  const members = HMStore.getMembers();
  let changed = false;

  members.forEach(m => {
    const memRoutines = routines.filter(r => (r.memberId || 'owner') === m.id);
    if (memRoutines.length > 0) {
      const doneCount = memRoutines.filter(r => r.week && r.week[TODAY_INDEX]).length;
      const pct = Math.round((doneCount / memRoutines.length) * 100);
      if (m.routinePct !== pct) {
        m.routinePct = pct;
        changed = true;
      }
    }
  });

  if (changed) HMStore.saveMembers(members);
}

const categoryIcons = {
  Water: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`,
  Walking: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1.5"/><path d="M10 22l1.5-6L9 14l1-5 3-2 3 2 1.5 4"/><path d="M11.5 16l3 2 2.5 4"/></svg>`,
  Exercise: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a4 4 0 0 0-6.8 0L12 6.6l-2-2a4 4 0 0 0-6.8 4.3C4.6 12 12 19 12 19s7.4-7 8.8-10.1a4 4 0 0 0 0-4.3z"/></svg>`,
  Sleep: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  Custom: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
};

function getFilteredRoutines() {
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';
  return routines.filter(r => (r.memberId || 'owner') === currentProfileId);
}

function initPageHeader() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const titleEl = document.getElementById('routinePageTitle') || document.querySelector('h1');
  const subEl = document.getElementById('routinePageSub');

  if (activeProfile && !activeProfile.isOwner) {
    if (titleEl) titleEl.textContent = `${activeProfile.name}'s Routine`;
    if (subEl) subEl.textContent = `${activeProfile.name}-এর দৈনিক স্বাস্থ্য রুটিন এবং সাপ্তাহিক ধারাবাহিকতা।`;
  } else {
    if (titleEl) titleEl.textContent = "Daily Routine";
    if (subEl) subEl.textContent = "আজকের স্বাস্থ্য রুটিন এবং সাপ্তাহিক ধারাবাহিকতার চিত্র।";
  }
}

function renderToday() {
  const el = document.getElementById('todayList');
  const emptyEl = document.getElementById('routineEmpty');
  const weeklySection = document.getElementById('weeklySection');
  const list = getFilteredRoutines();

  if (list.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    weeklySection.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';
  weeklySection.style.display = 'block';

  el.innerHTML = list.map(r => {
    const done = r.week ? r.week[TODAY_INDEX] : false;

    return `
      <div class="list-row">
        <button class="task-check ${done ? 'done' : ''}" onclick="toggleToday('${r.id}')" aria-label="Mark ${r.name} done">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <div class="list-row-icon">${categoryIcons[r.category] || categoryIcons.Custom}</div>
        <div class="list-row-main">
          <div class="name">
            <span style="${done ? 'text-decoration:line-through;color:var(--color-text-muted);' : ''}">${r.name}</span>
          </div>
          <div class="meta">${r.target ? r.target + ' &middot; ' : ''}${r.frequency}</div>
        </div>
        <div class="list-row-side">
          <button class="icon-action" title="Edit" onclick="openEditRoutine('${r.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-action danger" title="Remove" onclick="askDeleteRoutine('${r.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function renderWeekly() {
  const el = document.getElementById('weeklyList');
  const list = getFilteredRoutines();

  if (list.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = list.map(r => {
    const week = r.week || [false, false, false, false, false, false, false];
    const doneCount = week.filter(Boolean).length;

    const dots = week.map((done, i) => `
      <div class="d ${done ? 'done' : ''} ${i === TODAY_INDEX ? 'today' : ''}">${WEEK_LABELS[i]}</div>
    `).join('');

    return `
      <div class="list-row">
        <div class="list-row-main">
          <div class="name">
            <span>${r.name}</span>
          </div>
          <div class="meta">${doneCount} of 7 days completed this week</div>
        </div>
        <div class="week-dots">${dots}</div>
      </div>`;
  }).join('');
}

async function toggleToday(id) {
  routines = HMStore.getRoutines();
  const r = routines.find(x => String(x.id) === String(id));
  if (!r) return;
  if (!r.week) r.week = [false, false, false, false, false, false, false];
  const nextVal = !r.week[TODAY_INDEX];
  await HMStore.logRoutineDay(r.id, TODAY_INDEX, nextVal);
  routines = HMStore.getRoutines();
  renderToday();
  renderWeekly();
  showToast(`${r.name} marked ${nextVal ? 'completed' : 'pending'}`);
}

function openAddRoutine() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const who = activeProfile && !activeProfile.isOwner ? ` (${activeProfile.name})` : '';
  document.getElementById('routineModalTitle').textContent = `Add a routine${who}`;
  document.getElementById('routineForm').reset();
  document.getElementById('rtId').value = '';
  document.getElementById('rtReminder').checked = true;

  openModal('routineModal');
}

function openEditRoutine(id) {
  routines = HMStore.getRoutines();
  const r = routines.find(x => String(x.id) === String(id));
  if (!r) return;
  document.getElementById('routineModalTitle').textContent = 'Edit routine';
  document.getElementById('rtId').value = r.id;
  document.getElementById('rtName').value = r.name;
  document.getElementById('rtCategory').value = r.category;
  document.getElementById('rtFrequency').value = r.frequency;
  document.getElementById('rtTarget').value = r.target || '';
  document.getElementById('rtReminder').checked = !!r.reminder;

  openModal('routineModal');
}

function askDeleteRoutine(id) {
  pendingDeleteRoutineId = id;
  openModal('deleteRoutineModal');
}

async function confirmDeleteRoutine() {
  if (pendingDeleteRoutineId) {
    await HMStore.deleteRoutine(pendingDeleteRoutineId);
    routines = HMStore.getRoutines();
    pendingDeleteRoutineId = null;
  }
  closeModal('deleteRoutineModal');
  renderToday();
  renderWeekly();
  showToast('Routine removed');
}

document.getElementById('routineForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const idVal = document.getElementById('rtId').value;
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';

  const data = {
    name: document.getElementById('rtName').value.trim(),
    memberId: currentProfileId,
    category: document.getElementById('rtCategory').value,
    frequency: document.getElementById('rtFrequency').value,
    target: document.getElementById('rtTarget').value.trim(),
    reminder: document.getElementById('rtReminder').checked,
  };

  if (!data.name) return;

  if (idVal) {
    routines = HMStore.getRoutines();
    const r = routines.find(x => String(x.id) === String(idVal));
    if (r) Object.assign(r, data);
    await HMStore.saveRoutine(r || { id: idVal, ...data });
    showToast('Routine updated');
  } else {
    await HMStore.saveRoutine({
      week: [false, false, false, false, false, false, false],
      ...data
    });
    showToast('Routine added');
  }

  routines = HMStore.getRoutines();
  closeModal('routineModal');
  renderToday();
  renderWeekly();
});

// Initialization
initPageHeader();
renderToday();
renderWeekly();

if (window.HMStore && typeof HMStore.fetchMedicinesAndRoutines === 'function') {
  HMStore.fetchMedicinesAndRoutines().then(() => {
    routines = HMStore.getRoutines();
    renderToday();
    renderWeekly();
  });
}
