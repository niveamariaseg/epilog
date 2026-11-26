import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carrega dados assíncronos com estados de carregamento/erro.
 * const { dados, erro, carregando, recarregar, setDados } = useCarregar(() => api('/x'), [dep]);
 */
export function useCarregar(fn, deps = [], { ativo = true } = {}) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(ativo);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const versao = useRef(0);

  const recarregar = useCallback(async ({ silencioso = false } = {}) => {
    const minha = ++versao.current;
    if (!silencioso) setCarregando(true);
    setErro(null);
    try {
      const r = await fnRef.current();
      if (minha === versao.current) setDados(r);
    } catch (e) {
      if (minha === versao.current) setErro(e);
    } finally {
      if (minha === versao.current) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ativo) recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, ativo]);

  return { dados, erro, carregando, recarregar, setDados };
}
