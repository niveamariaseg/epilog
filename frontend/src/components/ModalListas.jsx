import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Carregando } from './Feedback.jsx';
import { IconeCadeado, IconeCheck } from './Icones.jsx';

/** Adiciona/remove a série em listas personalizadas e permite criar uma nova. */
export default function ModalListas({ aberto, aoFechar, serie }) {
  const [listas, setListas] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaPrivada, setNovaPrivada] = useState(false);
  const notificar = useToast();

  async function carregar() {
    const todas = await api(`/listas/minhas?serie_id=${serie.id}`);
    setListas(todas.filter((l) => l.tipo === 'custom'));
  }

  useEffect(() => {
    if (aberto) {
      setListas(null);
      carregar().catch((e) => notificar(e.message, 'erro'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, serie?.id]);

  async function alternar(lista) {
    setOcupado(lista.id);
    try {
      if (lista.contem_serie) {
        await api(`/listas/${lista.id}/itens/${serie.id}`, { metodo: 'DELETE' });
        notificar(`Removida de “${lista.titulo}”`);
      } else {
        await api(`/listas/${lista.id}/itens`, { metodo: 'POST', corpo: { serie_id: serie.id } });
        notificar(`Adicionada a “${lista.titulo}”`);
      }
      await carregar();
    } catch (e) {
      notificar(e.message, 'erro');
    } finally {
      setOcupado(null);
    }
  }

  async function criar(e) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setOcupado('nova');
    try {
      const lista = await api('/listas', {
        metodo: 'POST',
        corpo: { titulo: novoTitulo, visibilidade: novaPrivada ? 'privada' : 'publica' },
      });
      await api(`/listas/${lista.id}/itens`, { metodo: 'POST', corpo: { serie_id: serie.id } });
      notificar(`Lista “${lista.titulo}” criada com ${serie.nome}`);
      setNovoTitulo('');
      setNovaPrivada(false);
      await carregar();
    } catch (e2) {
      notificar(e2.message, 'erro');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Adicionar à lista">
      {!listas ? (
        <Carregando />
      ) : (
        <>
          {listas.length === 0 ? (
            <p className="muted">Você ainda não tem listas personalizadas. Crie a primeira abaixo.</p>
          ) : (
            <ul className="lista-escolha">
              {listas.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    className={`lista-escolha-item ${l.contem_serie ? 'marcada' : ''}`}
                    onClick={() => alternar(l)}
                    disabled={ocupado === l.id}
                    aria-pressed={l.contem_serie}
                  >
                    <span className="lista-escolha-check">{l.contem_serie && <IconeCheck width={14} height={14} />}</span>
                    <span className="lista-escolha-titulo">{l.titulo}</span>
                    {l.visibilidade === 'privada' && <IconeCadeado width={14} height={14} aria-label="Privada" />}
                    <span className="muted">{l.total_itens}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="form form-inline-lista" onSubmit={criar}>
            <label className="campo">
              <span>Nova lista</span>
              <input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex.: Melhores minisséries"
                maxLength={100}
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={novaPrivada} onChange={(e) => setNovaPrivada(e.target.checked)} />
              <span>Privada</span>
            </label>
            <button className="btn btn-primario" disabled={!novoTitulo.trim() || ocupado === 'nova'}>
              Criar e adicionar
            </button>
          </form>
          <p className="modal-rodape">
            <Link to="/me/listas" onClick={aoFechar}>
              Gerenciar minhas listas →
            </Link>
          </p>
        </>
      )}
    </Modal>
  );
}
