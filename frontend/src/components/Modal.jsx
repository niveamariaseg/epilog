import { useEffect, useRef } from 'react';
import { IconeX } from './Icones.jsx';

/** Modal acessível baseado em <dialog>. */
export default function Modal({ aberto, aoFechar, titulo, children, largura = 460 }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={{ maxWidth: largura }}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => {
        if (e.target === ref.current) aoFechar(); // clique no backdrop
      }}
    >
      {aberto && (
        <div className="modal-conteudo">
          <header className="modal-cabecalho">
            <h2>{titulo}</h2>
            <button type="button" className="btn-icone" onClick={aoFechar} aria-label="Fechar">
              <IconeX />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
