import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authOpcional } from '../middleware/auth.js';
import { supabaseAnon } from '../config/supabase.js';
import { rota, ok, validar, idNumerico } from '../utils/http.js';
import * as catalogo from '../services/catalogo.js';

const router = Router();

// Protege a cota do TMDB: 120 requisições/min por IP
router.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

/** GET /api/catalogo/destaques — séries em alta na semana */
router.get(
  '/destaques',
  rota(async (_req, res) => {
    res.json(await catalogo.destaques());
  })
);

/** GET /api/catalogo/busca?q=&pagina= */
router.get(
  '/busca',
  rota(async (req, res) => {
    const { q, pagina } = validar(
      z.object({
        q: z.string().trim().min(1, 'Digite um título para buscar').max(100),
        pagina: z.coerce.number().int().min(1).max(500).default(1),
      }),
      req.query
    );
    res.json(await catalogo.buscar(q, pagina));
  })
);

/** GET /api/catalogo/series/:tmdbId — ficha + dados pessoais (se logado) */
router.get(
  '/series/:tmdbId',
  authOpcional,
  rota(async (req, res) => {
    const tmdbId = idNumerico(req.params.tmdbId, 'tmdbId');
    const ficha = await catalogo.obterSerie(tmdbId);
    const serieId = ficha.serie.id;

    // Estatísticas públicas de avaliações
    const notas = ok(await supabaseAnon.from('avaliacao').select('nota').eq('serie_id', serieId));
    const distribuicao = Array(10).fill(0);
    let soma = 0;
    for (const { nota } of notas) {
      const n = Number(nota);
      soma += n;
      distribuicao[Math.round(n * 2) - 1] += 1;
    }
    const comunidade = {
      total: notas.length,
      media: notas.length ? Math.round((soma / notas.length) * 10) / 10 : null,
      distribuicao,
    };

    let pessoal = null;
    if (req.user) {
      const uid = req.user.id;

      const [avaliacao, watchlist, registros] = await Promise.all([
        req.db.from('avaliacao').select('*').eq('serie_id', serieId).eq('perfil_id', uid).maybeSingle(),
        req.db.from('lista').select('id, item_lista(serie_id)').eq('perfil_id', uid).eq('tipo', 'watchlist').maybeSingle(),
        req.db
          .from('diario')
          .select('episodio_id, episodio:episodio_id!inner(temporada_id, temporada:temporada_id!inner(serie_id))')
          .eq('perfil_id', uid)
          .eq('episodio.temporada.serie_id', serieId),
      ]);

      const regs = ok(registros);
      const distintosPorTemporada = new Map();
      for (const r of regs) {
        const tid = r.episodio.temporada_id;
        if (!distintosPorTemporada.has(tid)) distintosPorTemporada.set(tid, new Set());
        distintosPorTemporada.get(tid).add(r.episodio_id);
      }

      const wl = ok(watchlist);
      pessoal = {
        avaliacao: ok(avaliacao),
        na_watchlist: !!wl?.item_lista?.some((i) => i.serie_id === serieId),
        watchlist_id: wl?.id ?? null,
        total_registros: regs.length,
        progresso: Object.fromEntries(
          ficha.temporadas.map((t) => [
            t.numero,
            { assistidos: distintosPorTemporada.get(t.id)?.size || 0, total: t.total_episodios || 0 },
          ])
        ),
      };
    }

    res.json({ ...ficha, comunidade, pessoal });
  })
);

/** GET /api/catalogo/series/:tmdbId/temporadas/:numero — episódios + progresso */
router.get(
  '/series/:tmdbId/temporadas/:numero',
  authOpcional,
  rota(async (req, res) => {
    const tmdbId = idNumerico(req.params.tmdbId, 'tmdbId');
    const numero = Number(req.params.numero);
    if (!Number.isInteger(numero) || numero < 0) {
      return res.status(400).json({ erro: 'Número de temporada inválido' });
    }

    const dados = await catalogo.obterTemporada(tmdbId, numero);
    let episodios = dados.episodios.map((e) => ({ ...e, vezes_assistido: 0, ultima_vez: null }));
    let progresso = null;

    if (req.user) {
      const regs = ok(
        await req.db
          .from('diario')
          .select('episodio_id, assistido_em, episodio:episodio_id!inner(temporada_id)')
          .eq('perfil_id', req.user.id)
          .eq('episodio.temporada_id', dados.temporada.id)
      );

      const porEp = new Map();
      for (const r of regs) {
        const atual = porEp.get(r.episodio_id) || { vezes: 0, ultima: null };
        atual.vezes += 1;
        if (!atual.ultima || r.assistido_em > atual.ultima) atual.ultima = r.assistido_em;
        porEp.set(r.episodio_id, atual);
      }

      episodios = episodios.map((e) => ({
        ...e,
        vezes_assistido: porEp.get(e.id)?.vezes || 0,
        ultima_vez: porEp.get(e.id)?.ultima || null,
      }));

      // RN: episódios DISTINTOS assistidos / total de episódios da temporada
      const total = episodios.length;
      const assistidos = porEp.size;
      progresso = {
        assistidos,
        total,
        percentual: total ? Math.round((assistidos / total) * 100) : 0,
        registros: regs.length,
      };
    }

    res.json({ ...dados, episodios, progresso });
  })
);

export default router;
