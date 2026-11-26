import { Router } from 'express';
import { z } from 'zod';
import { exigirAuth } from '../middleware/auth.js';
import { rota, ok, validar, paginacao, ErroHttp } from '../utils/http.js';

const router = Router();
router.use(exigirAuth); // RN: diário é estritamente privado

const SELECT_DIARIO = `
  id, assistido_em, revisita, criado_em, episodio_id,
  episodio:episodio_id!inner (
    id, numero, nome, still_path,
    temporada:temporada_id!inner (
      id, numero,
      serie:serie_id!inner ( id, tmdb_id, nome, poster_path, ano_estreia )
    )
  )
`;

// Aceita até "amanhã" em UTC para tolerar fusos horários
const dataValida = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(d)), 'Data inválida')
  .refine((d) => {
    const limite = new Date();
    limite.setUTCDate(limite.getUTCDate() + 1);
    return d <= limite.toISOString().slice(0, 10);
  }, 'A data não pode estar no futuro')
  .refine((d) => d >= '1940-01-01', 'Data muito antiga');

const schemaNovo = z.object({
  episodio_id: z.coerce.number().int().positive('Episódio inválido'),
  assistido_em: dataValida,
  revisita: z.boolean().optional(),
});

const schemaLote = z.object({
  episodio_ids: z.array(z.coerce.number().int().positive()).min(1).max(200),
  assistido_em: dataValida,
});

const schemaEdicao = z
  .object({ assistido_em: dataValida.optional(), revisita: z.boolean().optional() })
  .refine((o) => Object.keys(o).length > 0, 'Nada para atualizar');

/** GET /api/diario?pagina=&limite=&serie_id=&de=&ate=&revisita= */
router.get(
  '/',
  rota(async (req, res) => {
    const { de, ate, limite, pagina } = paginacao(req.query, 30, 100);
    let q = req.db
      .from('diario')
      .select(SELECT_DIARIO, { count: 'exact' })
      .eq('perfil_id', req.user.id)
      .order('assistido_em', { ascending: false })
      .order('criado_em', { ascending: false })
      .range(de, ate);

    if (req.query.serie_id) q = q.eq('episodio.temporada.serie_id', Number(req.query.serie_id));
    if (req.query.de) q = q.gte('assistido_em', req.query.de);
    if (req.query.ate) q = q.lte('assistido_em', req.query.ate);
    if (req.query.revisita === 'true') q = q.eq('revisita', true);
    if (req.query.revisita === 'false') q = q.eq('revisita', false);

    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ pagina, limite, total: count ?? 0, registros: data });
  })
);

/** GET /api/diario/series — séries presentes no diário (para o filtro) */
router.get(
  '/series',
  rota(async (req, res) => {
    const regs = ok(
      await req.db
        .from('diario')
        .select('episodio:episodio_id!inner(temporada:temporada_id!inner(serie:serie_id!inner(id, nome)))')
        .eq('perfil_id', req.user.id)
        .limit(5000)
    );
    const mapa = new Map();
    for (const r of regs) {
      const s = r.episodio.temporada.serie;
      mapa.set(s.id, s);
    }
    res.json([...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
  })
);

/** POST /api/diario — registra uma visualização */
router.post(
  '/',
  rota(async (req, res) => {
    const dados = validar(schemaNovo, req.body);

    let revisita = dados.revisita;
    if (revisita === undefined) {
      // Se já existe registro do episódio, marca como revisita automaticamente
      const { count, error } = await req.db
        .from('diario')
        .select('id', { count: 'exact', head: true })
        .eq('perfil_id', req.user.id)
        .eq('episodio_id', dados.episodio_id);
      if (error) throw error;
      revisita = (count || 0) > 0;
    }

    const registro = ok(
      await req.db
        .from('diario')
        .insert({ perfil_id: req.user.id, episodio_id: dados.episodio_id, assistido_em: dados.assistido_em, revisita })
        .select(SELECT_DIARIO)
        .single()
    );
    res.status(201).json(registro);
  })
);

/** POST /api/diario/lote — marca vários episódios (ex.: temporada inteira) */
router.post(
  '/lote',
  rota(async (req, res) => {
    const { episodio_ids, assistido_em } = validar(schemaLote, req.body);
    const unicos = [...new Set(episodio_ids)];

    // Só registra os que ainda não foram vistos (evita poluir o diário)
    const jaVistos = ok(
      await req.db.from('diario').select('episodio_id').eq('perfil_id', req.user.id).in('episodio_id', unicos)
    );
    const vistos = new Set(jaVistos.map((r) => r.episodio_id));
    const novos = unicos.filter((id) => !vistos.has(id));

    if (!novos.length) return res.json({ inseridos: 0 });

    ok(
      await req.db
        .from('diario')
        .insert(novos.map((episodio_id) => ({ perfil_id: req.user.id, episodio_id, assistido_em, revisita: false })))
    );
    res.status(201).json({ inseridos: novos.length });
  })
);

/** PATCH /api/diario/:id — edita data e/ou revisita */
router.patch(
  '/:id',
  rota(async (req, res) => {
    const dados = validar(schemaEdicao, req.body);
    const registro = ok(
      await req.db
        .from('diario')
        .update(dados)
        .eq('id', req.params.id)
        .eq('perfil_id', req.user.id)
        .select(SELECT_DIARIO)
        .maybeSingle()
    );
    if (!registro) throw new ErroHttp(404, 'Registro não encontrado');
    res.json(registro);
  })
);

/** DELETE /api/diario/:id */
router.delete(
  '/:id',
  rota(async (req, res) => {
    const removidos = ok(
      await req.db.from('diario').delete().eq('id', req.params.id).eq('perfil_id', req.user.id).select('id')
    );
    if (!removidos.length) throw new ErroHttp(404, 'Registro não encontrado');
    res.status(204).end();
  })
);

export default router;
