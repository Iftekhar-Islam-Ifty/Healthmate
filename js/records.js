/* =========================================================
   HEALTHMATE — HEALTH RECORDS PAGE LOGIC
   Vitals tracking (Weight, BP, Sugar, Temp) isolated
   strictly to the active profile.
========================================================= */

const RECORD_TYPES = {
  weight: { label: 'Weight', unit: 'kg', fields: ['value'] },
  bp: { label: 'Blood Pressure', unit: 'mmHg', fields: ['systolic', 'diastolic'] },
  sugar: { label: 'Blood Sugar', unit: 'mg/dL', fields: ['value', 'context'] },
  temp: { label: 'Temperature', unit: '°F', fields: ['value'] }
};

let records = window.HMStore ? HMStore.getRecords() : {
  weight: [], bp: [], sugar: [], temp: []
};

// Ensure all entries have memberId (default to owner or sample member)
let hasRecordMigration = false;
Object.keys(records).forEach(type => {
  if (Array.isArray(records[type])) {
    records[type].forEach(item => {
      if (!item.memberId || item.memberId !== 'owner') {
        item.memberId = 'owner';
        hasRecordMigration = true;
      }
    });
  }
});
if (hasRecordMigration && window.HMStore) {
  HMStore.saveRecords(records);
}

function persistRecords() {
  if (window.HMStore) HMStore.saveRecords(records);
}

let nextRecordId = {
  weight: (records.weight?.length || 0) + 10,
  bp: (records.bp?.length || 0) + 10,
  sugar: (records.sugar?.length || 0) + 10,
  temp: (records.temp?.length || 0) + 10
};

let currentType = 'weight';
let chartInstance = null;
let pendingDeleteRecord = null;

function getMemberRecords(type) {
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';
  const list = records[type] || [];
  return list.filter(e => (e.memberId || 'owner') === currentProfileId);
}

function initPageHeader() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const titleEl = document.getElementById('recordsPageTitle') || document.querySelector('h1');
  const subEl = document.getElementById('recordsPageSub');

  if (activeProfile && !activeProfile.isOwner) {
    if (titleEl) titleEl.textContent = `${activeProfile.name}'s Health Records`;
    if (subEl) subEl.textContent = `${activeProfile.name}-এর স্বাস্থ্য পরিমাপ, পূর্ববর্তী রেকর্ড এবং ট্রেন্ড অ্যানালাইসিস।`;
  } else {
    if (titleEl) titleEl.textContent = "Health Records";
    if (subEl) subEl.textContent = "সময়ের সাথে সাথে স্বাস্থ্য পরিমাপ ট্র্যাক করুন এবং ট্রেন্ড পর্যবেক্ষণ করুন।";
  }
}

