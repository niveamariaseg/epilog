import { Router } from 'express';
import { exigirAuth } from '../middleware/auth.js';
import { rota, ok, paginacao } from '../utils/http.js';
import { SELECT_RESENHA, enriquecerResenhas } from '../services/resenhas.js';

const router = Router();

/**
 * GET /api/feed?pagina=&limite=
 * Resenhas/avaliações dos perfis seguidos, da mais recente para a mais antiga.
 * O feed é derivado (sem tabela própria): seguidor → avaliacao.
 */
router.get(
  '/',
  exigirAuth,
  rota(async (req, res) => {
    const { de, ate, pagina, limite } = paginacao(req.query, 20, 50);

    const seguidos = ok(
      await req.db.from('seguidor').select('seguido_id').eq('seguidor_id', req.user.id)
    ).map((s) => s.seguido_id);

    if (!seguidos.length) {
      return res.json({ pagina, limite, total: 0, seguindo: 0, resenhas: [] });
    }

    const { data, error, count } = await req.db
      .from('avaliacao')
      .select(SELECT_RESENHA, { count: 'exact' })
      .in('perfil_id', seguidos)
      .order('publicado_em', { ascending: false })
      .range(de, ate);
    if (error) throw error;

    res.json({
      pagina,
      limite,
      total: count ?? 0,
      seguindo: seguidos.length,
      resenhas: await enriquecerResenhas(data, req.user.id),
    });
  })
);

export default router;
