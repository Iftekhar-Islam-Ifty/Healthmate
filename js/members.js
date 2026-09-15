/* =========================================================
   HEALTHMATE — FAMILY & PERMISSIONS DATA LAYER
   Shared by family.html and member-profile.html so both pages
   read/write the same in-memory state during this prototype.

   When Laravel exists:
     - `members` array     -> GET /api/family/members
     - `permissions` object -> GET/PUT /api/family/permissions
     - canView()            -> can stay client-side as a cache,
                                but the real check must also
                                happen server-side per request.
   Nothing that calls canView() or getMember() needs to change.
========================================================= */

let members = [
  {
    id: 'owner', name: 'Ifty', initials: 'IF', role: 'Owner',
    age: 29, blood: 'B+', emergency: '+8801XXXXXXXXX',
    conditions: [], allergies: [], notes: '',
    medStats: { done: 1, total: 1 }, routinePct: 90
  },
  {
    id: 'ammu', name: 'Ammu', initials: 'AM', role: 'Member',
    age: 54, blood: 'A+', emergency: '+8801XXXXXXXXX',
    conditions: ['Hypertension'], allergies: ['Dust'],
    notes: 'Prefers evening walks over morning ones.',
    medStats: { done: 3, total: 4 }, routinePct: 80
  },
  {
    id: 'abbu', name: 'Abbu', initials: 'AB', role: 'Member',
    age: 58, blood: 'O+', emergency: '+8801XXXXXXXXX',
    conditions: ['Type 2 diabetes'], allergies: [],
    notes: 'Checks blood pressure every morning.',
    medStats: { done: 2, total: 3 }, routinePct: 60
  }
];

// Master ON/OFF toggle per pair, as planned for the first version.
// Key shape: "<viewer>_can_view_<target>".
let permissions = {
  ammu_can_view_abbu: true,
  abbu_can_view_ammu: false
};

function getMember(id) {
  return members.find(m => m.id === id);
}

// Hard rules: the Owner sees everyone; no one sees the Owner;
// everyone sees their own profile. Everything else follows the
// toggle grid above.
function canView(viewerId, targetId) {
  if (viewerId === 'owner') return true;
  if (targetId === 'owner') return false;
  if (viewerId === targetId) return true;
  return !!permissions[`${viewerId}_can_view_${targetId}`];
}

function setPermission(viewerId, targetId, value) {
  permissions[`${viewerId}_can_view_${targetId}`] = value;
}
