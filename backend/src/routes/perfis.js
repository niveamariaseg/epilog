import { Router } from 'express';
import { z } from 'zod';
import { exigirAuth, authOpcional } from '../middleware/auth.js';
import { supabaseAdmin, supabaseAnon } from '../config/supabase.js';
import { rota, ok, validar, ErroHttp } from '../utils/http.js';
import { SELECT_RESENHA, enriquecerResenhas } from '../services/resenhas.js';
import { resumirLista } from './listas.js';

const router = Router();

const REGEX_APELIDO = /^[a-z0-9_]{3,20}$/;
const schemaApelido = z
  .string()
  .trim()
  .toLowerCase()
  .regex(REGEX_APELIDO, 'Use de 3 a 20 caracteres: letras minúsculas, números ou _');

async function contar(tabela, coluna, valor) {
  const { count, error } = await supabaseAnon
    .from(tabela)
    .select('*', { count: 'exact', head: true })
    .eq(coluna, valor);
  if (error) throw error;
  return count ?? 0;
}

async function perfilPorApelido(apelido) {
  const perfil = ok(
    await supabaseAnon.from('perfil').select('id, apelido, criado_em').eq('apelido', apelido.toLowerCase()).maybeSingle()
  );
  if (!perfil) throw new ErroHttp(404, 'Perfil não encontrado');
  return perfil;
}

