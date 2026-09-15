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

function logoutUser() {
  if (window.HMStore && typeof HMStore.logout === 'function') {
    HMStore.logout();
  }
  showToast('Logged out successfully');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
}

// Sync topbar and dynamic notifications for personal user
function initAppShell() {
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

document.addEventListener('DOMContentLoaded', initAppShell);

