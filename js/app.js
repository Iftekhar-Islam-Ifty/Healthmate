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

function toggleMobileSidebar(force) {
  if (typeof force === 'boolean') {
    document.body.classList.toggle('sidebar-open', force);
  } else {
    document.body.classList.toggle('sidebar-open');
  }
}
window.toggleMobileSidebar = toggleMobileSidebar;

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
}
window.closeMobileSidebar = closeMobileSidebar;

function openMobileSidebar() {
  document.body.classList.add('sidebar-open');
}
window.openMobileSidebar = openMobileSidebar;

// Close drawer on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
    closeMobileSidebar();
  }
});

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
  showToast('সফলভাবে লগআউট করা হয়েছে');
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

// Sync topbar, mobile drawer, and dynamic notifications for personal user
function initAppShell() {
  checkAuthSession();

  // Setup mobile sidebar backdrop if not present
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    backdrop.onclick = closeMobileSidebar;
    document.body.appendChild(backdrop);
  }

  // Setup mobile close button in sidebar brand if not present
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const brand = sidebar.querySelector('.brand');
    if (brand && !brand.querySelector('.sidebar-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'sidebar-close-btn';
      closeBtn.setAttribute('aria-label', 'Close navigation menu');
      closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      closeBtn.onclick = closeMobileSidebar;
      brand.appendChild(closeBtn);
    }

    // Close mobile drawer when clicking navigation link
    sidebar.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileSidebar();
      });
    });

    // Ensure mobile sidebar footer exists for quick emergency access
    if (!sidebar.querySelector('.sidebar-footer')) {
      const footer = document.createElement('div');
      footer.className = 'sidebar-footer';
      footer.innerHTML = `
        <button type="button" class="sidebar-emergency-btn" onclick="openEmergencyModal(); closeMobileSidebar();">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.7-4.35-9.3-8.6C1 9.1 2 5.3 5.4 4.2 7.7 3.4 10 4.3 12 6.3c2-2 4.3-2.9 6.6-2.1 3.4 1.1 4.4 4.9 2.7 8.2C18.7 16.65 12 21 12 21z"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg>
          <span>Emergency Medical ID</span>
        </button>
      `;
      sidebar.appendChild(footer);
    }
  }

  // Setup mobile menu hamburger button in topbar if not present
  const topbar = document.querySelector('.topbar');
  if (topbar && !topbar.querySelector('.mobile-menu-btn')) {
    const mobileBtn = document.createElement('button');
    mobileBtn.type = 'button';
    mobileBtn.className = 'mobile-menu-btn';
    mobileBtn.setAttribute('aria-label', 'Open navigation menu');
    mobileBtn.title = 'Menu';
    mobileBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    mobileBtn.onclick = toggleMobileSidebar;
    
    // Insert before the first child or wrap in header
    const firstChild = topbar.firstElementChild;
    if (firstChild) {
      topbar.insertBefore(mobileBtn, firstChild);
    } else {
      topbar.appendChild(mobileBtn);
    }
  }

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
  if (ageEl) ageEl.textContent = `${data.age} বছর • ব্যক্তিগত অ্যাকাউন্ট`;
  const bloodEl = document.getElementById('emBlood');
  if (bloodEl) bloodEl.textContent = data.blood || 'B+';
  
  const phone = data.emergency || '+8801700000000';
  const callBtn = document.getElementById('emCallBtn');
  if (callBtn) callBtn.href = `tel:${phone}`;
  const callLabel = document.getElementById('emCallLabel');
  if (callLabel) callLabel.textContent = `ইমার্জেন্সি নম্বরে কল: ${phone}`;
  
  const allergiesEl = document.getElementById('emAllergies');
  if (allergiesEl) allergiesEl.textContent = (data.allergies && data.allergies.length) ? data.allergies.join(', ') : 'জানা নেই / নেই';
  const conditionsEl = document.getElementById('emConditions');
  if (conditionsEl) conditionsEl.textContent = (data.conditions && data.conditions.length) ? data.conditions.join(', ') : 'কোনো জটিলতা নেই';
  
  const medsContainer = document.getElementById('emMedsList');
  if (medsContainer) {
    if (data.activeMeds && data.activeMeds.length > 0) {
      medsContainer.innerHTML = data.activeMeds.map(m => `
        <span style="display:inline-block;padding:2px 8px;background:var(--color-primary-tint);color:var(--color-primary-dark);border-radius:12px;font-size:0.75rem;font-weight:500;">
          ${m.name} (${m.dosage})
        </span>
      `).join('');
    } else {
      medsContainer.innerHTML = '<span style="color:var(--color-text-muted);font-size:0.75rem;">বর্তমানে কোনো ওষুধ চালু নেই</span>';
    }
  }

  openModal('emergencyIdModal');
}

document.addEventListener('DOMContentLoaded', initAppShell);

