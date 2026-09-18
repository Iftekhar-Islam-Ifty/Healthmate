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
  let toast = document.getElementById('toastHm');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-hm';
    toast.id = 'toastHm';
    toast.innerHTML = '<span class="dot-success"></span><span id="toastMsg"></span>';
    document.body.appendChild(toast);
  }
  if (message) {
    const label = toast.querySelector('span:last-child') || toast.querySelector('#toastMsg');
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

// Global avatar renderer supporting both image upload and initials fallback
function renderAvatar(el, user) {
  if (!el) return;
  if (!user && window.HMStore && typeof HMStore.getUser === 'function') {
    user = HMStore.getUser();
  }
  const cleanName = (user && user.name) || 'User';
  const initials = (user && user.initials) || cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IA';

  if (user && user.avatar) {
    el.innerHTML = `<img src="${user.avatar}" alt="${cleanName}" class="avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
    el.classList.add('has-avatar-img');
  } else {
    el.textContent = initials;
    el.classList.remove('has-avatar-img');
  }
  el.title = `${cleanName} (Personal Account)`;
}
window.renderAvatar = renderAvatar;

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

  // 1. Update avatars across the app to reflect user photo or initials & bind click to open profile modal
  if (user) {
    document.querySelectorAll('.avatar, #topbarAvatar').forEach(el => {
      renderAvatar(el, user);
      el.style.cursor = 'pointer';
      el.onclick = (e) => {
        e.preventDefault();
        openGlobalEditProfileModal();
      };
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

// Ensure Emergency Medical ID modal structure exists in DOM
function ensureEmergencyModalInDOM() {
  if (document.getElementById('emergencyIdModal')) return;
  const modal = document.createElement('div');
  modal.className = 'modal-hm-backdrop';
  modal.id = 'emergencyIdModal';
  modal.innerHTML = `
    <div class="modal-hm" style="max-width:480px;padding:var(--space-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:#FEF2F2;color:var(--color-error);font-weight:bold;">🚑</span>
          <h3 style="margin:0;font-size:1.1rem;">Emergency Medical ID</h3>
        </div>
        <button type="button" class="icon-btn" onclick="closeModal('emergencyIdModal')" aria-label="Close" style="width:28px;height:28px;">✕</button>
      </div>

      <div class="emergency-card-visual" id="emCardVisual">
        <div class="emergency-header">
          <div>
            <div style="font-size:1.2rem;font-weight:700;" id="emName">User</div>
            <div style="font-size:0.8rem;color:var(--color-text-muted);" id="emAge">ব্যক্তিগত অ্যাকাউন্ট</div>
          </div>
          <div class="emergency-blood-badge" id="emBloodBadge">
            <span>BLOOD</span>
            <b id="emBlood">—</b>
          </div>
        </div>

        <div style="margin: 12px 0;">
          <a id="emCallBtn" href="tel:" class="emergency-call-btn" style="width:100%;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span id="emCallLabel">Emergency Contact</span>
          </a>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem;margin-top:10px;">
          <div style="background:#FFFFFF;border:1px solid #FEE2E2;padding:8px 10px;border-radius:6px;">
            <div style="font-weight:600;color:#DC2626;font-size:0.72rem;text-transform:uppercase;">Allergies</div>
            <div id="emAllergies" style="font-weight:500;margin-top:2px;">—</div>
          </div>
          <div style="background:#FFFFFF;border:1px solid var(--color-border);padding:8px 10px;border-radius:6px;">
            <div style="font-weight:600;color:var(--color-text-secondary);font-size:0.72rem;text-transform:uppercase;">Conditions</div>
            <div id="emConditions" style="font-weight:500;margin-top:2px;">—</div>
          </div>
        </div>

        <div style="margin-top:10px;background:#FFFFFF;border:1px solid var(--color-border);padding:8px 10px;border-radius:6px;font-size:0.8rem;">
          <div style="font-weight:600;color:var(--color-text-secondary);font-size:0.72rem;text-transform:uppercase;">Active Prescriptions</div>
          <div id="emMedsList" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;"></div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:8px;">
        <a href="report.html" class="btn-hm btn-ghost" style="font-size:0.82rem;padding:6px 12px;text-decoration:none;">Full Doctor's Report →</a>
        <button type="button" class="btn-hm btn-secondary" onclick="closeModal('emergencyIdModal')">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Open Emergency Medical ID modal across all pages
function openEmergencyModal() {
  ensureEmergencyModalInDOM();
  if (!window.HMStore || !HMStore.getEmergencyData) return;
  const data = HMStore.getEmergencyData();
  const nameEl = document.getElementById('emName');
  if (nameEl) nameEl.textContent = data.name || 'User';
  const ageEl = document.getElementById('emAge');
  if (ageEl) ageEl.textContent = data.age ? `${data.age} বছর • ব্যক্তিগত অ্যাকাউন্ট` : 'ব্যক্তিগত অ্যাকাউন্ট';
  const bloodEl = document.getElementById('emBlood');
  if (bloodEl) bloodEl.textContent = data.blood || '—';
  
  const phone = data.emergency || '';
  const callBtn = document.getElementById('emCallBtn');
  if (callBtn) {
    if (phone) {
      callBtn.href = `tel:${phone}`;
      callBtn.style.display = 'inline-flex';
    } else {
      callBtn.style.display = 'none';
    }
  }
  const callLabel = document.getElementById('emCallLabel');
  if (callLabel) callLabel.textContent = phone ? `ইমার্জেন্সি নম্বরে কল: ${phone}` : 'ইমার্জেন্সি নম্বর যুক্ত করা নেই';
  
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

// ==========================================
// GLOBAL PERSONAL PROFILE EDIT MODAL & AVATAR
// ==========================================

let globalStagedAvatar = '';

const GLOBAL_AVATAR_PRESETS = [
  {
    id: 'health-teal',
    title: 'Teal Health',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%230D6E6E"/><circle cx="50" cy="38" r="18" fill="%23FFFFFF"/><path d="M22 86c0-15.464 12.536-28 28-28s28 12.536 28 28" fill="%23E0F2F1"/><path d="M47 30h6v16h-6zM42 35h16v6H42z" fill="%230D6E6E"/></svg>`
  },
  {
    id: 'medic-blue',
    title: 'Medic Blue',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%230284C7"/><circle cx="50" cy="38" r="18" fill="%23FFFFFF"/><path d="M20 86c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="%23E0F2FE"/><circle cx="50" cy="38" r="8" fill="%230284C7"/></svg>`
  },
  {
    id: 'amber-vital',
    title: 'Warm Amber',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%23D97706"/><circle cx="50" cy="38" r="18" fill="%23FEF3C7"/><path d="M20 86c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="%23FFFBEB"/><path d="M50 26l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" fill="%23D97706"/></svg>`
  },
  {
    id: 'emerald-leaf',
    title: 'Wellness Green',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%23059669"/><circle cx="50" cy="38" r="18" fill="%23D1FAE5"/><path d="M20 86c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="%23ECFDF5"/><path d="M50 26c-8 0-12 6-12 12 6 0 12-4 12-12zm0 0c8 0 12 6 12 12-6 0-12-4-12-12z" fill="%23059669"/></svg>`
  },
  {
    id: 'heart-rose',
    title: 'Care Rose',
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="%23E11D48"/><circle cx="50" cy="38" r="18" fill="%23FFE4E6"/><path d="M20 86c0-16.5 13.5-30 30-30s30 13.5 30 30" fill="%23FFF1F2"/><path d="M50 44s-7-4.5-7-8.5a4 4 0 0 1 7-2.3 4 4 0 0 1 7 2.3c0 4-7 8.5-7 8.5z" fill="%23E11D48"/></svg>`
  }
];

function ensureEditProfileModalInDOM() {
  if (document.getElementById('editAccountModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-hm-backdrop';
  modal.id = 'editAccountModal';
  modal.innerHTML = `
    <div class="modal-hm" style="max-width:480px;padding:var(--space-4);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:1.15rem;">Edit Personal Profile</h3>
        <button type="button" class="icon-btn" onclick="closeModal('editAccountModal')" aria-label="Close" style="width:28px;height:28px;">✕</button>
      </div>
      <form id="editAccountForm" onsubmit="handleGlobalProfileFormSubmit(event)">
        <div style="display:flex;flex-direction:column;gap:var(--space-3);">
          
          <!-- Profile Picture Section -->
          <div class="field" style="margin-bottom:2px;">
            <label style="font-weight:600;margin-bottom:6px;display:block;">Profile Picture</label>
            <div class="avatar-uploader-box">
              <div class="modal-avatar-preview" id="modalAvatarPreview">IA</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                  <button type="button" class="btn-hm btn-secondary" style="font-size:0.8rem;padding:6px 12px;" onclick="document.getElementById('avatarFileInput').click()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload Photo
                  </button>
                  <button type="button" class="btn-hm btn-ghost" id="adjustAvatarBtn" style="font-size:0.8rem;padding:6px 10px;display:none;" onclick="openCropperWithCurrentAvatar()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
                    Crop &amp; Position
                  </button>
                  <button type="button" class="btn-hm btn-ghost" id="removeAvatarBtn" style="font-size:0.8rem;padding:6px 10px;color:var(--color-error);display:none;" onclick="removeGlobalStagedAvatar()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Remove
                  </button>
                  <input type="file" id="avatarFileInput" accept="image/png,image/jpeg,image/webp,image/jpg,image/gif" style="display:none;" onchange="handleGlobalAvatarFileSelect(event)">
                </div>
                <div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:5px;">
                  JPG, PNG, or WebP. Interactive crop &amp; reposition available.
                </div>

                <!-- Quick Presets -->
                <div style="margin-top:10px;">
                  <div style="font-size:0.72rem;font-weight:600;color:var(--color-text-secondary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.02em;">Or select an avatar style</div>
                  <div class="avatar-presets-grid" id="avatarPresetsContainer"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="accName">Full name</label>
            <input type="text" id="accName" required oninput="onGlobalAccNameChange()">
          </div>
          <div class="field">
            <label for="accEmail">Email address</label>
            <input type="email" id="accEmail" required>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
            <div class="field">
              <label for="accBlood">Blood group</label>
              <select id="accBlood">
                <option value="B+">B+ (Positive)</option>
                <option value="A+">A+ (Positive)</option>
                <option value="O+">O+ (Positive)</option>
                <option value="AB+">AB+ (Positive)</option>
                <option value="O-">O- (Negative)</option>
                <option value="A-">A- (Negative)</option>
                <option value="B-">B- (Negative)</option>
                <option value="AB-">AB- (Negative)</option>
              </select>
            </div>
            <div class="field">
              <label for="accAge">Age</label>
              <input type="number" id="accAge" min="1" max="120">
            </div>
          </div>
          <div class="field">
            <label for="accEmergency">Emergency contact</label>
            <input type="text" id="accEmergency" placeholder="+8801700000000">
          </div>
          <div class="field">
            <label for="accConditions">Conditions &amp; Allergies (comma separated)</label>
            <input type="text" id="accConditions" placeholder="e.g. Mild seasonal allergy, Dust">
          </div>
        </div>
        <div class="modal-hm-actions" style="margin-top:16px;">
          <button type="button" class="btn-hm btn-ghost" onclick="closeModal('editAccountModal')">Cancel</button>
          <button type="submit" class="btn-hm btn-primary" id="accSaveBtn">Save Changes</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  ensureAvatarCropperModalInDOM();
}

// ==========================================
// INTERACTIVE AVATAR CROPPER & REPOSITION ENGINE
// ==========================================

const cropperState = {
  img: null,
  rawSrc: '',
  scale: 1.0,
  baseScale: 1.0,
  posX: 0,
  posY: 0,
  rotation: 0,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  lastPinchDist: 0,
  viewSize: 320,
  circleRadius: 110
};

function ensureAvatarCropperModalInDOM() {
  if (document.getElementById('avatarCropperModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-hm-backdrop';
  modal.id = 'avatarCropperModal';
  modal.style.zIndex = '1060';
  modal.innerHTML = `
    <div class="modal-hm cropper-modal-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;font-size:1.15rem;">Crop &amp; Position Avatar</h3>
          <p style="margin:2px 0 0 0;font-size:0.75rem;color:var(--color-text-muted);">Drag image to move up/down/left/right • Zoom to fit perfectly</p>
        </div>
        <button type="button" class="icon-btn" onclick="closeAvatarCropperModal()" aria-label="Close" style="width:28px;height:28px;">✕</button>
      </div>

      <!-- Viewport Canvas Area -->
      <div class="cropper-viewport-container" id="cropperViewportWrap">
        <canvas id="cropCanvas" width="320" height="320" class="cropper-canvas"></canvas>
        <div class="cropper-help-pill">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
          Drag to move • Scroll to zoom
        </div>
      </div>

      <!-- Controls Toolbar -->
      <div class="cropper-toolbar">
        <!-- Zoom Slider -->
        <div class="cropper-slider-row">
          <button type="button" class="cropper-tool-btn" title="Zoom Out" onclick="stepCropperZoom(-0.15)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <input type="range" id="cropZoomSlider" min="1.0" max="3.5" step="0.02" value="1.0" oninput="onCropperZoomSliderChange(this.value)">
          <button type="button" class="cropper-tool-btn" title="Zoom In" onclick="stepCropperZoom(0.15)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span id="cropZoomValueBadge" style="font-size:0.75rem;font-weight:600;min-width:38px;text-align:right;color:var(--color-primary);">100%</span>
        </div>

        <!-- Position & Preview Row -->
        <div class="cropper-preview-row">
          <div style="display:flex;gap:6px;align-items:center;">
            <button type="button" class="btn-hm btn-ghost" style="font-size:0.78rem;padding:6px 10px;" onclick="rotateCropperImage()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Rotate 90°
            </button>
            <button type="button" class="btn-hm btn-ghost" style="font-size:0.78rem;padding:6px 10px;" onclick="resetCropperTransform()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Center
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.72rem;color:var(--color-text-muted);font-weight:500;">Live Cut:</span>
            <canvas id="cropMiniPreview" width="88" height="88" class="cropper-mini-preview-circle"></canvas>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-hm-actions" style="margin-top:14px;">
        <button type="button" class="btn-hm btn-ghost" onclick="closeAvatarCropperModal()">Cancel</button>
        <button type="button" class="btn-hm btn-primary" onclick="applyAvatarCrop()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Done / Apply Photo
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  initCropperCanvasEvents();
}

function initCropperCanvasEvents() {
  const canvas = document.getElementById('cropCanvas');
  const wrap = document.getElementById('cropperViewportWrap');
  if (!canvas || !wrap) return;

  // Mouse drag events
  canvas.addEventListener('mousedown', (e) => {
    cropperState.isDragging = true;
    cropperState.lastMouseX = e.clientX;
    cropperState.lastMouseY = e.clientY;
    canvas.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!cropperState.isDragging) return;
    const dx = e.clientX - cropperState.lastMouseX;
    const dy = e.clientY - cropperState.lastMouseY;
    cropperState.lastMouseX = e.clientX;
    cropperState.lastMouseY = e.clientY;

    cropperState.posX += dx;
    cropperState.posY += dy;
    drawCropperFrame();
  });

  window.addEventListener('mouseup', () => {
    if (cropperState.isDragging) {
      cropperState.isDragging = false;
      const c = document.getElementById('cropCanvas');
      if (c) c.classList.remove('is-dragging');
    }
  });

  // Wheel zoom
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const newScale = Math.max(1.0, Math.min(3.5, cropperState.scale + delta));
    setCropperScale(newScale);
  }, { passive: false });

  // Touch drag & pinch-to-zoom
  wrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      cropperState.isDragging = true;
      cropperState.lastMouseX = e.touches[0].clientX;
      cropperState.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      cropperState.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropperState.lastPinchDist = Math.hypot(dx, dy);
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && cropperState.isDragging) {
      e.preventDefault();
      const dx = e.touches[0].clientX - cropperState.lastMouseX;
      const dy = e.touches[0].clientY - cropperState.lastMouseY;
      cropperState.lastMouseX = e.touches[0].clientX;
      cropperState.lastMouseY = e.touches[0].clientY;

      cropperState.posX += dx;
      cropperState.posY += dy;
      drawCropperFrame();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (cropperState.lastPinchDist > 0) {
        const factor = dist / cropperState.lastPinchDist;
        const newScale = Math.max(1.0, Math.min(3.5, cropperState.scale * factor));
        setCropperScale(newScale);
      }
      cropperState.lastPinchDist = dist;
    }
  }, { passive: false });

  wrap.addEventListener('touchend', () => {
    cropperState.isDragging = false;
    cropperState.lastPinchDist = 0;
  });
}

