import { supabaseAdmin } from '../config/supabase.js';
import { ErroHttp, ok } from '../utils/http.js';
import * as tmdb from './tmdb.js';

const AVISO_CACHE =
  'O catálogo do TMDB está indisponível no momento. Exibindo dados salvos localmente — alguns detalhes podem estar desatualizados.';

const agora = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Upserts (service_role: o catálogo é compartilhado e só o backend grava) */
/* ------------------------------------------------------------------ */

async function upsertSerie(dados) {
  return ok(
    await supabaseAdmin
      .from('serie')
      .upsert({ ...dados, atualizado_em: agora() }, { onConflict: 'tmdb_id' })
      .select()
      .single()
  );
}

async function upsertTemporadas(serieId, temporadas) {
  if (!temporadas.length) return [];
  const linhas = temporadas.map((t) => ({ ...t, serie_id: serieId, atualizado_em: agora() }));
  return ok(
    await supabaseAdmin
      .from('temporada')
      .upsert(linhas, { onConflict: 'serie_id,numero' })
      .select()
      .order('numero')
  );
}

async function upsertEpisodios(temporadaId, episodios) {
  if (!episodios.length) return [];
  const linhas = episodios.map((e) => ({ ...e, temporada_id: temporadaId }));
  return ok(
    await supabaseAdmin
      .from('episodio')
      .upsert(linhas, { onConflict: 'temporada_id,numero' })
      .select()
      .order('numero')
  );
}

/* ------------------------------------------------------------------ */
/* Leitura local (cache) */
/* ------------------------------------------------------------------ */

async function serieLocal(tmdbId) {
  return ok(await supabaseAdmin.from('serie').select().eq('tmdb_id', tmdbId).maybeSingle());
}

async function temporadasLocais(serieId) {
  return ok(await supabaseAdmin.from('temporada').select().eq('serie_id', serieId).order('numero'));
}

/* ------------------------------------------------------------------ */
/* API pública do serviço */
/* ------------------------------------------------------------------ */

/**
 * Abre a ficha da série: consulta o TMDB, faz upsert de série e temporadas
 * e devolve. Se o TMDB falhar, devolve o que houver localmente com aviso.
 */
export async function obterSerie(tmdbId) {
  try {
    const { serie, temporadas, extras } = await tmdb.detalhesSerie(tmdbId);
    const salva = await upsertSerie(serie);
    const temps = await upsertTemporadas(salva.id, temporadas);
    return { serie: salva, temporadas: temps, extras, fonte: 'tmdb', aviso: null };
  } catch (e) {
    if (e instanceof tmdb.ErroTmdb && !e.indisponivel) {
      throw new ErroHttp(404, 'Série não encontrada');
    }
    if (!(e instanceof tmdb.ErroTmdb)) throw e;

    const local = await serieLocal(tmdbId);
    if (!local) {
      throw new ErroHttp(503, 'Catálogo indisponível e esta série ainda não está salva localmente. Tente novamente em instantes.');
    }
    const temps = await temporadasLocais(local.id);
    return { serie: local, temporadas: temps, extras: null, fonte: 'cache', aviso: AVISO_CACHE };
  }
}

/**
 * Abre uma temporada: garante a série local, consulta episódios no TMDB,
 * faz upsert e devolve. Em falha do TMDB, usa os episódios locais.
 */
export async function obterTemporada(tmdbId, numero) {
  let serie = await serieLocal(tmdbId);
  if (!serie) {
    // primeira visita direto pela URL da temporada
    serie = (await obterSerie(tmdbId)).serie;
  }

  try {
    const { temporada, episodios } = await tmdb.detalhesTemporada(tmdbId, numero);
    const [temp] = await upsertTemporadas(serie.id, [temporada]);
    const eps = await upsertEpisodios(temp.id, episodios);
    const temporadas = await temporadasLocais(serie.id);
    return { serie, temporada: temp, temporadas, episodios: eps, fonte: 'tmdb', aviso: null };
  } catch (e) {
    if (e instanceof tmdb.ErroTmdb && !e.indisponivel) {
      throw new ErroHttp(404, 'Temporada não encontrada');
    }
    if (!(e instanceof tmdb.ErroTmdb)) throw e;

    const temp = ok(
      await supabaseAdmin
        .from('temporada')
        .select()
        .eq('serie_id', serie.id)
        .eq('numero', numero)
        .maybeSingle()
    );
    const eps = temp
      ? ok(await supabaseAdmin.from('episodio').select().eq('temporada_id', temp.id).order('numero'))
      : [];
    if (!temp || !eps.length) {
      throw new ErroHttp(503, 'Catálogo indisponível e os episódios desta temporada ainda não foram salvos localmente.');
    }
    const temporadas = await temporadasLocais(serie.id);
    return { serie, temporada: temp, temporadas, episodios: eps, fonte: 'cache', aviso: AVISO_CACHE };
  }
}

/** Busca no TMDB; se cair, procura no catálogo local por nome. */
export async function buscar(q, pagina) {
  try {
    return { ...(await tmdb.buscarSeries(q, pagina)), fonte: 'tmdb', aviso: null };
  } catch (e) {
    if (!(e instanceof tmdb.ErroTmdb)) throw e;
    const locais = ok(
      await supabaseAdmin
        .from('serie')
        .select('tmdb_id, nome, ano_estreia, poster_path, sinopse')
        .ilike('nome', `%${q.replace(/[%_]/g, '')}%`)
        .order('nome')
        .limit(20)
    );
    return {
      pagina: 1,
      total_paginas: 1,
      total: locais.length,
      resultados: locais,
      fonte: 'cache',
      aviso: 'A busca do TMDB está indisponível. Mostrando apenas séries já salvas no EpiLog.',
    };
  }
}

/** Destaques da semana; se cair, últimas séries abertas no EpiLog. */
export async function destaques() {
  try {
    return { resultados: await tmdb.seriesEmAlta(), fonte: 'tmdb', aviso: null };
  } catch (e) {
    if (!(e instanceof tmdb.ErroTmdb)) throw e;
    const locais = ok(
      await supabaseAdmin
        .from('serie')
        .select('tmdb_id, nome, ano_estreia, poster_path, sinopse')
        .order('atualizado_em', { ascending: false })
        .limit(20)
    );
    return { resultados: locais, fonte: 'cache', aviso: AVISO_CACHE };
  }
}

/** Garante que uma série exista localmente a partir do tmdb_id (para listas). */
export async function garantirSerieLocal(tmdbId) {
  const local = await serieLocal(tmdbId);
  if (local) return local;
  return (await obterSerie(tmdbId)).serie;
}
