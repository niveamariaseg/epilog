import { env } from '../config/env.js';

const BASE = 'https://api.themoviedb.org/3';
const TIMEOUT_MS = 8000;
const CACHE_MAX = 500;

/** Erro específico do TMDB para diferenciar "não existe" de "fora do ar". */
export class ErroTmdb extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status; // 404 = não existe; 0/5xx/429 = indisponível
  }
  get indisponivel() {
    return this.status !== 404;
  }
}

// Cache LRU simples em memória (respeita limites de requisição do TMDB)
const cache = new Map();

function lerCache(chave) {
  const item = cache.get(chave);
  if (!item) return undefined;
  if (item.expira < Date.now()) {
    cache.delete(chave);
    return undefined;
  }
  cache.delete(chave);
  cache.set(chave, item); // move para o fim (mais recente)
  return item.dados;
}

function gravarCache(chave, dados) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(chave, { dados, expira: Date.now() + env.tmdbCacheTtl });
}

/** GET na API v3 do TMDB, autenticado com o token de leitura (Bearer). */
export async function tmdbGet(caminho, params = {}) {
  const url = new URL(BASE + caminho);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const chave = url.toString();

  const emCache = lerCache(chave);
  if (emCache !== undefined) return emCache;

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);

  let resp;
  try {
    resp = await fetch(chave, {
      headers: { Authorization: `Bearer ${env.tmdbToken}`, accept: 'application/json' },
      signal: controle.signal,
    });
  } catch (e) {
    throw new ErroTmdb(0, e.name === 'AbortError' ? 'TMDB não respondeu a tempo' : 'Falha de rede ao consultar o TMDB');
  } finally {
    clearTimeout(timer);
  }

  if (resp.status === 404) throw new ErroTmdb(404, 'Não encontrado no TMDB');
  if (resp.status === 429) throw new ErroTmdb(429, 'Limite de requisições do TMDB atingido');
  if (!resp.ok) throw new ErroTmdb(resp.status, `TMDB respondeu ${resp.status}`);

  const dados = await resp.json();
  gravarCache(chave, dados);
  return dados;
}

const texto = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);
const ano = (data) => (data && /^\d{4}/.test(data) ? Number(data.slice(0, 4)) : null);

/** Busca séries por título (pt-BR). */
export async function buscarSeries(query, pagina = 1) {
  const r = await tmdbGet('/search/tv', {
    query,
    page: pagina,
    language: 'pt-BR',
    include_adult: false,
  });
  return {
    pagina: r.page,
    total_paginas: r.total_pages,
    total: r.total_results,
    resultados: (r.results || []).map(resumoSerie),
  };
}

/** Séries em alta na semana (para a página inicial). */
export async function seriesEmAlta() {
  const r = await tmdbGet('/trending/tv/week', { language: 'pt-BR' });
  return (r.results || []).map(resumoSerie);
}

function resumoSerie(s) {
  return {
    tmdb_id: s.id,
    nome: texto(s.name) || texto(s.original_name) || 'Sem título',
    nome_original: s.original_name,
    ano_estreia: ano(s.first_air_date),
    poster_path: s.poster_path || null,
    sinopse: texto(s.overview),
    nota_tmdb: typeof s.vote_average === 'number' ? s.vote_average : null,
  };
}

/** Ficha da série com fallback de sinopse pt-BR → en-US. */
export async function detalhesSerie(tmdbId) {
  const pt = await tmdbGet(`/tv/${tmdbId}`, { language: 'pt-BR' });

  let sinopse = texto(pt.overview);
  let sinopseIdioma = sinopse ? 'pt-BR' : null;

  if (!sinopse) {
    try {
      const en = await tmdbGet(`/tv/${tmdbId}`, { language: 'en-US' });
      sinopse = texto(en.overview);
      sinopseIdioma = sinopse ? 'en-US' : null;
    } catch {
      /* sem sinopse em inglês: a interface usa texto padrão */
    }
  }

  return {
    serie: {
      tmdb_id: pt.id,
      nome: texto(pt.name) || texto(pt.original_name) || 'Sem título',
      sinopse,
      sinopse_idioma: sinopseIdioma,
      poster_path: pt.poster_path || null,
      backdrop_path: pt.backdrop_path || null,
      ano_estreia: ano(pt.first_air_date),
      generos: (pt.genres || []).map((g) => g.name),
      total_temporadas: pt.number_of_seasons ?? null,
    },
    temporadas: (pt.seasons || []).map((t) => ({
      numero: t.season_number,
      nome: texto(t.name),
      poster_path: t.poster_path || null,
      total_episodios: t.episode_count ?? null,
    })),
    extras: {
      nome_original: pt.original_name,
      situacao: pt.status,
      em_producao: pt.in_production,
      criadores: (pt.created_by || []).map((c) => c.name),
      emissoras: (pt.networks || []).map((n) => n.name),
      ultimo_ano: ano(pt.last_air_date),
      nota_tmdb: pt.vote_average ?? null,
      tagline: texto(pt.tagline),
    },
  };
}

/** Temporada com episódios, completando sinopses vazias com en-US. */
export async function detalhesTemporada(tmdbId, numero) {
  const pt = await tmdbGet(`/tv/${tmdbId}/season/${numero}`, { language: 'pt-BR' });
  const episodiosPt = pt.episodes || [];

  let mapaEn = new Map();
  if (episodiosPt.some((e) => !texto(e.overview))) {
    try {
      const en = await tmdbGet(`/tv/${tmdbId}/season/${numero}`, { language: 'en-US' });
      mapaEn = new Map((en.episodes || []).map((e) => [e.episode_number, e]));
    } catch {
      /* segue só com pt-BR */
    }
  }

  return {
    temporada: {
      numero: pt.season_number,
      nome: texto(pt.name),
      poster_path: pt.poster_path || null,
      total_episodios: episodiosPt.length,
    },
    episodios: episodiosPt.map((e) => {
      let sinopse = texto(e.overview);
      let idioma = sinopse ? 'pt-BR' : null;
      if (!sinopse) {
        const en = mapaEn.get(e.episode_number);
        sinopse = texto(en?.overview);
        idioma = sinopse ? 'en-US' : null;
      }
      const nomeEn = mapaEn.get(e.episode_number)?.name;
      // TMDB devolve "Episódio N" quando não há tradução do título
      const nome = texto(e.name) && !/^Episódio \d+$/.test(e.name) ? e.name : texto(nomeEn) || texto(e.name);
      return {
        numero: e.episode_number,
        nome,
        sinopse,
        sinopse_idioma: idioma,
        data_exibicao: e.air_date || null,
        still_path: e.still_path || null,
        duracao_min: e.runtime ?? null,
      };
    }),
  };
}