function openAvatarCropperWithImageSrc(imageSrc) {
  ensureAvatarCropperModalInDOM();
  cropperState.rawSrc = imageSrc;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    cropperState.img = img;
    
    // Calculate base scale to fill the 220px circle diameter
    const targetDiam = cropperState.circleRadius * 2;
    const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    cropperState.baseScale = targetDiam / minSide;
    cropperState.scale = 1.0;
    cropperState.posX = 0;
    cropperState.posY = 0;
    cropperState.rotation = 0;

    const slider = document.getElementById('cropZoomSlider');
    if (slider) slider.value = '1.0';
    updateZoomBadge(1.0);

    drawCropperFrame();
    openModal('avatarCropperModal');
  };
  img.onerror = () => {
    showToast('Failed to load image for cropping');
  };
  img.src = imageSrc;
}

function openCropperWithCurrentAvatar() {
  if (globalStagedAvatar) {
    openAvatarCropperWithImageSrc(globalStagedAvatar);
  } else {
    showToast('Please select or upload a photo first');
  }
}

function closeAvatarCropperModal() {
  closeModal('avatarCropperModal');
}

function setCropperScale(newScale) {
  cropperState.scale = Math.max(1.0, Math.min(3.5, newScale));
  const slider = document.getElementById('cropZoomSlider');
  if (slider) slider.value = cropperState.scale.toFixed(2);
  updateZoomBadge(cropperState.scale);
  drawCropperFrame();
}

