import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { codigoEpisodio, dataLonga, notaTexto } from '../lib/formatar.js';
import Avatar from '../components/Avatar.jsx';
import Poster from '../components/Poster.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';

function EditarApelido() {
  const { perfil, setPerfil } = useAuth();
  const notificar = useToast();
  const [valor, setValor] = useState(perfil?.apelido || '');
  const [disp, setDisp] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setValor(perfil?.apelido || '');
  }, [perfil?.apelido]);

  useEffect(() => {
    if (!valor || valor === perfil?.apelido) {
      setDisp(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        setDisp(await api(`/perfis/disponivel/${encodeURIComponent(valor)}`));
      } catch {
        setDisp(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [valor, perfil?.apelido]);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const p = await api('/perfis/me', { metodo: 'PATCH', corpo: { apelido: valor } });
      setPerfil(p);
      setDisp(null);
      notificar('Apelido atualizado');
    } catch (e2) {
      notificar(e2.message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  const inalterado = valor === perfil?.apelido;
  return (
    <form className="form cartao" onSubmit={salvar}>
      <h2>Editar perfil</h2>
      <label className="campo">
        <span>Apelido</span>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/\s/g, '').toLowerCase())}
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]{3,20}"
          required
        />
        <small className={disp ? (disp.disponivel ? 'texto-ok' : 'texto-erro') : 'muted'}>
          {disp ? (disp.disponivel ? '✓ Disponível' : disp.motivo) : '3–20 caracteres: letras minúsculas, números ou _'}
        </small>
      </label>
      <label className="campo">
        <span>E-mail <span className="muted">(privado)</span></span>
        <input value={perfil?.email || ''} disabled />
      </label>
      <div className="form-acoes">
        <button className="btn btn-primario" disabled={salvando || inalterado || (disp && !disp.disponivel)}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function Me() {
  const { perfil } = useAuth();
  const { dados: est, erro, carregando, recarregar } = useCarregar(() => api('/perfis/me/estatisticas'), []);
  const seguindo = useCarregar(() => api('/perfis/me/seguindo'), []);

  if (!perfil || carregando) return <Carregando />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={recarregar} /></div>;

  const numeros = [
    ['Episódios vistos', est.episodios_distintos],
    ['Registros no diário', est.registros],
    ['Séries', est.series_distintas],
    ['Horas (aprox.)', est.horas_assistidas],
    ['Neste ano', est.registros_este_ano],
    ['Avaliações', est.avaliacoes],
    ['Média das notas', est.media_notas != null ? notaTexto(est.media_notas) : '–'],
    ['Listas', est.listas],
  ];

  return (
    <div className="container">
      <header className="perfil-cabecalho">
        <Avatar apelido={perfil.apelido} tamanho={88} />
        <div className="perfil-identidade">
          <h1>{perfil.apelido}</h1>
          <p className="muted">
            <Link to={`/u/${perfil.apelido}`}>Ver meu perfil público →</Link>
          </p>
        </div>
        <dl className="perfil-numeros">
          <div><dt>Seguidores</dt><dd>{est.seguidores}</dd></div>
          <div><dt>Seguindo</dt><dd>{est.seguindo}</dd></div>
          <div><dt>Resenhas</dt><dd>{est.resenhas}</dd></div>
        </dl>
      </header>

      <section className="secao">
        <h2 className="titulo-secao">Estatísticas</h2>
        <div className="grade-estatisticas">
          {numeros.map(([rotulo, valor]) => (
            <div key={rotulo} className="estatistica">
              <strong>{valor}</strong>
              <span>{rotulo}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="duas-colunas">
        <section className="secao">
          <div className="secao-cabecalho">
            <h2 className="titulo-secao">Assistidos recentemente</h2>
            <Link to="/me/diario">Diário completo →</Link>
          </div>
          {est.recentes.length === 0 ? (
            <Vazio titulo="Seu diário está vazio">
              <p>Abra uma série, escolha uma temporada e registre o primeiro episódio.</p>
              <Link to="/" className="btn btn-primario">Explorar séries</Link>
            </Vazio>
          ) : (
            <ul className="recentes">
              {est.recentes.map((r) => {
                const s = r.episodio.temporada.serie;
                return (
                  <li key={r.id}>
                    <Link to={`/series/${s.tmdb_id}/temporadas/${r.episodio.temporada.numero}`}>
                      <Poster caminho={s.poster_path} titulo={s.nome} tamanho="w92" className="poster-micro" />
                      <div>
                        <strong>{s.nome}</strong>
                        <span className="muted">
                          {codigoEpisodio(r.episodio.temporada.numero, r.episodio.numero)} · {dataLonga(r.assistido_em)}
                          {r.revisita && ' · revisita'}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className="titulo-secao">Quem eu sigo</h2>
          {seguindo.dados?.length ? (
            <ul className="lista-perfis">
              {seguindo.dados.map((p) => (
                <li key={p.id}>
                  <Link to={`/u/${p.apelido}`}>
                    <Avatar apelido={p.apelido} tamanho={28} /> {p.apelido}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Você ainda não segue ninguém. <Link to="/feed">Encontre pessoas</Link>.
            </p>
          )}
        </section>

        <EditarApelido />
      </div>
    </div>
  );
}
