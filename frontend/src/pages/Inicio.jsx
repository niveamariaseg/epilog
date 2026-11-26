import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useAuth } from '../context/AuthContext.jsx';
import SerieCard from '../components/SerieCard.jsx';
import ResenhaCard from '../components/ResenhaCard.jsx';
import { Aviso, Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeLupa } from '../components/Icones.jsx';

function ResultadosBusca({ q }) {
  // o componente é remontado a cada nova busca (key={q}), então a página começa em 1
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState([]);

  const { dados, erro, carregando, recarregar } = useCarregar(async () => {
    const r = await api(`/catalogo/busca?q=${encodeURIComponent(q)}&pagina=${pagina}`);
    setItens((atuais) => (pagina === 1 ? r.resultados : [...atuais, ...r.resultados]));
    return r;
  }, [pagina]);

  return (
    <section className="secao">
      <h1 className="titulo-secao">
        Resultados para <em>“{q}”</em>
        {dados && <span className="muted"> · {dados.total}</span>}
      </h1>
      <Aviso>{dados?.aviso}</Aviso>
      {erro && <ErroCarga erro={erro} onTentar={recarregar} />}
      {!erro && itens.length === 0 && !carregando && (
        <Vazio titulo="Nenhuma série encontrada">
          <p>Tente outro título ou verifique a grafia.</p>
        </Vazio>
      )}
      <div className="grade-posters">
        {itens.map((s) => (
          <SerieCard key={s.tmdb_id} serie={s} />
        ))}
      </div>
      {carregando && <Carregando />}
      {dados && !carregando && dados.pagina < dados.total_paginas && (
        <div className="centro">
          <button className="btn btn-contorno" onClick={() => setPagina((p) => p + 1)}>
            Carregar mais
          </button>
        </div>
      )}
    </section>
  );
}

function Destaques() {
  const destaques = useCarregar(() => api('/catalogo/destaques'), []);
  const resenhas = useCarregar(() => api('/avaliacoes/recentes'), []);

  return (
    <>
      <section className="secao">
        <div className="secao-cabecalho">
          <h2 className="titulo-secao">Em alta nesta semana</h2>
        </div>
        <Aviso>{destaques.dados?.aviso}</Aviso>
        {destaques.carregando && <Carregando />}
        {destaques.erro && <ErroCarga erro={destaques.erro} onTentar={destaques.recarregar} />}
        <div className="grade-posters">
          {destaques.dados?.resultados.slice(0, 18).map((s) => (
            <SerieCard key={s.tmdb_id} serie={s} />
          ))}
        </div>
      </section>

      {resenhas.dados?.length > 0 && (
        <section className="secao">
          <h2 className="titulo-secao">Resenhas recentes da comunidade</h2>
          <div className="lista-resenhas">
            {resenhas.dados.map((r) => (
              <ResenhaCard key={r.id} resenha={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function Inicio() {
  const [params] = useSearchParams();
  const q = params.get('q')?.trim();
  const { logado, perfil } = useAuth();
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');

  return (
    <div className="container">
      {!q && (
        <section className="hero">
          <h1>
            {logado && perfil ? (
              <>Bem-vindo de volta, <span className="destaque">{perfil.apelido}</span>.</>
            ) : (
              <>Cada episódio <span className="destaque">conta</span>.</>
            )}
          </h1>
          <p className="hero-sub">
            Registre o que assistiu, acompanhe o progresso de cada temporada, avalie séries e descubra o que seus amigos
            estão vendo.
          </p>
          <form
            className="hero-busca"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (termo.trim()) navigate(`/?q=${encodeURIComponent(termo.trim())}`);
            }}
          >
            <IconeLupa />
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Qual série você está vendo?"
              aria-label="Buscar séries por título"
            />
            <button className="btn btn-primario">Buscar</button>
          </form>
          {!logado && (
            <p className="hero-cta">
              <Link to="/entrar" className="btn btn-contorno">Criar conta grátis</Link>
            </p>
          )}
        </section>
      )}

      {q ? <ResultadosBusca key={q} q={q} /> : <Destaques />}
    </div>
  );
}
