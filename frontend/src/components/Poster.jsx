import { useState } from 'react';
import { imagem } from '../lib/formatar.js';

/** Pôster com fallback visual (título sobre gradiente) quando não há imagem. */
export default function Poster({ caminho, titulo, tamanho = 'w342', className = '' }) {
  const [falhou, setFalhou] = useState(false);
  const url = imagem(caminho, tamanho);

  if (!url || falhou) {
    return (
      <div className={`poster poster-vazio ${className}`} role="img" aria-label={`Sem pôster: ${titulo}`}>
        <span>{titulo}</span>
      </div>
    );
  }
  return (
    <img
      className={`poster ${className}`}
      src={url}
      alt={`Pôster de ${titulo}`}
      loading="lazy"
      onError={() => setFalhou(true)}
    />
  );
}
