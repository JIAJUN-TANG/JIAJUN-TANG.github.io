#!/usr/bin/env node
/**
 * 本地管理中台 —— `npm run admin` 起一个只监听 127.0.0.1 的网页后台。
 *
 * 为什么是本地服务而不是纯静态页面：要写文件、跑 git、调 ORCID，
 * 这些都得有后端。服务只绑本机回环地址，不对外网开放。
 *
 * 路由一览（全部挂在 /api 下，返回 JSON）：
 *   GET  /api/state            读全部内容 + 侧栏计数 + 备份列表 + git 状态
 *   POST /api/save             校验后落盘（带自动备份与空分区护栏）
 *   POST /api/backup           手动打一份快照
 *   POST /api/restore          用某份快照覆盖当前内容
 *   POST /api/orcid/report     拉 ORCID 作品，跟站内论文对号入座（只读）
 *   POST /api/orcid/apply      把你勾选的字段/新作品合并进 content.json
 *   POST /api/bibtex/parse     解析 .bib 文本（预览，不落盘）
 *   POST /api/bibtex/import    解析并追加进论文表（按 DOI/标题去重）
 *   POST /api/scholar/sync     跑一次 Google Scholar 引用抓取
 *   GET  /api/git              仓库状态
 *   POST /api/git/commit       提交改动（scope: all | content）
 *   POST /api/git/push         推送到远程
 *   GET  /api/diff             内容数据的 diff
 *
 * 命令行参数：--port 4399 / --no-open
 */

