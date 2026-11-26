import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';
import { useAuth, caminhoLogin } from '../context/AuthContext.jsx';
import { IconeLupa, IconeMenu, IconeX } from './Icones.jsx';

function Busca({ aoBuscar }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');

  useEffect(() => {
    setQ(params.get('q') || '');
  }, [params]);

  return (
    <form
      className="busca-topo"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) {
          navigate(`/?q=${encodeURIComponent(q.trim())}`);
          aoBuscar?.();
        }
      }}
    >
      <IconeLupa width={16} height={16} />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar séries…"
        aria-label="Buscar séries"
      />
    </form>
  );
}

function MenuUsuario() {
  const { perfil, sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const apelido = perfil?.apelido || '…';
  return (
    <div className="menu-usuario" ref={ref}>
      <button
        type="button"
        className="menu-usuario-botao"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
      >
        <Avatar apelido={apelido} tamanho={28} />
        <span className="menu-usuario-nome">{apelido}</span>
      </button>
      {aberto && (
        <div className="menu-usuario-lista" role="menu" onClick={() => setAberto(false)}>
          <Link role="menuitem" to="/me">Meu perfil</Link>
          <Link role="menuitem" to="/me/diario">Diário</Link>
          <Link role="menuitem" to="/me/listas">Minhas listas</Link>
          <Link role="menuitem" to="/feed">Atividade</Link>
          {perfil && <Link role="menuitem" to={`/u/${perfil.apelido}`}>Ver perfil público</Link>}
          <hr />
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await sair();
              navigate('/');
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Cabecalho() {
  const { logado, pronto } = useAuth();
  const location = useLocation();
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    setMenuMobile(false);
  }, [location.pathname, location.search]);

  return (
    <header className="topo">
      <div className="container topo-interno">
        <Logo />
        <button
          className="btn-icone topo-hamburguer"
          onClick={() => setMenuMobile((m) => !m)}
          aria-label={menuMobile ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuMobile}
        >
          {menuMobile ? <IconeX /> : <IconeMenu />}
        </button>

        <nav className={`topo-nav ${menuMobile ? 'aberto' : ''}`} aria-label="Principal">
          <NavLink to="/" end>Séries</NavLink>
          {logado && (
            <>
              <NavLink to="/me/diario">Diário</NavLink>
              <NavLink to="/me/listas">Listas</NavLink>
              <NavLink to="/feed">Atividade</NavLink>
            </>
          )}
          <NavLink to="/sobre">Sobre</NavLink>
          <Busca aoBuscar={() => setMenuMobile(false)} />
          {pronto &&
            (logado ? (
              <MenuUsuario />
            ) : (
              <Link to={caminhoLogin(location)} className="btn btn-primario btn-sm">
                Entrar
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}

function Rodape() {
  return (
    <footer className="rodape">
      <div className="container rodape-interno">
        <div>
          <Logo tamanho={20} />
          <p className="muted">Diário e catálogo de séries de TV · UDESC Joinville · OTES-02 · 2026</p>
        </div>
        <p className="rodape-tmdb">
          Dados de séries fornecidos por{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a>.{' '}
          Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.{' '}
          <Link to="/sobre">Saiba mais</Link>
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a href="#conteudo" className="pular-conteudo">Pular para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo" className="principal">
        <Outlet />
      </main>
      <Rodape />
    </>
  );
}
