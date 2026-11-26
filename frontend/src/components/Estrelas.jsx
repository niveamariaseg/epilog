import { useRef, useState } from 'react';
import { notaTexto } from '../lib/formatar.js';

const ESTRELAS = '★★★★★';

/** Exibição de nota (0.5 a 5) com meia estrela. */
export function EstrelasExibir({ nota, tamanho = 'md' }) {
  const pct = (Number(nota) / 5) * 100;
  return (
    <span className={`estrelas estrelas-${tamanho}`} aria-label={`${notaTexto(nota)} de 5 estrelas`} title={`${notaTexto(nota)} / 5`}>
      <span className="estrelas-fundo" aria-hidden="true">{ESTRELAS}</span>
      <span className="estrelas-frente" style={{ width: `${pct}%` }} aria-hidden="true">{ESTRELAS}</span>
    </span>
  );
}

/**
 * Entrada de nota de meia em meia estrela.
 * Mouse: metade esquerda da estrela = x.5. Teclado: setas ←/→ (slider ARIA).
 */
export function EstrelasInput({ valor, onChange, tamanho = 'lg', desabilitado = false }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  function valorDoPonteiro(e) {
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    return Math.max(0.5, Math.ceil((x / r.width) * 10) / 2);
  }

  function teclado(e) {
    const atual = valor || 0;
    if (['ArrowRight', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      onChange(Math.min(5, atual + 0.5));
    } else if (['ArrowLeft', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      onChange(Math.max(0.5, atual - 0.5 || 0.5));
    } else if (e.key === 'Home') onChange(0.5);
    else if (e.key === 'End') onChange(5);
  }

  const mostrado = hover ?? valor ?? 0;

  return (
    <div className="estrelas-input-wrap">
      <span
        ref={ref}
        role="slider"
        tabIndex={desabilitado ? -1 : 0}
        aria-label="Nota"
        aria-valuemin={0.5}
        aria-valuemax={5}
        aria-valuenow={valor || 0}
        aria-valuetext={valor ? `${notaTexto(valor)} estrelas` : 'Sem nota'}
        aria-disabled={desabilitado}
        className={`estrelas estrelas-${tamanho} estrelas-input ${desabilitado ? 'desabilitado' : ''}`}
        onMouseMove={(e) => !desabilitado && setHover(valorDoPonteiro(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => !desabilitado && onChange(valorDoPonteiro(e))}
        onKeyDown={(e) => !desabilitado && teclado(e)}
      >
        <span className="estrelas-fundo" aria-hidden="true">{ESTRELAS}</span>
        <span className="estrelas-frente" style={{ width: `${(mostrado / 5) * 100}%` }} aria-hidden="true">
          {ESTRELAS}
        </span>
      </span>
      <span className="estrelas-valor">{mostrado ? notaTexto(mostrado) : '–'}</span>
    </div>
  );
}
