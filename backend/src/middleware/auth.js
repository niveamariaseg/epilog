import { supabaseAdmin, supabaseAnon, clienteDoUsuario } from '../config/supabase.js';
import { ErroHttp } from '../utils/http.js';

function extrairToken(req) {
  const h = req.headers.authorization || '';
  const [tipo, token] = h.split(' ');
  return tipo?.toLowerCase() === 'bearer' && token ? token : null;
}

async function resolverUsuario(token) {
  // Valida o JWT junto ao Supabase Auth (assinatura, expiração e revogação).
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/** Exige sessão válida. Define req.user e req.db (cliente com RLS do usuário). */
export async function exigirAuth(req, _res, next) {
  try {
    const token = extrairToken(req);
    if (!token) throw new ErroHttp(401, 'Faça login para continuar');
    const user = await resolverUsuario(token);
    if (!user) throw new ErroHttp(401, 'Sessão inválida ou expirada. Entre novamente.');
    req.user = user;
    req.db = clienteDoUsuario(token);
    next();
  } catch (e) {
    next(e);
  }
}

/** Sessão opcional: se houver token válido, popula req.user; senão segue como visitante. */
export async function authOpcional(req, _res, next) {
  try {
    const token = extrairToken(req);
    const user = token ? await resolverUsuario(token) : null;
    req.user = user;
    req.db = user ? clienteDoUsuario(token) : supabaseAnon;
    next();
  } catch (e) {
    next(e);
  }
}
