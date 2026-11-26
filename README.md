# EpiLog — Diário e Catálogo de Séries de TV

Aplicação Web inspirada no Letterboxd, adaptada para séries: o **diário** registra **episódios**; **notas, resenhas e listas** ficam no nível da **série**.
Projeto Final OTES-02 · UDESC Joinville · 2026/2.

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5, React Router 6, CSS puro (tema escuro, responsivo) |
| Backend | Node.js 20+ (LTS) + Express 4, validação com Zod |
| Banco e Auth | Supabase (PostgreSQL + Supabase Auth, JWT validado na API, RLS) |
| Catálogo | TMDB API v3 — chamada **só pelo backend** (token protegido) |

---

## 1. Estrutura de pastas

```
epilog/
├── supabase/
│   └── schema.sql              # tabelas, constraints, índices, triggers, RLS
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── server.js           # app Express, CORS, rotas, tratamento de erros
│       ├── config/             # env.js (validação) e supabase.js (3 clientes)
│       ├── middleware/         # auth.js (JWT) e erros.js (PG → HTTP)
│       ├── services/           # tmdb.js (fallback pt-BR→en-US, cache), catalogo.js (upsert/resiliência), resenhas.js
│       ├── routes/             # catalogo, diario, avaliacoes, listas, perfis, feed
│       └── utils/http.js
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js          # proxy /api → localhost:3001
│   ├── index.html
│   └── src/
│       ├── App.jsx             # mapa de navegação
│       ├── context/            # AuthContext (redirect pós-login), ToastContext
│       ├── lib/                # api.js (JWT automático), supabase.js, formatar.js, useCarregar.js
│       ├── components/         # Estrelas (½ em ½), SerieCard, ResenhaCard (spoiler), BarraProgresso, modais…
│       ├── pages/              # todas as rotas
│       └── styles/global.css
└── docs/                       # capturas de tela
```

---

## 2. Guia rápido de execução

