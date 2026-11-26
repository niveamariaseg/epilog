import { useState } from 'react';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useToast } from '../context/ToastContext.jsx';
import ListaCard from '../components/ListaCard.jsx';
import Modal from '../components/Modal.jsx';
import { Carregando, ErroCarga, Vazio } from '../components/Feedback.jsx';
import { IconeLapis, IconeLixo, IconeMais } from '../components/Icones.jsx';

function FormLista({ inicial, aoSalvar, aoCancelar }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '');
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [visibilidade, setVisibilidade] = useState(inicial?.visibilidade || 'publica');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await aoSalvar({ titulo, descricao, visibilidade });
    } catch (e2) {
      setErro(e2.message);
      setSalvando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar}>
      <label className="campo">
        <span>Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={100} required autoFocus />
      </label>
      <label className="campo">
        <span>Descrição <span className="muted">(opcional)</span></span>
        <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} />
      </label>
      <fieldset className="campo">
        <legend>Visibilidade</legend>
        <label className="radio">
          <input type="radio" name="vis" value="publica" checked={visibilidade === 'publica'} onChange={() => setVisibilidade('publica')} />
          <span>Pública <span className="muted">— aparece no seu perfil</span></span>
        </label>
        <label className="radio">
          <input type="radio" name="vis" value="privada" checked={visibilidade === 'privada'} onChange={() => setVisibilidade('privada')} />
          <span>Privada <span className="muted">— só você vê</span></span>
        </label>
      </fieldset>
      {erro && <p className="form-erro">{erro}</p>}
      <div className="form-acoes">
        <button type="button" className="btn btn-fantasma" onClick={aoCancelar}>Cancelar</button>
        <button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  );
}

/** /me/listas — "Quero assistir" + CRUD de listas personalizadas. */
export default function MeListas() {
  const notificar = useToast();
  const { dados: listas, erro, carregando, recarregar } = useCarregar(() => api('/listas/minhas'), []);
  const [modal, setModal] = useState(null); // null | { modo: 'nova' } | { modo: 'editar', lista }

  if (carregando && !listas) return <Carregando />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={recarregar} /></div>;

  const watchlist = listas.find((l) => l.tipo === 'watchlist');
  const custom = listas.filter((l) => l.tipo === 'custom');

  async function salvar(dados) {
    if (modal.modo === 'nova') {
      await api('/listas', { metodo: 'POST', corpo: dados });
      notificar('Lista criada');
    } else {
      await api(`/listas/${modal.lista.id}`, { metodo: 'PATCH', corpo: dados });
      notificar('Lista atualizada');
    }
    setModal(null);
    recarregar({ silencioso: true });
  }

  async function excluir(l) {
    if (!window.confirm(`Excluir a lista “${l.titulo}”? As séries não serão apagadas do EpiLog.`)) return;
    try {
      await api(`/listas/${l.id}`, { metodo: 'DELETE' });
      notificar('Lista excluída');
      recarregar({ silencioso: true });
    } catch (e) {
      notificar(e.message, 'erro');
    }
  }

  return (
    <div className="container">
      <div className="secao-cabecalho">
        <h1 className="titulo-pagina">Minhas listas</h1>
        <button className="btn btn-primario" onClick={() => setModal({ modo: 'nova' })}>
          <IconeMais width={16} height={16} /> Nova lista
        </button>
      </div>

      {watchlist && (
        <section className="secao">
          <h2 className="titulo-secao">Quero assistir <span className="muted">· sempre privada</span></h2>
          <div className="grade-listas">
            <ListaCard lista={watchlist} />
          </div>
        </section>
      )}

      <section className="secao">
        <h2 className="titulo-secao">Listas personalizadas</h2>
        {custom.length === 0 ? (
          <Vazio titulo="Nenhuma lista ainda">
            <p>Crie listas como “Melhores sitcoms” ou “Para maratonar nas férias”.</p>
          </Vazio>
        ) : (
          <div className="grade-listas">
            {custom.map((l) => (
              <ListaCard
                key={l.id}
                lista={l}
                acoes={
                  <>
                    <button className="btn-icone" onClick={() => setModal({ modo: 'editar', lista: l })} aria-label={`Editar ${l.titulo}`}>
                      <IconeLapis width={16} height={16} />
                    </button>
                    <button className="btn-icone perigo" onClick={() => excluir(l)} aria-label={`Excluir ${l.titulo}`}>
                      <IconeLixo width={16} height={16} />
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <Modal aberto={!!modal} aoFechar={() => setModal(null)} titulo={modal?.modo === 'editar' ? 'Editar lista' : 'Nova lista'}>
        {modal && <FormLista key={modal.lista?.id || 'nova'} inicial={modal.lista} aoSalvar={salvar} aoCancelar={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
