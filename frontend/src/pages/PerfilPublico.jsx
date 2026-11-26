import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useExigirLogin } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import ResenhaCard from '../components/ResenhaCard.jsx';
import ListaCard from '../components/ListaCard.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';

/**
 * /u/:apelido — apelido, listas públicas e resenhas.
 * Nunca mostra e-mail, diário ou listas privadas (a API nem devolve).
 */
export default function PerfilPublico() {
  const { apelido } = useParams();
  const exigirLogin = useExigirLogin();
  const notificar = useToast();
  const [aba, setAba] = useState('resenhas');
  const [seguindoOcupado, setSeguindoOcupado] = useState(false);

  const { dados, erro, carregando, recarregar, setDados } = useCarregar(
    () => api(`/perfis/${encodeURIComponent(apelido)}`),
    [apelido]
  );

  if (carregando) return <Carregando />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={erro.status === 404 ? null : recarregar} /></div>;
  if (!dados) return null;

  const { perfil } = dados;

  async function alternarSeguir() {
    setSeguindoOcupado(true);
    try {
      const r = await api(`/perfis/${perfil.apelido}/seguir`, { metodo: dados.eu_sigo ? 'DELETE' : 'POST' });
      setDados({ ...dados, eu_sigo: r.eu_sigo, seguidores: r.seguidores });
      notificar(r.eu_sigo ? `Você agora segue ${perfil.apelido}` : `Você deixou de seguir ${perfil.apelido}`);
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setSeguindoOcupado(false);
    }
  }

  return (
    <div className="container">
      <header className="perfil-cabecalho">
        <Avatar apelido={perfil.apelido} tamanho={88} />
        <div className="perfil-identidade">
          <h1>{perfil.apelido}</h1>
          <p className="muted">
            No EpiLog desde {new Date(perfil.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          {dados.sou_eu ? (
            <Link to="/me" className="btn btn-sm btn-contorno">Editar perfil</Link>
          ) : (
            <button
              className={`btn btn-sm ${dados.eu_sigo ? 'btn-contorno' : 'btn-primario'}`}
              onClick={() => exigirLogin(alternarSeguir)}
              disabled={seguindoOcupado}
            >
              {dados.eu_sigo ? 'Seguindo ✓' : 'Seguir'}
            </button>
          )}
        </div>
        <dl className="perfil-numeros">
          <div><dt>Avaliações</dt><dd>{dados.total_avaliacoes}</dd></div>
          <div><dt>Listas</dt><dd>{dados.listas.length}</dd></div>
          <div><dt>Seguidores</dt><dd>{dados.seguidores}</dd></div>
          <div><dt>Seguindo</dt><dd>{dados.seguindo}</dd></div>
        </dl>
      </header>

      <div className="abas" role="tablist">
        <button role="tab" aria-selected={aba === 'resenhas'} className={aba === 'resenhas' ? 'ativo' : ''} onClick={() => setAba('resenhas')}>
          Resenhas <span className="muted">{dados.resenhas.length}</span>
        </button>
        <button role="tab" aria-selected={aba === 'listas'} className={aba === 'listas' ? 'ativo' : ''} onClick={() => setAba('listas')}>
          Listas <span className="muted">{dados.listas.length}</span>
        </button>
      </div>

      {aba === 'resenhas' &&
        (dados.resenhas.length ? (
          <div className="lista-resenhas">
            {dados.resenhas.map((r) => (
              <ResenhaCard key={r.id} resenha={r} mostrarAutor={false} />
            ))}
          </div>
        ) : (
          <Vazio titulo="Nenhuma resenha publicada ainda" />
        ))}

      {aba === 'listas' &&
        (dados.listas.length ? (
          <div className="grade-listas">
            {dados.listas.map((l) => (
              <ListaCard key={l.id} lista={l} />
            ))}
          </div>
        ) : (
          <Vazio titulo="Nenhuma lista pública" />
        ))}
    </div>
  );
}
