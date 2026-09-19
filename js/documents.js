// =========================================================
// Healthmate — Medical Documents & Prescription Vault Engine
// =========================================================

let currentDocCategory = 'all';
let currentSearchQuery = '';
let currentDocSort = 'newest';
let stagedFileData = null;
let stagedFileName = '';
let stagedFileType = 'pdf';
let stagedFileSize = '';

document.addEventListener('DOMContentLoaded', () => {
  initDocumentVault();
});

function initDocumentVault() {
  const user = HMStore.getUser();
  if (user) {
    const avatar = document.querySelector('.avatar');
    if (avatar) avatar.textContent = user.initials || 'IF';
  }

  setupVaultListeners();
  updateCategoryPillCounters();
  renderDocumentsList();

  if (window.HMStore && typeof HMStore.fetchRecordsAndDocuments === 'function') {
    HMStore.fetchRecordsAndDocuments().then(() => {
      updateCategoryPillCounters();
      renderDocumentsList();
    });
  }
}

function setupVaultListeners() {
  // Search input
  const searchInput = document.getElementById('vaultSearchInput');
  const clearBtn = document.getElementById('vaultSearchClearBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = currentSearchQuery ? 'inline-flex' : 'none';
      }
      renderDocumentsList();
    });
  }

  // Global Keyboard Shortcut: Press '/' or Ctrl+K / Cmd+K to search
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable || activeEl.tagName === 'SELECT');
    
    if (!isEditing && e.key === '/') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // Setup drag & drop for upload modal
  const dropZone = document.getElementById('docDropZone');
  const fileInput = document.getElementById('docFileInput');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }
}

function handleFileSelection(file) {
  if (!file) return;

  stagedFileName = file.name;
  const isImage = file.type.startsWith('image/');
  stagedFileType = isImage ? 'image' : 'pdf';

  // Format file size
  const sizeKb = Math.round(file.size / 1024);
  stagedFileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  // Read data URL
  const reader = new FileReader();
  reader.onload = (e) => {
    stagedFileData = e.target.result;
    showFileStagedPreview();
  };
  reader.readAsDataURL(file);
}

function showFileStagedPreview() {
  const previewBox = document.getElementById('docFilePreviewBox');
  const dropPrompt = document.getElementById('docDropPrompt');

  if (previewBox && dropPrompt) {
    dropPrompt.style.display = 'none';
    previewBox.style.display = 'flex';
    document.getElementById('stagedFileName').textContent = stagedFileName;
    document.getElementById('stagedFileMeta').textContent = `${stagedFileType.toUpperCase()} · ${stagedFileSize}`;
  }

  // Auto-fill title if empty
  const titleInput = document.getElementById('docTitle');
  if (titleInput && !titleInput.value.trim()) {
    const cleanBaseName = stagedFileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    titleInput.value = cleanBaseName.charAt(0).toUpperCase() + cleanBaseName.slice(1);
  }
}

function removeStagedFile(e) {
  if (e) e.stopPropagation();
  stagedFileData = null;
  stagedFileName = '';
  stagedFileType = 'pdf';
  stagedFileSize = '';

  const fileInput = document.getElementById('docFileInput');
  if (fileInput) fileInput.value = '';

  const previewBox = document.getElementById('docFilePreviewBox');
  const dropPrompt = document.getElementById('docDropPrompt');
  if (previewBox && dropPrompt) {
    previewBox.style.display = 'none';
    dropPrompt.style.display = 'block';
  }
}

function filterDocCategory(category) {
  currentDocCategory = category;

  // Update category chip UI
  document.querySelectorAll('.vault-chip-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-cat') === category;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  renderDocumentsList();
}

function onDocSortChange(val) {
  currentDocSort = val || 'newest';
  renderDocumentsList();
}

function applyQuickSearch(term) {
  const searchInput = document.getElementById('vaultSearchInput');
  const clearBtn = document.getElementById('vaultSearchClearBtn');
  if (searchInput) {
    searchInput.value = term;
    searchInput.focus();
  }
  currentSearchQuery = term.trim().toLowerCase();
  if (clearBtn) {
    clearBtn.style.display = currentSearchQuery ? 'inline-flex' : 'none';
  }
  renderDocumentsList();
}

