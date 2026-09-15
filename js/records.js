/* =========================================================
   HEALTHMATE — HEALTH RECORDS PAGE LOGIC
   Mock data for the frontend prototype. When Laravel exists:
     - `records` object       -> GET /api/health-records?type=
     - saveEntry()/deleteEntry() -> POST/DELETE /api/health-records
   Render + chart functions can keep reading from the same shape.
========================================================= */

const RECORD_TYPES = {
  weight: { label: 'Weight', unit: 'kg', fields: ['value'] },
  bp: { label: 'Blood Pressure', unit: 'mmHg', fields: ['systolic', 'diastolic'] },
  sugar: { label: 'Blood Sugar', unit: 'mg/dL', fields: ['value', 'context'] },
  temp: { label: 'Temperature', unit: '°F', fields: ['value'] }
};

let records = {
  weight: [
    { id: 1, date: '2026-09-08', value: 71.5, note: '' },
    { id: 2, date: '2026-09-10', value: 71.2, note: '' },
    { id: 3, date: '2026-09-12', value: 70.8, note: '' },
    { id: 4, date: '2026-09-14', value: 70.6, note: 'After morning walk' }
  ],
  bp: [
    { id: 1, date: '2026-09-08', systolic: 132, diastolic: 86, note: '' },
    { id: 2, date: '2026-09-10', systolic: 128, diastolic: 84, note: '' },
    { id: 3, date: '2026-09-12', systolic: 126, diastolic: 82, note: '' },
    { id: 4, date: '2026-09-14', systolic: 124, diastolic: 80, note: 'Feeling well' }
  ],
  sugar: [
    { id: 1, date: '2026-09-09', value: 138, context: 'Fasting', note: '' },
    { id: 2, date: '2026-09-11', value: 145, context: 'After meal', note: '' },
    { id: 3, date: '2026-09-13', value: 130, context: 'Fasting', note: '' }
  ],
  temp: []
};

let nextRecordId = { weight: 5, bp: 5, sugar: 4, temp: 1 };
let currentType = 'weight';
let chartInstance = null;
let pendingDeleteRecord = null;

function switchType(type) {
  currentType = type;
  document.querySelectorAll('.tab-btn').forEach(btn => {
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
          <label for="fSystolic">Systolic</label>
          <input type="text" id="fSystolic" placeholder="e.g. 124">
        </div>
        <div class="field" style="flex:1;min-width:120px;">
          <label for="fDiastolic">Diastolic</label>
          <input type="text" id="fDiastolic" placeholder="e.g. 80">
        </div>
      </div>`;
  } else if (currentType === 'sugar') {
    wrap.innerHTML = `
      <div class="control-row" style="gap:var(--space-3);">
        <div class="field" style="flex:1;min-width:120px;">
          <label for="fValue">Value (mg/dL)</label>
          <input type="text" id="fValue" placeholder="e.g. 130">
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
        <input type="text" id="fValue" placeholder="e.g. ${currentType === 'weight' ? '70.5' : '98.6'}">
      </div>`;
  }
}

function latestEntry() {
  const list = records[currentType];
  return list.length ? list[list.length - 1] : null;
}

function entryPrimaryValue(entry) {
  if (currentType === 'bp') return `${entry.systolic}/${entry.diastolic}`;
  return entry.value;
}

function renderHero() {
  const meta = RECORD_TYPES[currentType];
  const el = document.getElementById('recordHero');
  const list = records[currentType];
  const latest = latestEntry();

  if (!latest) {
    el.innerHTML = `<span style="color:var(--color-text-muted);font-size:0.9rem;">No readings yet</span>`;
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

  el.innerHTML = `
    <span class="value">${entryPrimaryValue(latest)}</span>
    <span class="unit">${meta.unit}</span>
    ${trendHtml}
    <span style="width:100%;font-size:0.78rem;color:var(--color-text-muted);margin-top:2px;">Last recorded ${latest.date}</span>
  `;
}

function renderChart() {
  const ctx = document.getElementById('recordChart').getContext('2d');
  const list = records[currentType];
  const meta = RECORD_TYPES[currentType];

  if (chartInstance) chartInstance.destroy();

  const datasets = currentType === 'bp'
    ? [
        { label: 'Systolic', data: list.map(e => e.systolic), borderColor: '#2F6F5E', backgroundColor: '#2F6F5E', tension: 0.35, pointRadius: 3 },
        { label: 'Diastolic', data: list.map(e => e.diastolic), borderColor: '#E8A33D', backgroundColor: '#E8A33D', tension: 0.35, pointRadius: 3 }
      ]
    : [
        { label: meta.label, data: list.map(e => e.value), borderColor: '#2F6F5E', backgroundColor: 'rgba(47,111,94,0.08)', fill: true, tension: 0.35, pointRadius: 3 }
      ];

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: list.map(e => e.date.slice(5)), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: currentType === 'bp', labels: { boxWidth: 10, font: { family: 'Inter', size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#6B7570' } },
        y: { grid: { color: '#E3E7E4' }, ticks: { font: { family: 'Inter', size: 11 }, color: '#6B7570' } }
      }
    }
  });
}

function renderHistory() {
  const el = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  const list = records[currentType];

  if (list.length === 0) {
    el.innerHTML = '';
    el.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }
  el.style.display = 'block';
  emptyEl.style.display = 'none';

  el.innerHTML = [...list].reverse().map(e => `
    <div class="list-row">
      <div class="list-row-main">
        <div class="name">${entryPrimaryValue(e)} ${RECORD_TYPES[currentType].unit}</div>
        <div class="meta">${e.date}${e.context ? ' · ' + e.context : ''}${e.note ? ' · ' + e.note : ''}</div>
      </div>
      <div class="list-row-side">
        <button class="icon-action danger" title="Remove" onclick="askDeleteRecord(${e.id})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function openAddRecord() {
  document.getElementById('addRecordTitle').textContent = `Add ${RECORD_TYPES[currentType].label.toLowerCase()} reading`;
  document.getElementById('addRecordForm').reset();
  document.getElementById('fDate').value = new Date().toISOString().slice(0, 10);
  openModal('addRecordModal');
}

function askDeleteRecord(id) {
  pendingDeleteRecord = id;
  openModal('deleteRecordModal');
}

function confirmDeleteRecord() {
  records[currentType] = records[currentType].filter(e => e.id !== pendingDeleteRecord);
  pendingDeleteRecord = null;
  closeModal('deleteRecordModal');
  renderHero();
  renderChart();
  renderHistory();
  showToast('Reading removed');
}

document.getElementById('addRecordForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const date = document.getElementById('fDate').value || new Date().toISOString().slice(0, 10);
  const note = document.getElementById('fNote').value.trim();
  let entry = { id: nextRecordId[currentType]++, date, note };

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

  records[currentType].push(entry);
  records[currentType].sort((a, b) => a.date.localeCompare(b.date));

  closeModal('addRecordModal');
  renderHero();
  renderChart();
  renderHistory();
  showToast('Reading added');
});

switchType('weight');
