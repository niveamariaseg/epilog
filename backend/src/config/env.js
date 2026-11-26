import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Carrega backend/.env sem depender de --env-file (funciona em qualquer Node 18+)
const arquivoEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
if (fs.existsSync(arquivoEnv)) {
  for (const linha of fs.readFileSync(arquivoEnv, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || linha.trim().startsWith('#')) continue;
    const valor = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
} else {
  console.error(`\n[EpiLog] Arquivo não encontrado: ${arquivoEnv}`);
}

const obrigatorias = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TMDB_READ_TOKEN',
];

const faltando = obrigatorias.filter((k) => !process.env[k]);
if (faltando.length) {
  console.error(
    `\n[EpiLog] Variáveis de ambiente ausentes: ${faltando.join(', ')}\n` +
      'Copie backend/.env.example para backend/.env e preencha os valores.\n'
  );
  process.exit(1);
}

export const env = {
  porta: Number(process.env.PORT) || 3001,
  origens: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  tmdbToken: process.env.TMDB_READ_TOKEN,
  tmdbCacheTtl: (Number(process.env.TMDB_CACHE_TTL) || 600) * 1000,
};
