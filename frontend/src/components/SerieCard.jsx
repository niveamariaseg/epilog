import { Link } from 'react-router-dom';
import Poster from './Poster.jsx';

/** Card de série (pôster + título/ano). Aceita objetos do TMDB ou do banco local. */
export default function SerieCard({ serie, children, mostrarTitulo = true }) {
  return (
    <div className="serie-card">
      <Link to={`/series/${serie.tmdb_id}`} className="serie-card-link" title={serie.nome}>
        <Poster caminho={serie.poster_path} titulo={serie.nome} />
        {mostrarTitulo && (
          <div className="serie-card-info">
            <span className="serie-card-nome">{serie.nome}</span>
            {serie.ano_estreia && <span className="serie-card-ano">{serie.ano_estreia}</span>}
          </div>
        )}
      </Link>
      {children}
    </div>
  );
}
