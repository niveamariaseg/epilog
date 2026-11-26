import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../lib/api.js';
import { hojeISO, codigoEpisodio } from '../lib/formatar.js';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Registrar (ou editar) uma visualização de episódio no diário.
 * - novo: passe `episodio` ({ id, numero, nome, vezes_assistido }) e `temporadaNumero`
 * - edição: passe `registro` (linha do diário)
 */
export default function ModalRegistro({ aberto, aoFechar, aoSalvar, episodio, temporadaNumero, serieNome, registro }) {
  const editando = !!registro;
  const [data, setData] = useState(hojeISO());
  const [revisita, setRevisita] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const notificar = useToast();

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    if (editando) {
      setData(registro.assistido_em);
      setRevisita(registro.revisita);
    } else {
      setData(hojeISO());
      setRevisita((episodio?.vezes_assistido || 0) > 0);
    }
  }, [aberto, editando, registro, episodio]);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const r = editando
        ? await api(`/diario/${registro.id}`, { metodo: 'PATCH', corpo: { assistido_em: data, revisita } })
        : await api('/diario', { metodo: 'POST', corpo: { episodio_id: episodio.id, assistido_em: data, revisita } });
      notificar(editando ? 'Registro atualizado' : 'Episódio registrado no diário');
      aoSalvar?.(r);
      aoFechar();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setSalvando(false);
    }
  }

  const ep = editando ? registro.episodio : episodio;
  const tNum = editando ? registro.episodio.temporada.numero : temporadaNumero;
  const nomeSerie = editando ? registro.episodio.temporada.serie.nome : serieNome;

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo={editando ? 'Editar registro' : 'Registrar no diário'}>
      {ep && (
        <form onSubmit={salvar} className="form">
          <p className="modal-sub">
            <strong>{nomeSerie}</strong>
            <br />
            <span className="codigo">{codigoEpisodio(tNum, ep.numero)}</span> {ep.nome || `Episódio ${ep.numero}`}
          </p>

          <label className="campo">
            <span>Assistido em</span>
            <input type="date" value={data} max={hojeISO()} required onChange={(e) => setData(e.target.value)} />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={revisita} onChange={(e) => setRevisita(e.target.checked)} />
            <span>
              Revisita <span className="muted">(já tinha assistido antes)</span>
            </span>
          </label>

          {erro && <p className="form-erro">{erro}</p>}

          <div className="form-acoes">
            <button type="button" className="btn btn-fantasma" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={salvando}>
              {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Registrar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