function onCropperZoomSliderChange(val) {
  setCropperScale(parseFloat(val) || 1.0);
}

function stepCropperZoom(step) {
  setCropperScale(cropperState.scale + step);
}

function updateZoomBadge(scale) {
  const badge = document.getElementById('cropZoomValueBadge');
  if (badge) {
    badge.textContent = `${Math.round(scale * 100)}%`;
  }
}

function rotateCropperImage() {
  cropperState.rotation = (cropperState.rotation + 90) % 360;
  drawCropperFrame();
}

function resetCropperTransform() {
  cropperState.scale = 1.0;
  cropperState.posX = 0;
  cropperState.posY = 0;
  cropperState.rotation = 0;
  const slider = document.getElementById('cropZoomSlider');
  if (slider) slider.value = '1.0';
  updateZoomBadge(1.0);
  drawCropperFrame();
}

function drawCropperFrame() {
  const canvas = document.getElementById('cropCanvas');
  if (!canvas || !cropperState.img) return;
  const ctx = canvas.getContext('2d');
  const size = cropperState.viewSize;
  const center = size / 2;
  const r = cropperState.circleRadius;

  // Clear
  ctx.clearRect(0, 0, size, size);

  // 1. Draw Image with Transform
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((cropperState.rotation * Math.PI) / 180);
  ctx.translate(cropperState.posX, cropperState.posY);

  const effScale = cropperState.baseScale * cropperState.scale;
  ctx.scale(effScale, effScale);

  const nw = cropperState.img.naturalWidth || cropperState.img.width;
  const nh = cropperState.img.naturalHeight || cropperState.img.height;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cropperState.img, -nw / 2, -nh / 2, nw, nh);
  ctx.restore();

  // 2. Draw Dark Overlay Mask with Circular Cutout
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.68)';
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(center, center, r, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.restore();

  // 3. Draw Circular Viewport Ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#0D6E6E';
  ctx.stroke();

  // Soft Outer Glow Ring
  ctx.beginPath();
  ctx.arc(center, center, r + 1, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.stroke();

  // 4. Subtle 3x3 Grid Guidelines inside circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, r - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;

  // Horizontal lines
  ctx.beginPath();
  ctx.moveTo(center - r, center - r * 0.33);
  ctx.lineTo(center + r, center - r * 0.33);
  ctx.moveTo(center - r, center + r * 0.33);
  ctx.lineTo(center + r, center + r * 0.33);
  // Vertical lines
  ctx.moveTo(center - r * 0.33, center - r);
  ctx.lineTo(center - r * 0.33, center + r);
  ctx.moveTo(center + r * 0.33, center - r);
  ctx.lineTo(center + r * 0.33, center + r);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // 5. Update Mini Preview Canvas
  updateCropperMiniPreview();
}

function updateCropperMiniPreview() {
  const miniCanvas = document.getElementById('cropMiniPreview');
  if (!miniCanvas || !cropperState.img) return;
  const mCtx = miniCanvas.getContext('2d');
  const mSize = miniCanvas.width;
  const mCenter = mSize / 2;
  const r = cropperState.circleRadius;

  mCtx.clearRect(0, 0, mSize, mSize);

  // Clip to circle
  mCtx.save();
  mCtx.beginPath();
  mCtx.arc(mCenter, mCenter, mSize / 2, 0, Math.PI * 2);
  mCtx.clip();

  // Draw image matching exact view
  mCtx.translate(mCenter, mCenter);
  mCtx.rotate((cropperState.rotation * Math.PI) / 180);

  const miniRatio = (mSize / 2) / r;
  mCtx.translate(cropperState.posX * miniRatio, cropperState.posY * miniRatio);

  const effScale = cropperState.baseScale * cropperState.scale * miniRatio;
  mCtx.scale(effScale, effScale);

  const nw = cropperState.img.naturalWidth || cropperState.img.width;
  const nh = cropperState.img.naturalHeight || cropperState.img.height;
  mCtx.imageSmoothingEnabled = true;
  mCtx.imageSmoothingQuality = 'high';
  mCtx.drawImage(cropperState.img, -nw / 2, -nh / 2, nw, nh);
  mCtx.restore();
}

function applyAvatarCrop() {
  if (!cropperState.img) {
    closeAvatarCropperModal();
    return;
  }

  // Create High-Res Output Canvas (300 x 300)
  const outSize = 300;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outSize;
  outCanvas.height = outSize;
  const outCtx = outCanvas.getContext('2d');
  const outCenter = outSize / 2;
  const r = cropperState.circleRadius;

  const ratio = (outSize / 2) / r;

  outCtx.save();
  outCtx.translate(outCenter, outCenter);
  outCtx.rotate((cropperState.rotation * Math.PI) / 180);
  outCtx.translate(cropperState.posX * ratio, cropperState.posY * ratio);

  const effScale = cropperState.baseScale * cropperState.scale * ratio;
  outCtx.scale(effScale, effScale);

  const nw = cropperState.img.naturalWidth || cropperState.img.width;
  const nh = cropperState.img.naturalHeight || cropperState.img.height;
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(cropperState.img, -nw / 2, -nh / 2, nw, nh);
  outCtx.restore();

  const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
  globalStagedAvatar = croppedDataUrl;

  renderGlobalModalAvatarPreview();
  renderGlobalPresetAvatars();

  closeAvatarCropperModal();
  showToast('Photo positioned and cropped! Click "Save Changes" to save.');
}

function renderGlobalPresetAvatars() {
  const container = document.getElementById('avatarPresetsContainer');
  if (!container) return;
  container.innerHTML = GLOBAL_AVATAR_PRESETS.map(p => `
    <button type="button" class="avatar-preset-btn ${globalStagedAvatar === p.svg ? 'active' : ''}" title="${p.title}" onclick="selectGlobalPresetAvatar('${p.id}')">
      <img src="${p.svg}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;">
    </button>
  `).join('');
}

function selectGlobalPresetAvatar(presetId) {
  const found = GLOBAL_AVATAR_PRESETS.find(p => p.id === presetId);
  if (found) {
    globalStagedAvatar = found.svg;
    renderGlobalModalAvatarPreview();
    renderGlobalPresetAvatars();
  }
}

function removeGlobalStagedAvatar() {
  globalStagedAvatar = '';
  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) fileInput.value = '';
  renderGlobalModalAvatarPreview();
  renderGlobalPresetAvatars();
}

