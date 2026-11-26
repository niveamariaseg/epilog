import { supabaseAnon } from '../config/supabase.js';
import { ok } from '../utils/http.js';

/** Colunas padrão de uma resenha com autor e série. */
export const SELECT_RESENHA = `
  id, nota, texto, contem_spoiler, publicado_em, atualizado_em, serie_id, perfil_id,
  autor:perfil!avaliacao_perfil_id_fkey ( id, apelido ),
  serie:serie!avaliacao_serie_id_fkey ( id, tmdb_id, nome, poster_path, ano_estreia )
`;

/**
 * Acrescenta a cada resenha: total de curtidas e se o usuário atual curtiu.
 * Curtidas são públicas, então basta o cliente anônimo.
 */
export async function enriquecerResenhas(resenhas, usuarioId) {
  if (!resenhas.length) return [];
  const ids = resenhas.map((r) => r.id);
  const curtidas = ok(
    await supabaseAnon.from('curtida').select('avaliacao_id, perfil_id').in('avaliacao_id', ids)
  );

  const total = new Map();
  const minhas = new Set();
  for (const c of curtidas) {
    total.set(c.avaliacao_id, (total.get(c.avaliacao_id) || 0) + 1);
    if (usuarioId && c.perfil_id === usuarioId) minhas.add(c.avaliacao_id);
  }

  return resenhas.map((r) => ({
    ...r,
    nota: Number(r.nota),
    curtidas: total.get(r.id) || 0,
    curtida_por_mim: minhas.has(r.id),
    minha: usuarioId ? r.perfil_id === usuarioId : false,
  }));
}
