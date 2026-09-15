/* =========================================================
   HEALTHMATE — LOCAL STORAGE & STATE SYNC LAYER
   Personal health management state layer for single-user
   experience. Pre-configured to cleanly map to future
   Laravel REST API endpoints.
========================================================= */

const HM_DEFAULT_USER = {
  name: 'Ifty Ahmed',
  email: 'ifty@example.com',
  accountType: 'single', // Fixed to 'single' personal health space
  role: 'Personal',
  initials: 'IA',
  age: 29,
  blood: 'B+',
  emergency: '+8801700000000',
  conditions: ['Mild seasonal allergy'],
  allergies: ['Dust']
};

const HM_DEFAULT_MEMBERS = [
  {
    id: 'owner',
    name: 'Ifty Ahmed',
    initials: 'IA',
    role: 'Personal',
    age: 29,
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

const HM_DEFAULT_PREFERENCES = {
  medicineReminders: true,
  routineReminders: true,
  healthAlerts: true,
  dailySummaryTime: '08:00 AM'
};

const HMStore = {
  _get(key, fallback) {
    try {
      const val = localStorage.getItem('hm_' + key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.warn('LocalStorage read error', e);
      return fallback;
    }
  },

  _set(key, val) {
    try {
      localStorage.setItem('hm_' + key, JSON.stringify(val));
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
    return this._get('auth', true);
  },

  login(email, password) {
    this._set('auth', true);
    return true;
  },

  logout() {
    this._set('auth', false);
  },

  registerAccount({ name, email, password = '', emergency = '', blood = 'B+', age = 29, conditions = [] }) {
    const cleanName = name.trim();
    const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IA';
    const user = {
      name: cleanName,
      email: email.trim(),
      accountType: 'single',
      role: 'Personal',
      initials,
      age: Number(age) || 29,
      blood: blood || 'B+',
      emergency: emergency.trim() || '+8801700000000',
      conditions: Array.isArray(conditions) ? conditions : []
    };
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
    return user;
  },

  saveUser(data) {
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
        copy.memberId = idx === 1 ? 'abbu' : (idx === 2 ? 'ammu' : 'owner');
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
    if (changed) this.saveMedicines(normalized);
    return normalized;
  },

  saveMedicines(meds) {
    this._set('medicines', meds);
  },

  refillStock(medId, amount = 30) {
    const meds = this.getMedicines();
    const med = meds.find(m => m.id === medId);
    if (!med) return null;
    med.stock = (med.stock || 0) + amount;
    this.saveMedicines(meds);
    return med;
  },

  decrementStock(medId, amount = 1) {
    const meds = this.getMedicines();
    const med = meds.find(m => m.id === medId);
    if (!med) return null;
    med.stock = Math.max(0, (med.stock || 0) - amount);
    this.saveMedicines(meds);
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
  },

  getRecords() {
    return this._get('records', HM_DEFAULT_RECORDS);
  },

  saveRecords(records) {
    this._set('records', records);
  },

  getPreferences() {
    return this._get('preferences', HM_DEFAULT_PREFERENCES);
  },

  savePreferences(prefs) {
    this._set('preferences', prefs);
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

  resetToDefaults() {
    this._set('user', HM_DEFAULT_USER);
    this._set('members', HM_DEFAULT_MEMBERS);
    this._set('permissions', HM_DEFAULT_PERMISSIONS);
    this._set('medicines', HM_DEFAULT_MEDICINES);
    this._set('routines', HM_DEFAULT_ROUTINES);
    this._set('records', HM_DEFAULT_RECORDS);
    this._set('preferences', HM_DEFAULT_PREFERENCES);
  }
};

window.HMStore = HMStore;
