import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useAuth, useExigirLogin } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { imagem, nomeTemporada, notaTexto, plural } from '../lib/formatar.js';
import Poster from '../components/Poster.jsx';
import BarraProgresso from '../components/BarraProgresso.jsx';
import ResenhaCard from '../components/ResenhaCard.jsx';
import ModalListas from '../components/ModalListas.jsx';
import { EstrelasExibir, EstrelasInput } from '../components/Estrelas.jsx';
import { Aviso, Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeRelogio, IconeLista, IconeLapis, IconeCheck } from '../components/Icones.jsx';

function Histograma({ comunidade }) {
  const max = Math.max(1, ...comunidade.distribuicao);
  return (
    <div className="histograma" aria-label="Distribuição das notas">
      <div className="histograma-barras">
        {comunidade.distribuicao.map((n, i) => (
          <div
            key={i}
            className="histograma-barra"
            style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
            title={`${notaTexto((i + 1) / 2)} ★ — ${plural(n, 'avaliação', 'avaliações')}`}
          />
        ))}
      </div>
      <div className="histograma-legenda">
        <span>½</span>
        <strong>{comunidade.media ? notaTexto(comunidade.media) : '–'}</strong>
        <span>★★★★★</span>
      </div>
    </div>
  );
}

function ResenhasComunidade({ serieId, total }) {
  const [ordem, setOrdem] = useState('recentes');
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState([]);

  const { dados, carregando, erro, recarregar } = useCarregar(async () => {
    const r = await api(`/avaliacoes/serie/${serieId}?ordem=${ordem}&pagina=${pagina}`);
    setItens((a) => (pagina === 1 ? r.resenhas : [...a, ...r.resenhas]));
    return r;
  }, [serieId, ordem, pagina]);

  return (
    <section className="secao">
      <div className="secao-cabecalho">
        <h2 className="titulo-secao">Resenhas da comunidade</h2>
        <div className="segmentado" role="group" aria-label="Ordenar resenhas">
          {['recentes', 'populares'].map((o) => (
            <button
              key={o}
              className={ordem === o ? 'ativo' : ''}
              onClick={() => {
                setOrdem(o);
                setPagina(1);
              }}
            >
              {o === 'recentes' ? 'Recentes' : 'Populares'}
            </button>
          ))}
        </div>
      </div>
      {erro && <ErroCarga erro={erro} onTentar={recarregar} />}
      {!carregando && !erro && itens.length === 0 && (
        <Vazio titulo="Nenhuma resenha ainda">
          <p>{total ? 'Há notas, mas ninguém escreveu uma resenha. Seja o primeiro!' : 'Seja o primeiro a avaliar esta série.'}</p>
        </Vazio>
      )}
      <div className="lista-resenhas">
        {itens.map((r) => (
          <ResenhaCard key={r.id} resenha={r} mostrarSerie={false} />
        ))}
      </div>
      {carregando && <Carregando />}
      {dados && !carregando && pagina * dados.limite < dados.total && (
        <div className="centro">
          <button className="btn btn-contorno" onClick={() => setPagina((p) => p + 1)}>
            Mais resenhas
          </button>
        </div>
      )}
    </section>
  );
}

function PainelAcoes({ ficha, aoAtualizar }) {
  const { logado } = useAuth();
  const exigirLogin = useExigirLogin();
  const notificar = useToast();
  const [modalListas, setModalListas] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [wlOcupada, setWlOcupada] = useState(false);

  const { serie, pessoal } = ficha;
  const minha = pessoal?.avaliacao;

  async function alternarWatchlist() {
    setWlOcupada(true);
    try {
      const r = await api(`/listas/watchlist/${serie.id}`, { metodo: pessoal.na_watchlist ? 'DELETE' : 'POST' });
      aoAtualizar({ ...ficha, pessoal: { ...pessoal, na_watchlist: r.na_watchlist } });
      notificar(r.na_watchlist ? 'Adicionada a “Quero assistir”' : 'Removida de “Quero assistir”');
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setWlOcupada(false);
    }
  }

  async function avaliarRapido(nota) {
    setSalvandoNota(true);
    try {
      const salva = await api(`/avaliacoes/serie/${serie.id}`, {
        metodo: 'PUT',
        corpo: { nota, texto: minha?.texto ?? null, contem_spoiler: minha?.contem_spoiler ?? false },
      });
      aoAtualizar({ ...ficha, pessoal: { ...pessoal, avaliacao: salva } }, true);
      notificar(`Nota ${notaTexto(nota)} salva`);
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setSalvandoNota(false);
    }
  }

  return (
    <aside className="painel-acoes" aria-label="Ações">
      {logado && pessoal ? (
        <>
          <div className="painel-linha">
            <button
              className={`acao ${pessoal.total_registros ? 'ativo-verde' : ''}`}
              onClick={() => document.getElementById('temporadas')?.scrollIntoView({ behavior: 'smooth' })}
              title="Registre episódios na página da temporada"
            >
              <IconeCheck />
              <span>{pessoal.total_registros ? plural(pessoal.total_registros, 'registro', 'registros') : 'Registrar'}</span>
            </button>
            <button
              className={`acao ${pessoal.na_watchlist ? 'ativo-azul' : ''}`}
              onClick={alternarWatchlist}
              disabled={wlOcupada}
              aria-pressed={pessoal.na_watchlist}
            >
              <IconeRelogio />
              <span>{pessoal.na_watchlist ? 'Na watchlist' : 'Quero assistir'}</span>
            </button>
          </div>
          <div className="painel-nota">
            <span className="painel-rotulo">{minha ? 'Sua nota' : 'Avaliar'}</span>
            <EstrelasInput valor={minha ? Number(minha.nota) : null} onChange={avaliarRapido} desabilitado={salvandoNota} />
          </div>
          <Link to={`/series/${serie.tmdb_id}/avaliacao`} className="painel-item">
            <IconeLapis width={16} height={16} />
            {minha?.texto ? 'Editar resenha' : minha ? 'Escrever resenha' : 'Avaliar e resenhar'}
          </Link>
          <button className="painel-item" onClick={() => setModalListas(true)}>
            <IconeLista width={16} height={16} /> Adicionar à lista…
          </button>
          <ModalListas aberto={modalListas} aoFechar={() => setModalListas(false)} serie={serie} />
        </>
      ) : (
        <>
          <p className="painel-convite">Entre para registrar episódios, avaliar e montar listas.</p>
          <button className="btn btn-primario btn-bloco" onClick={() => exigirLogin()}>
            Entrar no EpiLog
          </button>
        </>
      )}
    </aside>
  );
}