function onGlobalAccNameChange() {
  if (!globalStagedAvatar) {
    renderGlobalModalAvatarPreview();
  }
}

function renderGlobalModalAvatarPreview() {
  const previewEl = document.getElementById('modalAvatarPreview');
  const removeBtn = document.getElementById('removeAvatarBtn');
  const adjustBtn = document.getElementById('adjustAvatarBtn');
  if (!previewEl) return;

  if (globalStagedAvatar) {
    previewEl.innerHTML = `<img src="${globalStagedAvatar}" alt="Preview" class="avatar-img" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;">`;
    if (removeBtn) removeBtn.style.display = 'inline-flex';
    if (adjustBtn) adjustBtn.style.display = 'inline-flex';
  } else {
    const nameInput = document.getElementById('accName');
    const nameVal = nameInput ? nameInput.value.trim() : '';
    const initials = nameVal ? nameVal.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'IA';
    previewEl.textContent = initials || 'IA';
    if (removeBtn) removeBtn.style.display = 'none';
    if (adjustBtn) adjustBtn.style.display = 'none';
  }
}

async function handleGlobalAvatarFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file (JPG, PNG, WebP).');
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    showToast('Image size should be less than 12MB.');
    return;
  }

  try {
    showToast('Loading image for crop…');
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target.result;
      openAvatarCropperWithImageSrc(dataUrl);
    };
    reader.onerror = function() {
      showToast('Error reading file.');
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error('Image upload error:', err);
    showToast('Failed to process image. Please try another.');
  }
}

