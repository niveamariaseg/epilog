import { Router } from 'express';
import { z } from 'zod';
import { exigirAuth, authOpcional } from '../middleware/auth.js';
import { rota, ok, validar, paginacao, idNumerico, ErroHttp } from '../utils/http.js';
import { SELECT_RESENHA, enriquecerResenhas } from '../services/resenhas.js';

const router = Router();

const schemaAvaliacao = z.object({
  nota: z.coerce
    .number()
    .min(0.5, 'A nota mínima é meia estrela')
    .max(5, 'A nota máxima é 5 estrelas')
    .refine((n) => Number.isInteger(n * 2), 'A nota deve variar de meia em meia estrela'),
  texto: z
    .string()
    .max(10000, 'A resenha pode ter até 10.000 caracteres')
    .optional()
    .nullable()
    .transform((t) => (t && t.trim() ? t.trim() : null)),
  contem_spoiler: z.boolean().optional().default(false),
});

/** GET /api/avaliacoes/recentes — resenhas públicas recentes (página inicial) */
router.get(
  '/recentes',
  authOpcional,
  rota(async (req, res) => {
    const lista = ok(
      await req.db
        .from('avaliacao')
        .select(SELECT_RESENHA)
        .not('texto', 'is', null)
        .order('publicado_em', { ascending: false })
        .limit(6)
    );
    res.json(await enriquecerResenhas(lista, req.user?.id));
  })
);

/** GET /api/avaliacoes/serie/:serieId?ordem=recentes|populares — resenhas da comunidade */
router.get(
  '/serie/:serieId',
  authOpcional,
  rota(async (req, res) => {
    const serieId = idNumerico(req.params.serieId, 'serieId');
    const { de, ate, pagina, limite } = paginacao(req.query, 10, 50);

    const { data, error, count } = await req.db
      .from('avaliacao')
      .select(SELECT_RESENHA, { count: 'exact' })
      .eq('serie_id', serieId)
      .not('texto', 'is', null)
      .order('publicado_em', { ascending: false })
      .range(de, ate);
    if (error) throw error;

    let resenhas = await enriquecerResenhas(data, req.user?.id);
    if (req.query.ordem === 'populares') {
      resenhas = resenhas.sort((a, b) => b.curtidas - a.curtidas || b.publicado_em.localeCompare(a.publicado_em));
    }
    res.json({ pagina, limite, total: count ?? 0, resenhas });
  })
);

/** PUT /api/avaliacoes/serie/:serieId — cria ou edita a (única) avaliação do usuário */
router.put(
  '/serie/:serieId',
  exigirAuth,
  rota(async (req, res) => {
    const serieId = idNumerico(req.params.serieId, 'serieId');
    const dados = validar(schemaAvaliacao, req.body);

    const salva = ok(
      await req.db
        .from('avaliacao')
        .upsert(
          { perfil_id: req.user.id, serie_id: serieId, ...dados },
          { onConflict: 'perfil_id,serie_id' }
        )
        .select(SELECT_RESENHA)
        .single()
    );
    const [enriquecida] = await enriquecerResenhas([salva], req.user.id);
    res.json(enriquecida);
  })
);

/** DELETE /api/avaliacoes/serie/:serieId — remove nota e resenha */
router.delete(
  '/serie/:serieId',
  exigirAuth,
  rota(async (req, res) => {
    const serieId = idNumerico(req.params.serieId, 'serieId');
    const removidas = ok(
      await req.db
        .from('avaliacao')
        .delete()
        .eq('serie_id', serieId)
        .eq('perfil_id', req.user.id)
        .select('id')
    );
    if (!removidas.length) throw new ErroHttp(404, 'Você ainda não avaliou esta série');
    res.status(204).end();
  })
);

/** POST /api/avaliacoes/:id/curtida — curtir */
router.post(
  '/:id/curtida',
  exigirAuth,
  rota(async (req, res) => {
    const { error } = await req.db
      .from('curtida')
      .insert({ perfil_id: req.user.id, avaliacao_id: req.params.id });
    // já curtida → idempotente
    if (error && error.code !== '23505') throw error;
    const { count } = await req.db
      .from('curtida')
      .select('*', { count: 'exact', head: true })
      .eq('avaliacao_id', req.params.id);
    res.json({ curtida_por_mim: true, curtidas: count ?? 0 });
  })
);

/** DELETE /api/avaliacoes/:id/curtida — descurtir */
router.delete(
  '/:id/curtida',
  exigirAuth,
  rota(async (req, res) => {
    ok(
      await req.db
        .from('curtida')
        .delete()
        .eq('perfil_id', req.user.id)
        .eq('avaliacao_id', req.params.id)
    );
    const { count } = await req.db
      .from('curtida')
      .select('*', { count: 'exact', head: true })
      .eq('avaliacao_id', req.params.id);
    res.json({ curtida_por_mim: false, curtidas: count ?? 0 });
  })
);

export default router;
