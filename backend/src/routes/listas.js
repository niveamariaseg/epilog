import { Router } from 'express';
import { z } from 'zod';
import { exigirAuth, authOpcional } from '../middleware/auth.js';
import { rota, ok, validar, idNumerico, ErroHttp } from '../utils/http.js';
import { garantirSerieLocal } from '../services/catalogo.js';

const router = Router();

const SELECT_RESUMO = `
  id, titulo, descricao, tipo, visibilidade, criado_em, perfil_id,
  itens:item_lista ( serie_id, ordem, serie:serie_id ( poster_path, nome ) )
`;

/** Converte a lista com itens em resumo (contagem + 4 capas para o mosaico). */
export function resumirLista(l, serieId) {
  const itens = [...(l.itens || [])].sort((a, b) => a.ordem - b.ordem);
  const { itens: _omit, ...resto } = l;
  return {
    ...resto,
    total_itens: itens.length,
    capas: itens.slice(0, 4).map((i) => i.serie?.poster_path || null),
    contem_serie: serieId ? itens.some((i) => i.serie_id === serieId) : undefined,
  };
}

const schemaLista = z.object({
  titulo: z.string().trim().min(1, 'Informe um título').max(100, 'Título muito longo'),
  descricao: z
    .string()
    .max(1000, 'Descrição muito longa')
    .optional()
    .nullable()
    .transform((t) => (t && t.trim() ? t.trim() : null)),
  visibilidade: z.enum(['publica', 'privada']).default('publica'),
});

const schemaItem = z
  .object({
    serie_id: z.coerce.number().int().positive().optional(),
    tmdb_id: z.coerce.number().int().positive().optional(),
  })
  .refine((o) => o.serie_id || o.tmdb_id, 'Informe a série');

async function listaDoUsuario(req, id) {
  const lista = ok(
    await req.db.from('lista').select('id, tipo, perfil_id').eq('id', id).eq('perfil_id', req.user.id).maybeSingle()
  );
  if (!lista) throw new ErroHttp(404, 'Lista não encontrada');
  return lista;
}

async function watchlistDoUsuario(req) {
  const wl = ok(
    await req.db.from('lista').select('id').eq('perfil_id', req.user.id).eq('tipo', 'watchlist').maybeSingle()
  );
  if (!wl) throw new ErroHttp(500, 'Lista "Quero assistir" não encontrada para este perfil');
  return wl;
}

async function proximaOrdem(req, listaId) {
  const ultimo = ok(
    await req.db
      .from('item_lista')
      .select('ordem')
      .eq('lista_id', listaId)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle()
  );
  return (ultimo?.ordem ?? -1) + 1;
}

/* ---------------------------- Minhas listas ---------------------------- */

/** GET /api/listas/minhas?serie_id= — watchlist primeiro, depois custom */
router.get(
  '/minhas',
  exigirAuth,
  rota(async (req, res) => {
    const serieId = req.query.serie_id ? Number(req.query.serie_id) : null;
    const listas = ok(
      await req.db
        .from('lista')
        .select(SELECT_RESUMO)
        .eq('perfil_id', req.user.id)
        .order('tipo', { ascending: false }) // 'watchlist' > 'custom'
        .order('criado_em', { ascending: false })
    );
    res.json(listas.map((l) => resumirLista(l, serieId)));
  })
);

/** POST /api/listas — cria lista personalizada */
router.post(
  '/',
  exigirAuth,
  rota(async (req, res) => {
    const dados = validar(schemaLista, req.body);
    const lista = ok(
      await req.db
        .from('lista')
        .insert({ ...dados, perfil_id: req.user.id, tipo: 'custom' })
        .select()
        .single()
    );
    res.status(201).json(lista);
  })
);

/* ------------------------------ Watchlist ------------------------------ */

/** POST /api/listas/watchlist/:serieId — adiciona a "Quero assistir" */
router.post(
  '/watchlist/:serieId',
  exigirAuth,
  rota(async (req, res) => {
    const serieId = idNumerico(req.params.serieId, 'serieId');
    const wl = await watchlistDoUsuario(req);
    const ordem = await proximaOrdem(req, wl.id);
    const { error } = await req.db.from('item_lista').insert({ lista_id: wl.id, serie_id: serieId, ordem });
    if (error && error.code !== '23505') throw error;
    res.status(201).json({ na_watchlist: true });
  })
);

/** DELETE /api/listas/watchlist/:serieId — remove de "Quero assistir" */
router.delete(
  '/watchlist/:serieId',
  exigirAuth,
  rota(async (req, res) => {
    const serieId = idNumerico(req.params.serieId, 'serieId');
    const wl = await watchlistDoUsuario(req);
    ok(await req.db.from('item_lista').delete().eq('lista_id', wl.id).eq('serie_id', serieId));
    res.json({ na_watchlist: false });
  })
);

