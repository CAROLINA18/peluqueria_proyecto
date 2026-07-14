import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';

async function ensureEnv() {
  try {
    await access('.env', constants.F_OK);
    console.log('✓ .env existente; no se sobrescribe.');
  } catch {
    await copyFile('.env.example', '.env');
    console.log('✓ .env creado desde .env.example.');
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await ensureEnv();
run('npm', ['ci']);
console.log('\nListo. Ejecuta: npm run db:up && npm run db:migrate && npm run db:seed && npm run dev');
