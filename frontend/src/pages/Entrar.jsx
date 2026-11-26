import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import Logo from '../components/Logo.jsx';

/** Só aceita caminhos internos (evita open redirect). */
function destinoSeguro(v) {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/entrar') ? v : '/';
}

export default function Entrar() {
  const { entrar, cadastrar, logado, pronto } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voltar = destinoSeguro(params.get('voltar'));

  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [apelido, setApelido] = useState('');
  const [disp, setDisp] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [confirmar, setConfirmar] = useState(false);

  // Verifica disponibilidade do apelido com debounce
  useEffect(() => {
    if (modo !== 'cadastrar' || !apelido) {
      setDisp(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        setDisp(await api(`/perfis/disponivel/${encodeURIComponent(apelido.toLowerCase())}`));
      } catch {
        setDisp(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [apelido, modo]);

  if (pronto && logado && !confirmar) return <Navigate to={voltar} replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
        navigate(voltar, { replace: true });
      } else {
        if (disp && !disp.disponivel) throw new Error(disp.motivo);
        const { precisaConfirmar } = await cadastrar(email, senha, apelido.toLowerCase(), voltar);
        if (precisaConfirmar) setConfirmar(true);
        else navigate(voltar, { replace: true });
      }
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  if (confirmar) {
    return (
      <div className="container pagina-auth">
        <div className="cartao auth-cartao">
          <Logo />
          <h1>Confirme seu e-mail</h1>
          <p>
            Enviamos um link para <strong>{email}</strong>. Depois de confirmar, você volta direto para onde estava.
          </p>
          <button className="btn btn-contorno" onClick={() => { setConfirmar(false); setModo('entrar'); }}>
            Já confirmei — entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container pagina-auth">
      <div className="cartao auth-cartao">
        <Logo />
        <div className="segmentado segmentado-bloco" role="tablist">
          <button role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'ativo' : ''} onClick={() => { setModo('entrar'); setErro(null); }}>
            Entrar
          </button>
          <button role="tab" aria-selected={modo === 'cadastrar'} className={modo === 'cadastrar' ? 'ativo' : ''} onClick={() => { setModo('cadastrar'); setErro(null); }}>
            Criar conta
          </button>
        </div>

        {voltar !== '/' && <p className="muted pequeno">Entre para continuar de onde parou.</p>}

        <form className="form" onSubmit={enviar}>
          {modo === 'cadastrar' && (
            <label className="campo">
              <span>Apelido</span>
              <input
                value={apelido}
                onChange={(e) => setApelido(e.target.value.replace(/\s/g, '').toLowerCase())}
                placeholder="ex.: maratonista_42"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]{3,20}"
                aria-describedby="apelido-ajuda"
              />
              <small id="apelido-ajuda" className={disp ? (disp.disponivel ? 'texto-ok' : 'texto-erro') : 'muted'}>
                {disp ? (disp.disponivel ? '✓ Disponível' : disp.motivo) : 'Seu endereço público: /u/apelido'}
              </small>
            </label>
          )}
          <label className="campo">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>
          {erro && <p className="form-erro" role="alert">{erro}</p>}
          <button className="btn btn-primario btn-bloco" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <p className="muted pequeno">Seu e-mail nunca aparece no seu perfil público.</p>
      </div>
    </div>
  );
}
