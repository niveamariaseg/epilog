import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useExigirLogin } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { tempoRelativo } from '../lib/formatar.js';
import { EstrelasExibir } from './Estrelas.jsx';
import { IconeCoracao } from './Icones.jsx';
import Poster from './Poster.jsx';
import Avatar from './Avatar.jsx';

/**
 * Card de resenha. Spoilers ficam ocultos até o leitor clicar em "Exibir spoiler"
 * (o próprio autor vê o texto sempre).
 * mostrarSerie: exibe pôster/título (feed, perfil); false na ficha da série.
 */
export default function ResenhaCard({ resenha, mostrarSerie = true, mostrarAutor = true }) {
  const [revelado, setRevelado] = useState(false);
  const [curtida, setCurtida] = useState({ minha: resenha.curtida_por_mim, total: resenha.curtidas });
  const [enviando, setEnviando] = useState(false);
  const exigirLogin = useExigirLogin();
  const notificar = useToast();

  const oculto = resenha.contem_spoiler && !revelado && !resenha.minha;
  const { serie, autor } = resenha;

  async function alternarCurtida() {
    if (enviando) return;
    setEnviando(true);
    const anterior = curtida;
    // atualização otimista
    setCurtida({ minha: !anterior.minha, total: anterior.total + (anterior.minha ? -1 : 1) });
    try {
      const r = await api(`/avaliacoes/${resenha.id}/curtida`, { metodo: anterior.minha ? 'DELETE' : 'POST' });
      setCurtida({ minha: r.curtida_por_mim, total: r.curtidas });
    } catch (e) {
      setCurtida(anterior);
      notificar(e.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="resenha">
      {mostrarSerie && serie && (
        <Link to={`/series/${serie.tmdb_id}`} className="resenha-poster" aria-label={serie.nome}>
          <Poster caminho={serie.poster_path} titulo={serie.nome} tamanho="w185" />
        </Link>
      )}

      <div className="resenha-corpo">
        {mostrarSerie && serie && (
          <h3 className="resenha-titulo">
            <Link to={`/series/${serie.tmdb_id}`}>{serie.nome}</Link>
            {serie.ano_estreia && <span className="muted"> {serie.ano_estreia}</span>}
          </h3>
        )}

        <div className="resenha-meta">
          {mostrarAutor && autor && (
            <Link to={`/u/${autor.apelido}`} className="resenha-autor">
              <Avatar apelido={autor.apelido} tamanho={22} />
              <span>{autor.apelido}</span>
            </Link>
          )}
          <EstrelasExibir nota={resenha.nota} tamanho="sm" />
          <time dateTime={resenha.publicado_em} className="muted" title={new Date(resenha.publicado_em).toLocaleString('pt-BR')}>
            {tempoRelativo(resenha.publicado_em)}
            {resenha.atualizado_em && ' · editada'}
          </time>
        </div>

        {resenha.texto &&
          (oculto ? (
            <div className="spoiler-mascara">
              <p>Esta resenha contém spoilers.</p>
              <button type="button" className="btn btn-sm btn-contorno" onClick={() => setRevelado(true)}>
                Exibir spoiler
              </button>
            </div>
          ) : (
            <div className="resenha-texto">
              {resenha.contem_spoiler && <span className="badge badge-coral">Spoiler</span>}
              {resenha.texto.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}

        <div className="resenha-acoes">
          <button
            type="button"
            className={`btn-curtir ${curtida.minha ? 'ativo' : ''}`}
            aria-pressed={curtida.minha}
            onClick={() => exigirLogin(alternarCurtida)}
            disabled={enviando}
          >
            <IconeCoracao cheio={curtida.minha} width={16} height={16} />
            <span>{curtida.minha ? 'Curtiu' : 'Curtir'}</span>
            {curtida.total > 0 && <span className="contador">{curtida.total}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
