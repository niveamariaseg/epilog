import { useState } from 'react';

// Logotipo oficial do TMDB (versão "blue short"), conforme a página de atribuição do TMDB.
// Para uso offline, baixe o SVG em https://www.themoviedb.org/about/logos-attribution
// e salve como frontend/public/tmdb-logo.svg — ele terá prioridade.
const LOGO_LOCAL = '/tmdb-logo.svg';
const LOGO_REMOTO =
  'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

function LogoTmdb() {
  const [src, setSrc] = useState(LOGO_LOCAL);
  const [falhou, setFalhou] = useState(false);
  if (falhou) return <strong className="tmdb-texto">The Movie Database (TMDB)</strong>;
  return (
    <img
      src={src}
      alt="The Movie Database (TMDB)"
      className="tmdb-logo"
      onError={() => (src === LOGO_LOCAL ? setSrc(LOGO_REMOTO) : setFalhou(true))}
    />
  );
}

export default function Sobre() {
  return (
    <div className="container pagina-estreita sobre">
      <h1>Sobre o EpiLog</h1>
      <p className="lead">
        O EpiLog é uma aplicação Web para quem quer organizar e compartilhar a experiência com séries de TV. Inspirado no
        Letterboxd, o diário funciona no nível de <strong>episódios</strong>, enquanto notas, resenhas e listas ficam no
        nível da <strong>série</strong>.
      </p>

      <section className="cartao">
        <h2>Projeto acadêmico</h2>
        <dl className="ficha-tecnica">
          <dt>Instituição</dt><dd>UDESC — Centro de Ciências Tecnológicas, Joinville</dd>
          <dt>Disciplina</dt><dd>OTES-02 · Projeto Final · 2026/2</dd>
          <dt>Equipe</dt><dd>Nivea Maria Seger e Enzo Holtz Lourenço</dd>
          <dt>Professora</dt><dd>Débora Cabral Nazário</dd>
        </dl>
      </section>

      <section className="cartao">
        <h2>Como funciona</h2>
        <ul className="lista-simples">
          <li>Busque uma série e abra a ficha; escolha uma temporada para ver os episódios.</li>
          <li>Cada visualização vira uma entrada no seu diário, com data e marcação de revisita.</li>
          <li>O progresso conta episódios <em>distintos</em>: rever o mesmo episódio não infla a barra.</li>
          <li>Dê de ½ a 5 estrelas e, se quiser, escreva uma resenha — com máscara para spoilers.</li>
          <li>“Quero assistir” é privada; outras listas podem ser públicas ou privadas.</li>
          <li>Siga perfis e acompanhe as resenhas deles na sua Atividade.</li>
          <li>Seu diário, seu progresso e seu e-mail nunca aparecem para outras pessoas.</li>
        </ul>
      </section>

      <section className="cartao">
        <h2>Tecnologias</h2>
        <p>
          React + Vite no navegador, Node.js + Express na API REST, PostgreSQL gerenciado e autenticação pelo Supabase
          (com políticas de segurança por linha), e o catálogo consultado sob demanda no TMDB pelo servidor.
        </p>
      </section>

      <section className="cartao atribuicao-tmdb">
        <h2>Créditos do catálogo</h2>
        <LogoTmdb />
        <p>
          <strong>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</strong>
          <br />
          <span className="muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
        </p>
        <p className="muted">
          Títulos, sinopses, pôsteres e dados de episódios são fornecidos pelo{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">The Movie Database</a>. Quando não há
          tradução em português, o EpiLog exibe o texto em inglês com um aviso.
        </p>
      </section>
    </div>
  );
}