function switchType(type) {
  currentType = type;
  document.querySelectorAll('.tab-row .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  renderRecordFields();
  renderHero();
  renderChart();
  renderHistory();
}

function renderRecordFields() {
  const meta = RECORD_TYPES[currentType];
  const wrap = document.getElementById('dynamicFields');

  if (currentType === 'bp') {
    wrap.innerHTML = `
      <div class="control-row" style="gap:var(--space-3);">
        <div class="field" style="flex:1;min-width:120px;">
          <label for="fSystolic">Systolic (mmHg)</label>
          <input type="number" id="fSystolic" placeholder="e.g. 120" required>
        </div>
        <div class="field" style="flex:1;min-width:120px;">
          <label for="fDiastolic">Diastolic (mmHg)</label>
          <input type="number" id="fDiastolic" placeholder="e.g. 80" required>
        </div>
      </div>`;
  } else if (currentType === 'sugar') {
    wrap.innerHTML = `
      <div class="control-row" style="gap:var(--space-3);">
        <div class="field" style="flex:1;min-width:120px;">
          <label for="fValue">Value (mg/dL)</label>
          <input type="number" step="0.1" id="fValue" placeholder="e.g. 110" required>
        </div>
        <div class="field" style="flex:1;min-width:140px;">
          <label for="fContext">Context</label>
          <select id="fContext">
            <option>Fasting</option>
            <option>After meal</option>
            <option>Random</option>
          </select>
        </div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="field">
        <label for="fValue">Value (${meta.unit})</label>
        <input type="number" step="0.1" id="fValue" placeholder="e.g. ${currentType === 'weight' ? '70.5' : '98.6'}" required>
      </div>`;
  }
}

function entryPrimaryValue(entry) {
  if (currentType === 'bp') return `${entry.systolic}/${entry.diastolic}`;
  return entry.value;
}

function renderHero() {
  const meta = RECORD_TYPES[currentType];
  const el = document.getElementById('recordHero');
  const list = getMemberRecords(currentType);
  const latest = list.length ? list[list.length - 1] : null;

  if (!latest) {
    el.innerHTML = `<span style="color:var(--color-text-muted);font-size:0.9rem;">No ${meta.label.toLowerCase()} readings yet for this profile.</span>`;
    return;
  }

  let trendHtml = '';
  if (list.length >= 2 && currentType !== 'bp') {
    const prev = list[list.length - 2].value;
    const diff = latest.value - prev;
    if (Math.abs(diff) >= 0.05) {
      const cls = diff > 0 ? 'trend-up' : 'trend-down';
      trendHtml = `<span class="trend ${cls}">${diff > 0 ? '+' : ''}${diff.toFixed(1)} since last</span>`;
    } else {
      trendHtml = `<span class="trend trend-flat">No change</span>`;
    }
  }

  const cls = window.HMStore && HMStore.getVitalClassification ? HMStore.getVitalClassification(currentType, latest) : null;
  const badgeHtml = cls ? `
    <span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:12px;background:${cls.bg};color:${cls.color};font-size:0.8rem;font-weight:700;border:1px solid ${cls.border};">
      ${cls.fullStatus || cls.status}
    </span>
  ` : '';

  const tipHtml = cls ? `
    <div style="width:100%;margin-top:8px;padding:8px 12px;border-radius:6px;background:${cls.bg};border-left:3px solid ${cls.color};font-size:0.82rem;color:${cls.color};line-height:1.4;">
      <b>Clinical Guidance:</b> ${cls.tip}
    </div>
  ` : '';

  el.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
      <span class="value">${entryPrimaryValue(latest)}</span>
      <span class="unit">${meta.unit}</span>
      ${badgeHtml}
      ${trendHtml}
    </div>
    ${tipHtml}
    <span style="width:100%;font-size:0.78rem;color:var(--color-text-muted);margin-top:4px;">Last recorded ${latest.date}${latest.context ? ' (' + latest.context + ')' : ''}</span>
  `;
}

function renderChart() {
  const canvas = document.getElementById('recordChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const list = getMemberRecords(currentType);
  const meta = RECORD_TYPES[currentType];

  if (chartInstance) chartInstance.destroy();

  if (list.length === 0) {
    chartInstance = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const datasets = currentType === 'bp'
    ? [
        { label: 'Systolic', data: list.map(e => e.systolic), borderColor: '#2F6F5E', backgroundColor: '#2F6F5E', tension: 0.35, pointRadius: 4 },
        { label: 'Diastolic', data: list.map(e => e.diastolic), borderColor: '#E8A33D', backgroundColor: '#E8A33D', tension: 0.35, pointRadius: 4 }
      ]
    : [
        { label: meta.label, data: list.map(e => e.value), borderColor: '#2F6F5E', backgroundColor: 'rgba(47,111,94,0.08)', fill: true, tension: 0.35, pointRadius: 4 }
      ];

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: list.map(e => e.date.slice(5)), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: currentType === 'bp',
          labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 }, color: '#6B7570' } },
        y: { grid: { color: '#E3E7E4' }, ticks: { font: { family: 'Plus Jakarta Sans, sans-serif', size: 11 }, color: '#6B7570' } }
      }
    }
  });
}

function renderHistory() {
  const el = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  const list = getMemberRecords(currentType);

  if (list.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';

  el.innerHTML = [...list].reverse().map(e => {
    const cls = window.HMStore && HMStore.getVitalClassification ? HMStore.getVitalClassification(currentType, e) : null;
    const badge = cls ? `
      <span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${cls.bg};color:${cls.color};font-size:0.72rem;font-weight:600;margin-left:6px;border:1px solid ${cls.border};">
        ${cls.status}
      </span>
    ` : '';

    return `
      <div class="list-row">
        <div class="list-row-main">
          <div class="name" style="display:flex;align-items:center;flex-wrap:wrap;">
            <span>${entryPrimaryValue(e)} ${RECORD_TYPES[currentType].unit}</span>
            ${badge}
          </div>
          <div class="meta">${e.date}${e.context ? ' · ' + e.context : ''}${e.note ? ' · ' + e.note : ''}</div>
        </div>
        <div class="list-row-side">
          <button class="icon-action danger" title="Remove" onclick="askDeleteRecord('${e.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function updateLiveClassification() {
  const preview = document.getElementById('recordLivePreview');
  if (!preview || !window.HMStore || !HMStore.getVitalClassification) return;

  let entry = null;
  if (currentType === 'bp') {
    const sys = Number(document.getElementById('fSystolic')?.value);
    const dia = Number(document.getElementById('fDiastolic')?.value);
    if (sys && dia) entry = { systolic: sys, diastolic: dia };
  } else if (currentType === 'sugar') {
    const val = Number(document.getElementById('fValue')?.value);
    const ctx = document.getElementById('fContext')?.value || 'Fasting';
    if (val) entry = { value: val, context: ctx };
  } else {
    const val = Number(document.getElementById('fValue')?.value);
    if (val) entry = { value: val };
  }

  if (!entry) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    return;
  }

  const cls = HMStore.getVitalClassification(currentType, entry);
  if (cls) {
    preview.style.display = 'block';
    preview.style.background = cls.bg;
    preview.style.color = cls.color;
    preview.style.border = `1px solid ${cls.border}`;
    preview.innerHTML = `<b>${cls.fullStatus || cls.status}</b>: ${cls.tip}`;
  } else {
    preview.style.display = 'none';
  }
}

