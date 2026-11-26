import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Mensagem clara durante o setup em vez de uma tela branca
  console.error(
    '[EpiLog] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em frontend/.env (veja .env.example).'
  );
}

/** Usado SOMENTE para autenticação. Os dados passam pela API Express. */
export const supabase = createClient(url || 'http://localhost', anonKey || 'chave-ausente', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
