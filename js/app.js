/* =========================================================
   HEALTHMATE — SHARED APP BEHAVIOR
   Generic UI helpers used across every page (toast, modal,
   notification panel). Page-specific logic (e.g. login form
   validation, marking a medicine as taken) lives in that
   page's own script block and can call these helpers.

   These are placeholder/mock behaviors for now — no network
   calls yet. When the backend exists, the same function names
   can be kept and their insides swapped for real API calls,
   so calling code elsewhere does not need to change.
========================================================= */

function showToast(message) {
  const toast = document.getElementById('toastHm');
  if (!toast) return;
  if (message) {
    const label = toast.querySelector('span:last-child');
    if (label) label.textContent = message;
  }
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.toggle('show');
}

// Close notification panel or profile menu when clicking outside
document.addEventListener('click', function (e) {
  const panel = document.getElementById('notifPanel');
  if (panel) {
    const trigger = e.target.closest('.icon-btn');
    if (!trigger && !e.target.closest('.notif-panel')) {
      panel.classList.remove('show');
    }
  }

  const profileMenu = document.getElementById('topbarProfileMenu');
  if (profileMenu) {
    const trigger = e.target.closest('#topbarProfileBtn');
    if (!trigger && !e.target.closest('#topbarProfileMenu')) {
      profileMenu.classList.remove('show');
    }
  }
});

function toggleProfileMenu() {
  const menu = document.getElementById('topbarProfileMenu');
  if (menu) menu.classList.toggle('show');
}

async function logoutUser() {
  if (window.HMStore && typeof HMStore.logout === 'function') {
    await HMStore.logout();
  }
  showToast('Logged out successfully');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}

// Session Guard: Checks Supabase session on protected pages
async function checkAuthSession() {
  const path = window.location.pathname.toLowerCase();
  const isAuthPage = path.endsWith('index.html') || path.endsWith('register.html') || path === '/' || path === '';

  if (window.hmSupabase) {
    try {
      const { data: { session } } = await window.hmSupabase.auth.getSession();
      if (session && session.user) {
        if (isAuthPage) {
          window.location.href = 'dashboard.html';
        }
      } else {
        if (!isAuthPage && window.HMStore && !HMStore.isAuthenticated()) {
          window.location.href = 'index.html';
        }
      }
    } catch (e) {
      console.warn('[Healthmate] Session check error:', e);
    }
  }
}

// Sync topbar and dynamic notifications for personal user
function initAppShell() {
  checkAuthSession();

  if (!window.HMStore) return;

  const user = HMStore.getUser ? HMStore.getUser() : null;

  // 1. Update avatars to reflect user initials
  if (user) {
    const initials = user.initials || (user.name ? user.name.slice(0, 2).toUpperCase() : 'IA');
    document.querySelectorAll('.avatar, #topbarAvatar').forEach(el => {
      el.textContent = initials;
      el.title = `${user.name} (Personal Account)`;
    });
  }

  // Remove any legacy family switcher banner or dropdown if present
  const existingSwitcher = document.getElementById('topbarProfileSwitcher');
  if (existingSwitcher) existingSwitcher.remove();
  const existingBanner = document.getElementById('activeProfileContextBanner');
  if (existingBanner) existingBanner.remove();

  // 2. Populate dynamic notifications
  const notifPanel = document.getElementById('notifPanel');
  if (notifPanel && HMStore.getDynamicNotifications) {
    const notifs = HMStore.getDynamicNotifications();
    const notifDot = document.querySelector('.notif-dot');
    if (notifDot) {
      const hasWarning = notifs.some(n => n.isWarning);
      notifDot.style.display = notifs.length > 0 ? 'block' : 'none';
      if (hasWarning) {
        notifDot.style.background = 'var(--color-warning, #D97706)';
      }
    }

    notifPanel.innerHTML = notifs.map(n => `
      <div class="notif-panel-item" style="${n.isWarning ? 'background:rgba(239,68,68,0.06);border-left:3px solid var(--color-warning,#D97706);' : ''}">
        <div class="t" style="${n.isWarning ? 'font-weight:600;color:var(--color-text);' : ''}">${n.title}</div>
        <div class="s" style="${n.isWarning ? 'color:var(--color-warning,#D97706);font-weight:500;' : ''}">${n.time}</div>
      </div>
    `).join('');
  }
}

// Open Emergency Medical ID modal across all pages
function openEmergencyModal() {
  if (!window.HMStore || !HMStore.getEmergencyData) return;
  const data = HMStore.getEmergencyData();
  const nameEl = document.getElementById('emName');
  if (nameEl) nameEl.textContent = data.name;
  const ageEl = document.getElementById('emAge');
  if (ageEl) ageEl.textContent = `${data.age} years • Personal Account`;
  const bloodEl = document.getElementById('emBlood');
  if (bloodEl) bloodEl.textContent = data.blood || 'B+';
  
  const phone = data.emergency || '+8801700000000';
  const callBtn = document.getElementById('emCallBtn');
  if (callBtn) callBtn.href = `tel:${phone}`;
  const callLabel = document.getElementById('emCallLabel');
  if (callLabel) callLabel.textContent = `Call Emergency: ${phone}`;
  
  const allergiesEl = document.getElementById('emAllergies');
  if (allergiesEl) allergiesEl.textContent = (data.allergies && data.allergies.length) ? data.allergies.join(', ') : 'None reported';
  const conditionsEl = document.getElementById('emConditions');
  if (conditionsEl) conditionsEl.textContent = (data.conditions && data.conditions.length) ? data.conditions.join(', ') : 'None';
  
  const medsContainer = document.getElementById('emMedsList');
  if (medsContainer) {
    if (data.activeMeds && data.activeMeds.length > 0) {
      medsContainer.innerHTML = data.activeMeds.map(m => `
        <span style="display:inline-block;padding:2px 8px;background:var(--color-primary-tint);color:var(--color-primary-dark);border-radius:12px;font-size:0.75rem;font-weight:500;">
          ${m.name} (${m.dosage})
        </span>
      `).join('');
    } else {
      medsContainer.innerHTML = '<span style="color:var(--color-text-muted);font-size:0.75rem;">No active medications</span>';
    }
  }

  openModal('emergencyIdModal');
}

document.addEventListener('DOMContentLoaded', initAppShell);

