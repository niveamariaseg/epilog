import { corDoApelido } from '../lib/formatar.js';

export default function Avatar({ apelido = '?', tamanho = 36 }) {
  return (
    <span
      className="avatar"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42, background: corDoApelido(apelido) }}
      aria-hidden="true"
    >
      {apelido.charAt(0).toUpperCase()}
    </span>
  );
}
