import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useAuth, useExigirLogin } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { codigoEpisodio, dataLonga, hojeISO, imagem, nomeTemporada } from '../lib/formatar.js';
import BarraProgresso from '../components/BarraProgresso.jsx';
import ModalRegistro from '../components/ModalRegistro.jsx';
import Poster from '../components/Poster.jsx';
import { Aviso, Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeOlho, IconeMais, IconeRepetir } from '../components/Icones.jsx';

function Episodio({ ep, temporadaNumero, serieNome, logado, aoRegistrar, aoSalvar }) {
  const [aberto, setAberto] = useState(false);
  const visto = ep.vezes_assistido > 0;
  const futuro = ep.data_exibicao && ep.data_exibicao > hojeISO();
  const still = imagem(ep.still_path, 'w300');

  return (
    <li className={`episodio ${visto ? 'visto' : ''}`}>
      <div className="episodio-still">
        {still ? <img src={still} alt="" loading="lazy" /> : <div className="still-vazio">{codigoEpisodio(temporadaNumero, ep.numero)}</div>}
        {visto && (
          <span className="episodio-visto-selo" title={`Assistido ${ep.vezes_assistido}×`}>
            <IconeOlho width={14} height={14} />
            {ep.vezes_assistido > 1 && <span>{ep.vezes_assistido}×</span>}
          </span>
        )}
      </div>

      <div className="episodio-info">
        <h3>
          <span className="codigo">{ep.numero}.</span> {ep.nome || `Episódio ${ep.numero}`}
        </h3>
        <p className="episodio-meta muted">
          {ep.data_exibicao ? dataLonga(ep.data_exibicao) : 'Data de exibição desconhecida'}
          {ep.duracao_min ? ` · ${ep.duracao_min} min` : ''}
          {futuro && <span className="badge badge-azul">Em breve</span>}
        </p>
        {ep.sinopse ? (
          <p className="episodio-sinopse">
            {ep.sinopse_idioma === 'en-US' && <span className="badge badge-azul">EN</span>} {ep.sinopse}
          </p>
        ) : (
          <p className="episodio-sinopse muted">Sem descrição.</p>
        )}
        {visto && ep.ultima_vez && (
          <p className="episodio-ultima">
            <IconeOlho width={13} height={13} /> Visto em {dataLonga(ep.ultima_vez)}
          </p>
        )}
      </div>

      <div className="episodio-acoes">
        <button
          className={`btn btn-sm ${visto ? 'btn-contorno' : 'btn-primario'}`}
          onClick={() => aoRegistrar(() => setAberto(true))}
          disabled={futuro}
          title={futuro ? 'Este episódio ainda não foi exibido' : undefined}
        >
          {visto ? <IconeRepetir width={14} height={14} /> : <IconeMais width={14} height={14} />}
          {visto ? 'Rever' : 'Registrar'}
        </button>
      </div>

      {logado && (
        <ModalRegistro
          aberto={aberto}
          aoFechar={() => setAberto(false)}
          episodio={ep}
          temporadaNumero={temporadaNumero}
          serieNome={serieNome}
          aoSalvar={aoSalvar}
        />
      )}
    </li>
  );
}

export default function Temporada() {
  const { id, n } = useParams();
  const { logado } = useAuth();
  const exigirLogin = useExigirLogin();
  const notificar = useToast();
  const [marcandoTudo, setMarcandoTudo] = useState(false);

  const { dados, erro, carregando, recarregar } = useCarregar(
    () => api(`/catalogo/series/${id}/temporadas/${n}`),
    [id, n, logado]
  );

  if (carregando && !dados) return <Carregando texto="Carregando episódios…" />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={recarregar} /></div>;
  if (!dados) return null;

  const { serie, temporada, temporadas = [], episodios, progresso } = dados;
  const atualizar = () => recarregar({ silencioso: true });
  const naoVistos = episodios.filter((e) => e.vezes_assistido === 0 && !(e.data_exibicao && e.data_exibicao > hojeISO()));

  async function marcarTemporada() {
    if (!window.confirm(`Marcar ${naoVistos.length} episódio(s) não registrados como assistidos hoje?`)) return;
    setMarcandoTudo(true);
    try {
      const r = await api('/diario/lote', {
        metodo: 'POST',
        corpo: { episodio_ids: naoVistos.map((e) => e.id), assistido_em: hojeISO() },
      });
      notificar(`${r.inseridos} episódio(s) registrados`);
      atualizar();
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setMarcandoTudo(false);
    }
  }

  const ordenadas = [...temporadas].sort((a, b) => (a.numero === 0) - (b.numero === 0) || a.numero - b.numero);

  return (
    <div className="container">
      <nav className="migalhas" aria-label="Trilha">
        <Link to={`/series/${serie.tmdb_id}`}>{serie.nome}</Link>
        <span aria-hidden="true">›</span>
        <span>{nomeTemporada(temporada)}</span>
      </nav>

      <Aviso>{dados.aviso}</Aviso>

      <header className="temporada-cabecalho">
        <Poster caminho={temporada.poster_path || serie.poster_path} titulo={nomeTemporada(temporada)} tamanho="w185" className="poster-mini" />
        <div className="temporada-cabecalho-info">
          <h1>{nomeTemporada(temporada)}</h1>
          <p className="muted">{serie.nome} · {episodios.length} episódios</p>
          {logado && progresso ? (
            <>
              <BarraProgresso assistidos={progresso.assistidos} total={progresso.total} />
              {progresso.registros > progresso.assistidos && (
                <p className="muted pequeno">
                  {progresso.registros} registros no diário — revisitas não contam duas vezes no progresso.
                </p>
              )}
              {naoVistos.length > 0 && (
                <button className="btn btn-sm btn-contorno" onClick={marcarTemporada} disabled={marcandoTudo}>
                  {marcandoTudo ? 'Registrando…' : 'Marcar restantes como vistos hoje'}
                </button>
              )}
            </>
          ) : (
            <p className="muted">
              <button className="link" onClick={() => exigirLogin()}>Entre</button> para registrar episódios e ver seu progresso.
            </p>
          )}
        </div>
      </header>

      {ordenadas.length > 1 && (
        <nav className="seletor-temporadas" aria-label="Temporadas">
          {ordenadas.map((t) => (
            <Link
              key={t.id}
              to={`/series/${serie.tmdb_id}/temporadas/${t.numero}`}
              className={t.numero === temporada.numero ? 'ativo' : ''}
              aria-current={t.numero === temporada.numero ? 'page' : undefined}
            >
              {t.numero === 0 ? 'Especiais' : `T${t.numero}`}
            </Link>
          ))}
        </nav>
      )}

      {episodios.length === 0 ? (
        <Vazio titulo="Nenhum episódio listado" />
      ) : (
        <ol className="lista-episodios">
          {episodios.map((ep) => (
            <Episodio
              key={ep.id}
              ep={ep}
              temporadaNumero={temporada.numero}
              serieNome={serie.nome}
              aoSalvar={atualizar}
              logado={logado}
              aoRegistrar={exigirLogin}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
