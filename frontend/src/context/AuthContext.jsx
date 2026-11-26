import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [pronto, setPronto] = useState(false);

  const carregarPerfil = useCallback(async () => {
    try {
      setPerfil(await api('/perfis/me'));
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      if (data.session) await carregarPerfil();
      setPronto(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
        // evita deadlock do supabase-js: chamada assíncrona fora do callback
        setTimeout(carregarPerfil, 0);
      }
      if (evento === 'SIGNED_OUT') setPerfil(null);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const entrar = useCallback(async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw traduzirErro(error);
    await carregarPerfil();
  }, [carregarPerfil]);

  const cadastrar = useCallback(async (email, senha, apelido, voltar = '/') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { apelido },
        emailRedirectTo: `${window.location.origin}/entrar?voltar=${encodeURIComponent(voltar)}`,
      },
    });
    if (error) throw traduzirErro(error);
    if (data.session) await carregarPerfil();
    return { precisaConfirmar: !data.session };
  }, [carregarPerfil]);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
  }, []);

  const valor = useMemo(
    () => ({
      sessao,
      usuario: sessao?.user ?? null,
      perfil,
      setPerfil,
      pronto,
      logado: !!sessao,
      entrar,
      cadastrar,
      sair,
      recarregarPerfil: carregarPerfil,
    }),
    [sessao, perfil, pronto, entrar, cadastrar, sair, carregarPerfil]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}

/** Caminho para /entrar que volta à página atual após o login. */
export function caminhoLogin(location) {
  const atual = location.pathname + location.search;
  return `/entrar?voltar=${encodeURIComponent(atual)}`;
}

/**
 * Envolve ações autenticadas: se o visitante não estiver logado,
 * redireciona para /entrar e volta para cá depois.
 *   const exigirLogin = useExigirLogin();
 *   onClick={() => exigirLogin(() => registrar())}
 */
export function useExigirLogin() {
  const { logado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(
    (acao) => {
      if (!logado) {
        navigate(caminhoLogin(location));
        return false;
      }
      acao?.();
      return true;
    },
    [logado, navigate, location]
  );
}

function traduzirErro(e) {
  const m = e.message || '';
  const mapa = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar (verifique a caixa de entrada).'],
    [/User already registered/i, 'Já existe uma conta com este e-mail.'],
    [/Password should be at least/i, 'A senha deve ter pelo menos 6 caracteres.'],
    [/rate limit/i, 'Muitas tentativas. Aguarde um instante e tente novamente.'],
    [/invalid.*email/i, 'E-mail inválido.'],
  ];
  const achado = mapa.find(([re]) => re.test(m));
  return new Error(achado ? achado[1] : m || 'Não foi possível autenticar.');
}