// Global modal opener when clicking navbar profile avatar or edit button
function openGlobalEditProfileModal() {
  ensureEditProfileModalInDOM();
  if (!window.HMStore || !HMStore.getUser) return;

  const user = HMStore.getUser();
  globalStagedAvatar = user.avatar || '';

  const nameInput = document.getElementById('accName');
  if (nameInput) nameInput.value = user.name || '';

  const emailInput = document.getElementById('accEmail');
  if (emailInput) emailInput.value = user.email || '';

  const bloodSelect = document.getElementById('accBlood');
  if (bloodSelect) bloodSelect.value = user.blood || 'B+';

  const ageInput = document.getElementById('accAge');
  if (ageInput) ageInput.value = user.age || 29;

  const emInput = document.getElementById('accEmergency');
  if (emInput) emInput.value = user.emergency || '';

  const condList = [
    ...(Array.isArray(user.conditions) ? user.conditions : []),
    ...(Array.isArray(user.allergies) ? user.allergies : [])
  ].filter(Boolean).join(', ');

  const condInput = document.getElementById('accConditions');
  if (condInput) condInput.value = condList;

  const fileInput = document.getElementById('avatarFileInput');
  if (fileInput) fileInput.value = '';

  renderGlobalModalAvatarPreview();
  renderGlobalPresetAvatars();

  openModal('editAccountModal');
}

