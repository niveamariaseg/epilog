import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useToast } from '../context/ToastContext.jsx';
import Poster from '../components/Poster.jsx';
import SerieCard from '../components/SerieCard.jsx';
import Avatar from '../components/Avatar.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeArrastar, IconeCadeado, IconeLixo, IconeSetaBaixo, IconeSetaCima, IconeLupa } from '../components/Icones.jsx';

/** Busca no TMDB para adicionar séries direto na lista (apenas o dono). */
function AdicionarSerie({ listaId, aoAdicionar, jaNaLista }) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [ocupado, setOcupado] = useState(null);
  const notificar = useToast();

  useEffect(() => {
    if (q.trim().length < 2) {
      setResultados([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await api(`/catalogo/busca?q=${encodeURIComponent(q.trim())}`, { sinal: ctrl.signal });
        setResultados(r.resultados.slice(0, 6));
      } catch {
        /* ignorado: digitação em andamento */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  async function adicionar(s) {
    setOcupado(s.tmdb_id);
    try {
      await api(`/listas/${listaId}/itens`, { metodo: 'POST', corpo: { tmdb_id: s.tmdb_id } });
      notificar(`${s.nome} adicionada`);
      aoAdicionar();
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="adicionar-serie">
      <label className="busca-topo busca-larga">
        <IconeLupa width={16} height={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adicionar série à lista…" aria-label="Buscar série para adicionar" />
      </label>
      {resultados.length > 0 && (
        <ul className="sugestoes">
          {resultados.map((s) => {
            const ja = jaNaLista.has(s.tmdb_id);
            return (
              <li key={s.tmdb_id}>
                <Poster caminho={s.poster_path} titulo={s.nome} tamanho="w92" className="poster-micro" />
                <span>
                  {s.nome} <span className="muted">{s.ano_estreia}</span>
                </span>
                <button className="btn btn-sm btn-contorno" disabled={ja || ocupado === s.tmdb_id} onClick={() => adicionar(s)}>
                  {ja ? 'Na lista' : 'Adicionar'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** /listas/:id — detalhe; o dono pode reordenar (arrastar ou setas), remover e adicionar. */
export default function ListaDetalhe() {
  const { id } = useParams();
  const notificar = useToast();
  const { dados: lista, erro, carregando, recarregar, setDados } = useCarregar(() => api(`/listas/${id}`), [id]);
  const [arrastando, setArrastando] = useState(null);
  const ordemAntes = useRef(null);

  if (carregando && !lista) return <Carregando />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={erro.status === 404 ? null : recarregar} /></div>;
  if (!lista) return null;

  const itens = lista.itens;
  const editavel = lista.sou_dono;

  async function persistirOrdem(novos) {
    const anterior = ordemAntes.current || itens;
    setDados({ ...lista, itens: novos });
    try {
      await api(`/listas/${lista.id}/ordem`, { metodo: 'PUT', corpo: { serie_ids: novos.map((i) => i.serie.id) } });
    } catch (e) {
      setDados({ ...lista, itens: anterior });
      notificar(e.message, 'erro');
    } finally {
      ordemAntes.current = null;
    }
  }

  function mover(de, para) {
    if (para < 0 || para >= itens.length) return;
    const novos = [...itens];
    const [item] = novos.splice(de, 1);
    novos.splice(para, 0, item);
    persistirOrdem(novos);
  }

  async function remover(item) {
    try {
      await api(`/listas/${lista.id}/itens/${item.serie.id}`, { metodo: 'DELETE' });
      setDados({ ...lista, itens: itens.filter((i) => i.serie.id !== item.serie.id) });
      notificar(`${item.serie.nome} removida`);
    } catch (e) {
      notificar(e.message, 'erro');
    }
  }

  // Drag and drop nativo (HTML5)
  function onDragStart(i) {
    ordemAntes.current = itens;
    setArrastando(i);
  }
  function onDragOver(e, i) {
    e.preventDefault();
    if (arrastando === null || arrastando === i) return;
    const novos = [...itens];
    const [item] = novos.splice(arrastando, 1);
    novos.splice(i, 0, item);
    setDados({ ...lista, itens: novos });
    setArrastando(i);
  }
  // dragend dispara uma única vez no elemento arrastado, com ou sem drop válido
  function aoSoltar() {
    const mudou = ordemAntes.current && ordemAntes.current.some((it, i) => it.serie.id !== itens[i]?.serie.id);
    if (mudou) persistirOrdem(itens);
    else ordemAntes.current = null;
    setArrastando(null);
  }

  const titulo = lista.tipo === 'watchlist' ? 'Quero assistir' : lista.titulo;

  return (
    <div className="container">
      <header className="lista-cabecalho">
        <p className="muted">
          Lista de{' '}
          <Link to={`/u/${lista.autor.apelido}`} className="resenha-autor">
            <Avatar apelido={lista.autor.apelido} tamanho={20} /> {lista.autor.apelido}
          </Link>
        </p>
        <h1 className="titulo-pagina">
          {titulo}{' '}
          {lista.visibilidade === 'privada' && (
            <span className="badge"><IconeCadeado width={12} height={12} /> Privada</span>
          )}
        </h1>
        {lista.descricao && <p className="lista-descricao">{lista.descricao}</p>}
        <p className="muted">{itens.length} {itens.length === 1 ? 'série' : 'séries'}</p>
      </header>

      {editavel && (
        <AdicionarSerie
          listaId={lista.id}
          jaNaLista={new Set(itens.map((i) => i.serie.tmdb_id))}
          aoAdicionar={() => recarregar({ silencioso: true })}
        />
      )}

      {itens.length === 0 ? (
        <Vazio titulo="Lista vazia">
          {editavel ? <p>Use a busca acima ou o botão “Adicionar à lista” na ficha de uma série.</p> : null}
        </Vazio>
      ) : editavel ? (
        <>
          <p className="muted pequeno">Arraste as séries (ou use as setas) para reordenar. A ordem é salva automaticamente.</p>
          <ol className="lista-ordenavel">
            {itens.map((item, i) => (
              <li
                key={item.serie.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={(e) => e.preventDefault()}
                onDragEnd={aoSoltar}
                className={arrastando === i ? 'arrastando' : ''}
              >
                <span className="alca" aria-hidden="true"><IconeArrastar /></span>
                <span className="posicao">{i + 1}</span>
                <Poster caminho={item.serie.poster_path} titulo={item.serie.nome} tamanho="w92" className="poster-micro" />
                <Link to={`/series/${item.serie.tmdb_id}`} className="lista-ordenavel-nome">
                  {item.serie.nome} <span className="muted">{item.serie.ano_estreia}</span>
                </Link>
                <span className="lista-ordenavel-acoes">
                  <button className="btn-icone" onClick={() => mover(i, i - 1)} disabled={i === 0} aria-label="Mover para cima"><IconeSetaCima width={16} height={16} /></button>
                  <button className="btn-icone" onClick={() => mover(i, i + 1)} disabled={i === itens.length - 1} aria-label="Mover para baixo"><IconeSetaBaixo width={16} height={16} /></button>
                  <button className="btn-icone perigo" onClick={() => remover(item)} aria-label={`Remover ${item.serie.nome}`}><IconeLixo width={16} height={16} /></button>
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="grade-posters">
          {itens.map((item, i) => (
            <SerieCard key={item.serie.id} serie={item.serie}>
              <span className="posicao-selo">{i + 1}</span>
            </SerieCard>
          ))}
        </div>
      )}
    </div>
  );
}
