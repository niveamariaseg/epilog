const IMG = 'https://image.tmdb.org/t/p';

/** URL de imagem do TMDB (ou null para usar o fallback visual). */
export function imagem(caminho, tamanho = 'w342') {
  return caminho ? `${IMG}/${tamanho}${caminho}` : null;
}

/** Data ISO (AAAA-MM-DD) → "12 de nov. de 2026" sem deslocamento de fuso. */
export function dataLonga(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function mesAno(iso) {
  const [a, m] = iso.slice(0, 10).split('-').map(Number);
  const s = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function diaDoMes(iso) {
  return Number(iso.slice(8, 10));
}

/** Timestamp → "há 3 h", "há 2 dias", ou data. */
export function tempoRelativo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `há ${Math.floor(diff / 86400)} d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Hoje no fuso local, formato do <input type="date">. */
export function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** S01E05 */
export function codigoEpisodio(temporada, episodio) {
  const p = (n) => String(n).padStart(2, '0');
  return `S${p(temporada)}E${p(episodio)}`;
}

export function nomeTemporada(t) {
  if (t.numero === 0) return t.nome || 'Especiais';
  return t.nome && !/^Temporada \d+$/i.test(t.nome) ? `T${t.numero} · ${t.nome}` : `Temporada ${t.numero}`;
}

export function notaTexto(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Cor estável a partir do apelido (avatar). */
export function corDoApelido(apelido = '') {
  let h = 0;
  for (const c of apelido) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 42%)`;
}

export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}
