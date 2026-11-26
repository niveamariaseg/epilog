export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="carregando" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

/** Faixa de aviso (ex.: TMDB fora do ar, dados do cache). */
export function Aviso({ children, tipo = 'alerta' }) {
  if (!children) return null;
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</div>;
}

export function ErroCarga({ erro, onTentar }) {
  return (
    <div className="erro-carga">
      <p>{erro?.message || 'Algo deu errado.'}</p>
      {onTentar && (
        <button className="btn btn-contorno" onClick={() => onTentar()}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Vazio({ titulo, children }) {
  return (
    <div className="vazio">
      {titulo && <h3>{titulo}</h3>}
      {children}
    </div>
  );
}
