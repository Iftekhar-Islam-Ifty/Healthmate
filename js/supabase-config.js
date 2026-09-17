/* =========================================================
   HEALTHMATE — SUPABASE CLIENT CONFIGURATION
   Central client initialized with project credentials for
   authentication, session management, and cloud database.
   ========================================================= */

const SUPABASE_URL = 'https://prxaoyxobilqfwkdpock.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByeGFveXhvYmlscWZ3a2Rwb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Nzc0NTcsImV4cCI6MjEwNTE1MzQ1N30.Wi04hQrTQD1Yel2hnQCj6eU8ZU1ssde-bUNDyYFZKqg';

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
