import {readFile, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = new URL('./', import.meta.url);
const generated = new URL('wrangler.resolved.json', root);
const cli = fileURLToPath(
  new URL('node_modules/wrangler/bin/wrangler.js', root)
);

function wrangler(args, capture = false) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: fileURLToPath(root),
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: {
      ...process.env,
      CI: 'true',
      NO_COLOR: '1',
      WRANGLER_SEND_METRICS: 'false'
    }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Cloudflareへの操作に失敗しました。公開ログを確認してください。');
  }
  return result.stdout;
}

function resolveDatabase(config, databases) {
  if (!Array.isArray(databases)) {
    throw new Error('DB一覧が取得できません。公開を中止します。');
  }
  const binding = config.d1_databases?.find(item => item.binding === 'DB');
  if (!binding?.database_name) {
    throw new Error('DB接続設定がありません。');
  }
  const matches = databases.filter(
    item => item && item.name === binding.database_name
  );
  if (matches.length !== 1) {
    throw new Error('既存DBを一意に確認できません。公開を中止します。');
  }
  const id = matches[0].uuid;
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error('DB IDが不正
