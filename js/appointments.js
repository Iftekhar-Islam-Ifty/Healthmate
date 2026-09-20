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
  const clearBtn = document.getElementById('apptSearchClearBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = (e.target.value || '').trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = currentSearchTerm ? 'flex' : 'none';
      }
      renderAppointmentsList();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && currentSearchTerm) {
        clearApptSearch();
      }
    });
  }

  if (window.HMStore && typeof HMStore.fetchAppointments === 'function') {
    HMStore.fetchAppointments().then(() => {
      renderAppointmentsList();
    });
  }

  // Auto-refresh when cloud sync completes
  window.addEventListener('hm:cloud-synced', () => {
    renderAppointmentsList();
  });
}

function setApptTab(tab) {
  currentApptTab = tab;
  document.querySelectorAll('.segmented-pill[data-tab]').forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  renderAppointmentsList();
}
window.setApptTab = setApptTab;

function switchApptTab(tab) {
  setApptTab(tab);
}
window.switchApptTab = switchApptTab;

function filterAppointments(tab) {
  if (tab) {
    setApptTab(tab);
  } else {
    renderAppointmentsList();
  }
}
window.filterAppointments = filterAppointments;

function clearApptSearch() {
  const searchInput = document.getElementById('apptSearchInput');
  const clearBtn = document.getElementById('apptSearchClearBtn');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
  currentSearchTerm = '';
  renderAppointmentsList();
}
window.clearApptSearch = clearApptSearch;