/* ------------------------------ Uma lista ------------------------------ */

/** GET /api/listas/:id — detalhe (público se visibilidade = publica) */
router.get(
  '/:id',
  authOpcional,
  rota(async (req, res) => {
    const lista = ok(
      await req.db
        .from('lista')
        .select(
          `id, titulo, descricao, tipo, visibilidade, criado_em, perfil_id,
           autor:perfil!lista_perfil_id_fkey ( id, apelido ),
           itens:item_lista ( ordem, adicionado_em,
             serie:serie_id ( id, tmdb_id, nome, poster_path, ano_estreia ) )`
        )
        .eq('id', req.params.id)
        .maybeSingle()
    );
    // RLS esconde listas privadas de terceiros → 404 (não revela existência)
    if (!lista) throw new ErroHttp(404, 'Lista não encontrada ou privada');

    lista.itens.sort((a, b) => a.ordem - b.ordem);
    res.json({ ...lista, sou_dono: req.user?.id === lista.perfil_id });
  })
);

/** PATCH /api/listas/:id — edita título/descrição/visibilidade */
router.patch(
  '/:id',
  exigirAuth,
  rota(async (req, res) => {
    const lista = await listaDoUsuario(req, req.params.id);
    const dados = validar(schemaLista.partial(), req.body);
    if (lista.tipo === 'watchlist' && (dados.titulo || dados.visibilidade === 'publica')) {
      throw new ErroHttp(400, 'A lista "Quero assistir" é sempre privada e não pode ser renomeada');
    }
    const atualizada = ok(
      await req.db.from('lista').update(dados).eq('id', lista.id).select().single()
    );
    res.json(atualizada);
  })
);

/** DELETE /api/listas/:id */
router.delete(
  '/:id',
  exigirAuth,
  rota(async (req, res) => {
    const lista = await listaDoUsuario(req, req.params.id);
    if (lista.tipo === 'watchlist') {
      throw new ErroHttp(400, 'A lista "Quero assistir" não pode ser excluída');
    }
    ok(await req.db.from('lista').delete().eq('id', lista.id));
    res.status(204).end();
  })
);

/** POST /api/listas/:id/itens — adiciona série ({ serie_id } ou { tmdb_id }) */
router.post(
  '/:id/itens',
  exigirAuth,
  rota(async (req, res) => {
    const lista = await listaDoUsuario(req, req.params.id);
    const { serie_id, tmdb_id } = validar(schemaItem, req.body);
    const serieId = serie_id || (await garantirSerieLocal(tmdb_id)).id;

    const ordem = await proximaOrdem(req, lista.id);
    const { error } = await req.db.from('item_lista').insert({ lista_id: lista.id, serie_id: serieId, ordem });
    if (error?.code === '23505') throw new ErroHttp(409, 'Esta série já está na lista');
    if (error) throw error;
    res.status(201).json({ lista_id: lista.id, serie_id: serieId, ordem });
  })
);

/** DELETE /api/listas/:id/itens/:serieId */
router.delete(
  '/:id/itens/:serieId',
  exigirAuth,
  rota(async (req, res) => {
    const lista = await listaDoUsuario(req, req.params.id);
    const serieId = idNumerico(req.params.serieId, 'serieId');
    ok(await req.db.from('item_lista').delete().eq('lista_id', lista.id).eq('serie_id', serieId));
    res.status(204).end();
  })
);

/** PUT /api/listas/:id/ordem — { serie_ids: [ordem desejada] } */
router.put(
  '/:id/ordem',
  exigirAuth,
  rota(async (req, res) => {
    const lista = await listaDoUsuario(req, req.params.id);
    const { serie_ids } = validar(
      z.object({ serie_ids: z.array(z.coerce.number().int().positive()).max(1000) }),
      req.body
    );

    const atuais = ok(await req.db.from('item_lista').select('serie_id').eq('lista_id', lista.id));
    const conjunto = new Set(atuais.map((i) => i.serie_id));
    if (serie_ids.length !== conjunto.size || !serie_ids.every((id) => conjunto.has(id))) {
      throw new ErroHttp(400, 'A nova ordem deve conter exatamente as séries da lista');
    }

    const resultados = await Promise.all(
      serie_ids.map((serieId, ordem) =>
        req.db.from('item_lista').update({ ordem }).eq('lista_id', lista.id).eq('serie_id', serieId)
      )
    );
    resultados.forEach(ok);
    res.json({ ok: true });
  })
);

export default router;
