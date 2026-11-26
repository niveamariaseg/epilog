/** Erro HTTP com status e mensagem amigável (pt-BR). */
export class ErroHttp extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

/** Envolve handlers async para que erros cheguem ao middleware de erro. */
export const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Lança se o Supabase devolveu erro; retorna data. */
export function ok({ data, error }) {
  if (error) throw error;
  return data;
}

/** Valida com um schema zod e devolve os dados limpos (ou 400). */
export function validar(schema, entrada) {
  const r = schema.safeParse(entrada);
  if (!r.success) {
    const primeira = r.error.issues[0];
    throw new ErroHttp(400, primeira?.message || 'Dados inválidos', r.error.issues);
  }
  return r.data;
}

/** Paginação simples via ?pagina=&limite= */
export function paginacao(query, limitePadrao = 20, limiteMax = 50) {
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
  const limite = Math.min(limiteMax, Math.max(1, parseInt(query.limite, 10) || limitePadrao));
  const de = (pagina - 1) * limite;
  return { pagina, limite, de, ate: de + limite - 1 };
}

/** Converte parâmetro numérico de rota, ou 400. */
export function idNumerico(valor, nome = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, `Parâmetro "${nome}" inválido`);
  return n;
}
