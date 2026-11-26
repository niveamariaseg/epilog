import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCarregar } from '../lib/useCarregar.js';
import { useToast } from '../context/ToastContext.jsx';
import Poster from '../components/Poster.jsx';
import { EstrelasInput } from '../components/Estrelas.jsx';
import { Carregando, ErroCarga } from '../components/Feedback.jsx';

/** /series/:id/avaliacao — nota (½ a 5★), resenha opcional e marcação de spoiler. */
export default function Avaliar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notificar = useToast();
  const { dados: ficha, erro, carregando, recarregar } = useCarregar(() => api(`/catalogo/series/${id}`), [id]);

  const [nota, setNota] = useState(null);
  const [texto, setTexto] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState(null);

  const existente = ficha?.pessoal?.avaliacao;

  useEffect(() => {
    if (existente) {
      setNota(Number(existente.nota));
      setTexto(existente.texto || '');
      setSpoiler(existente.contem_spoiler);
    }
  }, [existente]);

  if (carregando) return <Carregando />;
  if (erro) return <div className="container"><ErroCarga erro={erro} onTentar={recarregar} /></div>;
  if (!ficha) return null;

  const { serie } = ficha;

  async function salvar(e) {
    e.preventDefault();
    if (!nota) {
      setErroForm('Escolha uma nota de ½ a 5 estrelas.');
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      await api(`/avaliacoes/serie/${serie.id}`, {
        metodo: 'PUT',
        corpo: { nota, texto, contem_spoiler: spoiler },
      });
      notificar(existente ? 'Avaliação atualizada' : 'Avaliação publicada');
      navigate(`/series/${serie.tmdb_id}`);
    } catch (e2) {
      setErroForm(e2.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm('Remover sua nota e resenha desta série?')) return;
    setSalvando(true);
    try {
      await api(`/avaliacoes/serie/${serie.id}`, { metodo: 'DELETE' });
      notificar('Avaliação removida');
      navigate(`/series/${serie.tmdb_id}`);
    } catch (e2) {
      setErroForm(e2.message);
      setSalvando(false);
    }
  }

  return (
    <div className="container pagina-estreita">
      <div className="avaliar-cabecalho">
        <Poster caminho={serie.poster_path} titulo={serie.nome} tamanho="w185" className="poster-mini" />
        <div>
          <p className="muted">{existente ? 'Editando sua avaliação de' : 'Avaliar'}</p>
          <h1>
            <Link to={`/series/${serie.tmdb_id}`}>{serie.nome}</Link>{' '}
            {serie.ano_estreia && <span className="muted">{serie.ano_estreia}</span>}
          </h1>
        </div>
      </div>

      <form className="form cartao" onSubmit={salvar}>
        <div className="campo">
          <span>Nota</span>
          <EstrelasInput valor={nota} onChange={setNota} tamanho="xl" />
          <small className="muted">Clique na metade esquerda de uma estrela para meia estrela. Setas do teclado também funcionam.</small>
        </div>

        <label className="campo">
          <span>Resenha <span className="muted">(opcional · pública)</span></span>
          <textarea
            rows={8}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={10000}
            placeholder="O que você achou da série?"
          />
          <small className="muted contador-caracteres">{texto.length.toLocaleString('pt-BR')} / 10.000</small>
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
          <span>
            Contém spoilers <span className="muted">— o texto ficará oculto até o leitor clicar em “Exibir spoiler”</span>
          </span>
        </label>

        {erroForm && <p className="form-erro">{erroForm}</p>}

        <div className="form-acoes">
          {existente && (
            <button type="button" className="btn btn-perigo-fantasma" onClick={excluir} disabled={salvando}>
              Excluir avaliação
            </button>
          )}
          <span className="espaco" />
          <Link to={`/series/${serie.tmdb_id}`} className="btn btn-fantasma">Cancelar</Link>
          <button className="btn btn-primario" disabled={salvando}>
            {salvando ? 'Salvando…' : existente ? 'Salvar alterações' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  );
}
