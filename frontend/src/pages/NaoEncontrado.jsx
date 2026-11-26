import { Link } from 'react-router-dom';

export default function NaoEncontrado() {
  return (
    <div className="container pagina-estreita centro nao-encontrado">
      <p className="codigo-grande">S04E04</p>
      <h1>Episódio perdido</h1>
      <p className="muted">A página que você procura não existe ou foi removida.</p>
      <Link to="/" className="btn btn-primario">Voltar ao início</Link>
    </div>
  );
}