function openAddRecord() {
  const activeProfile = window.HMStore ? HMStore.getActiveProfile() : null;
  const who = activeProfile && !activeProfile.isOwner ? ` (${activeProfile.name})` : '';
  document.getElementById('addRecordTitle').textContent = `Add ${RECORD_TYPES[currentType].label.toLowerCase()} reading${who}`;
  document.getElementById('addRecordForm').reset();
  document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);

  const preview = document.getElementById('recordLivePreview');
  if (preview) {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }

  // Attach live preview input listeners
  setTimeout(() => {
    ['fSystolic', 'fDiastolic', 'fValue', 'fContext'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener('input', updateLiveClassification);
        el.removeEventListener('change', updateLiveClassification);
        el.addEventListener('input', updateLiveClassification);
        el.addEventListener('change', updateLiveClassification);
      }
    });
  }, 50);

  openModal('addRecordModal');
}

function askDeleteRecord(id) {
  pendingDeleteRecord = id;
  openModal('deleteRecordModal');
}

async function confirmDeleteRecord() {
  if (pendingDeleteRecord) {
    const idToDelete = pendingDeleteRecord;
    pendingDeleteRecord = null;
    await HMStore.deleteHealthRecord(currentType, idToDelete);
    records = HMStore.getRecords();
  }
  closeModal('deleteRecordModal');
  renderHero();
  renderChart();
  renderHistory();
  showToast('Reading removed');
}

document.getElementById('addRecordForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const date = document.getElementById('fDate').value || new Date().toISOString().slice(0, 10);
  const note = document.getElementById('fNote').value.trim();
  const currentProfileId = window.HMStore ? HMStore.getActiveProfileId() : 'owner';

  let entry = { memberId: currentProfileId, date, note };

  if (currentType === 'bp') {
    const systolic = Number(document.getElementById('fSystolic').value);
    const diastolic = Number(document.getElementById('fDiastolic').value);
    if (!systolic || !diastolic) return;
    entry.systolic = systolic;
    entry.diastolic = diastolic;
  } else if (currentType === 'sugar') {
    const value = Number(document.getElementById('fValue').value);
    if (!value) return;
    entry.value = value;
    entry.context = document.getElementById('fContext').value;
  } else {
    const value = Number(document.getElementById('fValue').value);
    if (!value) return;
    entry.value = value;
  }

  await HMStore.saveHealthRecord(currentType, entry);
  records = HMStore.getRecords();

  closeModal('addRecordModal');
  renderHero();
  renderChart();
  renderHistory();
  showToast('Reading saved to cloud');
});

// Initialization
initPageHeader();
switchType('weight');

if (window.HMStore && typeof HMStore.fetchRecordsAndDocuments === 'function') {
  HMStore.fetchRecordsAndDocuments().then(() => {
    records = HMStore.getRecords();
    renderHero();
    renderChart();
    renderHistory();
  });
}
