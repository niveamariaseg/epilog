import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, caminhoLogin } from '../context/AuthContext.jsx';
import { Carregando } from './Feedback.jsx';

/** Páginas autenticadas: visitante vai para /entrar e volta depois do login. */
export default function RotaProtegida({ children }) {
  const { logado, pronto } = useAuth();
  const location = useLocation();
  if (!pronto) return <Carregando />;
  if (!logado) return <Navigate to={caminhoLogin(location)} replace />;
  return children;
}
