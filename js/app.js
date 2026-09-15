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

// Close the notification panel when clicking outside of it.
document.addEventListener('click', function (e) {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const trigger = e.target.closest('.icon-btn');
  if (!trigger && !e.target.closest('.notif-panel')) {
    panel.classList.remove('show');
  }
});
