import { Link } from 'react-router-dom';

/** Marca do EpiLog: três barras de "episódios" em progresso + wordmark. */
export default function Logo({ tamanho = 26 }) {
  return (
    <Link to="/" className="logo" aria-label="EpiLog — página inicial">
      <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
        <rect x="6" y="12" width="52" height="10" rx="5" fill="var(--verde)" />
        <rect x="6" y="27" width="40" height="10" rx="5" fill="var(--azul)" />
        <rect x="6" y="42" width="28" height="10" rx="5" fill="var(--coral)" />
      </svg>
      <span>
        Epi<strong>Log</strong>
      </span>
    </Link>
  );
}