// Global Profile Form Submission
async function handleGlobalProfileFormSubmit(e) {
  if (e) e.preventDefault();
  const saveBtn = document.getElementById('accSaveBtn');
  const origText = saveBtn ? saveBtn.innerHTML : 'Save Changes';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving to cloud…';
  }

  const nameInput = document.getElementById('accName');
  const emailInput = document.getElementById('accEmail');
  const bloodSelect = document.getElementById('accBlood');
  const ageInput = document.getElementById('accAge');
  const emInput = document.getElementById('accEmergency');
  const condInput = document.getElementById('accConditions');

  const name = nameInput ? nameInput.value.trim() : 'User';
  const email = emailInput ? emailInput.value.trim() : '';
  const blood = bloodSelect ? bloodSelect.value : 'B+';
  const age = ageInput ? parseInt(ageInput.value, 10) || 29 : 29;
  const emergency = emInput ? emInput.value.trim() : '';
  const condRaw = condInput ? condInput.value.trim() : '';
  const conditions = condRaw ? condRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IA';

  try {
    if (window.HMStore && typeof HMStore.saveUser === 'function') {
      await HMStore.saveUser({
        name,
        email,
        blood,
        age,
        emergency,
        conditions,
        initials,
        avatar: globalStagedAvatar,
        accountType: 'single',
        role: 'Personal'
      });
    }

    closeModal('editAccountModal');

    // Update all avatars on the current page
    const user = HMStore.getUser ? HMStore.getUser() : { name, initials, avatar: globalStagedAvatar };
    document.querySelectorAll('.avatar, #topbarAvatar').forEach(el => {
      renderAvatar(el, user);
    });

    // Update greeting name on dashboard if present
    const greetingName = document.getElementById('greetingName');
    if (greetingName) {
      greetingName.textContent = `Good morning, ${user.name || 'there'}`;
    }

    // Refresh settings view if on settings page
    if (typeof renderSettings === 'function') {
      renderSettings();
    }

    // Refresh report view if on report page
    if (typeof renderReport === 'function') {
      renderReport();
    }

    showToast('Personal profile & photo synced with cloud');
  } catch (err) {
    console.error('Error saving profile:', err);
    showToast('Error saving profile to cloud');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origText;
    }
  }
}