function updateCategoryPillCounters() {
  const docs = HMStore.getDocuments ? HMStore.getDocuments() : [];
  const counts = {
    all: docs.length,
    prescription: 0,
    lab: 0,
    radiology: 0,
    other: 0
  };

  docs.forEach(d => {
    const cat = d.category || 'other';
    if (counts[cat] !== undefined) {
      counts[cat]++;
    } else {
      counts.other++;
    }
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('countCatAll', counts.all);
  setEl('countCatPrescription', counts.prescription);
  setEl('countCatLab', counts.lab);
  setEl('countCatRadiology', counts.radiology);
  setEl('countCatOther', counts.other);
}

function getCategoryConfig(cat) {
  const map = {
    prescription: {
      label: 'Prescription',
      bg: '#ECFDF5',
      color: '#065F46',
      border: '#A7F3D0',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>'
    },
    lab: {
      label: 'Lab Test',
      bg: '#EFF6FF',
      color: '#1E40AF',
      border: '#BFDBFE',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>'
    },
    radiology: {
      label: 'Radiology / Imaging',
      bg: '#FAF5FF',
      color: '#6B21A8',
      border: '#E9D5FF',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>'
    },
    other: {
      label: 'Checkup / Other',
      bg: '#F8FAFC',
      color: '#334155',
      border: '#E2E8F0',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    }
  };
  return map[cat] || map.other;
}

function renderDocumentsList() {
  const container = document.getElementById('vaultDocsGrid');
  const countBadge = document.getElementById('vaultDocCount');
  const filterDescEl = document.getElementById('vaultActiveFilterDesc');
  if (!container) return;

  const allDocs = HMStore.getDocuments ? HMStore.getDocuments() : [];
  let docs = [...allDocs];

  // 1. Filter by category
  if (currentDocCategory !== 'all') {
    docs = docs.filter(d => (d.category || 'other') === currentDocCategory);
  }

  // 2. Filter by search query
  if (currentSearchQuery) {
    docs = docs.filter(d => {
      const matchTitle = (d.title || '').toLowerCase().includes(currentSearchQuery);
      const matchDoc = (d.doctor || '').toLowerCase().includes(currentSearchQuery);
      const matchFacility = (d.facility || '').toLowerCase().includes(currentSearchQuery);
      const matchNotes = (d.notes || '').toLowerCase().includes(currentSearchQuery);
      const matchTags = Array.isArray(d.tags) && d.tags.some(t => t.toLowerCase().includes(currentSearchQuery));
      return matchTitle || matchDoc || matchFacility || matchNotes || matchTags;
    });
  }

  // 3. Sort records
  docs.sort((a, b) => {
    if (currentDocSort === 'oldest') {
      return (new Date(a.date || 0).getTime() || 0) - (new Date(b.date || 0).getTime() || 0);
    } else if (currentDocSort === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (currentDocSort === 'doctor') {
      const docA = (a.doctor || a.facility || '').toLowerCase();
      const docB = (b.doctor || b.facility || '').toLowerCase();
      return docA.localeCompare(docB);
    }
    // Default: 'newest'
    return (new Date(b.date || 0).getTime() || 0) - (new Date(a.date || 0).getTime() || 0);
  });

  // Update Status and Filter Descriptions
  if (countBadge) {
    if (currentSearchQuery || currentDocCategory !== 'all') {
      countBadge.textContent = `Showing ${docs.length} of ${allDocs.length} ${allDocs.length === 1 ? 'document' : 'documents'}`;
    } else {
      countBadge.textContent = `Total ${docs.length} ${docs.length === 1 ? 'document' : 'documents'}`;
    }
  }

  if (filterDescEl) {
    if (currentSearchQuery) {
      filterDescEl.style.display = 'inline-block';
      filterDescEl.innerHTML = `Query: "<b>${escapeHtml(currentSearchQuery)}</b>"`;
    } else if (currentDocCategory !== 'all') {
      const catCfg = getCategoryConfig(currentDocCategory);
      filterDescEl.style.display = 'inline-block';
      filterDescEl.innerHTML = `Category: <b>${catCfg.label}</b>`;
    } else {
      filterDescEl.style.display = 'none';
      filterDescEl.innerHTML = '';
    }
  }

  updateCategoryPillCounters();

  if (docs.length === 0) {
    container.innerHTML = `
      <div class="empty-vault-state">
        <div class="empty-icon-circle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <h3>No documents found</h3>
        <p>${currentSearchQuery ? `No records matched "${escapeHtml(currentSearchQuery)}". Try another medical test or doctor name.` : 'Your medical vault is empty in this category. Upload prescriptions, blood reports, or checkup records.'}</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap;">
          ${currentSearchQuery ? `<button class="btn-hm btn-ghost" onclick="clearDocSearch()">Clear Search Filter</button>` : ''}
          <button class="btn-hm btn-primary" onclick="openUploadDocModal()">+ Upload First Document</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map(doc => {
    const catCfg = getCategoryConfig(doc.category);
    const isImage = doc.fileType === 'image' && doc.fileData;

    return `
      <div class="vault-card" id="doc-card-${doc.id}">
        <div class="vault-card-thumb" onclick="previewDocument(${doc.id})">
          ${isImage ? `
            <img src="${doc.fileData}" alt="${doc.title}" class="vault-thumb-img">
          ` : `
            <div class="vault-thumb-placeholder">
              <span class="vault-thumb-ext">${(doc.fileType || 'pdf').toUpperCase()}</span>
              <span class="vault-thumb-icon">${catCfg.icon}</span>
            </div>
          `}
          <span class="vault-badge-cat" style="background:${catCfg.bg};color:${catCfg.color};border-color:${catCfg.border};">
            ${catCfg.icon} ${catCfg.label}
          </span>
        </div>

        <div class="vault-card-body">
          <div class="vault-doc-date">${doc.date}</div>
          <h3 class="vault-doc-title" onclick="previewDocument(${doc.id})" title="${doc.title}">${doc.title}</h3>
          
          <div class="vault-meta-row">
            ${doc.doctor ? `<span class="vault-meta-item"><b>Dr:</b> ${doc.doctor}</span>` : ''}
            ${doc.facility ? `<span class="vault-meta-item"><b>Clinic:</b> ${doc.facility}</span>` : ''}
          </div>

          ${doc.notes ? `<p class="vault-doc-notes">${doc.notes}</p>` : ''}

          <div class="vault-card-footer">
            <span class="vault-filesize">${doc.fileSize || 'Standard file'}</span>
            <div class="vault-card-actions">
              <button class="btn-hm btn-ghost btn-sm" onclick="previewDocument('${doc.id}')" title="Preview Document">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View
              </button>
              <button class="btn-hm btn-sm" onclick="aiScanDocument('${doc.id}')" title="Scan with AI Assistant" style="background:#E6F4F1;color:#0D6E6E;border:1px solid #BFE3DC;">
                🤖 Scan AI
              </button>
              <button class="btn-hm btn-secondary btn-sm" onclick="downloadDocument('${doc.id}')" title="Download">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="btn-hm btn-ghost btn-sm icon-delete" onclick="askDeleteDoc('${doc.id}')" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openUploadDocModal() {
  const form = document.getElementById('uploadDocForm');
  if (form) form.reset();

  removeStagedFile();
  document.getElementById('docDate').value = new Date().toISOString().slice(0, 10);
  openModal('uploadDocModal');
}

async function handleSaveDocument(e) {
  e.preventDefault();

  const title = document.getElementById('docTitle').value.trim();
  if (!title) {
    if (typeof showToast === 'function') {
      showToast('Please enter a document title');
    }
    return;
  }

  const category = document.getElementById('docCategory').value || 'other';
  const categoryName = document.getElementById('docCategory').options[document.getElementById('docCategory').selectedIndex].text;
  const date = document.getElementById('docDate').value || new Date().toISOString().slice(0, 10);
  const doctor = document.getElementById('docDoctor').value.trim();
  const facility = document.getElementById('docFacility').value.trim();
  const notes = document.getElementById('docNotes').value.trim();

  const doc = {
    title,
    category,
    categoryName,
    date,
    doctor,
    facility,
    notes,
    fileType: stagedFileType || 'pdf',
    fileName: stagedFileName || `${title.replace(/\s+/g, '_')}.pdf`,
    fileSize: stagedFileSize || '1.0 MB',
    fileData: stagedFileData || ''
  };

  await HMStore.addDocument(doc);
  closeModal('uploadDocModal');
  renderDocumentsList();
  if (typeof showToast === 'function') {
    showToast('Document saved to vault');
  }
}

function previewDocument(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  const modal = document.getElementById('viewDocModal');
  const catCfg = getCategoryConfig(doc.category);

  const titleEl = document.getElementById('viewDocTitle');
  if (titleEl) titleEl.textContent = doc.title;
  
  const metaEl = document.getElementById('viewDocMeta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;background:${catCfg.bg};color:${catCfg.color};font-size:0.75rem;font-weight:700;">
        ${catCfg.icon} ${catCfg.label}
      </span>
      <span style="font-size:0.78rem;color:var(--color-text-muted);">Recorded: ${doc.date}</span>
    `;
  }

  const doctorEl = document.getElementById('viewDocDoctor');
  if (doctorEl) doctorEl.textContent = doc.doctor || 'Not specified';
  const facilityEl = document.getElementById('viewDocFacility');
  if (facilityEl) facilityEl.textContent = doc.facility || 'Not specified';
  const notesEl = document.getElementById('viewDocNotes');
  if (notesEl) notesEl.textContent = doc.notes || 'No notes added.';

  const previewStage = document.getElementById('viewDocStage');
  if (previewStage) {
    if (doc.fileData && doc.fileType === 'image') {
      previewStage.innerHTML = `
        <div style="max-height:420px;overflow:auto;text-align:center;background:#0F172A;border-radius:6px;padding:12px;">
          <img src="${doc.fileData}" alt="${doc.title}" style="max-width:100%;max-height:380px;object-fit:contain;border-radius:4px;">
        </div>
      `;
    } else {
      // Clinical sheet preview
      previewStage.innerHTML = `
        <div style="background:#FFFFFF;border:1px solid var(--color-border);border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;border-bottom:2px solid var(--color-primary);padding-bottom:12px;margin-bottom:14px;">
            <div>
              <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:1.1rem;color:var(--color-primary-dark);">${doc.facility || 'Clinical Healthcare Facility'}</div>
              <div style="font-size:0.78rem;color:var(--color-text-muted);">${doc.doctor ? 'Attending: ' + doc.doctor : 'Healthmate Vault Archive'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.75rem;color:var(--color-text-muted);">${doc.date}</div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--color-primary);">${(doc.fileType || 'PDF').toUpperCase()} DOCUMENT</div>
            </div>
          </div>
          <div style="font-size:0.92rem;font-weight:700;color:var(--color-text);margin-bottom:8px;">${doc.title}</div>
          <div style="font-size:0.84rem;color:var(--color-text-secondary);line-height:1.5;background:#F8FAFC;padding:12px;border-radius:6px;border:1px solid #E2E8F0;">
            <b>Clinical Summary / Findings:</b><br>
            ${doc.notes || 'Full archival record stored in patient personal health space.'}
          </div>
          <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:0.75rem;color:var(--color-text-muted);">
            <span>File: <b>${doc.fileName || 'document.pdf'}</b> (${doc.fileSize || '1.0 MB'})</span>
            <span>Verified Patient: <b>Ifty (IA)</b></span>
          </div>
        </div>
      `;
    }
  }

  // Setup download button
  const dlBtn = document.getElementById('viewDocDownloadBtn');
  if (dlBtn) {
    dlBtn.onclick = () => downloadDocument(doc.id);
  }

  // Setup AI Scan button in preview modal
  const scanBtn = document.getElementById('viewDocAiScanBtn');
  if (scanBtn) {
    scanBtn.onclick = () => {
      closeModal('viewDocModal');
      aiScanDocument(doc.id);
    };
  }

  openModal('viewDocModal');
}

function aiScanDocument(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  const prompt = `আমার মেডিকেল ভল্টের প্রেসক্রিপশন/ডকুমেন্ট "${doc.title}" (তারিখ: ${doc.date}, ডাক্তার: ${doc.doctor || 'N/A'}, ক্লিনিক: ${doc.facility || 'N/A'}) টি স্ক্যান ও পর্যালোচনা করো। প্রেসক্রিপশনে উল্লেখিত সমস্ত ঔষধ তাদের ডোজ, খাওয়ার সময় ও খাবারের নিয়মসহ বের করো এবং আমার রুটিন ঔষধ তালিকায় যুক্ত করার পরামর্শ বা কমান্ড দাও। সেই সাথে প্রয়োজনীয় স্বাস্থ্য পরামর্শ ও নির্দেশনা দাও।`;

  if (typeof window.openHealthAiWithPrompt === 'function') {
    // Check if doc has an image to send
    let imageObj = null;
    if (doc.fileData && doc.fileData.startsWith('data:image/')) {
      const parts = doc.fileData.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = parts[1];
      imageObj = { mimeType, data: base64Data };
    }
    window.openHealthAiWithPrompt(prompt, imageObj);
  } else if (typeof showToast === 'function') {
    showToast('AI Assistant খুলতে সমস্যা হচ্ছে');
  }
}

function downloadDocument(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  if (doc.fileData) {
    const a = document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.${doc.fileType === 'image' ? 'jpg' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // If no file data (pre-seeded sample), create a nice standalone HTML report
  const cleanTitle = doc.title.replace(/\s+/g, '_');
  const content = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${doc.title} — Healthmate Vault</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1E293B; }
  .card { max-width: 680px; margin: 0 auto; border: 1px solid #CBD5E1; border-radius: 8px; padding: 28px; }
  .header { border-bottom: 2px solid #0D6E6E; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 20px; margin: 0 0 6px 0; color: #0D6E6E; }
  .meta { font-size: 13px; color: #64748B; margin-bottom: 14px; }
  .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${doc.title}</h1>
      <div class="meta">Facility: ${doc.facility || 'Clinical Diagnostic'} · Doctor: ${doc.doctor || 'Attending Physician'} · Date: ${doc.date}</div>
    </div>
    <div class="box">
      <b>Summary & Findings:</b><br>
      ${doc.notes || 'Clinical record preserved in Healthmate personal space.'}
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Healthmate_${cleanTitle}_${doc.date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let pendingDocIdToDelete = null;

function askDeleteDoc(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  pendingDocIdToDelete = id;
  const modalText = document.getElementById('deleteDocModalText');
  if (modalText) {
    modalText.textContent = `Are you sure you want to delete "${doc.title}" from your medical vault? This action cannot be undone.`;
  }

  const modalEl = document.getElementById('deleteDocModal');
  if (modalEl && typeof openModal === 'function') {
    openModal('deleteDocModal');
  } else {
    // Fallback if modal not present
    deleteDoc(id);
  }
}

async function confirmDeleteDoc() {
  if (!pendingDocIdToDelete) return;
  const id = pendingDocIdToDelete;
  pendingDocIdToDelete = null;
  if (typeof closeModal === 'function') {
    closeModal('deleteDocModal');
  }
  await deleteDoc(id);
}

async function deleteDoc(id) {
  await HMStore.deleteDocument(id);
  renderDocumentsList();
  if (typeof showToast === 'function') {
    showToast('Document deleted from vault');
  }
}

function clearDocSearch() {
  const searchInput = document.getElementById('vaultSearchInput');
  const clearBtn = document.getElementById('vaultSearchClearBtn');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
  currentSearchQuery = '';
  renderDocumentsList();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global exports for HTML event bindings
window.filterDocCategory = filterDocCategory;
window.selectCategory = filterDocCategory;
window.setDocFilter = filterDocCategory;
window.filterDocuments = renderDocumentsList;
window.clearDocSearch = clearDocSearch;
window.onDocSortChange = onDocSortChange;
window.applyQuickSearch = applyQuickSearch;
window.updateCategoryPillCounters = updateCategoryPillCounters;
window.askDeleteDoc = askDeleteDoc;
window.confirmDeleteDoc = confirmDeleteDoc;
window.deleteDoc = deleteDoc;
window.previewDocument = previewDocument;
window.downloadDocument = downloadDocument;
window.aiScanDocument = aiScanDocument;
window.handleSaveDocument = handleSaveDocument;
window.openUploadDocModal = openUploadDocModal;
window.openUploadModal = openUploadDocModal;