export default function Serie() {
  const { id } = useParams();
  const { dados: ficha, erro, carregando, recarregar, setDados } = useCarregar(
    () => api(`/catalogo/series/${id}`),
    [id]
  );
  const [chaveResenhas, setChaveResenhas] = useState(0);

  if (carregando && !ficha) return <Carregando texto="Abrindo a ficha…" />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={recarregar} /></div>;
  if (!ficha) return null;

  const { serie, temporadas, extras, comunidade, pessoal } = ficha;
  const fundo = imagem(serie.backdrop_path, 'w1280');
  const temporadasOrdenadas = [...temporadas].sort((a, b) => (a.numero === 0) - (b.numero === 0) || a.numero - b.numero);

  return (
    <div className="pagina-serie">
      <div className="serie-fundo" style={fundo ? { backgroundImage: `url(${fundo})` } : undefined} aria-hidden="true" />
      <div className={`container serie-layout ${fundo ? '' : 'sem-fundo'}`}>
        <div className="serie-coluna-poster">
          <Poster caminho={serie.poster_path} titulo={serie.nome} tamanho="w500" className="poster-grande" />
          <div className="serie-titulo-mobile" aria-hidden="true">
            <strong>{serie.nome}</strong> {serie.ano_estreia && <span className="muted">{serie.ano_estreia}</span>}
          </div>
          {comunidade.total > 0 && (
            <div className="serie-comunidade">
              <span className="painel-rotulo">Média EpiLog · {plural(comunidade.total, 'nota', 'notas')}</span>
              <Histograma comunidade={comunidade} />
            </div>
          )}
        </div>

        <div className="serie-coluna-info">
          <Aviso>{ficha.aviso}</Aviso>
          <h1 className="serie-titulo">
            {serie.nome} {serie.ano_estreia && <span className="serie-ano">{serie.ano_estreia}</span>}
          </h1>
          {extras?.criadores?.length > 0 && (
            <p className="serie-criadores">Criada por <strong>{extras.criadores.join(', ')}</strong></p>
          )}
          {extras?.tagline && <p className="serie-tagline">{extras.tagline}</p>}

          <div className="serie-sinopse">
            {serie.sinopse ? (
              <>
                {serie.sinopse_idioma === 'en-US' && (
                  <span className="badge badge-azul" title="Sem tradução em português no TMDB">Texto em inglês</span>
                )}
                <p>{serie.sinopse}</p>
              </>
            ) : (
              <p className="muted">Sinopse ainda não disponível para esta série.</p>
            )}
          </div>

          <div className="serie-tags">
            {serie.generos?.map((g) => <span key={g} className="tag">{g}</span>)}
            {extras?.emissoras?.map((e) => <span key={e} className="tag tag-contorno">{e}</span>)}
            {extras?.situacao && <span className="tag tag-contorno">{traduzirSituacao(extras.situacao)}</span>}
          </div>

          <section className="secao" id="temporadas">
            <h2 className="titulo-secao">
              Temporadas <span className="muted">· {temporadas.filter((t) => t.numero > 0).length}</span>
            </h2>
            {temporadas.length === 0 ? (
              <Vazio>Nenhuma temporada listada.</Vazio>
            ) : (
              <div className="grade-temporadas">
                {temporadasOrdenadas.map((t) => {
                  const prog = pessoal?.progresso?.[t.numero];
                  return (
                    <Link key={t.id} to={`/series/${serie.tmdb_id}/temporadas/${t.numero}`} className="temporada-card">
                      <Poster caminho={t.poster_path || serie.poster_path} titulo={nomeTemporada(t)} tamanho="w185" />
                      <div className="temporada-card-info">
                        <strong>{nomeTemporada(t)}</strong>
                        <span className="muted">{t.total_episodios != null ? plural(t.total_episodios, 'episódio', 'episódios') : '—'}</span>
                        {prog && <BarraProgresso assistidos={prog.assistidos} total={prog.total} compacta />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <ResenhasComunidade key={chaveResenhas} serieId={serie.id} total={comunidade.total} />
        </div>

        <div className="serie-coluna-acoes">
          <PainelAcoes
            ficha={ficha}
            aoAtualizar={(nova, mudouAvaliacao) => {
              setDados(nova);
              if (mudouAvaliacao) {
                recarregar({ silencioso: true });
                setChaveResenhas((k) => k + 1);
              }
            }}
          />
          {pessoal?.avaliacao && (
            <div className="sua-avaliacao">
              <span className="painel-rotulo">Você avaliou</span>
              <EstrelasExibir nota={pessoal.avaliacao.nota} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function traduzirSituacao(s) {
  return (
    {
      'Returning Series': 'Em exibição',
      Ended: 'Finalizada',
      Canceled: 'Cancelada',
      'In Production': 'Em produção',
      Planned: 'Planejada',
      Pilot: 'Piloto',
    }[s] || s
  );
}
