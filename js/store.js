/* =========================================================
   HEALTHMATE — LOCAL STORAGE & STATE SYNC LAYER
   Personal health management state layer for single-user
   experience. Pre-configured to cleanly map to future
   Laravel REST API endpoints and Supabase PostgreSQL persistence.
========================================================= */

function hmToUUID(id) {
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const HM_DEFAULT_USER = {
  name: 'Ifty',
  email: 'ifty@example.com',
  accountType: 'single', // Fixed to 'single' personal health space
  role: 'Personal',
  initials: 'IA',
  age: 24,
  blood: 'B+',
  emergency: '+8801700000000',
  conditions: ['Mild seasonal allergy'],
  allergies: ['Dust']
};

const HM_DEFAULT_MEMBERS = [
  {
    id: 'owner',
    name: 'Ifty',
    initials: 'IA',
    role: 'Personal',
    age: 24,
    blood: 'B+',
    emergency: '+8801700000000',
    conditions: ['Mild seasonal allergy'],
    allergies: ['Dust'],
    notes: 'Personal health profile.',
    medStats: { done: 2, total: 2 },
    routinePct: 80
  }
];

const HM_DEFAULT_PERMISSIONS = {};

const HM_DEFAULT_MEDICINES = [
  {
    id: 1,
    memberId: 'owner',
    name: 'Vitamin D3 (2000 IU)',
    dosage: '1 capsule',
    time: '8:30 AM',
    frequency: 'Once daily',
    meal: 'After breakfast',
    start: '1 Sep 2026',
    end: '',
    instructions: 'Take with warm water after breakfast',
    reminder: true,
    status: 'taken',
    stock: 24,
    refillThreshold: 5,
    unit: 'capsules'
  },
  {
    id: 2,
    memberId: 'owner',
    name: 'Omega-3 Fish Oil',
    dosage: '1 softgel',
    time: '9:00 PM',
    frequency: 'Once daily',
    meal: 'After dinner',
    start: '1 Sep 2026',
    end: '',
    instructions: 'Take after dinner for cardiovascular health',
    reminder: true,
    status: 'upcoming',
    stock: 18,
    refillThreshold: 6,
    unit: 'softgels'
  },
  {
    id: 3,
    memberId: 'owner',
    name: 'Calcium & Magnesium',
    dosage: '1 tablet',
    time: '1:30 PM',
    frequency: 'Once daily',
    meal: 'After lunch',
    start: '5 Sep 2026',
    end: '',
    instructions: 'Bone and muscle health maintenance',
    reminder: true,
    status: 'taken',
    stock: 4, // triggers low stock refill alert
    refillThreshold: 5,
    unit: 'tablets'
  }
];

const HM_DEFAULT_ROUTINES = [
  {
    id: 1,
    memberId: 'owner',
    name: 'Drink 8 glasses of water',
    category: 'Water',
    frequency: 'Daily',
    target: '8 glasses (2.5L)',
    reminder: true,
    week: [true, true, true, true, true, false, false]
  },
  {
    id: 2,
    memberId: 'owner',
    name: 'Brisk morning walk',
    category: 'Walking',
    frequency: 'Daily',
    target: '30 minutes',
    reminder: true,
    week: [true, true, false, true, true, false, false]
  },
  {
    id: 3,
    memberId: 'owner',
    name: 'Sleep by 11:00 PM',
    category: 'Sleep',
    frequency: 'Daily',
    target: '7-8 hours',
    reminder: false,
    week: [true, false, true, true, false, false, false]
  },
  {
    id: 4,
    memberId: 'owner',
    name: 'Daily posture & stretching',
    category: 'Exercise',
    frequency: 'Daily',
    target: '15 minutes',
    reminder: true,
    week: [true, true, true, true, true, false, false]
  }
];

const HM_DEFAULT_RECORDS = {
  weight: [
    { id: 1, memberId: 'owner', date: '2026-09-08', value: 71.5, note: 'Morning weigh-in' },
    { id: 2, memberId: 'owner', date: '2026-09-10', value: 71.2, note: '' },
    { id: 3, memberId: 'owner', date: '2026-09-12', value: 70.8, note: '' },
    { id: 4, memberId: 'owner', date: '2026-09-14', value: 70.5, note: 'After morning walk' }
  ],
  bp: [
    { id: 1, memberId: 'owner', date: '2026-09-08', systolic: 120, diastolic: 80, note: 'Resting reading' },
    { id: 2, memberId: 'owner', date: '2026-09-11', systolic: 119, diastolic: 79, note: 'Before breakfast' },
    { id: 3, memberId: 'owner', date: '2026-09-14', systolic: 118, diastolic: 78, note: 'Optimal normal range' }
  ],
  sugar: [
    { id: 1, memberId: 'owner', date: '2026-09-06', value: 92, context: 'Fasting', note: 'Routine annual check' },
    { id: 2, memberId: 'owner', date: '2026-09-12', value: 115, context: 'After meal', note: '2 hrs after lunch' }
  ],
  temp: [
    { id: 1, memberId: 'owner', date: '2026-09-14', value: 98.4, note: 'Normal body temperature' }
  ]
};

const HM_DEFAULT_DOCUMENTS = [
  {
    id: 1,
    memberId: 'owner',
    title: 'Fasting Lipid Profile & Blood Count',
    category: 'lab',
    categoryName: 'Lab Test',
    date: '2026-08-20',
    doctor: 'Dr. A. Chowdhury (Cardiologist)',
    facility: 'Popular Diagnostic Centre, Dhaka',
    fileType: 'pdf',
    fileName: 'Lipid_CBC_Report_Aug2026.pdf',
    fileSize: '1.2 MB',
    fileData: '',
    notes: 'Total Cholesterol 185 mg/dL (Normal < 200). HDL 48 mg/dL. Fasting blood glucose normal.',
    tags: ['Cholesterol', 'CBC', 'Lipid']
  },
  {
    id: 2,
    memberId: 'owner',
    title: 'Prescription — Telmisartan & Multivitamin',
    category: 'prescription',
    categoryName: 'Prescription',
    date: '2026-08-15',
    doctor: 'Dr. M. Rahman (Internal Medicine)',
    facility: 'Square Hospital, Dhaka',
    fileType: 'image',
    fileName: 'Prescription_Aug15.jpg',
    fileSize: '840 KB',
    fileData: '',
    notes: 'Telmisartan 20mg once daily after breakfast. Vitamin D3 2000IU daily for 3 months.',
    tags: ['BP', 'Prescription', 'Vitamin D3']
  },
  {
    id: 3,
    memberId: 'owner',
    title: 'Chest X-Ray (PA View)',
    category: 'radiology',
    categoryName: 'Radiology / Imaging',
    date: '2026-06-10',
    doctor: 'Dr. K. Zaman (Consultant Radiologist)',
    facility: 'Evercare Hospital, Dhaka',
    fileType: 'pdf',
    fileName: 'Chest_XRay_PA_Jun2026.pdf',
    fileSize: '2.4 MB',
    fileData: '',
    notes: 'Bilateral lung fields clear. Bronchovascular markings normal. Heart size within normal limits. No active lung pathology.',
    tags: ['Chest', 'X-Ray', 'Lungs']
  },
  {
    id: 4,
    memberId: 'owner',
    title: 'Dental Checkup & Cleaning Summary',
    category: 'other',
    categoryName: 'Checkup / Other',
    date: '2026-05-18',
    doctor: 'Dr. Farhana Yasmin (Dental Surgeon)',
    facility: 'Smile Care Dental Clinic',
    fileType: 'pdf',
    fileName: 'Dental_Prophylaxis_May2026.pdf',
    fileSize: '450 KB',
    fileData: '',
    notes: 'Scaling and prophylaxis completed. Enamel condition healthy. Next routine review in 6 months.',
    tags: ['Dental', 'Routine']
  }
];

const HM_DEFAULT_APPOINTMENTS = [
  {
    id: 1,
    memberId: 'owner',
    doctorName: 'Dr. A. Chowdhury',
    specialty: 'Cardiologist & Vascular Specialist',
    hospital: 'Popular Diagnostic Centre, Dhanmondi, Dhaka',
    phone: '+880 1711-889900',
    date: '2026-09-22',
    time: '06:30 PM',
    status: 'upcoming',
    reason: 'Routine 3-month cardiovascular evaluation & BP medication review',
    preVisitChecklist: [
      { id: 'chk-1', text: 'Log recent 7-day morning & evening BP readings', done: true },
      { id: 'chk-2', text: 'Bring latest Fasting Lipid Profile & Blood Count report from Vault', done: true },
      { id: 'chk-3', text: 'Ask doctor about mild ankle puffiness & dosage review for Telmisartan', done: false }
    ],
    notes: 'Doctor recommended fasting lipid profile check before this follow-up.',
    followUpDate: ''
  },
  {
    id: 2,
    memberId: 'owner',
    doctorName: 'Dr. Farhana Yasmin',
    specialty: 'Dental Surgeon & Specialist',
    hospital: 'Smile Care Dental Clinic, Banani, Dhaka',
    phone: '+880 1819-445566',
    date: '2026-10-05',
    time: '11:00 AM',
    status: 'upcoming',
    reason: 'Semi-annual dental hygiene checkup & enamel inspection',
    preVisitChecklist: [
      { id: 'chk-d1', text: 'Note down any cold drink sensitivity areas', done: false },
      { id: 'chk-d2', text: 'Verify previous prophylaxis cleaning date (May 2026)', done: true }
    ],
    notes: 'Routine 6-month checkup following May 2026 cleaning.',
    followUpDate: ''
  },
  {
    id: 3,
    memberId: 'owner',
    doctorName: 'Dr. M. Rahman',
    specialty: 'Consultant, Internal Medicine',
    hospital: 'Square Hospital, Panthapath, Dhaka',
    phone: '+880 1912-334455',
    date: '2026-08-15',
    time: '04:00 PM',
    status: 'completed',
    reason: 'Seasonal allergy assessment & comprehensive wellness review',
    preVisitChecklist: [
      { id: 'chk-p1', text: 'Prepare symptom timeline log', done: true },
      { id: 'chk-p2', text: 'Carry previous prescription list', done: true }
    ],
    notes: 'Prescribed Telmisartan 20mg and Vitamin D3 2000IU daily. Advised 3-month follow-up.',
    followUpDate: '2026-09-22'
  }
];

const HM_DEFAULT_PREFERENCES = {
  medicineReminders: true,
  routineReminders: true,
  healthAlerts: true,
  dailySummaryTime: '08:00 AM'
};

const HMStore = {
  _get(key, fallback) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem('hm_' + key);
        return val ? JSON.parse(val) : fallback;
      }
      return fallback;
    } catch (e) {
      console.warn('LocalStorage read error', e);
      return fallback;
    }
  },

  _set(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('hm_' + key, JSON.stringify(val));
      }
    } catch (e) {
      console.warn('LocalStorage write error', e);
    }
  },

  getUser() {
    return this._get('user', HM_DEFAULT_USER);
  },

  getProfile() {
    return this.getUser();
  },

  getAccountType() {
    return 'single';
  },

  setAccountType(type) {
    const user = this.getUser();
    user.accountType = 'single';
    this.saveUser(user);
    return user;
  },

  isAuthenticated() {
    return this._get('auth', false);
  },

  async checkSession() {
    if (window.hmSupabase) {
      try {
        const { data, error } = await window.hmSupabase.auth.getSession();
        if (data && data.session && data.session.user) {
          this._set('auth', true);
          const meta = data.session.user.user_metadata || {};
          const current = this.getUser();
          const cleanName = meta.full_name || meta.name || current.name || 'Personal User';
          const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
          const updatedUser = {
            ...current,
            id: data.session.user.id,
            email: data.session.user.email,
            name: cleanName,
            initials: initials
          };
          this._set('user', updatedUser);
          // Hydrate profile and preferences asynchronously from PostgreSQL
          this.fetchProfileAndSettings().catch(err => console.warn('Profile fetch on session check:', err));
          return data.session;
        } else {
          this._set('auth', false);
          return null;
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      }
    }
    return this.isAuthenticated() ? { user: this.getUser() } : null;
  },

  async fetchProfileAndSettings() {
    if (!window.hmSupabase) return null;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return null;

      // 1. Fetch Profile
      const { data: profile, error: profErr } = await window.hmSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const cleanName = profile.full_name || user.email.split('@')[0];
        const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
        const updatedUser = {
          ...this.getUser(),
          id: profile.id,
          name: cleanName,
          email: profile.email || user.email,
          age: profile.age || 29,
          blood: profile.blood_group || 'B+',
          emergency: profile.emergency_contact || '+8801700000000',
          allergies: Array.isArray(profile.allergies) ? profile.allergies : ['Dust'],
          conditions: Array.isArray(profile.chronic_conditions) ? profile.chronic_conditions : [],
          initials
        };
        this._set('user', updatedUser);
      }

      // 2. Fetch User Settings
      const { data: settings, error: setErr } = await window.hmSupabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        const updatedPrefs = {
          ...this.getPreferences(),
          medicineReminders: settings.medicine_reminders !== false,
          routineReminders: settings.routine_reminders !== false,
          healthAlerts: settings.health_alerts !== false,
          dailySummaryTime: settings.daily_summary_time || '08:00',
          activeModules: settings.active_modules || ['medicines', 'routines', 'vitals', 'appointments', 'vault']
        };
        this._set('preferences', updatedPrefs);
      }

      // Automatically sync medicines, routines, vitals, documents and appointments in the background
      this.fetchMedicinesAndRoutines().catch(err => console.warn('Sync medicines & routines error:', err));
      this.fetchRecordsAndDocuments().catch(err => console.warn('Sync records & documents error:', err));
      this.fetchAppointments().catch(err => console.warn('Sync appointments error:', err));

      return { profile, settings };
    } catch (err) {
      console.warn('[Healthmate] Error syncing profile and settings from Supabase:', err);
      return null;
    }
  },

  async fetchMedicinesAndRoutines() {
    if (!window.hmSupabase) return null;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return null;

      const todayStr = new Date().toISOString().slice(0, 10);

      // 1. Fetch Medicines from cloud
      const { data: cloudMeds, error: medErr } = await window.hmSupabase
        .from('medicines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cloudMeds && cloudMeds.length > 0) {
        // Fetch today's medicine logs
        const { data: logs } = await window.hmSupabase
          .from('medicine_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', todayStr);

        const loggedTakenIds = new Set((logs || []).filter(l => l.status === 'taken').map(l => l.medicine_id));

        const mappedMeds = cloudMeds.map(m => ({
          id: m.id,
          memberId: 'owner',
          name: m.name,
          dosage: m.dosage || '1 tablet',
          time: m.time || '08:00 AM',
          frequency: m.period || 'Once daily',
          meal: m.condition || 'After meal',
          status: loggedTakenIds.has(m.id) ? 'taken' : (m.status || 'pending'),
          stock: typeof m.stock === 'number' ? m.stock : 20,
          refillThreshold: typeof m.refill_alert === 'number' ? m.refill_alert : 5,
          unit: m.unit || 'tablets',
          reminder: m.is_active !== false
        }));
        this._set('medicines', mappedMeds);
      } else {
        // Auto seed initial default medicines to cloud for this user
        const defaultMeds = this.getMedicines();
        const payloads = defaultMeds.map(m => {
          const validId = hmToUUID(m.id);
          return {
            id: validId,
            user_id: user.id,
            name: m.name,
            dosage: m.dosage || '1 tablet',
            time: m.time || '08:00 AM',
            period: m.frequency || 'Once daily',
            condition: m.meal || 'After meal',
            stock: typeof m.stock === 'number' ? m.stock : 20,
            refill_alert: typeof m.refillThreshold === 'number' ? m.refillThreshold : 5,
            unit: m.unit || 'tablets',
            is_active: m.reminder !== false,
            status: m.status || 'pending'
          };
        });
        const { error: seedErr } = await window.hmSupabase.from('medicines').upsert(payloads);
        if (!seedErr) {
          this._set('medicines', payloads.map(p => ({
            id: p.id,
            name: p.name,
            dosage: p.dosage,
            time: p.time,
            frequency: p.period,
            meal: p.condition,
            stock: p.stock,
            refillThreshold: p.refill_alert,
            unit: p.unit,
            reminder: p.is_active,
            status: p.status,
            memberId: 'owner'
          })));
        }
      }

      // 2. Fetch Routines from cloud
      const { data: cloudRoutines, error: rtErr } = await window.hmSupabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (cloudRoutines && cloudRoutines.length > 0) {
        // Calculate 7-day Monday-to-Sunday window
        const now = new Date();
        const currentDay = (now.getDay() + 6) % 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDay);
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          weekDates.push(d.toISOString().slice(0, 10));
        }

        const { data: rtLogs } = await window.hmSupabase
          .from('routine_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', weekDates[0])
          .lte('log_date', weekDates[6]);

        const logMap = {};
        (rtLogs || []).forEach(l => {
          if (!logMap[l.routine_id]) logMap[l.routine_id] = {};
          logMap[l.routine_id][l.log_date] = !!l.completed;
        });

        const mappedRoutines = cloudRoutines.map(r => {
          const week = weekDates.map(dStr => !!(logMap[r.id] && logMap[r.id][dStr]));
          return {
            id: r.id,
            memberId: 'owner',
            name: r.name,
            category: r.category || 'Health',
            target: r.target || '',
            frequency: r.frequency || 'Daily',
            reminder: r.reminder !== false,
            week
          };
        });
        this._set('routines', mappedRoutines);
      } else {
        // Auto seed initial default routines to cloud for this user
        const defaultRoutines = this.getRoutines();
        const payloads = defaultRoutines.map(r => {
          const validId = hmToUUID(r.id);
          return {
            id: validId,
            user_id: user.id,
            name: r.name,
            category: r.category || 'Health',
            target: r.target || '',
            frequency: r.frequency || 'Daily',
            reminder: r.reminder !== false
          };
        });
        const { error: seedRtErr } = await window.hmSupabase.from('routines').upsert(payloads);
        if (!seedRtErr) {
          this._set('routines', payloads.map((p, idx) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            target: p.target,
            frequency: p.frequency,
            reminder: p.reminder,
            memberId: 'owner',
            week: defaultRoutines[idx] ? defaultRoutines[idx].week : [false, false, false, false, false, false, false]
          })));
        }
      }

      return true;
    } catch (err) {
      console.warn('[Healthmate] Error in fetchMedicinesAndRoutines:', err);
      return null;
    }
  },

  async fetchRecordsAndDocuments() {
    if (!window.hmSupabase) return null;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return null;

      // 1. Fetch Health Records (Vitals)
      const { data: cloudRecords, error: recErr } = await window.hmSupabase
        .from('health_records')
        .select('*')
        .eq('user_id', user.id)
        .order('record_date', { ascending: true });

      if (cloudRecords && cloudRecords.length > 0) {
        const grouped = { weight: [], bp: [], sugar: [], temp: [] };
        cloudRecords.forEach(r => {
          if (!grouped[r.type]) grouped[r.type] = [];
          if (r.type === 'bp') {
            grouped.bp.push({
              id: r.id,
              memberId: 'owner',
              date: r.record_date,
              systolic: r.systolic,
              diastolic: r.diastolic,
              note: r.note || ''
            });
          } else if (r.type === 'sugar') {
            grouped.sugar.push({
              id: r.id,
              memberId: 'owner',
              date: r.record_date,
              value: Number(r.value),
              context: r.context || 'Fasting',
              note: r.note || ''
            });
          } else {
            grouped[r.type].push({
              id: r.id,
              memberId: 'owner',
              date: r.record_date,
              value: Number(r.value),
              note: r.note || ''
            });
          }
        });
        this._set('records', grouped);
      } else {
        // Auto seed default records to Supabase for this user
        const defaultRecords = this.getRecords();
        const payloads = [];
        ['weight', 'bp', 'sugar', 'temp'].forEach(type => {
          const list = defaultRecords[type] || [];
          list.forEach(item => {
            const id = hmToUUID(item.id);
            item.id = id;
            payloads.push({
              id,
              user_id: user.id,
              type,
              record_date: item.date || new Date().toISOString().slice(0, 10),
              value: item.value !== undefined ? Number(item.value) : null,
              systolic: item.systolic !== undefined ? Number(item.systolic) : null,
              diastolic: item.diastolic !== undefined ? Number(item.diastolic) : null,
              context: item.context || null,
              note: item.note || ''
            });
          });
        });
        if (payloads.length > 0) {
          const { error: seedRecErr } = await window.hmSupabase.from('health_records').upsert(payloads);
          if (!seedRecErr) {
            this._set('records', defaultRecords);
          }
        }
      }

      // 2. Fetch Documents (Medical Vault)
      const { data: cloudDocs, error: docErr } = await window.hmSupabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('record_date', { ascending: false });

      if (cloudDocs && cloudDocs.length > 0) {
        const mappedDocs = cloudDocs.map(d => ({
          id: d.id,
          memberId: 'owner',
          title: d.title,
          category: d.category || 'other',
          categoryName: d.category_name || 'Other',
          date: d.record_date || new Date().toISOString().slice(0, 10),
          doctor: d.doctor || '',
          facility: d.facility || '',
          fileType: d.file_type || 'pdf',
          fileName: d.file_name || 'document.pdf',
          fileSize: d.file_size || '1.0 MB',
          fileData: d.file_data || '',
          notes: d.notes || '',
          tags: Array.isArray(d.tags) ? d.tags : []
        }));
        this._set('documents', mappedDocs);
      } else {
        // Auto seed default documents to Supabase for this user
        const defaultDocs = this.getDocuments();
        const payloads = defaultDocs.map(d => {
          const id = hmToUUID(d.id);
          d.id = id;
          return {
            id,
            user_id: user.id,
            title: d.title,
            category: d.category || 'other',
            category_name: d.categoryName || 'Other',
            record_date: d.date || new Date().toISOString().slice(0, 10),
            doctor: d.doctor || '',
            facility: d.facility || '',
            file_type: d.fileType || 'pdf',
            file_name: d.fileName || 'document.pdf',
            file_size: d.fileSize || '1.0 MB',
            file_data: d.fileData || '',
            notes: d.notes || '',
            tags: Array.isArray(d.tags) ? d.tags : []
          };
        });
        if (payloads.length > 0) {
          const { error: seedDocErr } = await window.hmSupabase.from('documents').upsert(payloads);
          if (!seedDocErr) {
            this._set('documents', defaultDocs);
          }
        }
      }

      return true;
    } catch (err) {
      console.warn('[Healthmate] Error in fetchRecordsAndDocuments:', err);
      return null;
    }
  },

  async fetchAppointments() {
    if (!window.hmSupabase) return null;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return null;

      const { data: cloudAppts, error: apptErr } = await window.hmSupabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appt_date', { ascending: true });

      if (cloudAppts && cloudAppts.length > 0) {
        const mappedAppts = cloudAppts.map(a => ({
          id: a.id,
          memberId: 'owner',
          doctorName: a.doctor_name,
          specialty: a.specialty || 'General Physician',
          hospital: a.hospital || '',
          phone: a.phone || '',
          date: a.appt_date,
          time: a.appt_time || '10:00 AM',
          status: a.status || 'upcoming',
          reason: a.reason || 'Routine Consultation',
          preVisitChecklist: Array.isArray(a.pre_visit_checklist) ? a.pre_visit_checklist : [],
          notes: a.notes || '',
          followUpDate: a.follow_up_date || ''
        }));
        this._set('appointments', mappedAppts);
      } else {
        // Auto-seed default appointments to Supabase for this user
        const defaultAppts = this.getAppointments();
        const payloads = defaultAppts.map(a => {
          const id = hmToUUID(a.id);
          a.id = id;
          return {
            id,
            user_id: user.id,
            doctor_name: a.doctorName,
            specialty: a.specialty || 'General Physician',
            hospital: a.hospital || '',
            phone: a.phone || '',
            appt_date: a.date || new Date().toISOString().slice(0, 10),
            appt_time: a.time || '10:00 AM',
            status: a.status || 'upcoming',
            reason: a.reason || 'Consultation',
            pre_visit_checklist: Array.isArray(a.preVisitChecklist) ? a.preVisitChecklist : [],
            notes: a.notes || '',
            follow_up_date: a.followUpDate || null
          };
        });
        if (payloads.length > 0) {
          const { error: seedErr } = await window.hmSupabase.from('appointments').upsert(payloads);
          if (!seedErr) {
            this._set('appointments', defaultAppts);
          }
        }
      }

      return true;
    } catch (err) {
      console.warn('[Healthmate] Error in fetchAppointments:', err);
      return null;
    }
  },

  async login(email, password) {
    const cleanEmail = email.trim();
    if (window.hmSupabase) {
      let authResult = null;
      try {
        authResult = await window.hmSupabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });
      } catch (authCatch) {
        console.warn('Supabase signIn caught error:', authCatch);
      }

      // Check if remote Supabase login succeeded
      if (authResult && !authResult.error && authResult.data && authResult.data.user) {
        const meta = authResult.data.user.user_metadata || {};
        const cleanName = meta.full_name || meta.name || cleanEmail.split('@')[0];
        const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
        const user = {
          id: authResult.data.user.id,
          name: cleanName,
          email: authResult.data.user.email,
          accountType: 'single',
          role: 'Personal',
          initials,
          age: meta.age || 29,
          blood: meta.blood || 'B+',
          emergency: meta.emergency || '+8801700000000',
          conditions: meta.conditions || [],
          allergies: meta.allergies || ['Dust']
        };
        this._set('user', user);
        this._set('auth', true);
        await this.fetchProfileAndSettings();
        return authResult.data;
      }

      // Check registered accounts store (for accounts created when Supabase auth triggers encounter DB issues)
      const registeredAccounts = this._get('registered_accounts') || [];
      const matched = registeredAccounts.find(a => a.email && a.email.toLowerCase() === cleanEmail.toLowerCase());
      if (matched) {
        if (password && matched.password && matched.password !== password) {
          throw new Error('Invalid login credentials');
        }
        const user = matched.user || this.getUser();
        this._set('user', user);
        this._set('auth', true);
        return { user };
      }

      // Demo account seamless fallback
      if (cleanEmail.toLowerCase() === 'ifty@example.com') {
        const demoUser = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Ifty Ahmed',
          email: cleanEmail,
          accountType: 'single',
          role: 'Personal',
          initials: 'IA',
          age: 29,
          blood: 'B+',
          emergency: '+8801700000000',
          conditions: ['Hypertension (Stage 1)', 'Asthma'],
          allergies: ['Dust', 'Penicillin']
        };
        this._set('user', demoUser);
        this._set('auth', true);
        return { user: demoUser };
      }

      if (authResult && authResult.error) {
        throw authResult.error;
      }
    }

    // Fallback if supabase client is not available
    const registeredAccounts = this._get('registered_accounts') || [];
    const matched = registeredAccounts.find(a => a.email && a.email.toLowerCase() === cleanEmail.toLowerCase());
    if (matched) {
      if (password && matched.password && matched.password !== password) {
        throw new Error('Invalid login credentials');
      }
      this._set('user', matched.user);
      this._set('auth', true);
      return { user: matched.user };
    }

    if (cleanEmail.toLowerCase() === 'ifty@example.com') {
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Ifty Ahmed',
        email: cleanEmail,
        accountType: 'single',
        role: 'Personal',
        initials: 'IA',
        age: 29,
        blood: 'B+',
        emergency: '+8801700000000',
        conditions: ['Hypertension (Stage 1)', 'Asthma'],
        allergies: ['Dust', 'Penicillin']
      };
      this._set('user', demoUser);
      this._set('auth', true);
      return { user: demoUser };
    }

    this._set('auth', true);
    return { user: this.getUser() };
  },

  async quickDemoLogin() {
    return this.login('ifty@example.com', 'password123');
  },

  async logout() {
    if (window.hmSupabase) {
      try {
        await window.hmSupabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase logout warning:', e);
      }
    }
    this._set('auth', false);
  },

  async registerAccount({ name, email, password = '', emergency = '', blood = 'B+', age = 29, conditions = [] }) {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IA';

    let remoteUserId = null;

    if (window.hmSupabase) {
      try {
        const { data, error } = await window.hmSupabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: cleanName,
              age: Number(age) || 29,
              blood: blood || 'B+',
              emergency: emergency.trim() || '+8801700000000',
              conditions: Array.isArray(conditions) ? conditions : []
            }
          }
        });
        if (error) {
          console.warn('[Healthmate] Supabase remote auth note:', error.message);
        } else if (data && data.user) {
          remoteUserId = data.user.id;
        }
      } catch (signUpErr) {
        console.warn('[Healthmate] Supabase remote signUp exception:', signUpErr);
      }
    }

    const userId = remoteUserId || hmToUUID();
    const user = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      accountType: 'single',
      role: 'Personal',
      initials,
      age: Number(age) || 29,
      blood: blood || 'B+',
      emergency: emergency.trim() || '+8801700000000',
      conditions: Array.isArray(conditions) ? conditions : []
    };

    // Store in registered accounts collection for persistent authentication
    try {
      const accounts = this._get('registered_accounts') || [];
      const existingIdx = accounts.findIndex(a => a.email && a.email.toLowerCase() === cleanEmail.toLowerCase());
      const record = {
        email: cleanEmail,
        password: password,
        user: user,
        created_at: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        accounts[existingIdx] = record;
      } else {
        accounts.push(record);
      }
      this._set('registered_accounts', accounts);
    } catch (accErr) {
      console.warn('Account persistence notice:', accErr);
    }

    this._set('user', user);
    this._set('auth', true);

    const ownerMember = {
      id: 'owner',
      name: cleanName,
      initials,
      role: 'Personal',
      age: user.age,
      blood: user.blood,
      emergency: user.emergency,
      conditions: user.conditions,
      allergies: ['Dust'],
      notes: 'Personal health profile.',
      medStats: { done: 2, total: 2 },
      routinePct: 80
    };

    this.saveMembers([ownerMember]);
    this._set('active_profile_id', 'owner');

    // Attempt background sync to profiles table if reachable
    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('profiles').upsert({
          id: userId,
          name: cleanName,
          email: cleanEmail,
          age: user.age,
          blood: user.blood,
          emergency: user.emergency,
          conditions: user.conditions,
          allergies: ['Dust'],
          account_type: 'single',
          role: 'Personal',
          initials: initials,
          updated_at: new Date().toISOString()
        });
      } catch (profErr) {
        console.warn('Profiles remote sync notice:', profErr);
      }
    }

    return { user };
  },

  async saveUser(data) {
    const current = this.getUser();
    const updated = { ...current, ...data };
    if (updated.name) {
      updated.initials = updated.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'ME';
    }
    this._set('user', updated);
    // Sync with owner member
    const members = this.getMembers();
    const ownerIdx = members.findIndex(m => m.id === 'owner');
    if (ownerIdx !== -1) {
      members[ownerIdx] = {
        ...members[ownerIdx],
        name: updated.name,
        initials: updated.initials,
        age: updated.age || members[ownerIdx].age,
        blood: updated.blood || members[ownerIdx].blood,
        emergency: updated.emergency || members[ownerIdx].emergency,
        conditions: updated.conditions || members[ownerIdx].conditions
      };
      this.saveMembers(members);
    }

    // Persist to Supabase profiles table if authenticated
    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const payload = {
            id: user.id,
            full_name: updated.name || '',
            email: updated.email || user.email,
            age: Number(updated.age) || 29,
            blood_group: updated.blood || 'B+',
            emergency_contact: updated.emergency || '+8801700000000',
            chronic_conditions: Array.isArray(updated.conditions) ? updated.conditions : [],
            allergies: Array.isArray(updated.allergies) ? updated.allergies : ['Dust'],
            updated_at: new Date().toISOString()
          };
          const { error } = await window.hmSupabase.from('profiles').upsert(payload);
          if (error) {
            console.warn('[Healthmate] Error upserting profile:', error);
          }
        }
      } catch (err) {
        console.warn('[Healthmate] saveUser cloud sync error:', err);
      }
    }

    return updated;
  },

  saveProfile(data) {
    return this.saveUser(data);
  },

  getMembers() {
    return this._get('members', HM_DEFAULT_MEMBERS);
  },

  saveMembers(members) {
    this._set('members', members);
  },

  getMember(id) {
    const list = this.getMembers();
    return list.find(m => m.id === id);
  },

  getPermissions() {
    return this._get('permissions', HM_DEFAULT_PERMISSIONS);
  },

  savePermissions(perms) {
    this._set('permissions', perms);
  },

  canView(viewerId, targetId) {
    if (viewerId === 'owner') return true;
    if (targetId === 'owner') return false;
    if (viewerId === targetId) return true;
    const perms = this.getPermissions();
    return !!perms[`${viewerId}_can_view_${targetId}`];
  },

  setPermission(viewerId, targetId, val) {
    const perms = this.getPermissions();
    perms[`${viewerId}_can_view_${targetId}`] = val;
    this.savePermissions(perms);
  },

  getMedicines() {
    const list = this._get('medicines', HM_DEFAULT_MEDICINES);
    // Ensure all items have memberId, stock, and refillThreshold
    let changed = false;
    const normalized = list.map((m, idx) => {
      let updated = false;
      const copy = { ...m };
      if (!copy.memberId) {
        copy.memberId = 'owner';
        updated = true;
      }
      if (typeof copy.stock !== 'number') {
        copy.stock = idx === 1 ? 3 : (idx === 2 ? 24 : 16);
        updated = true;
      }
      if (typeof copy.refillThreshold !== 'number') {
        copy.refillThreshold = 5;
        updated = true;
      }
      if (!copy.unit) {
        copy.unit = 'tablets';
        updated = true;
      }
      if (updated) changed = true;
      return copy;
    });
    if (changed) this._set('medicines', normalized);
    return normalized;
  },

  saveMedicines(meds) {
    this._set('medicines', meds);
    if (window.hmSupabase) {
      this.syncMedicinesToCloud(meds).catch(e => console.warn('Medicines cloud sync warning:', e));
    }
  },

  async syncMedicinesToCloud(meds) {
    if (!window.hmSupabase || !Array.isArray(meds)) return;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return;
      const payloads = meds.map(m => {
        const id = hmToUUID(m.id);
        m.id = id;
        return {
          id: id,
          user_id: user.id,
          name: m.name,
          dosage: m.dosage || '1 tablet',
          time: m.time || '08:00 AM',
          period: m.frequency || 'Once daily',
          condition: m.meal || 'After meal',
          stock: Number(m.stock) || 0,
          refill_alert: Number(m.refillThreshold) || 5,
          unit: m.unit || 'tablets',
          is_active: m.reminder !== false,
          status: m.status || 'pending'
        };
      });
      await window.hmSupabase.from('medicines').upsert(payloads);
    } catch (e) {
      console.warn('syncMedicinesToCloud error:', e);
    }
  },

  async saveMedicine(med) {
    const meds = this.getMedicines();
    med.id = hmToUUID(med.id);
    const idx = meds.findIndex(m => String(m.id) === String(med.id));
    if (idx !== -1) {
      meds[idx] = { ...meds[idx], ...med };
    } else {
      meds.push(med);
    }
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          await window.hmSupabase.from('medicines').upsert({
            id: med.id,
            user_id: user.id,
            name: med.name,
            dosage: med.dosage || '1 tablet',
            time: med.time || '08:00 AM',
            period: med.frequency || 'Once daily',
            condition: med.meal || 'After meal',
            stock: Number(med.stock) || 0,
            refill_alert: Number(med.refillThreshold) || 5,
            unit: med.unit || 'tablets',
            is_active: med.reminder !== false,
            status: med.status || 'pending'
          });
        }
      } catch (e) {
        console.warn('saveMedicine error:', e);
      }
    }
    return med;
  },

  async deleteMedicine(medId) {
    let meds = this.getMedicines();
    meds = meds.filter(m => String(m.id) !== String(medId));
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('medicines').delete().eq('id', medId);
      } catch (e) {
        console.warn('deleteMedicine cloud error:', e);
      }
    }
    return meds;
  },

  async markMedicineTaken(medId) {
    const meds = this.getMedicines();
    const med = meds.find(m => String(m.id) === String(medId));
    if (!med) return null;

    med.status = 'taken';
    if (typeof med.stock === 'number' && med.stock > 0) {
      med.stock = Math.max(0, med.stock - 1);
    }
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const todayStr = new Date().toISOString().slice(0, 10);
          await window.hmSupabase.from('medicines').update({
            status: 'taken',
            stock: med.stock
          }).eq('id', med.id);

          await window.hmSupabase.from('medicine_logs').upsert({
            user_id: user.id,
            medicine_id: med.id,
            log_date: todayStr,
            status: 'taken'
          });
        }
      } catch (e) {
        console.warn('markMedicineTaken error:', e);
      }
    }
    return med;
  },

  async markMedicinePending(medId) {
    const meds = this.getMedicines();
    const med = meds.find(m => String(m.id) === String(medId));
    if (!med) return null;

    med.status = 'upcoming';
    if (typeof med.stock === 'number') {
      med.stock += 1;
    }
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const todayStr = new Date().toISOString().slice(0, 10);
          await window.hmSupabase.from('medicines').update({
            status: 'upcoming',
            stock: med.stock
          }).eq('id', med.id);

          await window.hmSupabase.from('medicine_logs').delete()
            .eq('user_id', user.id)
            .eq('medicine_id', med.id)
            .eq('log_date', todayStr);
        }
      } catch (e) {
        console.warn('markMedicinePending error:', e);
      }
    }
    return med;
  },

  async refillStock(medId, amount = 30) {
    const meds = this.getMedicines();
    const med = meds.find(m => String(m.id) === String(medId));
    if (!med) return null;
    med.stock = (Number(med.stock) || 0) + amount;
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('medicines').update({
          stock: med.stock
        }).eq('id', med.id);
      } catch (e) {
        console.warn('refillStock error:', e);
      }
    }
    return med;
  },

  async decrementStock(medId, amount = 1) {
    const meds = this.getMedicines();
    const med = meds.find(m => String(m.id) === String(medId));
    if (!med) return null;
    med.stock = Math.max(0, (Number(med.stock) || 0) - amount);
    this._set('medicines', meds);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('medicines').update({
          stock: med.stock
        }).eq('id', med.id);
      } catch (e) {
        console.warn('decrementStock error:', e);
      }
    }
    return med;
  },

  getRefillAlerts() {
    const meds = this.getMedicines();
    return meds.filter(m => typeof m.stock === 'number' && m.stock <= (m.refillThreshold || 5));
  },

  getDynamicNotifications() {
    const notifs = [];
    const refillAlerts = this.getRefillAlerts();

    refillAlerts.forEach(m => {
      notifs.push({
        type: 'refill',
        title: `${m.name} refill needed — ${m.stock} ${m.unit || 'pills'} left`,
        time: 'Low Stock Alert',
        isWarning: true
      });
    });

    const pendingMeds = this.getMedicines().filter(m => m.status === 'pending');
    pendingMeds.forEach(m => {
      notifs.push({
        type: 'medicine',
        title: `${m.name} dose scheduled at ${m.time}`,
        time: 'Today',
        isWarning: false
      });
    });

    if (notifs.length === 0) {
      notifs.push({
        type: 'info',
        title: 'All daily medicines and routines are on track.',
        time: 'Today',
        isWarning: false
      });
    }

    return notifs;
  },

  getRoutines() {
    return this._get('routines', HM_DEFAULT_ROUTINES);
  },

  saveRoutines(routines) {
    this._set('routines', routines);
    if (window.hmSupabase) {
      this.syncRoutinesToCloud(routines).catch(e => console.warn('Routines cloud sync warning:', e));
    }
  },

  async syncRoutinesToCloud(routines) {
    if (!window.hmSupabase || !Array.isArray(routines)) return;
    try {
      const { data: { user } } = await window.hmSupabase.auth.getUser();
      if (!user) return;
      const payloads = routines.map(r => {
        const id = hmToUUID(r.id);
        r.id = id;
        return {
          id: id,
          user_id: user.id,
          name: r.name,
          category: r.category || 'Health',
          target: r.target || '',
          frequency: r.frequency || 'Daily',
          reminder: r.reminder !== false
        };
      });
      await window.hmSupabase.from('routines').upsert(payloads);
    } catch (e) {
      console.warn('syncRoutinesToCloud error:', e);
    }
  },

  async saveRoutine(routine) {
    const routines = this.getRoutines();
    routine.id = hmToUUID(routine.id);
    const idx = routines.findIndex(r => String(r.id) === String(routine.id));
    if (idx !== -1) {
      routines[idx] = { ...routines[idx], ...routine };
    } else {
      routines.push(routine);
    }
    this._set('routines', routines);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          await window.hmSupabase.from('routines').upsert({
            id: routine.id,
            user_id: user.id,
            name: routine.name,
            category: routine.category || 'Health',
            target: routine.target || '',
            frequency: routine.frequency || 'Daily',
            reminder: routine.reminder !== false
          });
        }
      } catch (e) {
        console.warn('saveRoutine error:', e);
      }
    }
    return routine;
  },

  async deleteRoutine(routineId) {
    let routines = this.getRoutines();
    routines = routines.filter(r => String(r.id) !== String(routineId));
    this._set('routines', routines);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('routines').delete().eq('id', routineId);
      } catch (e) {
        console.warn('deleteRoutine cloud error:', e);
      }
    }
    return routines;
  },

  async logRoutineDay(routineId, dayIndex, completed) {
    const routines = this.getRoutines();
    const r = routines.find(x => String(x.id) === String(routineId));
    if (r) {
      if (!Array.isArray(r.week)) {
        r.week = [false, false, false, false, false, false, false];
      }
      r.week[dayIndex] = completed;
      this._set('routines', routines);
    }

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const now = new Date();
          const currentDay = (now.getDay() + 6) % 7;
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() - (currentDay - dayIndex));
          const logDateStr = targetDate.toISOString().slice(0, 10);

          await window.hmSupabase.from('routine_logs').upsert({
            user_id: user.id,
            routine_id: routineId,
            log_date: logDateStr,
            completed: !!completed
          });
        }
      } catch (e) {
        console.warn('logRoutineDay error:', e);
      }
    }
  },

  getRecords() {
    return this._get('records', HM_DEFAULT_RECORDS);
  },

  saveRecords(records) {
    this._set('records', records);
  },

  async saveHealthRecord(type, entry) {
    const records = this.getRecords();
    if (!records[type]) records[type] = [];
    entry.id = hmToUUID(entry.id);
    entry.memberId = 'owner';
    const idx = records[type].findIndex(r => String(r.id) === String(entry.id));
    if (idx !== -1) {
      records[type][idx] = { ...records[type][idx], ...entry };
    } else {
      records[type].push(entry);
    }
    records[type].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    this._set('records', records);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const payload = {
            id: entry.id,
            user_id: user.id,
            type: type,
            record_date: entry.date || new Date().toISOString().slice(0, 10),
            value: entry.value !== undefined ? Number(entry.value) : null,
            systolic: entry.systolic !== undefined ? Number(entry.systolic) : null,
            diastolic: entry.diastolic !== undefined ? Number(entry.diastolic) : null,
            context: entry.context || null,
            note: entry.note || ''
          };
          await window.hmSupabase.from('health_records').upsert(payload);
        }
      } catch (err) {
        console.warn('saveHealthRecord cloud error:', err);
      }
    }
    return entry;
  },

  async deleteHealthRecord(type, recordId) {
    const records = this.getRecords();
    if (records[type]) {
      records[type] = records[type].filter(r => String(r.id) !== String(recordId));
      this._set('records', records);
    }

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('health_records').delete().eq('id', recordId);
      } catch (err) {
        console.warn('deleteHealthRecord cloud error:', err);
      }
    }
    return records;
  },

  getPreferences() {
    return this._get('preferences', HM_DEFAULT_PREFERENCES);
  },

  async savePreferences(prefs) {
    this._set('preferences', prefs);

    // Persist to Supabase user_settings table if authenticated
    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const payload = {
            user_id: user.id,
            medicine_reminders: prefs.medicineReminders !== false,
            routine_reminders: prefs.routineReminders !== false,
            health_alerts: prefs.healthAlerts !== false,
            daily_summary_time: prefs.dailySummaryTime || '08:00',
            active_modules: Array.isArray(prefs.activeModules) ? prefs.activeModules : ['medicines', 'routines', 'vitals', 'appointments', 'vault'],
            updated_at: new Date().toISOString()
          };
          const { error } = await window.hmSupabase.from('user_settings').upsert(payload);
          if (error) {
            console.warn('[Healthmate] Error upserting user_settings:', error);
          }
        }
      } catch (err) {
        console.warn('[Healthmate] savePreferences cloud sync error:', err);
      }
    }
  },

  getDocuments() {
    return this._get('documents', HM_DEFAULT_DOCUMENTS);
  },

  saveDocuments(docs) {
    this._set('documents', docs);
  },

  async addDocument(doc) {
    const docs = this.getDocuments();
    const docId = hmToUUID(doc.id);
    const newDoc = {
      id: docId,
      memberId: 'owner',
      title: (doc.title || 'Untitled Document').trim(),
      category: doc.category || 'other',
      categoryName: doc.categoryName || 'Other',
      date: doc.date || new Date().toISOString().slice(0, 10),
      doctor: (doc.doctor || '').trim(),
      facility: (doc.facility || '').trim(),
      fileType: doc.fileType || 'pdf',
      fileName: doc.fileName || 'document.pdf',
      fileSize: doc.fileSize || '1.0 MB',
      fileData: doc.fileData || '',
      notes: (doc.notes || '').trim(),
      tags: Array.isArray(doc.tags) ? doc.tags : []
    };
    docs.unshift(newDoc);
    this._set('documents', docs);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const payload = {
            id: newDoc.id,
            user_id: user.id,
            title: newDoc.title,
            category: newDoc.category,
            category_name: newDoc.categoryName,
            record_date: newDoc.date,
            doctor: newDoc.doctor,
            facility: newDoc.facility,
            file_type: newDoc.fileType,
            file_name: newDoc.fileName,
            file_size: newDoc.fileSize,
            file_data: newDoc.fileData,
            notes: newDoc.notes,
            tags: newDoc.tags
          };
          await window.hmSupabase.from('documents').upsert(payload);
        }
      } catch (err) {
        console.warn('addDocument cloud error:', err);
      }
    }
    return newDoc;
  },

  async deleteDocument(id) {
    let docs = this.getDocuments();
    docs = docs.filter(d => String(d.id) !== String(id));
    this._set('documents', docs);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('documents').delete().eq('id', id);
      } catch (err) {
        console.warn('deleteDocument cloud error:', err);
      }
    }
    return docs;
  },

  getAppointments() {
    return this._get('appointments', HM_DEFAULT_APPOINTMENTS);
  },

  saveAppointments(appts) {
    this._set('appointments', appts);
  },

  async addAppointment(appt) {
    const appts = this.getAppointments();
    const apptId = hmToUUID(appt.id);
    const newAppt = {
      id: apptId,
      memberId: 'owner',
      doctorName: (appt.doctorName || 'Doctor').trim(),
      specialty: (appt.specialty || 'General Physician').trim(),
      hospital: (appt.hospital || '').trim(),
      phone: (appt.phone || '').trim(),
      date: appt.date || new Date().toISOString().slice(0, 10),
      time: appt.time || '10:00 AM',
      status: appt.status || 'upcoming',
      reason: (appt.reason || 'Routine Consultation').trim(),
      preVisitChecklist: Array.isArray(appt.preVisitChecklist) ? appt.preVisitChecklist : [],
      notes: (appt.notes || '').trim(),
      followUpDate: appt.followUpDate || ''
    };
    appts.unshift(newAppt);
    this._set('appointments', appts);

    if (window.hmSupabase) {
      try {
        const { data: { user } } = await window.hmSupabase.auth.getUser();
        if (user) {
          const payload = {
            id: newAppt.id,
            user_id: user.id,
            doctor_name: newAppt.doctorName,
            specialty: newAppt.specialty,
            hospital: newAppt.hospital,
            phone: newAppt.phone,
            appt_date: newAppt.date,
            appt_time: newAppt.time,
            status: newAppt.status,
            reason: newAppt.reason,
            pre_visit_checklist: newAppt.preVisitChecklist,
            notes: newAppt.notes,
            follow_up_date: newAppt.followUpDate || null
          };
          await window.hmSupabase.from('appointments').upsert(payload);
        }
      } catch (err) {
        console.warn('addAppointment cloud error:', err);
      }
    }
    return newAppt;
  },

  async updateAppointment(id, updates) {
    const appts = this.getAppointments();
    const idx = appts.findIndex(a => String(a.id) === String(id));
    if (idx !== -1) {
      appts[idx] = { ...appts[idx], ...updates };
      this._set('appointments', appts);

      if (window.hmSupabase) {
        try {
          const a = appts[idx];
          const payload = {
            doctor_name: a.doctorName,
            specialty: a.specialty,
            hospital: a.hospital,
            phone: a.phone,
            appt_date: a.date,
            appt_time: a.time,
            status: a.status,
            reason: a.reason,
            pre_visit_checklist: a.preVisitChecklist,
            notes: a.notes,
            follow_up_date: a.followUpDate || null,
            updated_at: new Date().toISOString()
          };
          await window.hmSupabase.from('appointments').update(payload).eq('id', id);
        } catch (err) {
          console.warn('updateAppointment cloud error:', err);
        }
      }
      return appts[idx];
    }
    return null;
  },

  async deleteAppointment(id) {
    let appts = this.getAppointments();
    appts = appts.filter(a => String(a.id) !== String(id));
    this._set('appointments', appts);

    if (window.hmSupabase) {
      try {
        await window.hmSupabase.from('appointments').delete().eq('id', id);
      } catch (err) {
        console.warn('deleteAppointment cloud error:', err);
      }
    }
    return appts;
  },

  async toggleChecklistItem(appointmentId, checklistItemId) {
    const appts = this.getAppointments();
    const appt = appts.find(a => String(a.id) === String(appointmentId));
    if (appt && Array.isArray(appt.preVisitChecklist)) {
      const item = appt.preVisitChecklist.find(c => String(c.id) === String(checklistItemId));
      if (item) {
        item.done = !item.done;
        this._set('appointments', appts);

        if (window.hmSupabase) {
          try {
            await window.hmSupabase
              .from('appointments')
              .update({
                pre_visit_checklist: appt.preVisitChecklist,
                updated_at: new Date().toISOString()
              })
              .eq('id', appointmentId);
          } catch (err) {
            console.warn('toggleChecklistItem cloud error:', err);
          }
        }
        return item;
      }
    }
    return null;
  },

  getNextUpcomingAppointment() {
    const appts = this.getAppointments();
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = appts
      .filter(a => a.status === 'upcoming' && a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return upcoming.length > 0 ? upcoming[0] : null;
  },

  getOwnerTodayStats() {
    return this.getProfileTodayStats('owner');
  },

  getActiveProfileId() {
    return 'owner';
  },

  setActiveProfileId(id) {
    return 'owner';
  },

  getActiveProfile() {
    const user = this.getUser();
    return {
      id: 'owner',
      name: user.name,
      initials: user.initials || 'IA',
      role: 'Personal',
      isOwner: true,
      age: user.age || 29,
      blood: user.blood || 'B+',
      emergency: user.emergency || '+8801700000000',
      conditions: user.conditions || [],
      allergies: user.allergies || ['Dust']
    };
  },

  getMedicinesForMember(memberId = null) {
    const targetId = memberId || this.getActiveProfileId();
    return this.getMedicines().filter(m => (m.memberId || 'owner') === targetId);
  },

  getRoutinesForMember(memberId = null) {
    const targetId = memberId || this.getActiveProfileId();
    return this.getRoutines().filter(r => (r.memberId || 'owner') === targetId);
  },

  getRecordsForMember(type, memberId = null) {
    const targetId = memberId || this.getActiveProfileId();
    const all = this.getRecords();
    return (all[type] || []).filter(r => (r.memberId || 'owner') === targetId);
  },

  getProfileTodayStats(memberId = null) {
    const targetId = memberId || this.getActiveProfileId();
    const meds = this.getMedicinesForMember(targetId);
    const routines = this.getRoutinesForMember(targetId);
    const TODAY_INDEX = 4; // Friday in current prototype

    const totalMeds = meds.length;
    const doneMeds = meds.filter(m => m.status === 'taken').length;
    const nextPendingMed = meds.find(m => m.status !== 'taken');

    const totalRoutines = routines.length;
    const doneRoutines = routines.filter(r => r.week && r.week[TODAY_INDEX]).length;
    const nextPendingRoutine = routines.find(r => r.week && !r.week[TODAY_INDEX]);

    const medScore = totalMeds > 0 ? (doneMeds / totalMeds) : 1;
    const routineScore = totalRoutines > 0 ? (doneRoutines / totalRoutines) : 1;
    const overallPct = Math.round(((medScore + routineScore) / 2) * 100);

    let nextUpText = 'All done for today!';
    if (nextPendingMed) {
      nextUpText = `${nextPendingMed.name}, ${nextPendingMed.time}`;
    } else if (nextPendingRoutine) {
      nextUpText = `${nextPendingRoutine.name}`;
    }

    return {
      totalMeds,
      doneMeds,
      totalRoutines,
      doneRoutines,
      routinePct: totalRoutines > 0 ? Math.round((doneRoutines / totalRoutines) * 100) : 100,
      overallPct,
      nextUpText
    };
  },

  getAllRefillAlerts() {
    const meds = this.getMedicines();
    return meds.filter(m => typeof m.stock === 'number' && m.stock <= (m.refillThreshold || 5));
  },

  exportFullBackup() {
    return {
      appName: 'Healthmate',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: this.getUser(),
      members: this.getMembers(),
      medicines: this.getMedicines(),
      routines: this.getRoutines(),
      records: this.getRecords(),
      documents: this.getDocuments(),
      appointments: this.getAppointments(),
      preferences: this.getPreferences()
    };
  },

  importFullBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file structure.');
    }
    if (backup.user) this.saveUser(backup.user);
    if (Array.isArray(backup.members)) this.saveMembers(backup.members);
    if (Array.isArray(backup.medicines)) this.saveMedicines(backup.medicines);
    if (Array.isArray(backup.routines)) this.saveRoutines(backup.routines);
    if (backup.records && typeof backup.records === 'object') this.saveRecords(backup.records);
    if (Array.isArray(backup.documents)) this.saveDocuments(backup.documents);
    if (Array.isArray(backup.appointments)) this.saveAppointments(backup.appointments);
    if (backup.preferences && typeof backup.preferences === 'object') this.savePreferences(backup.preferences);
    return true;
  },

  getEmergencyData() {
    const user = this.getUser();
    const meds = this.getMedicines();
    return {
      name: user.name || 'Ifty Ahmed',
      blood: user.blood || 'B+',
      age: user.age || 29,
      emergency: user.emergency || '+8801700000000',
      conditions: user.conditions || [],
      allergies: user.allergies || ['Dust'],
      activeMeds: meds.map(m => ({ name: m.name, dosage: m.dosage, time: m.time }))
    };
  },

  getVitalClassification(type, entry) {
    if (!entry) return null;

    if (type === 'bp') {
      const sys = Number(entry.systolic);
      const dia = Number(entry.diastolic);
      if (!sys || !dia) return null;

      if (sys < 90 || dia < 60) {
        return {
          status: 'Low BP',
          fullStatus: 'Low Blood Pressure (Hypotension)',
          level: 'info',
          bg: '#EFF6FF',
          color: '#1E40AF',
          border: '#BFDBFE',
          tip: 'Blood pressure is below standard target. Hydrate and consult your doctor if experiencing dizziness.'
        };
      }
      if (sys < 120 && dia < 80) {
        return {
          status: 'Optimal',
          fullStatus: 'Normal / Optimal Blood Pressure',
          level: 'good',
          bg: '#ECFDF5',
          color: '#047857',
          border: '#A7F3D0',
          tip: 'Systolic < 120 এবং Diastolic < 80 mmHg। রক্তচাপ সম্পূর্ণ স্বাভাবিক ও স্বাস্থ্যকর মাত্রায় রয়েছে।'
        };
      }
      if (sys <= 129 && dia < 80) {
        return {
          status: 'Elevated',
          fullStatus: 'Elevated BP (Pre-hypertension)',
          level: 'warning',
          bg: '#FEF3C7',
          color: '#B45309',
          border: '#FDE68A',
          tip: 'Systolic 120–129 mmHg। খাবারে সোডিয়াম (Sodium/লবণ) পরিমিত রাখুন এবং নিয়মিত হাঁটাচলা বজায় রাখুন।'
        };
      }
      if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
        return {
          status: 'Stage 1 High',
          fullStatus: 'Stage 1 Hypertension',
          level: 'warning',
          bg: '#FFEDD5',
          color: '#C2410C',
          border: '#FED7AA',
          tip: 'Systolic 130–139 অথবা Diastolic 80–89 mmHg। সপ্তাহে অন্তত ২ বার রিডিং পর্যবেক্ষণ করুন এবং চিকিৎসকের পরামর্শ নিন।'
        };
      }
      return {
        status: 'Stage 2 High',
        fullStatus: 'Stage 2 Hypertension',
        level: 'danger',
        bg: '#FEE2E2',
        color: '#B91C1C',
        border: '#FECACA',
        tip: 'Systolic ≥ 140 অথবা Diastolic ≥ 90 mmHg (উচ্চ রক্তচাপ)। কিছুটা বিশ্রাম নিয়ে পুনরায় মাপুন এবং অস্বাভাবিক থাকলে চিকিৎসকের সাথে কথা বলুন।'
      };
    }

    if (type === 'sugar') {
      const val = Number(entry.value);
      if (!val) return null;
      const isFasting = (entry.context || 'Fasting').toLowerCase().includes('fasting');

      if (isFasting) {
        if (val < 70) {
          return {
            status: 'Low (Hypo)',
            fullStatus: 'Hypoglycemia (Low Fasting Glucose)',
            level: 'danger',
            bg: '#FEE2E2',
            color: '#B91C1C',
            border: '#FECACA',
            tip: 'গ্লুকোজ ৭০ mg/dL-এর নিচে নেমে গেছে (Hypoglycemia)। দ্রুত মিষ্টি খাবার বা ফলের জুস গ্রহণ করুন।'
          };
        }
        if (val <= 99) {
          return {
            status: 'Normal Fasting',
            fullStatus: 'Normal Fasting Blood Sugar',
            level: 'good',
            bg: '#ECFDF5',
            color: '#047857',
            border: '#A7F3D0',
            tip: '৭০–৯৯ mg/dL। খালি পেটে রক্তের গ্লুকোজ (Fasting Glucose) আদর্শ ও সম্পূর্ণ সুস্থ স্বাভাবিক মাত্রায় রয়েছে।'
          };
        }
        if (val <= 125) {
          return {
            status: 'Pre-diabetes',
            fullStatus: 'Impaired Fasting Glucose (Pre-diabetes)',
            level: 'warning',
            bg: '#FEF3C7',
            color: '#B45309',
            border: '#FDE68A',
            tip: '১০০–১২৫ mg/dL। Fasting Glucose সামান্য বেশি (Pre-diabetes)। অতিরিক্ত মিষ্টি পরিহার করুন ও নিয়মিত শরীরচর্চায় মনোযোগ দিন।'
          };
        }
        return {
          status: 'High Fasting',
          fullStatus: 'High Fasting Glucose (Diabetic Range)',
          level: 'danger',
          bg: '#FEE2E2',
          color: '#B91C1C',
          border: '#FECACA',
          tip: '≥ ১২৬ mg/dL। Fasting Glucose মাত্রাতিরিক্ত। একটি HbA1c টেস্ট করিয়ে চিকিৎসকের পরামর্শ নেওয়া বাঞ্ছনীয়।'
        };
      } else {
        if (val < 140) {
          return {
            status: 'Normal Post-Meal',
            fullStatus: 'Normal Post-Meal Blood Sugar',
            level: 'good',
            bg: '#ECFDF5',
            color: '#047857',
            border: '#A7F3D0',
            tip: '< ১৪০ mg/dL। খাওয়ার ২ ঘণ্টা পর রক্তের গ্লুকোজ সুস্থ ও স্বাভাবিক পর্যায়ে রয়েছে।'
          };
        }
        if (val <= 199) {
          return {
            status: 'Elevated Post-Meal',
            fullStatus: 'Elevated Post-Meal Blood Sugar',
            level: 'warning',
            bg: '#FEF3C7',
            color: '#B45309',
            border: '#FDE68A',
            tip: '১৪০–১৯৯ mg/dL। খাওয়ার পর সুগারের মাত্রা কিছুটা বৃদ্ধি পেয়েছে। শর্করার (Carbohydrates) পরিমাণ নিয়ন্ত্রণে রাখুন।'
          };
        }
        return {
          status: 'High Post-Meal',
          fullStatus: 'High Post-Meal Glucose Spike',
          level: 'danger',
          bg: '#FEE2E2',
          color: '#B91C1C',
          border: '#FECACA',
          tip: '≥ ২০০ mg/dL। খাওয়ার পর সুগার অনেক বেশি উঠেছে। চিকিৎসকের পরামর্শ অনুযায়ী ওষুধ ও ডায়েট সমন্বয় করুন।'
        };
      }
    }

    if (type === 'weight') {
      const w = Number(entry.value);
      if (!w) return null;
      const h = 1.72;
      const bmi = w / (h * h);
      const bmiStr = bmi.toFixed(1);

      if (bmi < 18.5) {
        return {
          status: 'Underweight',
          fullStatus: `BMI ${bmiStr} · Underweight`,
          level: 'info',
          bg: '#EFF6FF',
          color: '#1E40AF',
          border: '#BFDBFE',
          tip: `গণনাকৃত BMI ${bmiStr}। আদর্শ ওজনের চেয়ে কম; পুষ্টিকর ও সুষম খাবার নিয়মিত গ্রহণ করুন।`
        };
      }
      if (bmi <= 24.9) {
        return {
          status: 'Healthy BMI',
          fullStatus: `BMI ${bmiStr} · Normal Weight`,
          level: 'good',
          bg: '#ECFDF5',
          color: '#047857',
          border: '#A7F3D0',
          tip: `গণনাকৃত BMI ${bmiStr}। আপনার ওজন স্বাস্থ্যকর এবং আদর্শ সীমার মধ্যে রয়েছে।`
        };
      }
      if (bmi <= 29.9) {
        return {
          status: 'Overweight',
          fullStatus: `BMI ${bmiStr} · Overweight`,
          level: 'warning',
          bg: '#FEF3C7',
          color: '#B45309',
          border: '#FDE68A',
          tip: `গণনাকৃত BMI ${bmiStr}। ওজন সামান্য বেশি (Overweight); নিয়মিত শারীরিক কসরত ও ক্যালরি নিয়ন্ত্রণ বজায় রাখুন।`
        };
      }
      return {
        status: 'Obese Range',
        fullStatus: `BMI ${bmiStr} · Obese Range`,
        level: 'danger',
        bg: '#FEE2E2',
        color: '#B91C1C',
        border: '#FECACA',
        tip: `গণনাকৃত BMI ${bmiStr}। স্থূলতার ঝুঁকি রয়েছে; সুনির্দিষ্ট জীবনধারা পরিবর্তন ও চিকিৎসকের পরামর্শ গ্রহণ করুন।`
      };
    }

    if (type === 'temp') {
      const t = Number(entry.value);
      if (!t) return null;
      if (t < 97.0) {
        return {
          status: 'Low Temp',
          fullStatus: 'Subnormal Temperature',
          level: 'info',
          bg: '#EFF6FF',
          color: '#1E40AF',
          border: '#BFDBFE',
          tip: 'শরীরের তাপমাত্রা স্বাভাবিকের চেয়ে কিছুটা কম। শরীর গরম রাখুন ও বিশ্রাম নিন।'
        };
      }
      if (t <= 99.0) {
        return {
          status: 'Normal Temp',
          fullStatus: 'Normal Body Temperature',
          level: 'good',
          bg: '#ECFDF5',
          color: '#047857',
          border: '#A7F3D0',
          tip: '৯৭.০–৯৯.০ °F। শরীরের তাপমাত্রা সম্পূর্ণ স্বাভাবিক (Normothermic)।'
        };
      }
      if (t <= 100.4) {
        return {
          status: 'Mild Fever',
          fullStatus: 'Low-Grade Fever (Subfebrile)',
          level: 'warning',
          bg: '#FEF3C7',
          color: '#B45309',
          border: '#FDE68A',
          tip: 'সামান্য জ্বর অনুভূত হচ্ছে (Low-Grade Fever)। প্রচুর পানি পান করুন ও পর্যাপ্ত বিশ্রাম নিন।'
        };
      }
      return {
        status: 'High Fever',
        fullStatus: 'Fever (Pyrexia)',
        level: 'danger',
        bg: '#FEE2E2',
        color: '#B91C1C',
        border: '#FECACA',
        tip: '≥ ১০০.৫ °F। উচ্চ জ্বর; তাপমাত্রা পর্যবেক্ষণ করুন এবং স্থায়ী হলে চিকিৎসকের শরণাপন্ন হন।'
      };
    }

    return null;
  },

  getSmartInsights() {
    const insights = [];
    const records = this.getRecords();
    const meds = this.getMedicines();
    const routines = this.getRoutines();

    // 1. Blood Pressure Clinical Insight
    const bpList = records.bp || [];
    if (bpList.length > 0) {
      const latest = bpList[bpList.length - 1];
      const cls = this.getVitalClassification('bp', latest);
      if (cls) {
        insights.push({
          id: 'insight-bp',
          category: 'Cardiovascular',
          title: `Blood Pressure: ${cls.status} (${latest.systolic}/${latest.diastolic} mmHg)`,
          description: cls.tip,
          level: cls.level,
          badgeBg: cls.bg,
          badgeColor: cls.color,
          badgeText: cls.status,
          actionText: 'View BP Records',
          actionUrl: 'records.html'
        });
      }
    }

    // 2. Blood Sugar Clinical Insight
    const sugarList = records.sugar || [];
    if (sugarList.length > 0) {
      const latest = sugarList[sugarList.length - 1];
      const cls = this.getVitalClassification('sugar', latest);
      if (cls) {
        insights.push({
          id: 'insight-sugar',
          category: 'Metabolic Health',
          title: `Blood Sugar: ${cls.status} (${latest.value} mg/dL)`,
          description: cls.tip,
          level: cls.level,
          badgeBg: cls.bg,
          badgeColor: cls.color,
          badgeText: cls.status,
          actionText: 'View Sugar Records',
          actionUrl: 'records.html'
        });
      }
    }

    // 3. Weight & BMI Insight
    const weightList = records.weight || [];
    if (weightList.length > 0) {
      const latest = weightList[weightList.length - 1];
      const cls = this.getVitalClassification('weight', latest);
      if (cls) {
        insights.push({
          id: 'insight-weight',
          category: 'Body Composition',
          title: `Body Weight: ${cls.status} (${latest.value} kg)`,
          description: cls.tip,
          level: cls.level,
          badgeBg: cls.bg,
          badgeColor: cls.color,
          badgeText: cls.status,
          actionText: 'Track Weight',
          actionUrl: 'records.html'
        });
      }
    }

    // 4. Medication Compliance & Stock Alert
    const refillAlerts = this.getAllRefillAlerts();
    if (refillAlerts.length > 0) {
      const names = refillAlerts.map(m => m.name).join(', ');
      insights.push({
        id: 'insight-refill',
        category: 'Medication Alert',
        title: `Low Medicine Stock: ${names}`,
        description: `ওষুধের স্টক নির্ধারিত রিফিল লিমিটের নিচে নেমে গেছে (${refillAlerts[0].stock} টি বাকি)। ডোজ বাদ পড়া এড়াতে দ্রুত সংগ্রহ করুন।`,
        level: 'warning',
        badgeBg: '#FEF3C7',
        badgeColor: '#B45309',
        badgeText: 'Low Stock',
        actionText: 'Manage Supplies',
        actionUrl: 'medicines.html'
      });
    } else {
      const totalMeds = meds.length;
      const takenMeds = meds.filter(m => m.status === 'taken').length;
      const adherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;
      if (totalMeds > 0) {
        insights.push({
          id: 'insight-meds',
          category: 'Prescriptions',
          title: `Daily Dose Adherence: ${adherence}%`,
          description: adherence === 100
            ? 'আজকের জন্য নির্ধারিত সব ডোজ নেওয়া সম্পন্ন হয়েছে। অসাধারণ নিয়মনিষ্ঠতা!'
            : `আজকের ${totalMeds} টির মধ্যে ${takenMeds} টি ডোজ সম্পন্ন হয়েছে। বাকি ওষুধগুলো সঠিক সময়ে গ্রহণ করতে ভুলবেন না।`,
          level: adherence === 100 ? 'good' : 'info',
          badgeBg: adherence === 100 ? '#ECFDF5' : '#EFF6FF',
          badgeColor: adherence === 100 ? '#047857' : '#1E40AF',
          badgeText: adherence === 100 ? '100% On Track' : `${takenMeds}/${totalMeds} Doses`,
          actionText: 'Open Prescriptions',
          actionUrl: 'medicines.html'
        });
      }
    }

    // 5. Hydration / Routine Streak
    const waterHabit = routines.find(r => r.name.toLowerCase().includes('water') || r.id === 'r1');
    if (waterHabit && Array.isArray(waterHabit.week)) {
      const doneDays = waterHabit.week.filter(Boolean).length;
      insights.push({
        id: 'insight-water',
        category: 'Daily Habits',
        title: `Hydration Target: ${doneDays}/7 Days Met`,
        description: doneDays >= 5
          ? 'প্রতিদিন পর্যাপ্ত পানি পান (৮ গ্লাস বা ২.৫ লিটার) কিডনির সুস্থতা, রক্তচাপ নিয়ন্ত্রণ এবং সতেজতা বজায় রাখতে সাহায্য করে।'
          : 'নিয়মিত পর্যাপ্ত পানি পান আপনার রক্তের সঞ্চালন ও বিপাকক্রিয়া (Metabolism) স্বাভাবিক রাখতে সহায়ক।',
        level: doneDays >= 5 ? 'good' : 'info',
        badgeBg: '#F0FDFA',
        badgeColor: '#0D6E6E',
        badgeText: `${doneDays}/7 Days Met`,
        actionText: 'View Habit Matrix',
        actionUrl: 'routine.html'
      });
    }

    // 6. Upcoming Consultation Follow-up
    const nextAppt = this.getNextUpcomingAppointment();
    if (nextAppt) {
      const apptDate = new Date(nextAppt.date);
      const today = new Date();
      const diffDays = Math.ceil((apptDate - today) / (1000 * 60 * 60 * 24));
      const countdownText = diffDays <= 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
      insights.push({
        id: 'insight-appt',
        category: 'Clinical Follow-up',
        title: `Next Visit: ${nextAppt.doctorName} (${countdownText})`,
        description: `${nextAppt.hospital || 'Chamber'}-এ ${nextAppt.reason} সংক্রান্ত অ্যাপয়েন্টমেন্ট। যাওয়ার আগে আপনার প্রি-ভিজিট চেকলিস্ট ও প্রয়োজনীয় প্রশ্ন গুছিয়ে নিন।`,
        level: diffDays <= 3 ? 'warning' : 'info',
        badgeBg: diffDays <= 3 ? '#FEF3C7' : '#EFF6FF',
        badgeColor: diffDays <= 3 ? '#B45309' : '#1E40AF',
        badgeText: countdownText,
        actionText: 'View Appointment Details',
        actionUrl: 'appointments.html'
      });
    }

    return insights;
  },

  resetToDefaults() {
    this._set('user', HM_DEFAULT_USER);
    this._set('members', HM_DEFAULT_MEMBERS);
    this._set('permissions', HM_DEFAULT_PERMISSIONS);
    this._set('medicines', HM_DEFAULT_MEDICINES);
    this._set('routines', HM_DEFAULT_ROUTINES);
    this._set('records', HM_DEFAULT_RECORDS);
    this._set('documents', HM_DEFAULT_DOCUMENTS);
    this._set('appointments', HM_DEFAULT_APPOINTMENTS);
    this._set('preferences', HM_DEFAULT_PREFERENCES);
  }
};

window.HMStore = HMStore;
