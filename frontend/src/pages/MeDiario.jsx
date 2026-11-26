import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useToast } from '../context/ToastContext.jsx';
import { codigoEpisodio, diaDoMes, mesAno } from '../lib/formatar.js';
import Poster from '../components/Poster.jsx';
import ModalRegistro from '../components/ModalRegistro.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeLapis, IconeLixo, IconeRepetir } from '../components/Icones.jsx';

const LIMITE = 30;

/** /me/diario — histórico cronológico, agrupado por mês (estilo diário). */
export default function MeDiario() {
  const notificar = useToast();
  const [filtros, setFiltros] = useState({ serie_id: '', revisita: '', de: '', ate: '' });
  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState([]);
  const [editando, setEditando] = useState(null);

  const series = useCarregar(() => api('/diario/series'), []);

  const query = useMemo(() => {
    const p = new URLSearchParams({ pagina, limite: LIMITE });
    Object.entries(filtros).forEach(([k, v]) => v && p.set(k, v));
    return p.toString();
  }, [filtros, pagina]);

  const { dados, erro, carregando, recarregar } = useCarregar(async () => {
    const r = await api(`/diario?${query}`);
    setRegistros((a) => (pagina === 1 ? r.registros : [...a, ...r.registros]));
    return r;
  }, [query]);

  function mudarFiltro(campo, valor) {
    setPagina(1);
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  async function excluir(r) {
    const ep = r.episodio;
    if (!window.confirm(`Excluir o registro de ${ep.temporada.serie.nome} ${codigoEpisodio(ep.temporada.numero, ep.numero)}?`)) return;
    try {
      await api(`/diario/${r.id}`, { metodo: 'DELETE' });
      setRegistros((a) => a.filter((x) => x.id !== r.id));
      notificar('Registro excluído');
    } catch (e) {
      notificar(e.message, 'erro');
    }
  }

  // agrupa por mês mantendo a ordem decrescente
  const grupos = [];
  for (const r of registros) {
    const chave = r.assistido_em.slice(0, 7);
    if (grupos.at(-1)?.chave !== chave) grupos.push({ chave, itens: [] });
    grupos.at(-1).itens.push(r);
  }

  const filtrando = Object.values(filtros).some(Boolean);

  return (
    <div className="container">
      <div className="secao-cabecalho">
        <h1 className="titulo-pagina">Meu diário</h1>
        {dados && <span className="muted">{dados.total} registros · privado</span>}
      </div>

      <form className="filtros" onSubmit={(e) => e.preventDefault()}>
        <label className="campo">
          <span>Série</span>
          <select value={filtros.serie_id} onChange={(e) => mudarFiltro('serie_id', e.target.value)}>
            <option value="">Todas</option>
            {series.dados?.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select value={filtros.revisita} onChange={(e) => mudarFiltro('revisita', e.target.value)}>
            <option value="">Todos</option>
            <option value="false">Primeira vez</option>
            <option value="true">Revisitas</option>
          </select>
        </label>
        <label className="campo">
          <span>De</span>
          <input type="date" value={filtros.de} onChange={(e) => mudarFiltro('de', e.target.value)} />
        </label>
        <label className="campo">
          <span>Até</span>
          <input type="date" value={filtros.ate} onChange={(e) => mudarFiltro('ate', e.target.value)} />
        </label>
        {filtrando && (
          <button type="button" className="btn btn-fantasma" onClick={() => { setPagina(1); setFiltros({ serie_id: '', revisita: '', de: '', ate: '' }); }}>
            Limpar
          </button>
        )}
      </form>

      {erro && <ErroCarga erro={erro} onTentar={recarregar} />}

      {!carregando && !erro && registros.length === 0 && (
        <Vazio titulo={filtrando ? 'Nenhum registro com esses filtros' : 'Seu diário está vazio'}>
          {!filtrando && <Link to="/" className="btn btn-primario">Encontrar uma série</Link>}
        </Vazio>
      )}

      {grupos.map((g) => (
        <section key={g.chave} className="diario-mes">
          <h2 className="diario-mes-titulo">{mesAno(g.chave + '-01')}</h2>
          <table className="diario-tabela">
            <thead className="sr-only">
              <tr><th>Dia</th><th>Série</th><th>Episódio</th><th>Revisita</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {g.itens.map((r) => {
                const ep = r.episodio;
                const s = ep.temporada.serie;
                return (
                  <tr key={r.id}>
                    <td className="diario-dia">{diaDoMes(r.assistido_em)}</td>
                    <td className="diario-poster">
                      <Link to={`/series/${s.tmdb_id}`}><Poster caminho={s.poster_path} titulo={s.nome} tamanho="w92" className="poster-micro" /></Link>
                    </td>
                    <td>
                      <div className="diario-obra">
                      <Link to={`/series/${s.tmdb_id}`} className="diario-serie">{s.nome}</Link>
                      <Link to={`/series/${s.tmdb_id}/temporadas/${ep.temporada.numero}`} className="diario-ep">
                        <span className="codigo">{codigoEpisodio(ep.temporada.numero, ep.numero)}</span> {ep.nome || `Episódio ${ep.numero}`}
                      </Link>
                      </div>
                    </td>
                    <td className="diario-revisita">
                      {r.revisita && <span title="Revisita" className="badge badge-verde"><IconeRepetir width={12} height={12} /> revisita</span>}
                    </td>
                    <td className="diario-acoes">
                      <button className="btn-icone" onClick={() => setEditando(r)} aria-label="Editar registro"><IconeLapis width={16} height={16} /></button>
                      <button className="btn-icone perigo" onClick={() => excluir(r)} aria-label="Excluir registro"><IconeLixo width={16} height={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {carregando && <Carregando />}
      {dados && !carregando && registros.length < dados.total && (
        <div className="centro">
          <button className="btn btn-contorno" onClick={() => setPagina((p) => p + 1)}>Carregar mais</button>
        </div>
      )}

      <ModalRegistro
        aberto={!!editando}
        registro={editando}
        aoFechar={() => setEditando(null)}
        aoSalvar={(novo) => {
          // reordena caso a data tenha mudado
          setRegistros((a) =>
            a.map((x) => (x.id === novo.id ? novo : x))
              .sort((x, y) => y.assistido_em.localeCompare(x.assistido_em) || y.criado_em.localeCompare(x.criado_em))
          );
        }}
      />
    </div>
  );
}
