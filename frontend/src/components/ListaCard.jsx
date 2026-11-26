import { Link } from 'react-router-dom';
import Poster from './Poster.jsx';
import { IconeCadeado } from './Icones.jsx';
import { plural } from '../lib/formatar.js';

/** Card de lista com mosaico de até 4 pôsteres sobrepostos (estilo "pilha"). */
export default function ListaCard({ lista, acoes }) {
  const capas = [...lista.capas, null, null, null, null].slice(0, 4);
  return (
    <div className="lista-card">
      <Link to={`/listas/${lista.id}`} className="lista-card-link">
        <div className="lista-mosaico" aria-hidden="true">
          {capas.map((c, i) => (
            <div key={i} className="lista-mosaico-item" style={{ zIndex: 4 - i }}>
              {c ? <Poster caminho={c} titulo="" tamanho="w185" /> : <div className="poster poster-placeholder" />}
            </div>
          ))}
        </div>
        <div className="lista-card-info">
          <h3>
            {lista.titulo}
            {lista.visibilidade === 'privada' && (
              <IconeCadeado width={14} height={14} className="icone-inline" aria-label="Privada" />
            )}
          </h3>
          <span className="muted">{plural(lista.total_itens, 'série', 'séries')}</span>
          {lista.descricao && <p className="lista-card-desc">{lista.descricao}</p>}
        </div>
      </Link>
      {acoes && <div className="lista-card-acoes">{acoes}</div>}
    </div>
  );
}
