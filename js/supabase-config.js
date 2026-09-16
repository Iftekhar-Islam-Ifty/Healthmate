/* =========================================================
   HEALTHMATE — SUPABASE CLIENT CONFIGURATION
   Central client initialized with project credentials for
   authentication, session management, and cloud database.
   ========================================================= */

const SUPABASE_URL = 'https://prxaoyxobilqfwkdpock.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mVLdAd0XIrLUi3rj9RYrbA_kWWC6ybD';

let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    console.log('[Healthmate] Supabase client initialized.');
  } catch (err) {
    console.error('[Healthmate] Supabase initialization error:', err);
  }
} else {
  console.warn('[Healthmate] Supabase UMD library not detected in window.');
}

window.hmSupabase = supabaseClient;
