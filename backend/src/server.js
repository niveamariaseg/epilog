import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { tratarErros, naoEncontrado } from './middleware/erros.js';
import catalogo from './routes/catalogo.js';
import diario from './routes/diario.js';
import avaliacoes from './routes/avaliacoes.js';
import listas from './routes/listas.js';
import perfis from './routes/perfis.js';
import feed from './routes/feed.js';

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin(origem, cb) {
      // permite ferramentas como Postman (sem Origin) e as origens configuradas
      if (!origem || env.origens.includes(origem)) return cb(null, true);
      cb(new Error(`Origem não permitida pelo CORS: ${origem}`));
    },
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

app.get('/api/saude', (_req, res) => {
  res.json({ ok: true, servico: 'EpiLog API', horario: new Date().toISOString() });
});

app.use('/api/catalogo', catalogo);
app.use('/api/diario', diario);
app.use('/api/avaliacoes', avaliacoes);
app.use('/api/listas', listas);
app.use('/api/perfis', perfis);
app.use('/api/feed', feed);

app.use('/api', naoEncontrado);
app.use(tratarErros);

app.listen(env.porta, () => {
  console.log(`\n🎬 EpiLog API rodando em http://localhost:${env.porta}/api`);
  console.log(`   CORS liberado para: ${env.origens.join(', ')}\n`);
});