/** GET /api/perfis?busca= — encontrar pessoas para seguir */
router.get(
  '/',
  authOpcional,
  rota(async (req, res) => {
    const busca = String(req.query.busca || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (busca.length < 2) return res.json([]);
    const perfis = ok(
      await supabaseAnon.from('perfil').select('id, apelido, criado_em').ilike('apelido', `%${busca}%`).limit(20)
    );
    res.json(perfis);
  })
);

/** GET /api/perfis/disponivel/:apelido — usado no cadastro */
router.get(
  '/disponivel/:apelido',
  rota(async (req, res) => {
    const r = schemaApelido.safeParse(req.params.apelido);
    if (!r.success) return res.json({ disponivel: false, motivo: r.error.issues[0].message });
    const existe = ok(
      await supabaseAdmin.from('perfil').select('id').eq('apelido', r.data).maybeSingle()
    );
    res.json({ disponivel: !existe, motivo: existe ? 'Este apelido já está em uso' : null });
  })
);

/* ------------------------------- Meu perfil ------------------------------- */

/** GET /api/perfis/me — inclui e-mail (somente para o próprio usuário) */
router.get(
  '/me',
  exigirAuth,
  rota(async (req, res) => {
    const perfil = ok(await req.db.from('perfil').select('*').eq('id', req.user.id).single());
    res.json({ ...perfil, email: req.user.email });
  })
);

/** PATCH /api/perfis/me — edita apelido */
router.patch(
  '/me',
  exigirAuth,
  rota(async (req, res) => {
    const { apelido } = validar(z.object({ apelido: schemaApelido }), req.body);
    const { data, error } = await req.db
      .from('perfil')
      .update({ apelido })
      .eq('id', req.user.id)
      .select()
      .single();
    if (error?.code === '23505') throw new ErroHttp(409, 'Este apelido já está em uso');
    if (error) throw error;
    res.json({ ...data, email: req.user.email });
  })
);

/** GET /api/perfis/me/estatisticas — resumo para /me */
router.get(
  '/me/estatisticas',
  exigirAuth,
  rota(async (req, res) => {
    const uid = req.user.id;
    const anoAtual = new Date().getFullYear();

    const [diario, avaliacoes, listas, seguidores, seguindo, recentes] = await Promise.all([
      req.db
        .from('diario')
        .select('episodio_id, assistido_em, revisita, episodio:episodio_id!inner(duracao_min, temporada:temporada_id!inner(serie_id))')
        .eq('perfil_id', uid)
        .limit(20000),
      req.db.from('avaliacao').select('nota, texto').eq('perfil_id', uid),
      req.db.from('lista').select('id', { count: 'exact', head: true }).eq('perfil_id', uid),
      contar('seguidor', 'seguido_id', uid),
      contar('seguidor', 'seguidor_id', uid),
      req.db
        .from('diario')
        .select('id, assistido_em, revisita, episodio:episodio_id!inner(numero, nome, temporada:temporada_id!inner(numero, serie:serie_id!inner(tmdb_id, nome, poster_path)))')
        .eq('perfil_id', uid)
        .order('assistido_em', { ascending: false })
        .order('criado_em', { ascending: false })
        .limit(6),
    ]);

    const regs = ok(diario);
    const avs = ok(avaliacoes);
    if (listas.error) throw listas.error;

    const episodios = new Set(regs.map((r) => r.episodio_id));
    const series = new Set(regs.map((r) => r.episodio.temporada.serie_id));
    const minutos = regs.reduce((s, r) => s + (r.episodio.duracao_min || 0), 0);
    const notas = avs.map((a) => Number(a.nota));

    res.json({
      registros: regs.length,
      episodios_distintos: episodios.size,
      series_distintas: series.size,
      revisitas: regs.filter((r) => r.revisita).length,
      registros_este_ano: regs.filter((r) => r.assistido_em.startsWith(String(anoAtual))).length,
      horas_assistidas: Math.round(minutos / 60),
      avaliacoes: avs.length,
      resenhas: avs.filter((a) => a.texto).length,
      media_notas: notas.length ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : null,
      listas: listas.count ?? 0,
      seguidores,
      seguindo,
      recentes: ok(recentes),
    });
  })
);

/** GET /api/perfis/me/seguindo — quem eu sigo */
router.get(
  '/me/seguindo',
  exigirAuth,
  rota(async (req, res) => {
    const rel = ok(
      await req.db
        .from('seguidor')
        .select('criado_em, perfil:perfil!seguidor_seguido_id_fkey(id, apelido)')
        .eq('seguidor_id', req.user.id)
        .order('criado_em', { ascending: false })
    );
    res.json(rel.map((r) => r.perfil));
  })
);

/* ------------------------------ Perfil público ------------------------------ */

/**
 * GET /api/perfis/:apelido — perfil público.
 * RN: expõe apelido, listas PÚBLICAS e resenhas. Nunca e-mail, diário ou listas privadas.
 */
router.get(
  '/:apelido',
  authOpcional,
  rota(async (req, res) => {
    const perfil = await perfilPorApelido(req.params.apelido);

    const [listas, resenhas, seguidores, seguindo, euSigo, totalAvaliacoes] = await Promise.all([
      supabaseAnon
        .from('lista')
        .select(`id, titulo, descricao, tipo, visibilidade, criado_em, perfil_id,
                 itens:item_lista ( serie_id, ordem, serie:serie_id ( poster_path, nome ) )`)
        .eq('perfil_id', perfil.id)
        .eq('visibilidade', 'publica')
        .order('criado_em', { ascending: false }),
      supabaseAnon
        .from('avaliacao')
        .select(SELECT_RESENHA)
        .eq('perfil_id', perfil.id)
        .not('texto', 'is', null)
        .order('publicado_em', { ascending: false })
        .limit(30),
      contar('seguidor', 'seguido_id', perfil.id),
      contar('seguidor', 'seguidor_id', perfil.id),
      req.user
        ? supabaseAnon
            .from('seguidor')
            .select('seguidor_id')
            .eq('seguidor_id', req.user.id)
            .eq('seguido_id', perfil.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      contar('avaliacao', 'perfil_id', perfil.id),
    ]);

    res.json({
      perfil,
      sou_eu: req.user?.id === perfil.id,
      eu_sigo: !!ok(euSigo),
      seguidores,
      seguindo,
      total_avaliacoes: totalAvaliacoes,
      listas: ok(listas).map((l) => resumirLista(l)),
      resenhas: await enriquecerResenhas(ok(resenhas), req.user?.id),
    });
  })
);

/** POST /api/perfis/:apelido/seguir */
router.post(
  '/:apelido/seguir',
  exigirAuth,
  rota(async (req, res) => {
    const alvo = await perfilPorApelido(req.params.apelido);
    if (alvo.id === req.user.id) throw new ErroHttp(400, 'Você não pode seguir a si mesmo');
    const { error } = await req.db.from('seguidor').insert({ seguidor_id: req.user.id, seguido_id: alvo.id });
    if (error && error.code !== '23505') throw error;
    res.status(201).json({ eu_sigo: true, seguidores: await contar('seguidor', 'seguido_id', alvo.id) });
  })
);

/** DELETE /api/perfis/:apelido/seguir */
router.delete(
  '/:apelido/seguir',
  exigirAuth,
  rota(async (req, res) => {
    const alvo = await perfilPorApelido(req.params.apelido);
    ok(await req.db.from('seguidor').delete().eq('seguidor_id', req.user.id).eq('seguido_id', alvo.id));
    res.json({ eu_sigo: false, seguidores: await contar('seguidor', 'seguido_id', alvo.id) });
  })
);

export default router;