**Pré-requisitos:** Node.js 20 ou superior, uma conta gratuita no [Supabase](https://supabase.com) e uma conta no [TMDB](https://www.themoviedb.org/signup).

### 2.1 Supabase
1. Crie um projeto no Supabase.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Sign In / Providers → Email**, para a apresentação, **desative "Confirm email"** (assim o cadastro entra direto). Se mantiver ativo, o app mostra a tela "Confirme seu e-mail" e volta para a página de origem depois do link.
4. Em **Authentication → URL Configuration**, defina *Site URL* = `http://localhost:5173`.
5. Em **Project Settings → API**, copie: `Project URL`, `anon public` e `service_role` (secreta).

### 2.2 TMDB
Em **Configurações → API**, copie o **API Read Access Token** (o token longo, v4). Ele é usado como `Bearer` na API v3.

### 2.3 Backend
```bash
cd backend
cp .env.example .env       # preencha SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e TMDB_READ_TOKEN
npm install
npm run dev                # http://localhost:3001/api/saude
```

### 2.4 Frontend
```bash
cd frontend
cp .env.example .env       # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (NUNCA a service_role)
npm install
npm run dev                # http://localhost:5173
```

### 2.5 Roteiro sugerido para a apresentação (02/12)
1. `/` → buscar “Ruptura” → abrir a ficha (mostre o badge “Texto em inglês” numa série sem tradução).
2. Clicar em **Quero assistir** como visitante → redireciona para `/entrar` → criar conta → **volta para a ficha**.
3. Abrir a Temporada 1 → registrar o E01 → registrar o E01 de novo (revisita) → progresso continua **1/N**.
4. Dar 4½★ na ficha, escrever resenha com spoiler → mostrar a máscara “Exibir spoiler” em outra conta.
5. Criar lista pública, adicionar séries, reordenar arrastando.
6. Na segunda conta: seguir a primeira, curtir a resenha, abrir `/feed`.
7. Abrir `/u/apelido` e mostrar que diário, e-mail e “Quero assistir” não aparecem.
8. (Resiliência) Trocar `TMDB_READ_TOKEN` por um valor inválido e reiniciar: séries já abertas continuam acessíveis com o aviso de cache.

---

## 3. Referência de design

| Referência | O que foi aproveitado |
|---|---|
| **Letterboxd** | Fundo ardósia escuro, parede de pôsteres, **verde reservado para marca e notas** e **azul para links**, serifa nas resenhas, painel lateral de ações (assistido / watchlist / nota / listas), diário agrupado por mês com o dia em destaque, mosaico de pôsteres nas listas, histograma de notas. |
| **Serializd** (o “Letterboxd das séries”) | Navegação série → temporada → episódio, progresso por temporada e registro por episódio. |

Identidade própria do EpiLog: marca com três barras de “episódios” (verde, azul, coral), tipografia **Fraunces** (títulos e resenhas) + **Inter** (interface), coral para curtidas e spoilers. Não há uso de logotipo, nome ou ativos do Letterboxd. Os tokens ficam em `:root` no início de `frontend/src/styles/global.css`.

---

## 4. Melhorias em relação à especificação original

**Banco de dados**
- `perfil.apelido` com `CHECK` (`^[a-z0-9_]{3,20}$`), que evita colisões entre maiúsculas e minúsculas e mantém as URLs `/u/:apelido` limpas. No signup, um apelido repetido vira `nivea_1`, e quem não informa apelido recebe `user_xxxxxxxx`.
- **Uma única watchlist por perfil** (índice único parcial), sempre privada (`CHECK`). Um trigger impede renomeá-la, torná-la pública ou convertê-la. A RLS impede o usuário de criar ou excluir watchlists.
- Colunas que os requisitos de conteúdo do resumo pedem e que faltavam no modelo: `serie.generos`, `serie.backdrop_path`, `episodio.sinopse`, `episodio.data_exibicao`, `episodio.still_path`, `episodio.duracao_min`, `temporada.total_episodios`.
- `sinopse_idioma` em série e episódio: o badge “texto em inglês” continua aparecendo mesmo quando os dados vêm do cache local.
- `avaliacao.atualizado_em`. Um trigger mantém `publicado_em` imutável, então editar uma resenha não a faz “subir” no feed.
- Índices em todas as FKs e nas consultas de feed e diário. `criado_em` em diário, lista, seguidor e curtida.

**Backend**
- Três clientes Supabase: `service_role` **só** para gravar o catálogo compartilhado, cliente com o **JWT do usuário** para dados pessoais (a RLS vale de verdade) e `anon` para leituras públicas.
- Cache LRU em memória das respostas do TMDB (TTL configurável), timeout de 8 s e *rate limit* em `/api/catalogo`.
- Títulos de episódio sem tradução (“Episódio 3”) usam o título em inglês.
- Busca e destaques também têm fallback para o banco local quando o TMDB cai.
- Registrar um episódio já visto marca `revisita` automaticamente.
- `POST /api/diario/lote`: botão “marcar restantes como vistos hoje”.
- Datas futuras são rejeitadas no diário, e episódios ainda não exibidos ficam desabilitados.

**Frontend**
- Entrada de estrelas acessível (slider ARIA, setas do teclado) e avaliação rápida direto na ficha.
- Lista reordenável por **arrastar e soltar** e por setas, com salvamento automático e *rollback* em caso de erro.
- Rota `/series/:id/avaliacao` (presente no mapa de navegação do resumo) para escrever e editar a resenha.
- Página inicial com séries em alta e resenhas recentes. Na Atividade, busca de perfis para seguir.
- Estatísticas em `/me`: episódios distintos, horas, média das notas, registros no ano.
- Redirecionamento pós-login seguro (aceita só caminhos internos, sem *open redirect*), que também funciona no link de confirmação de e-mail.

---

## 5. API REST

Todas as rotas ficam sob `/api`. Rotas 🔒 exigem `Authorization: Bearer <access_token do Supabase>`, e as rotas ◐ aceitam token opcional.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/saude` | Health check |
| GET | `/catalogo/destaques` | Séries em alta (TMDB → cache local) |
| GET | `/catalogo/busca?q=&pagina=` | Busca por título (pt-BR) |
| GET ◐ | `/catalogo/series/:tmdbId` | Ficha + upsert de série e temporadas + estatísticas + dados pessoais |
| GET ◐ | `/catalogo/series/:tmdbId/temporadas/:n` | Episódios + upsert + progresso (distintos/total) |
| GET 🔒 | `/diario?serie_id=&de=&ate=&revisita=&pagina=` | Histórico (privado) |
| GET 🔒 | `/diario/series` | Séries presentes no diário (filtro) |
| POST 🔒 | `/diario` | `{ episodio_id, assistido_em, revisita? }` |
| POST 🔒 | `/diario/lote` | `{ episodio_ids[], assistido_em }` |
| PATCH 🔒 | `/diario/:id` | `{ assistido_em?, revisita? }` |
| DELETE 🔒 | `/diario/:id` | |
| GET ◐ | `/avaliacoes/recentes` | Últimas resenhas públicas |
| GET ◐ | `/avaliacoes/serie/:serieId?ordem=recentes\|populares` | Resenhas da comunidade |
| PUT 🔒 | `/avaliacoes/serie/:serieId` | Cria ou edita `{ nota, texto?, contem_spoiler? }` |
| DELETE 🔒 | `/avaliacoes/serie/:serieId` | |
| POST/DELETE 🔒 | `/avaliacoes/:id/curtida` | Curtir / descurtir |
| GET 🔒 | `/listas/minhas?serie_id=` | Watchlist + listas, com `contem_serie` |
| POST 🔒 | `/listas` | `{ titulo, descricao?, visibilidade }` |
| POST/DELETE 🔒 | `/listas/watchlist/:serieId` | Adiciona ou remove de “Quero assistir” |
| GET ◐ | `/listas/:id` | Detalhe (404 se privada de terceiros) |
| PATCH/DELETE 🔒 | `/listas/:id` | Edita ou exclui (watchlist protegida) |
| POST 🔒 | `/listas/:id/itens` | `{ serie_id }` ou `{ tmdb_id }` (409 se duplicada) |
| DELETE 🔒 | `/listas/:id/itens/:serieId` | |
| PUT 🔒 | `/listas/:id/ordem` | `{ serie_ids: [...] }` |
| GET | `/perfis?busca=` · `/perfis/disponivel/:apelido` | Busca e disponibilidade |
| GET/PATCH 🔒 | `/perfis/me` | Meu perfil (com e-mail) / editar apelido |
| GET 🔒 | `/perfis/me/estatisticas` · `/perfis/me/seguindo` | |
| GET ◐ | `/perfis/:apelido` | Perfil público: listas públicas + resenhas |
| POST/DELETE 🔒 | `/perfis/:apelido/seguir` | Seguir / deixar de seguir (400 se for você) |
| GET 🔒 | `/feed?pagina=` | Avaliações dos seguidos, `publicado_em` decrescente |

**Erros** retornam `{ "erro": "mensagem em pt-BR" }`. O mapeamento é: 400 (validação, `CHECK`), 401 (sem sessão), 403 (RLS), 404, 409 (duplicata), 503 (TMDB fora e sem cache).

---

## 6. Regras de negócio e onde são garantidas

| Regra | Banco | API | Interface |
|---|---|---|---|
| Nota de 0,5 a 5,0 em passos de 0,5 | `CHECK` | Zod | slider de ½ estrela |
| Uma avaliação por usuário e série | `UNIQUE(perfil_id, serie_id)` | upsert | “Editar resenha” |
| Progresso = episódios **distintos** / total | — | `Set` por episódio | “5 registros · 4/9” |
| Diário e progresso privados | RLS `perfil_id = auth.uid()` | `exigirAuth` | — |
| Spoiler oculto até o clique | — | — | `ResenhaCard` |
| Série uma única vez por lista | PK composta | 409 | “Na lista” |
| Não seguir a si mesmo | `CHECK` | 400 | botão oculto |
| “Quero assistir” privada e criada no signup | trigger + `CHECK` + índice | 400 | sem editar ou excluir |
| Perfil público sem e-mail, diário nem listas privadas | `perfil` sem e-mail + RLS | filtro `publica` | — |
| TMDB fora do ar | dados locais | `fonte: 'cache'` + aviso | faixa amarela |

---

## 7. Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. A página `/sobre` exibe o logotipo oficial. Para funcionar offline, baixe o SVG em <https://www.themoviedb.org/about/logos-attribution> e salve como `frontend/public/tmdb-logo.svg`.
