import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';

import Inicio from './pages/Inicio.jsx';
import Serie from './pages/Serie.jsx';
import Avaliar from './pages/Avaliar.jsx';
import Temporada from './pages/Temporada.jsx';
import PerfilPublico from './pages/PerfilPublico.jsx';
import Entrar from './pages/Entrar.jsx';
import Sobre from './pages/Sobre.jsx';
import Me from './pages/Me.jsx';
import MeDiario from './pages/MeDiario.jsx';
import MeListas from './pages/MeListas.jsx';
import ListaDetalhe from './pages/ListaDetalhe.jsx';
import Feed from './pages/Feed.jsx';
import NaoEncontrado from './pages/NaoEncontrado.jsx';

const protegida = (el) => <RotaProtegida>{el}</RotaProtegida>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route index element={<Inicio />} />
        <Route path="series/:id" element={<Serie />} />
        <Route path="series/:id/temporadas/:n" element={<Temporada />} />
        <Route path="u/:apelido" element={<PerfilPublico />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="sobre" element={<Sobre />} />
        {/* Pública se visibilidade = 'publica' (a API aplica a regra) */}
        <Route path="listas/:id" element={<ListaDetalhe />} />

        {/* Autenticadas */}
        <Route path="series/:id/avaliacao" element={protegida(<Avaliar />)} />
        <Route path="me" element={protegida(<Me />)} />
        <Route path="me/diario" element={protegida(<MeDiario />)} />
        <Route path="me/listas" element={protegida(<MeListas />)} />
        <Route path="feed" element={protegida(<Feed />)} />

        <Route path="*" element={<NaoEncontrado />} />
      </Route>
    </Routes>
  );
}