// Global window bindings
window.openGlobalEditProfileModal = openGlobalEditProfileModal;
window.openEditAccountModal = openGlobalEditProfileModal;
window.handleGlobalProfileFormSubmit = handleGlobalProfileFormSubmit;
window.selectGlobalPresetAvatar = selectGlobalPresetAvatar;
window.removeGlobalStagedAvatar = removeGlobalStagedAvatar;
window.onGlobalAccNameChange = onGlobalAccNameChange;
window.handleGlobalAvatarFileSelect = handleGlobalAvatarFileSelect;
window.openCropperWithCurrentAvatar = openCropperWithCurrentAvatar;
window.closeAvatarCropperModal = closeAvatarCropperModal;
window.applyAvatarCrop = applyAvatarCrop;
window.rotateCropperImage = rotateCropperImage;
window.resetCropperTransform = resetCropperTransform;
window.onCropperZoomSliderChange = onCropperZoomSliderChange;
window.stepCropperZoom = stepCropperZoom;
window.openAvatarCropperWithImageSrc = openAvatarCropperWithImageSrc;

// Auto-inject HealthMate AI Companion for app pages
function injectHealthAiAssistantScript() {
  const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';
  if (isLoginPage && !window.HMStore?.isAuthenticated?.()) return;

  if (!document.getElementById('hmAiScript')) {
    const s = document.createElement('script');
    s.id = 'hmAiScript';
    s.src = '/js/ai-assistant.js';
    document.body.appendChild(s);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAppShell();
  injectHealthAiAssistantScript();
});



