import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import ResenhaCard from '../components/ResenhaCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeLupa } from '../components/Icones.jsx';

function EncontrarPessoas() {
  const [q, setQ] = useState('');
  const [perfis, setPerfis] = useState([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setPerfis([]);
      return undefined;
    }
    const t = setTimeout(() => api(`/perfis?busca=${encodeURIComponent(q.trim())}`).then(setPerfis).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="cartao encontrar-pessoas">
      <h2>Encontrar pessoas</h2>
      <label className="busca-topo busca-larga">
        <IconeLupa width={16} height={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por apelido…" aria-label="Buscar perfis por apelido" />
      </label>
      {perfis.length > 0 && (
        <ul className="lista-perfis">
          {perfis.map((p) => (
            <li key={p.id}>
              <Link to={`/u/${p.apelido}`}>
                <Avatar apelido={p.apelido} tamanho={28} /> {p.apelido}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** /feed — resenhas dos perfis seguidos, mais recentes primeiro. */
export default function Feed() {
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState([]);

  const { dados, erro, carregando, recarregar } = useCarregar(async () => {
    const r = await api(`/feed?pagina=${pagina}`);
    setItens((a) => (pagina === 1 ? r.resenhas : [...a, ...r.resenhas]));
    return r;
  }, [pagina]);

  return (
    <div className="container duas-colunas duas-colunas-feed">
      <section>
        <h1 className="titulo-pagina">Atividade</h1>
        <p className="muted">Resenhas e notas das pessoas que você segue.</p>

        {erro && <ErroCarga erro={erro} onTentar={recarregar} />}

        {dados && dados.seguindo === 0 && (
          <Vazio titulo="Você ainda não segue ninguém">
            <p>Siga perfis para ver as resenhas deles aqui. Procure pelo apelido ao lado ou visite o perfil de quem escreveu uma resenha que você curtiu.</p>
          </Vazio>
        )}
        {dados && dados.seguindo > 0 && itens.length === 0 && !carregando && (
          <Vazio titulo="Nada por aqui ainda">
            <p>As pessoas que você segue ainda não publicaram avaliações.</p>
          </Vazio>
        )}

        <div className="lista-resenhas">
          {itens.map((r) => (
            <ResenhaCard key={r.id} resenha={r} />
          ))}
        </div>

        {carregando && <Carregando />}
        {dados && !carregando && itens.length < dados.total && (
          <div className="centro">
            <button className="btn btn-contorno" onClick={() => setPagina((p) => p + 1)}>Carregar mais</button>
          </div>
        )}
      </section>
      <aside>
        <EncontrarPessoas />
      </aside>
    </div>
  );
}
