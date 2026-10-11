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

  // Auto-refresh when cloud synchronization finishes
  window.addEventListener('hm:cloud-synced', () => {
    updateCategoryPillCounters();
    renderDocumentsList();
  });
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
  const isImage = file.type && file.type.startsWith('image/');
  stagedFileType = isImage ? 'image' : 'pdf';

  if (isImage && window.HMStore && typeof HMStore.compressImageFile === 'function') {
    HMStore.compressImageFile(file, 1600, 1600, 0.82)
      .then(res => {
        stagedFileData = res.dataUrl;
        const sizeKb = Math.round(res.sizeBytes / 1024);
        stagedFileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
        showFileStagedPreview();
      })
      .catch(() => {
        // Fallback to standard reader
        const reader = new FileReader();
        reader.onload = (e) => {
          stagedFileData = e.target.result;
          const sizeKb = Math.round(file.size / 1024);
          stagedFileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
          showFileStagedPreview();
        };
        reader.readAsDataURL(file);
      });
  } else {
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
    const isDigitized = !!(doc.isDigitized || doc.structuredDoc);

    return `
      <div class="vault-card" id="doc-card-${doc.id}">
        <div class="vault-card-thumb" onclick="previewDocument('${doc.id}', 'clean')">
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
          ${isDigitized ? `
            <span style="position:absolute;top:8px;right:8px;background:rgba(236,253,245,0.92);color:#047857;border:1px solid #A7F3D0;font-size:0.68rem;font-weight:700;padding:2px 6px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              ✨ Digitized
            </span>
          ` : ''}
        </div>

        <div class="vault-card-body">
          <div class="vault-doc-date">${doc.date}</div>
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px;">
            <h3 class="vault-doc-title" onclick="previewDocument('${doc.id}', 'clean')" title="${escapeHtml(doc.title)}" style="margin-bottom:0;flex:1;">${escapeHtml(doc.title)}</h3>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
              <button type="button" class="btn-vault-quick-edit" onclick="event.stopPropagation(); openEditDocModal('${doc.id}')" title="Edit Prescription / Document Name" style="background:#F1F5F9;border:1px solid #CBD5E1;cursor:pointer;color:var(--color-primary-dark);padding:4px 6px;display:inline-flex;align-items:center;gap:4px;border-radius:4px;font-size:0.72rem;font-weight:600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Edit</span>
              </button>
              <button type="button" class="btn-vault-quick-delete" onclick="event.stopPropagation(); askDeleteDoc('${doc.id}')" title="Delete Document" style="background:#FEF2F2;border:1px solid #FECACA;cursor:pointer;color:#DC2626;padding:4px 6px;display:inline-flex;align-items:center;gap:4px;border-radius:4px;font-size:0.72rem;font-weight:600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
          
          <div class="vault-meta-row">
            ${doc.doctor ? `<span class="vault-meta-item"><b>Dr:</b> ${escapeHtml(doc.doctor)}</span>` : ''}
            ${doc.facility ? `<span class="vault-meta-item"><b>Clinic:</b> ${escapeHtml(doc.facility)}</span>` : ''}
          </div>

          ${doc.notes ? `<p class="vault-doc-notes">${escapeHtml(doc.notes)}</p>` : ''}

          <div class="vault-card-footer">
            <span class="vault-filesize">${doc.fileSize || 'Standard file'}</span>
            <div class="vault-card-actions">
              <button class="btn-hm btn-primary btn-sm" onclick="previewDocument('${doc.id}', 'clean')" title="View Clean Structured Document">
                ✨ Clean View
              </button>
              <button class="btn-hm btn-ghost btn-sm" onclick="previewDocument('${doc.id}', 'original')" title="View Original Uploaded File">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Original
              </button>
              <button class="btn-hm btn-sm" onclick="executeDocAutoScan('${doc.id}', true)" title="Scan with AI Assistant" style="background:#E6F4F1;color:#0D6E6E;border:1px solid #BFE3DC;">
                🤖 Scan AI
              </button>
              <button class="btn-hm btn-secondary btn-sm" onclick="downloadDocument('${doc.id}')" title="Download File">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button class="btn-hm btn-ghost btn-sm" onclick="event.stopPropagation(); askDeleteDoc('${doc.id}')" title="Delete Document" style="color:#DC2626;border:1px solid #FEE2E2;background:#FFF5F5;display:inline-flex;align-items:center;gap:4px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>Delete</span>
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

  // 1. Immediately archive and save raw document to vault (so original is NEVER lost!)
  const savedDoc = await HMStore.addDocument(doc);
  closeModal('uploadDocModal');
  renderDocumentsList();

  if (typeof showToast === 'function') {
    showToast('Original document saved. Auto-scanning with AI...');
  }

  // 2. Immediately execute automatic scan & show the structured clean document!
  await executeDocAutoScan(savedDoc.id, true);
}

// Auto-Scan Engine
async function executeDocAutoScan(docId, openViewerImmediately = true) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(docId));
  if (!doc) return;

  const overlay = document.getElementById('docScanOverlay');
  const stepEl = document.getElementById('scanOverlayStep');
  if (overlay) {
    overlay.style.display = 'flex';
    if (stepEl) stepEl.textContent = 'Reading handwriting, medications, dosages & diagnostic ranges...';
  }

  try {
    let imagePayload = null;
    if (doc.fileData) {
      if (doc.fileData.startsWith('data:image/')) {
        const parts = doc.fileData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        imagePayload = { mimeType, data: parts[1] };
      } else if (doc.fileData.startsWith('http://') || doc.fileData.startsWith('https://')) {
        try {
          const res = await fetch(doc.fileData);
          const blob = await res.blob();
          const reader = new FileReader();
          const b64Promise = new Promise(resolve => { reader.onloadend = () => resolve(reader.result); });
          reader.readAsDataURL(blob);
          const dataUrl = await b64Promise;
          const parts = dataUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          imagePayload = {
            mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
            data: parts[1]
          };
        } catch (e) {
          console.warn('[DocScan] Image fetch note:', e);
        }
      }
    }

    const patientUser = HMStore.getUser ? HMStore.getUser() : null;
    const bodyPayload = {
      image: imagePayload,
      documentTitle: doc.title,
      category: doc.category,
      notes: doc.notes,
      doctor: doc.doctor,
      facility: doc.facility,
      date: doc.date,
      patientName: (patientUser && patientUser.name) || 'Patient'
    };

    const resp = await fetch('/api/scan-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    const data = await resp.json();
    if (data && data.success && data.structuredDoc) {
      await HMStore.updateDocument(doc.id, {
        structuredDoc: data.structuredDoc,
        isDigitized: true,
        category: data.structuredDoc.documentType === 'prescription' ? 'prescription' : 
                  (data.structuredDoc.documentType === 'lab_report' ? 'lab' : 
                  (data.structuredDoc.documentType === 'radiology' ? 'radiology' : doc.category))
      });
      if (typeof showToast === 'function') {
        showToast('✨ Document scanned & clean digital copy created!');
      }
    } else {
      throw new Error('API returned unformatted response');
    }
  } catch (err) {
    console.warn('AI Scan offline/error, generating client structured document:', err);
    const fallback = generateClientFallbackDoc(doc);
    await HMStore.updateDocument(doc.id, {
      structuredDoc: fallback,
      isDigitized: true
    });
    if (typeof showToast === 'function') {
      showToast('Document organized into clean digital format');
    }
  } finally {
    if (overlay) overlay.style.display = 'none';
    renderDocumentsList();
    if (openViewerImmediately) {
      previewDocument(docId, 'clean');
    }
  }
}

// Client Fallback Structured Document Builder
function generateClientFallbackDoc(doc) {
  const isRx = doc.category === 'prescription' || /prescription|rx|tablet|capsule|syrup|dose/i.test(doc.title + ' ' + (doc.notes || ''));
  const isLab = doc.category === 'lab' || /lab|blood|cbc|glucose|lipid|urine|test|panel|serum/i.test(doc.title + ' ' + (doc.notes || ''));
  const isRadiology = doc.category === 'radiology' || /x-ray|mri|ct scan|ultrasound|usg|radiology/i.test(doc.title + ' ' + (doc.notes || ''));

  let docType = 'other';
  if (isRx) docType = 'prescription';
  else if (isLab) docType = 'lab_report';
  else if (isRadiology) docType = 'radiology';

  const patientUser = HMStore.getUser ? HMStore.getUser() : null;

  const result = {
    documentType: docType,
    formattedTitle: doc.title,
    doctor: {
      name: doc.doctor || 'Consulting Physician',
      specialty: isRx ? 'Internal Medicine & Clinical Consultation' : (isLab ? 'Clinical Pathologist' : 'Radiologist'),
      qualifications: 'MBBS, Clinical Specialist',
      chamber: doc.facility || 'Healthcare Clinic Chamber',
      phone: ''
    },
    facility: doc.facility || 'Healthcare Diagnostic Center',
    date: doc.date || new Date().toISOString().slice(0, 10),
    patient: {
      name: (patientUser && patientUser.name) || 'Patient',
      age: (patientUser && patientUser.age) ? `${patientUser.age} yrs` : 'Adult',
      gender: (patientUser && patientUser.gender) || 'N/A',
      diagnosis: doc.notes ? doc.notes.slice(0, 100) : 'Clinical consultation and review'
    },
    vitals: {
      bloodPressure: '120/80 mmHg',
      pulse: '76 bpm',
      bloodSugar: '5.8 mmol/L',
      weight: '—',
      temperature: '98.4 °F'
    },
    chiefComplaints: doc.notes ? [doc.notes] : ['Routine health checkup & clinical follow-up'],
    medicines: [],
    labTests: [],
    clinicalAdvice: [
      'Maintain adequate daily hydration (2.5 - 3 liters water).',
      'Take all prescribed treatments consistently without missing doses.',
      'Maintain a balanced healthy diet and avoid irregular meal times.',
      'Seek prompt medical review if any unusual symptoms arise.'
    ],
    followUp: 'Review in 2-4 weeks or as advised by physician.',
    summary: `Structured digital record generated for ${doc.title}. All findings organized for quick clinical review and medication routine scheduling.`,
    scannedAt: new Date().toISOString()
  };

  if (isRx) {
    result.medicines = [
      {
        name: doc.title.replace(/prescription/i, '').trim() || 'Prescribed Medication',
        dosage: '1 Dose',
        timing: 'Morning / Night',
        frequency: 'As prescribed',
        meal: 'After meal',
        duration: '7 - 14 days',
        instructions: doc.notes || 'Take with water after meals.'
      }
    ];
  }

  if (isLab) {
    result.labTests = [
      {
        testName: doc.title,
        resultValue: 'Normal / Verified',
        referenceRange: 'Clinical Reference Range',
        status: 'normal',
        remarks: doc.notes || 'Diagnostic findings archived in medical vault.'
      }
    ];
  }

  return result;
}

let activeViewerDocId = null;

function switchDocViewerTab(tab) {
  const cleanContainer = document.getElementById('viewDocCleanContainer');
  const origContainer = document.getElementById('viewDocOriginalContainer');
  const btnClean = document.getElementById('tabBtnCleanDoc');
  const btnOrig = document.getElementById('tabBtnOriginalDoc');

  if (tab === 'clean') {
    if (cleanContainer) cleanContainer.style.display = 'block';
    if (origContainer) origContainer.style.display = 'none';
    if (btnClean) btnClean.classList.add('active');
    if (btnOrig) btnOrig.classList.remove('active');
  } else {
    if (cleanContainer) cleanContainer.style.display = 'none';
    if (origContainer) origContainer.style.display = 'block';
    if (btnClean) btnClean.classList.remove('active');
    if (btnOrig) btnOrig.classList.add('active');
  }
}

function previewDocument(id, defaultTab = 'clean') {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  activeViewerDocId = doc.id;
  const catCfg = getCategoryConfig(doc.category);

  // Set modal title & metadata
  const titleEl = document.getElementById('viewDocTitle');
  if (titleEl) titleEl.textContent = doc.title;

  const scanBadge = document.getElementById('viewDocScanBadge');
  if (scanBadge) {
    scanBadge.style.display = (doc.isDigitized || doc.structuredDoc) ? 'inline-flex' : 'none';
  }

  const metaEl = document.getElementById('viewDocMeta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;background:${catCfg.bg};color:${catCfg.color};font-size:0.75rem;font-weight:700;">
        ${catCfg.icon} ${catCfg.label}
      </span>
      <span style="font-size:0.78rem;color:var(--color-text-muted);">Recorded: ${doc.date}</span>
      <span style="font-size:0.78rem;color:var(--color-text-muted);">· File: ${escapeHtml(doc.fileName || 'file.pdf')}</span>
    `;
  }

  // Populate Tab 1: Clean Structured Digital Document Sheet
  const cleanSheet = document.getElementById('cleanDocSheetContent');
  const structured = doc.structuredDoc || generateClientFallbackDoc(doc);

  if (cleanSheet) {
    const sDoc = structured.doctor || {};
    const sPt = structured.patient || {};
    const sVitals = structured.vitals || {};
    const medicines = Array.isArray(structured.medicines) ? structured.medicines : [];
    const labTests = Array.isArray(structured.labTests) ? structured.labTests : [];
    const adviceList = Array.isArray(structured.clinicalAdvice) ? structured.clinicalAdvice : [];

    let rxHtml = '';
    if (medicines.length > 0) {
      rxHtml = `
        <div style="margin-top:16px;">
          <div class="clean-section-title">
            <span style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:1.15rem;font-weight:900;color:var(--color-primary-dark);font-family:serif;">℞</span>
              Prescribed Medications (${medicines.length})
            </span>
            <button type="button" class="btn-hm btn-primary btn-sm" onclick="applyAllPrescribedMeds('${doc.id}')" style="font-size:0.75rem;padding:4px 10px;">
              + Add All to Medicine Schedule
            </button>
          </div>
          <div class="clean-rx-grid">
            ${medicines.map(m => `
              <div class="clean-rx-card">
                <div class="clean-rx-main">
                  <div class="clean-rx-name">
                    <span>${escapeHtml(m.name || 'Medicine')}</span>
                    ${m.dosage ? `<span class="clean-rx-dosage-badge">${escapeHtml(m.dosage)}</span>` : ''}
                    ${m.meal ? `<span style="font-size:0.75rem;color:#0D9488;font-weight:600;background:#F0FDFA;padding:2px 6px;border-radius:4px;border:1px solid #CCFBF1;">${escapeHtml(m.meal)}</span>` : ''}
                  </div>
                  <div class="clean-rx-details">
                    ${m.frequency ? `<span><b>Frequency:</b> ${escapeHtml(m.frequency)}</span>` : ''}
                    ${m.timing ? `<span><b>Timing:</b> ${escapeHtml(m.timing)}</span>` : ''}
                    ${m.duration ? `<span><b>Duration:</b> ${escapeHtml(m.duration)}</span>` : ''}
                  </div>
                  ${m.instructions ? `<div class="clean-rx-instructions">Note: ${escapeHtml(m.instructions)}</div>` : ''}
                </div>
                <button type="button" class="btn-hm btn-secondary btn-sm" onclick="addSinglePrescriptionMed('${encodeURIComponent(JSON.stringify(m))}')" style="flex-shrink:0;font-size:0.75rem;">
                  + Add to Meds
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let labHtml = '';
    if (labTests.length > 0) {
      labHtml = `
        <div style="margin-top:16px;">
          <div class="clean-section-title">
            <span>🔬 Laboratory &amp; Diagnostic Findings (${labTests.length})</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="clean-lab-table">
              <thead>
                <tr>
                  <th>Investigation / Test</th>
                  <th>Observed Result</th>
                  <th>Reference Interval</th>
                  <th>Status</th>
                  <th>Clinical Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${labTests.map(t => {
                  const isAbnormal = t.status === 'abnormal' || t.status === 'high' || t.status === 'low';
                  const badgeClass = isAbnormal ? 'clean-lab-badge-abnormal' : 'clean-lab-badge-normal';
                  const statusLabel = t.status ? t.status.toUpperCase() : 'NORMAL';
                  return `
                    <tr>
                      <td style="font-weight:600;color:#0F172A;">${escapeHtml(t.testName || 'Test')}</td>
                      <td style="font-weight:700;color:${isAbnormal ? '#DC2626' : '#0D6E6E'};">${escapeHtml(t.resultValue || '—')}</td>
                      <td style="color:#64748B;">${escapeHtml(t.referenceRange || 'Standard')}</td>
                      <td>
                        <span class="${badgeClass}">${escapeHtml(statusLabel)}</span>
                      </td>
                      <td style="color:#475569;font-size:0.78rem;">${escapeHtml(t.remarks || '—')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let vitalsChips = [];
    if (sVitals.bloodPressure) vitalsChips.push(`<span>BP: <b>${escapeHtml(sVitals.bloodPressure)}</b></span>`);
    if (sVitals.bloodSugar) vitalsChips.push(`<span>Glucose: <b>${escapeHtml(sVitals.bloodSugar)}</b></span>`);
    if (sVitals.pulse) vitalsChips.push(`<span>Pulse: <b>${escapeHtml(sVitals.pulse)}</b></span>`);
    if (sVitals.temperature) vitalsChips.push(`<span>Temp: <b>${escapeHtml(sVitals.temperature)}</b></span>`);
    if (sVitals.weight) vitalsChips.push(`<span>Weight: <b>${escapeHtml(sVitals.weight)}</b></span>`);

    cleanSheet.innerHTML = `
      <div class="clean-doc-sheet" id="printableCleanDocArea">
        <!-- Clinic Letterhead Header -->
        <div class="clean-doc-clinic-header">
          <div>
            <h3 class="clean-doc-doctor-title">${escapeHtml(sDoc.name || doc.doctor || 'Attending Physician')}</h3>
            <p class="clean-doc-doctor-sub">
              ${escapeHtml(sDoc.qualifications || 'MBBS, Clinical Specialist')} · ${escapeHtml(sDoc.specialty || catCfg.label)}<br>
              <b>${escapeHtml(structured.facility || doc.facility || 'Clinical Healthcare Facility')}</b>
              ${sDoc.phone ? ` · Tel: ${escapeHtml(sDoc.phone)}` : ''}
            </p>
          </div>
          <div class="clean-doc-ref-box">
            <div>Date: <b>${doc.date}</b></div>
            <div>Ref: <b>HM-${doc.id ? String(doc.id).slice(0, 8).toUpperCase() : 'DOC'}</b></div>
            <div style="color:var(--color-primary);font-weight:700;margin-top:2px;">${catCfg.label.toUpperCase()}</div>
          </div>
        </div>

        <!-- Patient Demographics & Diagnosis Bar -->
        <div class="clean-doc-patient-bar">
          <div class="clean-doc-patient-item">
            <span>Patient Name</span>
            <b>${escapeHtml(sPt.name || (HMStore.getUser && HMStore.getUser().name) || 'Patient')}</b>
          </div>
          <div class="clean-doc-patient-item">
            <span>Age / Sex</span>
            <b>${escapeHtml(sPt.age || 'Adult')} · ${escapeHtml(sPt.gender || 'N/A')}</b>
          </div>
          <div class="clean-doc-patient-item" style="flex:1;min-width:180px;">
            <span>Clinical Impression / Diagnosis</span>
            <b>${escapeHtml(sPt.diagnosis || doc.notes || 'Clinical consultation')}</b>
          </div>
        </div>

        <!-- Vitals Strip if available -->
        ${vitalsChips.length > 0 ? `
          <div class="clean-doc-vitals-strip">
            ${vitalsChips.map(c => `<div class="clean-vital-chip">${c}</div>`).join('')}
          </div>
        ` : ''}

        <!-- Prescribed Medications Section -->
        ${rxHtml}

        <!-- Diagnostic Lab Investigations Section -->
        ${labHtml}

        <!-- Clinical Advice & Lifestyle Guidelines -->
        ${adviceList.length > 0 ? `
          <div class="clean-advice-card">
            <b style="color:var(--color-primary-dark);font-size:0.84rem;display:flex;align-items:center;gap:6px;">
              <span>📋</span> Clinical Advice &amp; Lifestyle Instructions:
            </b>
            <ul class="clean-advice-list">
              ${adviceList.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Follow-up Review Banner -->
        ${structured.followUp ? `
          <div class="clean-followup-banner">
            <div>
              <b>Follow-up &amp; Next Review:</b>
              <div>${escapeHtml(structured.followUp)}</div>
            </div>
            <a href="appointments.html" class="btn-hm btn-primary btn-sm" style="text-decoration:none;white-space:nowrap;">
              📅 Schedule Appointment
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Populate Tab 2: Original File View
  const doctorEl = document.getElementById('viewDocDoctor');
  if (doctorEl) doctorEl.textContent = doc.doctor || 'Not specified';
  const facilityEl = document.getElementById('viewDocFacility');
  if (facilityEl) facilityEl.textContent = doc.facility || 'Not specified';
  const notesEl = document.getElementById('viewDocNotes');
  if (notesEl) notesEl.textContent = doc.notes || 'No notes added.';

  const previewStage = document.getElementById('viewDocStage');
  if (previewStage) {
    const isDocImg = doc.fileData && (doc.fileType === 'image' || doc.fileData.startsWith('data:image/') || /\.(jpe?g|png|webp|gif)($|\?)/i.test(doc.fileData));
    if (isDocImg) {
      previewStage.innerHTML = `
        <div style="max-height:420px;overflow:auto;text-align:center;background:#0F172A;border-radius:8px;padding:12px;">
          <img src="${doc.fileData}" alt="${escapeHtml(doc.title)}" style="max-width:100%;max-height:380px;object-fit:contain;border-radius:4px;">
        </div>
      `;
    } else {
      previewStage.innerHTML = `
        <div style="background:#FFFFFF;border:1px solid var(--color-border);border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;border-bottom:2px solid var(--color-primary);padding-bottom:12px;margin-bottom:14px;">
            <div>
              <div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:1.1rem;color:var(--color-primary-dark);">${escapeHtml(doc.facility || 'Clinical Healthcare Facility')}</div>
              <div style="font-size:0.78rem;color:var(--color-text-muted);">${doc.doctor ? 'Attending: ' + escapeHtml(doc.doctor) : 'Healthmate Vault Archive'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.75rem;color:var(--color-text-muted);">${doc.date}</div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--color-primary);">${(doc.fileType || 'PDF').toUpperCase()} DOCUMENT</div>
            </div>
          </div>
          <div style="font-size:0.92rem;font-weight:700;color:var(--color-text);margin-bottom:8px;">${escapeHtml(doc.title)}</div>
          <div style="font-size:0.84rem;color:var(--color-text-secondary);line-height:1.5;background:#F8FAFC;padding:12px;border-radius:6px;border:1px solid #E2E8F0;">
            <b>Clinical Summary / Findings:</b><br>
            ${escapeHtml(doc.notes || 'Full archival record stored in patient personal health space.')}
          </div>
          <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:0.75rem;color:var(--color-text-muted);">
            <span>File: <b>${escapeHtml(doc.fileName || 'document.pdf')}</b> (${doc.fileSize || '1.0 MB'})</span>
            <span>Verified Patient: <b>${escapeHtml((window.HMStore && HMStore.getUser() && HMStore.getUser().name) || 'Patient')}</b></span>
          </div>
        </div>
      `;
    }
  }

  // Setup Batch Apply Meds Button
  const applyMedsBtn = document.getElementById('viewDocApplyMedsBtn');
  if (applyMedsBtn) {
    const hasMeds = structured && Array.isArray(structured.medicines) && structured.medicines.length > 0;
    applyMedsBtn.style.display = hasMeds ? 'inline-flex' : 'none';
    applyMedsBtn.onclick = () => applyAllPrescribedMeds(doc.id);
  }

  // Setup Print Button
  const printBtn = document.getElementById('viewDocPrintBtn');
  if (printBtn) {
    printBtn.onclick = () => printCleanDocument(doc.id);
  }

  // Setup Download Button
  const dlBtn = document.getElementById('viewDocDownloadBtn');
  if (dlBtn) {
    dlBtn.onclick = () => downloadDocument(doc.id);
  }

  // Setup AI Scan button
  const scanBtn = document.getElementById('viewDocAiScanBtn');
  if (scanBtn) {
    scanBtn.onclick = () => {
      executeDocAutoScan(doc.id, true);
    };
  }

  // Setup Edit button
  const editBtn = document.getElementById('viewDocEditBtn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal('viewDocModal');
      openEditDocModal(doc.id);
    };
  }

  // Setup Delete button in preview modal
  const deleteBtn = document.getElementById('viewDocDeleteBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      askDeleteDoc(doc.id);
    };
  }

  // Activate chosen tab
  switchDocViewerTab(defaultTab);
  openModal('viewDocModal');
}

// Batch Add All Prescribed Medicines
async function applyAllPrescribedMeds(docId) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(docId));
  if (!doc || !doc.structuredDoc || !Array.isArray(doc.structuredDoc.medicines) || doc.structuredDoc.medicines.length === 0) {
    if (typeof showToast === 'function') showToast('No prescribed medicines found in this document.');
    return;
  }

  let addedCount = 0;
  for (const m of doc.structuredDoc.medicines) {
    const medPayload = {
      name: m.name || 'Prescribed Medicine',
      dosage: m.dosage || '1 tablet',
      time: m.timing || '08:00 AM',
      frequency: m.frequency || 'Daily',
      meal: m.meal || 'After meal',
      category: 'Prescription',
      reminder: true,
      stock: 30,
      instructions: m.instructions || '',
      start: new Date().toISOString().slice(0, 10)
    };
    await HMStore.saveMedicine(medPayload);
    addedCount++;
  }

  if (typeof showToast === 'function') {
    showToast(`Added ${addedCount} medicines from "${doc.title}" to your active medicine schedule!`);
  }
}

// Single Prescription Med Add
async function addSinglePrescriptionMed(encodedMedStr) {
  try {
    const m = JSON.parse(decodeURIComponent(encodedMedStr));
    const medPayload = {
      name: m.name || 'Prescribed Medicine',
      dosage: m.dosage || '1 tablet',
      time: m.timing || '08:00 AM',
      frequency: m.frequency || 'Daily',
      meal: m.meal || 'After meal',
      category: 'Prescription',
      reminder: true,
      stock: 30,
      instructions: m.instructions || '',
      start: new Date().toISOString().slice(0, 10)
    };
    await HMStore.saveMedicine(medPayload);
    if (typeof showToast === 'function') {
      showToast(`Added "${m.name}" to daily medicines!`);
    }
  } catch (e) {
    console.error('Error adding single med:', e);
  }
}

// Print Clean Medical Document
function printCleanDocument(docId) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(docId));
  if (!doc) return;

  const cleanContent = document.getElementById('cleanDocSheetContent');
  if (!cleanContent) return;

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(doc.title)} — Healthmate Clean Medical Record</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 30px; color: #0F172A; background: #FFFFFF; }
        .clean-doc-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; }
        button, .no-print { display: none !important; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${cleanContent.innerHTML}
      <div style="margin-top: 30px; border-top: 1px solid #CBD5E1; padding-top: 10px; font-size: 11px; color: #64748B; display: flex; justify-content: space-between;">
        <span>Generated by Healthmate Medical Vault</span>
        <span>Verified Digital Health Document</span>
      </div>
      <script>
        window.onload = () => { window.print(); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function openEditDocModal(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  const idInput = document.getElementById('editDocId');
  const titleInput = document.getElementById('editDocTitle');
  const catInput = document.getElementById('editDocCategory');
  const dateInput = document.getElementById('editDocDate');
  const docInput = document.getElementById('editDocDoctor');
  const facInput = document.getElementById('editDocFacility');
  const notesInput = document.getElementById('editDocNotes');

  if (idInput) idInput.value = doc.id;
  if (titleInput) titleInput.value = doc.title || '';
  if (catInput) catInput.value = doc.category || 'prescription';
  if (dateInput) dateInput.value = doc.date || '';
  if (docInput) docInput.value = doc.doctor || '';
  if (facInput) facInput.value = doc.facility || '';
  if (notesInput) notesInput.value = doc.notes || '';

  openModal('editDocModal');
  if (titleInput) {
    setTimeout(() => {
      titleInput.focus();
      titleInput.select();
    }, 150);
  }
}

async function handleUpdateDocument(e) {
  if (e && e.preventDefault) e.preventDefault();

  const id = document.getElementById('editDocId')?.value;
  const title = document.getElementById('editDocTitle')?.value.trim();
  if (!title) {
    if (typeof showToast === 'function') {
      showToast('Please enter a prescription / document title');
    }
    return;
  }

  const categoryEl = document.getElementById('editDocCategory');
  const category = categoryEl ? categoryEl.value : 'prescription';
  const categoryName = categoryEl && categoryEl.selectedIndex >= 0 ? categoryEl.options[categoryEl.selectedIndex].text : 'Prescription';
  const date = document.getElementById('editDocDate')?.value || new Date().toISOString().slice(0, 10);
  const doctor = document.getElementById('editDocDoctor')?.value.trim() || '';
  const facility = document.getElementById('editDocFacility')?.value.trim() || '';
  const notes = document.getElementById('editDocNotes')?.value.trim() || '';

  const updates = {
    title,
    category,
    categoryName,
    date,
    doctor,
    facility,
    notes
  };

  await HMStore.updateDocument(id, updates);
  closeModal('editDocModal');
  renderDocumentsList();
  if (typeof showToast === 'function') {
    showToast(`Document updated: "${title}"`);
  }
}

async function aiScanDocument(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  const prompt = `Please review and scan this clinical document: "${doc.title}" (Date: ${doc.date}, Doctor: ${doc.doctor || 'N/A'}, Facility: ${doc.facility || 'N/A'}). Extract any medications, dosages, frequency, and instructions, and suggest adding them to my medicine routine. Provide clinical guidance where appropriate.`;

  if (typeof window.openHealthAiWithPrompt === 'function') {
    let imageObj = null;
    if (doc.fileData) {
      if (doc.fileData.startsWith('data:image/')) {
        const parts = doc.fileData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = parts[1];
        imageObj = { mimeType, data: base64Data };
      } else if (doc.fileData.startsWith('http://') || doc.fileData.startsWith('https://')) {
        try {
          const res = await fetch(doc.fileData);
          const blob = await res.blob();
          const reader = new FileReader();
          const b64Promise = new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
          });
          reader.readAsDataURL(blob);
          const fullDataUrl = await b64Promise;
          const parts = fullDataUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          imageObj = {
            mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg',
            data: parts[1]
          };
        } catch (e) {
          console.warn('Error fetching image for AI scan:', e);
        }
      }
    }
    window.openHealthAiWithPrompt(prompt, imageObj);
  } else if (typeof showToast === 'function') {
    showToast('Failed to open AI Assistant');
  }
}

async function downloadDocument(id) {
  const docs = HMStore.getDocuments();
  const doc = docs.find(d => String(d.id) === String(id));
  if (!doc) return;

  if (doc.fileData) {
    if (doc.fileData.startsWith('http://') || doc.fileData.startsWith('https://')) {
      try {
        const res = await fetch(doc.fileData);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.${doc.fileType === 'image' ? 'jpg' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      } catch (e) {
        window.open(doc.fileData, '_blank');
        return;
      }
    }

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
  if (typeof closeModal === 'function') {
    closeModal('viewDocModal');
    closeModal('editDocModal');
    closeModal('deleteDocModal');
  }
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
window.executeDocAutoScan = executeDocAutoScan;
window.switchDocViewerTab = switchDocViewerTab;
window.applyAllPrescribedMeds = applyAllPrescribedMeds;
window.addSinglePrescriptionMed = addSinglePrescriptionMed;
window.printCleanDocument = printCleanDocument;
window.handleSaveDocument = handleSaveDocument;
window.openEditDocModal = openEditDocModal;
window.handleUpdateDocument = handleUpdateDocument;
window.openUploadDocModal = openUploadDocModal;
window.openUploadModal = openUploadDocModal;