function getCountdownInfo(dateStr, timeStr) {
  if (!dateStr) return { text: 'শিডিউল করা', type: 'normal' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} দিন আগে`, type: 'done' };
  } else if (diffDays === 0) {
    return { text: 'আজকের অ্যাপয়েন্টমেন্ট', type: 'soon' };
  } else if (diffDays === 1) {
    return { text: 'আগামীকাল', type: 'soon' };
  } else if (diffDays <= 7) {
    return { text: `${diffDays} দিন পর`, type: 'soon' };
  } else if (diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return { text: `${weeks} সপ্তাহ পর`, type: 'normal' };
  } else {
    return { text: `${diffDays} দিন পর`, type: 'normal' };
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
      return `${days[d.getDay()]}, ${parts[2]} ${months[d.getMonth()]} ${parts[0]}`;
    }
  } catch (e) {
    return dateStr;
  }
  return dateStr;
}

function getDoctorInitials(name) {
  if (!name) return 'ডা.';
  const clean = name.replace(/^(dr\.?|ডা\.?|ডাক্তার)\s*/i, '').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'ডা.';
}

function renderAppointmentsList() {
  const container = document.getElementById('appointmentsContainer');
  if (!container) return;

  if (!window.HMStore) {
    container.innerHTML = '<div class="panel text-center">অ্যাপয়েন্টমেন্টের তথ্য লোড হচ্ছে...</div>';
    return;
  }

  const allAppts = HMStore.getAppointments();

  // Update badge counts
  const upcomingCount = allAppts.filter(a => a.status === 'upcoming').length;
  const completedCount = allAppts.filter(a => a.status === 'completed').length;
  const allCount = allAppts.length;

  const countUp = document.getElementById('countUpcoming');
  if (countUp) countUp.textContent = upcomingCount;
  const countComp = document.getElementById('countCompleted');
  if (countComp) countComp.textContent = completedCount;
  const countAll = document.getElementById('countAll');
  if (countAll) countAll.textContent = allCount;

  // Filter list by tab
  let filtered = allAppts.filter(a => {
    if (currentApptTab === 'upcoming') return a.status === 'upcoming';
    if (currentApptTab === 'completed') return a.status === 'completed';
    return true; // 'all'
  });

  // Filter list by search keyword
  if (currentSearchTerm) {
    filtered = filtered.filter(a => {
      const matchDoc = (a.doctorName || '').toLowerCase().includes(currentSearchTerm);
      const matchSpec = (a.specialty || '').toLowerCase().includes(currentSearchTerm);
      const matchHosp = (a.hospital || '').toLowerCase().includes(currentSearchTerm);
      const matchReason = (a.reason || '').toLowerCase().includes(currentSearchTerm);
      const matchNotes = (a.notes || '').toLowerCase().includes(currentSearchTerm);
      const matchDate = (a.date || '').toLowerCase().includes(currentSearchTerm);
      const matchChecklist = Array.isArray(a.preVisitChecklist) && a.preVisitChecklist.some(c => (c.text || '').toLowerCase().includes(currentSearchTerm));
      return matchDoc || matchSpec || matchHosp || matchReason || matchNotes || matchDate || matchChecklist;
    });
  }

  // Sort: upcoming by date asc, completed by date desc
  filtered.sort((a, b) => {
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      return (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '');
    }
    return (b.date || '').localeCompare(a.date || '');
  });

  if (filtered.length === 0) {
    if (currentSearchTerm) {
      container.innerHTML = `
        <div class="empty-vault-state" style="grid-column: 1 / -1;">
          <div class="empty-icon-circle" style="background:#FEF3C7;color:#D97706;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <h3>"${escapeHtml(currentSearchTerm)}" এর সাথে কোনো ভিজিট পাওয়া যায়নি</h3>
          <p>অন্য কোনো ডাক্তারের নাম, বিশেষজ্ঞ বা হাসপাতালের নাম দিয়ে চেষ্টা করুন অথবা সার্চ ফিল্টার ক্লিয়ার করুন।</p>
          <button type="button" class="btn-hm btn-ghost" onclick="clearApptSearch()" style="margin-top:14px;">
            সার্চ ক্লিয়ার করুন
          </button>
        </div>
      `;
    } else {
      const tabTitle = currentApptTab === 'upcoming' ? 'আসন্ন কোনো' : (currentApptTab === 'completed' ? 'কোনো সম্পন্ন' : 'কোনো');
      container.innerHTML = `
        <div class="empty-vault-state" style="grid-column: 1 / -1;">
          <div class="empty-icon-circle" style="background:#ECFDF5;color:#059669;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>বর্তমানে ${tabTitle} ডাক্তারের অ্যাপয়েন্টমেন্ট নেই</h3>
          <p>ডাক্তারের সাথে কনসালটেশনের সময়, চেম্বারের তথ্য এবং প্রয়োজনীয় প্রশ্ন ও ল্যাব রিপোর্টের চেকলিস্ট যুক্ত রাখুন।</p>
          <button type="button" class="btn-hm btn-primary" onclick="openScheduleModal()" style="margin-top:14px;">
            + নতুন অ্যাপয়েন্টমেন্ট শিডিউল
          </button>
        </div>
      `;
    }
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
              <span class="appt-specialty-pill">${escapeHtml(appt.specialty || 'চিকিৎসা বিশেষজ্ঞ')}</span>
            </div>
          </div>
          <div>
            ${isCompleted
              ? '<span class="appt-countdown-tag done"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> সম্পন্ন</span>'
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
                ${escapeHtml(appt.phone)} (চেম্বারে সরাসরি কল করুন)
              </a>
            </div>
          ` : ''}
          <div class="appt-meta-item" style="color:var(--color-text);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <b>ভিজিটের কারণ:</b> <span>${escapeHtml(appt.reason || 'নিয়মিত চেকআপ ও পরামর্শ')}</span>
          </div>
        </div>

        <!-- Pre-Visit Checklist & Questions -->
        <div class="appt-checklist-block">
          <div class="appt-checklist-head">
            <span>প্রস্তুতি চেকলিস্ট ও জরুরি প্রশ্ন (${doneCheckCount}/${checklist.length})</span>
            <span style="font-weight:normal;text-transform:none;font-size:0.75rem;color:var(--color-text-muted);">
              ${checklist.length > 0 && doneCheckCount === checklist.length ? 'সব প্রস্তুত ✓' : 'টিক দিয়ে সম্পন্ন করুন'}
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
            <input type="text" id="addCheckInput-${appt.id}" placeholder="প্রশ্ন বা প্রয়োজনীয় টেস্ট রিপোর্ট লিখে এন্টার দিন..." onkeydown="if(event.key==='Enter') handleAddChecklistItem('${appt.id}')">
            <button type="button" onclick="handleAddChecklistItem('${appt.id}')">+ যোগ করুন</button>
          </div>
        </div>

        <!-- Notes / Doctor Guidance -->
        ${appt.notes ? `
          <div class="appt-notes-box">
            <div style="font-size:0.75rem;font-weight:700;color:var(--color-primary-dark);margin-bottom:2px;">ডাক্তারের পরামর্শ ও টেস্টের নির্দেশিকা</div>
            <div>${escapeHtml(appt.notes)}</div>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="appt-card-actions">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${!isCompleted ? `
              <button type="button" class="btn-hm btn-primary" onclick="markApptCompleted('${appt.id}')" style="font-size:0.8rem;padding:6px 12px;background:#059669;border-color:#059669;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ভিজিট সম্পন্ন হয়েছে
              </button>
            ` : `
              <button type="button" class="btn-hm btn-ghost" onclick="openFollowUpModal('${appt.id}')" style="font-size:0.8rem;padding:6px 12px;color:var(--color-primary-dark);">
                📅 পরবর্তী ফলো-আপ শিডিউল
              </button>
            `}
            <a href="documents.html" class="btn-hm btn-ghost" style="font-size:0.8rem;padding:6px 12px;text-decoration:none;" title="মেডিকেল ভল্ট থেকে টেস্ট রিপোর্ট দেখুন">
              ভল্ট রিপোর্টস ↗
            </a>
          </div>
          <div style="display:flex;gap:4px;">
            <button type="button" class="icon-btn" onclick="openScheduleModal('${appt.id}')" title="তথ্য এডিট করুন" aria-label="Edit" style="width:32px;height:32px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="icon-btn" onclick="askDeleteAppt('${appt.id}')" title="অ্যাপয়েন্টমেন্ট বাতিল / মুছে ফেলুন" aria-label="Delete" style="width:32px;height:32px;color:var(--color-error);">
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
    showApptToast('চেকলিস্টে নতুন বিষয় যুক্ত হয়েছে');
  }
}

function openScheduleModal(apptId = null) {
  editingApptId = apptId;
  const modalTitle = document.getElementById('scheduleModalTitle');
  const form = document.getElementById('scheduleApptForm');
  if (!form) return;

  // Reset or pre-fill
  if (apptId) {
    if (modalTitle) modalTitle.textContent = 'অ্যাপয়েন্টমেন্টের তথ্য পরিবর্তন করুন';
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
    if (modalTitle) modalTitle.textContent = 'নতুন অ্যাপয়েন্টমেন্ট শিডিউল করুন';
    form.reset();
    document.getElementById('apptDateInput').value = new Date().toISOString().slice(0, 10);
    document.getElementById('apptTimeInput').value = '10:00 AM';
    document.getElementById('apptStatusInput').value = 'upcoming';

    const listContainer = document.getElementById('modalChecklistRows');
    if (listContainer) {
      listContainer.innerHTML = '';
      addModalChecklistRow('সাম্প্রতিক প্রেসার ও সুগারের রিডিং লগ সাথে নেওয়া', false);
      addModalChecklistRow('মেডিকেল ভল্ট থেকে সর্বশেষ ল্যাব টেস্ট ও পূর্বের প্রেসক্রিপশন রাখা', false);
      addModalChecklistRow('ডাক্তারকে জানানোর মতো নতুন কোনো লক্ষণ বা ওষুধের প্রশ্ন লিখে রাখা', false);
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
    <input type="text" class="modal-chk-text" value="${escapeHtml(text)}" placeholder="যেমন: খালিপেটে সুগার টেস্টের রিপোর্ট সাথে নেওয়া" style="flex:1;padding:7px 10px;font-size:0.84rem;border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface);">
    <button type="button" class="icon-btn" onclick="this.closest('div').remove()" style="width:28px;height:28px;color:var(--color-error);" aria-label="Remove item">✕</button>
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
    showApptToast('দয়া করে ডাক্তারের নাম ও অ্যাপয়েন্টমেন্টের তারিখ দিন।');
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
    showApptToast('অ্যাপয়েন্টমেন্টের তথ্য সফলভাবে আপডেট হয়েছে');
  } else {
    await HMStore.addAppointment(payload);
    showApptToast('নতুন অ্যাপয়েন্টমেন্ট সফলভাবে শিডিউল হয়েছে');
  }

  closeModal('scheduleApptModal');
  renderAppointmentsList();
}

let pendingApptIdToDelete = null;

function askDeleteAppt(id) {
  pendingApptIdToDelete = id;
  const modalEl = document.getElementById('deleteApptModal');
  if (modalEl && typeof openModal === 'function') {
    openModal('deleteApptModal');
  } else {
    // Fallback if modal not in DOM
    deleteAppt(id);
  }
}

async function confirmDeleteAppt() {
  if (!pendingApptIdToDelete) return;
  const id = pendingApptIdToDelete;
  pendingApptIdToDelete = null;
  if (typeof closeModal === 'function') {
    closeModal('deleteApptModal');
  }
  await deleteAppt(id);
}

async function deleteAppt(id) {
  await HMStore.deleteAppointment(id);
  renderAppointmentsList();
  showApptToast('অ্যাপয়েন্টমেন্ট মুছে ফেলা হয়েছে');
}

async function markApptCompleted(id) {
  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(id));
  if (!appt) return;

  await HMStore.updateAppointment(id, { status: 'completed' });
  renderAppointmentsList();
  showApptToast('ডাক্তার ভিজিট সম্পন্ন হিসেবে চিহ্নিত হয়েছে');

  // Prompt follow-up scheduler
  openFollowUpModal(id);
}

function openFollowUpModal(apptId) {
  const appts = HMStore.getAppointments();
  const appt = appts.find(a => String(a.id) === String(apptId));
  if (!appt) return;

  document.getElementById('followUpDocName').textContent = appt.doctorName;
  document.getElementById('followUpSpecialty').textContent = appt.specialty || 'চিকিৎসা বিশেষজ্ঞ';
  document.getElementById('followUpParentId').value = appt.id;

  // Calculate default follow-up in 3 months
  const now = new Date();
  now.setMonth(now.getMonth() + 3);
  document.getElementById('followUpDateInput').value = now.toISOString().slice(0, 10);
  document.getElementById('followUpReasonInput').value = `${appt.doctorName}-এর সাথে ৩ মাসের ফলো-আপ ও নিয়মিত প্রেসক্রিপশন রিভিউ`;

  openModal('followUpModal');
}

async function handleSaveFollowUp(event) {
  event.preventDefault();
  const parentId = document.getElementById('followUpParentId').value;
  const appts = HMStore.getAppointments();
  const parent = appts.find(a => String(a.id) === String(parentId));

  const date = document.getElementById('followUpDateInput').value;
  const time = document.getElementById('followUpTimeInput').value || '10:00 AM';
  const reason = document.getElementById('followUpReasonInput').value || 'নিয়মিত ফলো-আপ পরামর্শ';

  if (!date) {
    showApptToast('দয়া করে ফলো-আপের তারিখ নির্বাচন করুন।');
    return;
  }

  const newFollowUp = {
    doctorName: parent ? parent.doctorName : 'ডাক্তার',
    specialty: parent ? parent.specialty : 'চিকিৎসা বিশেষজ্ঞ',
    hospital: parent ? parent.hospital : '',
    phone: parent ? parent.phone : '',
    date: date,
    time: time,
    reason: reason,
    status: 'upcoming',
    preVisitChecklist: [
      { id: 'chk-f1', text: 'বিগত সময়ের প্রেসার ও সুগার ট্র্যাকিং চার্ট পর্যালোচনা করা', done: false },
      { id: 'chk-f2', text: 'নতুন কোনো টেস্ট বা ল্যাব রিপোর্ট সাথে নিয়ে যাওয়া', done: false }
    ],
    notes: `${parent ? parent.date : 'পূর্ববর্তী'} ভিজিটের পর নির্ধারিত পরবর্তী ফলো-আপ চেকআপ।`
  };

  await HMStore.addAppointment(newFollowUp);
  closeModal('followUpModal');
  renderAppointmentsList();
  showApptToast('পরবর্তী ফলো-আপ শিডিউল যুক্ত হয়েছে');
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

// Global exports for HTML event handlers
window.askDeleteAppt = askDeleteAppt;
window.confirmDeleteAppt = confirmDeleteAppt;
window.deleteAppt = deleteAppt;
window.openScheduleModal = openScheduleModal;
window.openEditApptModal = openScheduleModal;
window.addModalChecklistRow = addModalChecklistRow;
window.handleSaveAppointment = handleSaveAppointment;
window.handleSaveAppt = handleSaveAppointment;
window.markApptCompleted = markApptCompleted;
window.openFollowUpModal = openFollowUpModal;
window.handleSaveFollowUp = handleSaveFollowUp;
window.setApptTab = setApptTab;
window.switchApptTab = switchApptTab;
window.filterAppointments = filterAppointments;
window.clearApptSearch = clearApptSearch;
window.handleAddChecklistItem = handleAddChecklistItem;
window.handleToggleChecklist = handleToggleChecklist;
window.renderAppointmentsList = renderAppointmentsList;

document.addEventListener('DOMContentLoaded', initAppointments);
