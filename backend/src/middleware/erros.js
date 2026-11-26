import { ErroHttp } from '../utils/http.js';

// Códigos do PostgreSQL/PostgREST → HTTP
const MAPA_PG = {
  23505: [409, 'Registro duplicado'],
  23503: [400, 'Referência inexistente'],
  23514: [400, 'Valor fora das regras permitidas'],
  '22P02': [400, 'Formato de dado inválido'],
  42501: [403, 'Você não tem permissão para esta ação'],
  PGRST116: [404, 'Não encontrado'],
};

export function naoEncontrado(_req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, _req, res, _next) {
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }

  if (err?.code && MAPA_PG[err.code]) {
    const [status, padrao] = MAPA_PG[err.code];
    // mensagens de RAISE EXCEPTION dos triggers são amigáveis — repassa
    const mensagem = err.code === '23514' && err.message && !/violates/.test(err.message)
      ? err.message
      : padrao;
    return res.status(status).json({ erro: mensagem });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  console.error('[EpiLog] Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
}
