import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const opcoes = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

/**
 * Cliente com service_role: ignora RLS.
 * Uso restrito a: gravar o catálogo (serie/temporada/episodio), validar JWT
 * e checagens públicas (disponibilidade de apelido).
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceKey, opcoes);

/** Cliente anônimo: leituras públicas, sempre sujeitas à RLS. */
export const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, opcoes);

/**
 * Cliente "no contexto do usuário": repassa o JWT para o PostgREST,
 * então auth.uid() funciona nas políticas RLS.
 */
export function clienteDoUsuario(token) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...opcoes,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