import { createServer } from 'node:http';
import { existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { spawn } from 'node:child_process';

import { ORDER, ID_PREFIX, nextId, normDoi, paperTitles, serializableSchema } from './schema.mjs';
import {
  ROOT,
  CONTENT_FILE,
  CONFIG_FILE,
  SCHOLAR_FILE,
  BACKUP_DIR,
  readContent,
  readJson,
  writeContent,
  validateContent,
  backupContent,
  listBackups,
  sectionCounts,
} from './lib/content.mjs';
import { gitStatus, gitCommit, gitPush, gitDiff } from './lib/git.mjs';
import { buildOrcidReport, applyChanges, normalizeOrcidId } from './lib/orcid.mjs';
import { bibtexToPapers } from './lib/bibtex.mjs';
import { runScholarSync } from './lib/scholar.mjs';
import { listPosts, readPost, writePost, deletePost } from './lib/blog.mjs';

/* ── 配置 ───────────────────────────────────────────────────── */

const DEFAULTS = { port: 4399, orcidId: '', scholarId: '' };
const loadConfig = () => ({ ...DEFAULTS, ...(readJson(CONFIG_FILE, {}) ?? {}) });

/* ── HTTP 小工具 ────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const NO_STORE = { 'Cache-Control': 'no-store' };

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': MIME['.json'], ...NO_STORE });
  res.end(JSON.stringify(obj));
}

function sendFile(res, absPath) {
  if (!existsSync(absPath) || statSync(absPath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return true;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(absPath).toLowerCase()] ?? 'application/octet-stream', ...NO_STORE });
  res.end(readFileSync(absPath));
  return true;
}

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const text = await readBody(req);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
}

/* ── 业务处理 ───────────────────────────────────────────────── */

async function buildState() {
  const content = readContent();
  const git = await gitStatus();
  return {
    ok: true,
    schema: serializableSchema(),
    content,
    counts: sectionCounts(content),
    backups: listBackups(),
    config: loadConfig(),
    scholar: readJson(SCHOLAR_FILE, null),
    paths: { root: ROOT, content: CONTENT_FILE, config: CONFIG_FILE, backupDir: BACKUP_DIR },
    git,
  };
}

/** 校验 → 备份 → 落盘。所有写操作都走这里，保证护栏一致。 */
function commitContent(content, { allowEmpty = false, skipBackup = false } = {}) {
  const previous = readContent();
  const result = validateContent(content, { allowEmpty, previous });
  if (!result.ok) {
    return { ok: false, errors: result.errors, warnings: result.warnings, message: result.message, emptySections: result.emptySections };
  }
  const backup = skipBackup ? null : backupContent();
  const written = writeContent(result.content);
  return { ok: true, warnings: result.warnings, backup, content: written, counts: sectionCounts(written) };
}

/** 在 papers 里按 DOI → 标题判断是否已存在，避免导入重复。 */
function paperExists(papers, candidate) {
  const doi = normDoi(candidate.doi) || normDoi(candidate.url);
  if (doi) {
    for (const p of papers) if (normDoi(p.doi) === doi || normDoi(p.url) === doi) return true;
  }
  const titles = new Set(paperTitles(candidate));
  for (const p of papers) {
    for (const t of paperTitles(p)) if (titles.has(t)) return true;
  }
  return false;
}

async function handleOrcidReport(body) {
  const id = normalizeOrcidId(body.orcidId) || normalizeOrcidId(loadConfig().orcidId);
  if (!id) return { ok: false, error: '请先填 ORCID iD（形如 0000-0000-0000-0000）。' };
  const content = readContent();
  try {
    const report = await buildOrcidReport(content.papers ?? [], id);
    return { ok: true, ...report };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function handleOrcidApply(body) {
  const id = normalizeOrcidId(body.orcidId) || normalizeOrcidId(loadConfig().orcidId);
  if (!id) return { ok: false, error: '请先填 ORCID iD。' };

  const content = readContent();
  const papers = [...(content.papers ?? [])];

  let report;
  try {
    report = await buildOrcidReport(papers, id);
  } catch (e) {
    return { ok: false, error: e.message };
  }

  const matchedById = new Map(report.matched.map((m) => [m.id, m]));
  const selected = new Map((body.apply ?? []).map((item) => [String(item.id), new Set(item.fields ?? [])]));

  let fieldUpdates = 0;
  const nextPapers = papers.map((paper) => {
    const wanted = selected.get(String(paper.id));
    if (!wanted || !wanted.size) return paper;
    const match = matchedById.get(paper.id);
    if (!match) return paper;
    const changes = match.changes.filter((c) => wanted.has(c.field));
    if (!changes.length) return paper;
    fieldUpdates += changes.length;
    return applyChanges(paper, changes);
  });

  const addKeys = new Set(body.add ?? []);
  let added = 0;
  const skipped = [];
  for (const item of report.newWorks) {
    if (!addKeys.has(item.key)) continue;
    if (paperExists(nextPapers, item.paper)) {
      skipped.push(item.paper.title?.en || item.paper.title?.zh || '(无标题)');
      continue;
    }
    nextPapers.push({ id: nextId('papers', nextPapers), ...item.paper });
    added++;
  }

  if (!fieldUpdates && !added) return { ok: true, noop: true, message: '没有勾选任何要合并的内容。' };

  const result = commitContent({ ...content, papers: nextPapers });
  if (!result.ok) return result;
  return { ...result, fieldUpdates, added, addedSkipped: skipped };
}

async function handleBibtexImport(body) {
  const papers = bibtexToPapers(String(body.text ?? ''));
  if (!papers.length) return { ok: false, error: '没解析出条目，确认贴的是 BibTeX 格式。' };

  const content = readContent();
  const next = [...(content.papers ?? [])];
  let added = 0;
  const skipped = [];
  const selected = body.selected ? new Set(body.selected) : null;

  papers.forEach((paper, i) => {
    const key = String(i);
    if (selected && !selected.has(key)) return;
    if (paperExists(next, paper)) {
      skipped.push(paper.title?.en || paper.title?.zh || '(无标题)');
      return;
    }
    next.push({ id: nextId('papers', next), ...paper });
    added++;
  });

  if (!added) return { ok: true, noop: true, message: `解析到 ${papers.length} 条，但都与现有论文重复，没有新增。`, skipped };
  const result = commitContent({ ...content, papers: next });
  if (!result.ok) return result;
  return { ...result, added, skipped, parsed: papers.length };
}

async function handleRestore(body) {
  const name = String(body.name ?? '');
  if (!/^content-[\d-]+\.json$/.test(name)) return { ok: false, error: '快照名不合法。' };
  const src = join(BACKUP_DIR, name);
  if (!existsSync(src)) return { ok: false, error: `找不到快照 ${name}。` };
  backupContent();
  writeFileSync(CONTENT_FILE, readFileSync(src));
  const content = readContent();
  return { ok: true, restored: name, counts: sectionCounts(content), content };
}

/* ── 路由 ───────────────────────────────────────────────────── */

const ROUTES = {
  'GET /api/state': async () => ({ body: await buildState() }),

  'POST /api/save': async (body) => {
    const res = commitContent(body.content, { allowEmpty: Boolean(body.allowEmpty) });
    return { body: res };
  },

  'POST /api/backup': async () => {
    const name = backupContent();
    return { body: { ok: true, backup: name, backups: listBackups() } };
  },

  'POST /api/restore': async (body) => ({ body: await handleRestore(body) }),

  'POST /api/orcid/report': async (body) => ({ body: await handleOrcidReport(body) }),

  'POST /api/orcid/apply': async (body) => ({ body: await handleOrcidApply(body) }),

  'POST /api/bibtex/parse': async (body) => {
    const papers = bibtexToPapers(String(body.text ?? ''));
    return { body: { ok: true, count: papers.length, papers } };
  },

  'POST /api/bibtex/import': async (body) => ({ body: await handleBibtexImport(body) }),

  'POST /api/scholar/sync': async (body) => {
    const id = String(body.scholarId ?? '').trim() || loadConfig().scholarId;
    const res = await runScholarSync({ scholarId: id, attempts: 2 });
    return { body: res };
  },

  'GET /api/git': async () => ({ body: { ok: true, git: await gitStatus() } }),

  'POST /api/git/commit': async (body) => {
    // scope='all' 提交全部改动（含源码与博客），'content' 只提交 data/ 下的内容。
    const scope = body.scope === 'content' ? 'content' : 'all';
    const res = await gitCommit(body.message, { scope });
    return { body: { ...res, git: await gitStatus() } };
  },

  'POST /api/git/push': async () => {
    const res = await gitPush();
    return { body: { ...res, git: await gitStatus() } };
  },

  'GET /api/diff': async () => ({ body: { ok: true, ...(await gitDiff()) } }),

  /* 博客：直接读写 blog/ 下的 Markdown 文件 */
  'GET /api/blog': async () => ({ body: { ok: true, posts: listPosts() } }),
  'POST /api/blog/read': async (body) => ({ body: { ok: true, post: readPost(body.slug) } }),
  'POST /api/blog/save': async (body) => ({ body: { ok: true, ...writePost(body) } }),
  'POST /api/blog/delete': async (body) => ({ body: { ok: true, ...deletePost(body.slug) } }),
};

/* ── 静态文件 ───────────────────────────────────────────────── */

const ADMIN_DIR = join(ROOT, 'admin');
const ALLOW_EXTERNAL = ['/image', '/dist', '/favicon.ico'];

function resolveStatic(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0]);
  if (clean === '/' || clean === '') return join(ADMIN_DIR, 'index.html');
  const safe = normalize(clean).replace(/^(\.\.[/\\])+/, '');
  const external = ALLOW_EXTERNAL.some((p) => safe === p || safe.startsWith(`${p}/`));
  const base = external ? ROOT : ADMIN_DIR;
  const abs = join(base, safe);
  if (!abs.startsWith(base + sep) && abs !== base) return null;
  return abs;
}

/* ── 启动 ───────────────────────────────────────────────────── */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') out.port = Number(argv[++i]);
    else if (argv[i] === '--no-open') out.open = false;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadConfig();
  const port = Number(process.env.ADMIN_PORT) || args.port || cfg.port || DEFAULTS.port;

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const key = `${req.method} ${url.pathname}`;

    if (url.pathname.startsWith('/api/')) {
      const handler = ROUTES[key];
      if (!handler) return sendJson(res, 404, { ok: false, error: `未知接口 ${key}` });
      try {
        const body = req.method === 'GET' ? {} : await readJsonBody(req);
        const out = await handler(body);
        return sendJson(res, 200, out.body);
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message });
      }
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Method Not Allowed');
    }
    const abs = resolveStatic(url.pathname);
    if (!abs) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Forbidden');
    }
    return sendFile(res, abs);
  });

  server.listen(port, '127.0.0.1', () => {
    const link = `http://127.0.0.1:${port}/`;
    console.log('');
    console.log('  内容中台已启动');
    console.log(`  ${link}`);
    console.log('');
    console.log(`  数据文件  ${CONTENT_FILE.replace(`${ROOT}/`, '')}`);
    console.log(`  备份目录  ${BACKUP_DIR.replace(`${ROOT}/`, '')}/`);
    console.log(`  ORCID     ${cfg.orcidId || '(未配置)'}      Scholar  ${cfg.scholarId || '(未配置)'}`);
    console.log('');
    console.log('  按 Ctrl+C 停止');
    console.log('');
    if (args.open !== false && process.platform === 'darwin') {
      spawn('open', [link], { stdio: 'ignore', detached: true }).unref();
    }
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`端口 ${port} 已被占用。换一个：npm run admin -- --port ${port + 1}`);
    } else {
      console.error(e.message);
    }
    process.exit(1);
  });
}

main();
