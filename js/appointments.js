/* =========================================================
   HEALTHMATE — APPOINTMENTS & CLINICAL FOLLOW-UP CONTROLLER
   Manages doctor consultations, pre-visit checklists,
   countdown alerts, and follow-up tracking.
========================================================= */

let currentApptTab = 'upcoming';
let currentSearchTerm = '';
let editingApptId = null;

function initAppointments() {
  renderAppointmentsList();

  const searchInput = document.getElementById('apptSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = (e.target.value || '').trim().toLowerCase();
      renderAppointmentsList();
    });
  }

  if (window.HMStore && typeof HMStore.fetchAppointments === 'function') {
    HMStore.fetchAppointments().then(() => {
      renderAppointmentsList();
    });
  }
}

function setApptTab(tab) {
  currentApptTab = tab;
  document.querySelectorAll('.segmented-pill[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  renderAppointmentsList();
}

function getCountdownInfo(dateStr, timeStr) {
  if (!dateStr) return { text: 'Scheduled', type: 'normal' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d ago`, type: 'done' };
  } else if (diffDays === 0) {
    return { text: 'Today', type: 'soon' };
  } else if (diffDays === 1) {
    return { text: 'Tomorrow', type: 'soon' };
  } else if (diffDays <= 7) {
    return { text: `In ${diffDays} days`, type: 'soon' };
  } else if (diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return { text: `In ${weeks} week${weeks > 1 ? 's' : ''}`, type: 'normal' };
  } else {
    return { text: `In ${diffDays} days`, type: 'normal' };
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (e) {
    return dateStr;
  }
  return dateStr;
}

function getDoctorInitials(name) {
  if (!name) return 'DR';
  const clean = name.replace(/^dr\.?\s*/i, '').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'DR';
}

function renderAppointmentsList() {
  const container = document.getElementById('appointmentsContainer');
  if (!container) return;

  if (!window.HMStore) {
    container.innerHTML = '<div class="panel text-center">Loading appointment records...</div>';
    return;
  }

  const allAppts = HMStore.getAppointments();

  // Update counts
  const upcomingCount = allAppts.filter(a => a.status === 'upcoming').length;
  const completedCount = allAppts.filter(a => a.status === 'completed').length;
  const allCount = allAppts.length;

  const countUp = document.getElementById('countUpcoming');
  if (countUp) countUp.textContent = upcomingCount;
  const countComp = document.getElementById('countCompleted');
  if (countComp) countComp.textContent = completedCount;
  const countAll = document.getElementById('countAll');
  if (countAll) countAll.textContent = allCount;

  // Filter list
  let filtered = allAppts.filter(a => {
    if (currentApptTab === 'upcoming') return a.status === 'upcoming';
    if (currentApptTab === 'completed') return a.status === 'completed';
    return true; // 'all'
  });

  if (currentSearchTerm) {
    filtered = filtered.filter(a => {
      const matchDoc = (a.doctorName || '').toLowerCase().includes(currentSearchTerm);
      const matchSpec = (a.specialty || '').toLowerCase().includes(currentSearchTerm);
      const matchHosp = (a.hospital || '').toLowerCase().includes(currentSearchTerm);
      const matchReason = (a.reason || '').toLowerCase().includes(currentSearchTerm);
      return matchDoc || matchSpec || matchHosp || matchReason;
    });
  }

  // Sort: upcoming by date asc, completed by date desc
  filtered.sort((a, b) => {
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
    }
    return b.date.localeCompare(a.date);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-vault-state">
        <div class="empty-icon-circle" style="background:#ECFDF5;color:#059669;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h3>No ${currentApptTab === 'all' ? '' : currentApptTab} appointments found</h3>
        <p>Keep track of your clinical follow-ups, questions to ask the physician, and test preparations.</p>
        <button type="button" class="btn-hm btn-primary" onclick="openScheduleModal()" style="margin-top:16px;">
          + Schedule New Consultation
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(appt => {
    const countdown = getCountdownInfo(appt.date, appt.time);
    const initials = getDoctorInitials(appt.doctorName);
    const isCompleted = appt.status === 'completed';
    const checklist = Array.isArray(appt.preVisitChecklist) ? appt.preVisitChecklist : [];
    const doneCheckCount = checklist.filter(c => c.done).length;

    return `
      <div class="appt-card ${isCompleted ? 'is-completed' : ''}" id="appt-card-${appt.id}">
        <!-- Top Bar: Doctor & Status -->
        <div class="appt-card-top">
          <div class="appt-doc-profile">
            <div class="appt-avatar">${initials}</div>
            <div class="appt-doc-info">
              <h3>${escapeHtml(appt.doctorName)}</h3>
              <span class="appt-specialty-pill">${escapeHtml(appt.specialty || 'Physician')}</span>
            </div>
          </div>
          <div>
            ${isCompleted
              ? '<span class="appt-countdown-tag done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Completed</span>'
              : `<span class="appt-countdown-tag ${countdown.type}">⏳ ${countdown.text}</span>`
            }
          </div>
        </div>

        <!-- Date & Time Banner -->
        <div class="appt-time-banner">
          <div style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--color-text);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${formatDisplayDate(appt.date)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;font-weight:600;color:var(--color-primary-dark);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>${escapeHtml(appt.time || '10:00 AM')}</span>
          </div>
        </div>

        <!-- Meta Details: Location & Reason -->
        <div class="appt-meta-list">
          ${appt.hospital ? `
            <div class="appt-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${escapeHtml(appt.hospital)}</span>
            </div>
          ` : ''}
          ${appt.phone ? `
            <div class="appt-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <a href="tel:${escapeHtml(appt.phone)}" style="color:var(--color-primary);text-decoration:none;font-weight:500;">
                ${escapeHtml(appt.phone)} (Call Chamber)
              </a>
            </div>
          ` : ''}
          <div class="appt-meta-item" style="color:var(--color-text);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <b>Reason:</b> <span>${escapeHtml(appt.reason || 'General Follow-up')}</span>
          </div>
        </div>

        <!-- Pre-Visit Checklist & Questions -->
        <div class="appt-checklist-block">
          <div class="appt-checklist-head">
            <span>Pre-Visit Preparation (${doneCheckCount}/${checklist.length})</span>
            <span style="font-weight:normal;text-transform:none;font-size:0.72rem;color:var(--color-text-muted);">
              ${checklist.length > 0 && doneCheckCount === checklist.length ? 'Ready ✓' : 'Tap to mark done'}
            </span>
          </div>
          <div id="checklist-items-${appt.id}">
            ${checklist.map(chk => `
              <label class="appt-check-item ${chk.done ? 'done' : ''}">
                <input type="checkbox" ${chk.done ? 'checked' : ''} onchange="handleToggleChecklist('${appt.id}', '${chk.id}')">
                <span>${escapeHtml(chk.text)}</span>
              </label>
            `).join('')}
          </div>
          <div class="appt-checklist-add-row">
            <input type="text" id="addCheckInput-${appt.id}" placeholder="Add question or report to carry..." onkeydown="if(event.key==='Enter') handleAddChecklistItem('${appt.id}')">
            <button type="button" onclick="handleAddChecklistItem('${appt.id}')">+ Add</button>
          </div>
        </div>

        <!-- Notes / Doctor Guidance -->
        ${appt.notes ? `
          <div class="appt-notes-box">
            <div style="font-size:0.72rem;font-weight:700;color:var(--color-primary-dark);text-transform:uppercase;margin-bottom:2px;">Doctor & Pre-visit Guidance</div>
            <div>${escapeHtml(appt.notes)}</div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="appt-card-actions">
          <div style="display:flex;gap:8px;">
            ${!isCompleted ? `
              <button type="button" class="btn-hm btn-primary" onclick="markApptCompleted('${appt.id}')" style="font-size:0.78rem;padding:5px 10px;background:#059669;border-color:#059669;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Mark Completed
              </button>
            ` : `
              <button type="button" class="btn-hm btn-ghost" onclick="openFollowUpModal('${appt.id}')" style="font-size:0.78rem;padding:5px 10px;color:var(--color-primary-dark);">
                📅 Next Follow-up
              </button>
            `}
            <a href="documents.html" class="btn-hm btn-ghost" style="font-size:0.78rem;padding:5px 10px;text-decoration:none;" title="Open Medical Vault to view reports">
              Vault Reports ↗
            </a>
          </div>
          <div style="display:flex;gap:4px;">
            <button type="button" class="icon-btn" onclick="openScheduleModal('${appt.id}')" title="Edit consultation details" aria-label="Edit" style="width:30px;height:30px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="icon-btn" onclick="deleteAppt('${appt.id}')" title="Cancel or remove consultation" aria-label="Delete" style="width:30px;height:30px;color:var(--color-error);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleToggleChecklist(apptId, checklistId) {
  if (!window.HMStore) return;
  await HMStore.toggleChecklistItem(apptId, checklistId);
  renderAppointmentsList();
}

async function handleAddChecklistItem(apptId) {
  const input = document.getElementById(`addCheckInput-${apptId}`);
  if (!input) return;
  const text = (input.value || '').trim();
  if (!text) return;

  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(apptId));
  if (appt) {
    if (!Array.isArray(appt.preVisitChecklist)) appt.preVisitChecklist = [];
    appt.preVisitChecklist.push({
      id: 'chk-' + Date.now(),
      text: text,
      done: false
    });
    await HMStore.updateAppointment(appt.id, { preVisitChecklist: appt.preVisitChecklist });
    input.value = '';
    renderAppointmentsList();
    showApptToast('Checklist item added');
  }
}

function openScheduleModal(apptId = null) {
  editingApptId = apptId;
  const modalTitle = document.getElementById('scheduleModalTitle');
  const form = document.getElementById('scheduleApptForm');
  if (!form) return;

  // Reset or pre-fill
  if (apptId) {
    if (modalTitle) modalTitle.textContent = 'Edit Consultation Details';
    const appts = HMStore.getAppointments();
    const appt = appts.find(a => String(a.id) === String(apptId));
    if (appt) {
      document.getElementById('apptDoctorInput').value = appt.doctorName || '';
      document.getElementById('apptSpecialtyInput').value = appt.specialty || '';
      document.getElementById('apptHospitalInput').value = appt.hospital || '';
      document.getElementById('apptPhoneInput').value = appt.phone || '';
      document.getElementById('apptDateInput').value = appt.date || '';
      document.getElementById('apptTimeInput').value = appt.time || '10:00 AM';
      document.getElementById('apptReasonInput').value = appt.reason || '';
      document.getElementById('apptNotesInput').value = appt.notes || '';
      document.getElementById('apptStatusInput').value = appt.status || 'upcoming';

      // Populate checklist items in modal
      const listContainer = document.getElementById('modalChecklistRows');
      if (listContainer) {
        listContainer.innerHTML = '';
        if (Array.isArray(appt.preVisitChecklist) && appt.preVisitChecklist.length > 0) {
          appt.preVisitChecklist.forEach(c => addModalChecklistRow(c.text, c.done));
        } else {
          addModalChecklistRow('', false);
        }
      }
    }
  } else {
    if (modalTitle) modalTitle.textContent = 'Schedule Medical Consultation';
    form.reset();
    document.getElementById('apptDateInput').value = new Date().toISOString().slice(0, 10);
    document.getElementById('apptTimeInput').value = '10:00 AM';
    document.getElementById('apptStatusInput').value = 'upcoming';

    const listContainer = document.getElementById('modalChecklistRows');
    if (listContainer) {
      listContainer.innerHTML = '';
      addModalChecklistRow('Log recent blood pressure / vitals history', false);
      addModalChecklistRow('Carry latest diagnostic lab reports from Medical Vault', false);
      addModalChecklistRow('Note any symptom changes or prescription questions', false);
    }
  }

  openModal('scheduleApptModal');
}

function addModalChecklistRow(text = '', isDone = false) {
  const container = document.getElementById('modalChecklistRows');
  if (!container) return;
  const rowId = 'modal-chk-' + Date.now() + Math.random().toString(36).slice(2, 6);
  const div = document.createElement('div');
  div.id = rowId;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
  div.innerHTML = `
    <input type="text" class="modal-chk-text" value="${escapeHtml(text)}" placeholder="e.g. Bring fasting sugar report" style="flex:1;padding:6px 10px;font-size:0.82rem;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface);">
    <button type="button" class="icon-btn" onclick="document.getElementById('${rowId}').remove()" style="width:28px;height:28px;color:var(--color-error);" aria-label="Remove item">✕</button>
  `;
  container.appendChild(div);
}

async function handleSaveAppointment(event) {
  event.preventDefault();

  const doctorName = (document.getElementById('apptDoctorInput').value || '').trim();
  const specialty = (document.getElementById('apptSpecialtyInput').value || '').trim();
  const hospital = (document.getElementById('apptHospitalInput').value || '').trim();
  const phone = (document.getElementById('apptPhoneInput').value || '').trim();
  const date = document.getElementById('apptDateInput').value;
  const time = (document.getElementById('apptTimeInput').value || '10:00 AM').trim();
  const reason = (document.getElementById('apptReasonInput').value || '').trim();
  const notes = (document.getElementById('apptNotesInput').value || '').trim();
  const status = document.getElementById('apptStatusInput').value || 'upcoming';

  if (!doctorName || !date) {
    alert('Please enter doctor name and appointment date.');
    return;
  }

  // Parse checklist items
  const checklist = [];
  const textInputs = document.querySelectorAll('.modal-chk-text');
  textInputs.forEach((inp, idx) => {
    const val = (inp.value || '').trim();
    if (val) {
      checklist.push({
        id: 'chk-' + (idx + 1) + '-' + Date.now(),
        text: val,
        done: false
      });
    }
  });

  const payload = {
    doctorName,
    specialty,
    hospital,
    phone,
    date,
    time,
    reason,
    notes,
    status,
    preVisitChecklist: checklist
  };

  if (editingApptId) {
    await HMStore.updateAppointment(editingApptId, payload);
    showApptToast('Appointment details updated');
  } else {
    await HMStore.addAppointment(payload);
    showApptToast('Consultation scheduled successfully');
  }

  closeModal('scheduleApptModal');
  renderAppointmentsList();
}

async function deleteAppt(id) {
  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(id));
  const name = appt ? appt.doctorName : 'this appointment';
  if (confirm(`Are you sure you want to cancel / delete the consultation with ${name}?`)) {
    await HMStore.deleteAppointment(id);
    renderAppointmentsList();
    showApptToast('Appointment removed');
  }
}

async function markApptCompleted(id) {
  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(id));
  if (!appt) return;

  await HMStore.updateAppointment(id, { status: 'completed' });
  renderAppointmentsList();
  showApptToast('Marked as completed');

  // Prompt follow-up scheduler
  openFollowUpModal(id);
}

function openFollowUpModal(apptId) {
  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(apptId));
  if (!appt) return;

  document.getElementById('followUpDocName').textContent = appt.doctorName;
  document.getElementById('followUpSpecialty').textContent = appt.specialty || 'Physician';
  document.getElementById('followUpParentId').value = appt.id;

  // Calculate default follow-up in 3 months
  const now = new Date();
  now.setMonth(now.getMonth() + 3);
  document.getElementById('followUpDateInput').value = now.toISOString().slice(0, 10);
  document.getElementById('followUpReasonInput').value = `Routine follow-up & medication review with ${appt.doctorName}`;

  openModal('followUpModal');
}

async function handleSaveFollowUp(event) {
  event.preventDefault();
  const parentId = document.getElementById('followUpParentId').value;
  const appts = HMStore.getAppointments();
  const parent = appts.find(a => String(a.id) === String(parentId));

  const date = document.getElementById('followUpDateInput').value;
  const time = document.getElementById('followUpTimeInput').value || '10:00 AM';
  const reason = document.getElementById('followUpReasonInput').value || 'Routine follow-up';

  if (!date) {
    alert('Please choose a follow-up date.');
    return;
  }

  const newFollowUp = {
    doctorName: parent ? parent.doctorName : 'Doctor',
    specialty: parent ? parent.specialty : 'Physician',
    hospital: parent ? parent.hospital : '',
    phone: parent ? parent.phone : '',
    date: date,
    time: time,
    reason: reason,
    status: 'upcoming',
    preVisitChecklist: [
      { id: 'chk-f1', text: 'Review vitals trends logged over interval', done: false },
      { id: 'chk-f2', text: 'Bring any new lab test reports', done: false }
    ],
    notes: `Scheduled following completed visit on ${parent ? parent.date : 'prior consultation'}.`
  };

  await HMStore.addAppointment(newFollowUp);
  closeModal('followUpModal');
  renderAppointmentsList();
  showApptToast('Next follow-up consultation scheduled');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showApptToast(msg) {
  if (typeof showToast === 'function') {
    showToast(msg);
  }
}

document.addEventListener('DOMContentLoaded', initAppointments);
