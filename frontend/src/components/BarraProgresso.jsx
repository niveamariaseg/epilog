/** Barra de progresso de temporada: episódios distintos / total. */
export default function BarraProgresso({ assistidos = 0, total = 0, compacta = false }) {
  const pct = total ? Math.min(100, Math.round((assistidos / total) * 100)) : 0;
  const completa = total > 0 && assistidos >= total;
  return (
    <div className={`progresso ${compacta ? 'progresso-compacta' : ''}`}>
      <div
        className="progresso-trilho"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={assistidos}
        aria-label={`${assistidos} de ${total} episódios assistidos`}
      >
        <div className={`progresso-barra ${completa ? 'completa' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="progresso-texto">
        {assistidos}/{total}
        {!compacta && <span className="muted"> episódios · {pct}%</span>}
      </span>
    </div>
  );
}
