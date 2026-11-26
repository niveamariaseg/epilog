import { supabase } from './supabase.js';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

/**
 * Chama a API Express anexando o JWT da sessão Supabase (se houver).
 * api('/diario', { metodo: 'POST', corpo: {...} })
 */
export async function api(caminho, { metodo = 'GET', corpo, sinal } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let resp;
  try {
    resp = await fetch(BASE + caminho, {
      method: metodo,
      signal: sinal,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ErroApi(0, 'Não foi possível conectar à API. Verifique se o backend está rodando.');
  }

  if (resp.status === 204) return null;
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new ErroApi(resp.status, json.erro || `Erro ${resp.status}`);
  return json;
}
