/**
 * Google Scholar 引用同步。
 *
 * 真正的抓取交给 scripts/update_scholar_citations.py（scholarly 库），
 * 这里只负责：找 python、跑脚本、把前后两份 scholar.json 比出差异。
 * 脚本本身有保护——抓不到数据就不覆盖旧文件，所以失败是安全的。
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

import { ROOT, readJson, SCHOLAR_FILE } from './content.mjs';

const VENV_PYTHON = '/Users/tangjiajun/.workbuddy/binaries/python/envs/default/bin/python';

/** 按可用性挑一个 python。 */
export function resolvePython(preferred) {
  const candidates = [
    preferred,
    process.env.PYTHON,
    existsSync(VENV_PYTHON) ? VENV_PYTHON : null,
    'python3',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c === 'python3') return c;
    if (existsSync(c)) return c;
  }
  return 'python3';
}

const byPubId = (pubs) => {
  const m = new Map();
  for (const p of pubs ?? []) {
    if (p.pub_id) m.set(p.pub_id, p);
  }
  return m;
};

/**
 * 跑一次抓取。
 * @param {{python?:string, scholarId?:string, attempts?:number}} opts
 */
export async function runScholarSync({ python, scholarId, attempts = 2 } = {}) {
  const before = readJson(SCHOLAR_FILE, {}) ?? {};
  const py = resolvePython(python);
  const args = ['scripts/update_scholar_citations.py'];
  const env = {
    ...process.env,
    GOOGLE_SCHOLAR_ID: scholarId || before.scholar_id || '',
    SCHOLAR_ATTEMPTS: String(attempts),
  };

  const started = Date.now();
  const run = await new Promise((resolve) => {
    execFile(py, args, { cwd: ROOT, env, timeout: 240000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, error, stdout: stdout ?? '', stderr: stderr ?? '' });
    });
  });

  const log = [run.stdout, run.stderr].filter(Boolean).join('\n').trim().slice(-4000);
  const after = readJson(SCHOLAR_FILE, {}) ?? {};
  const changed = readJson(SCHOLAR_FILE) && JSON.stringify(before) !== JSON.stringify(after);

  const changes = [];
  if (changed) {
    const b = byPubId(before.publications);
    for (const pub of after.publications ?? []) {
      const prev = b.get(pub.pub_id);
      if (prev && prev.citations !== pub.citations) {
        changes.push({ title: pub.title, from: prev.citations, to: pub.citations, pub_id: pub.pub_id });
      }
    }
    const bIds = new Set((before.publications ?? []).map((p) => p.pub_id));
    for (const pub of after.publications ?? []) {
      if (!bIds.has(pub.pub_id)) changes.push({ title: pub.title, from: null, to: pub.citations, added: true });
    }
  }

  return {
    ok: run.ok,
    python: py,
    log,
    seconds: Math.round((Date.now() - started) / 1000),
    updatedAt: after.updated ?? null,
    profile: after.profile ?? null,
    publications: (after.publications ?? []).length,
    changes,
    changed,
    hint: run.ok
      ? undefined
      : '抓取失败时脚本不会覆盖旧的 data/scholar.json，站点上的引用数保持原样。' +
        (log.includes('Cannot Fetch')
          ? '当前网络访问不到 scholar.google.com —— 在本机终端里跑，或配 SCRAPERAPI_KEY 走代理。'
          : ''),
  };
}
