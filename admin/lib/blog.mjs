/**
 * 博客文章读写 —— `blog/` 目录下的 Markdown 文件。
 *
 * 每篇文章是一个 `.md` 文件：开头一小段 front-matter（title / date /
 * summary / tags / lang），其余是正文。站点构建时用 `import.meta.glob`
 * 直接把同一批文件读进去（见根目录 `blog.ts`），中台只是它们的另一个编辑器，
 * 两边共用同一套 front-matter 约定。
 *
 * 文件名即 slug，会参与拼路径，所以写入前必须严格校验 —— 见 assertSlug。
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { BACKUP_DIR, ROOT } from './content.mjs';

export const BLOG_DIR = join(ROOT, 'blog');
const BLOG_BACKUP_DIR = join(BACKUP_DIR, 'blog');

/** 只允许小写字母、数字与连字符：既为 URL 友好，也是路径穿越的第一道闸。 */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertSlug(slug) {
  const s = String(slug ?? '').trim();
  if (!SLUG_RE.test(s)) {
    throw new Error(
      '文件名只能用英文小写字母、数字和连字符（例如 how-this-site-works），不能有空格、斜杠或中文。',
    );
  }
  return s;
}

/* ── front-matter ────────────────────────────────────────────── */

const unquote = (value) => {
  const s = String(value ?? '').trim();
  const quoted =
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")));
  return quoted ? s.slice(1, -1).replace(/\\(["'\\])/g, '$1') : s;
};

/** 拆分 front-matter 与正文；没有头部时整篇都是正文。 */
export function parseFrontMatter(raw) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---[ \t]*\n?/.exec(text);
  if (!match) return { data: {}, body: text.trim() };

  const data = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const at = line.indexOf(':');
    if (at < 0) continue;
    const key = line.slice(0, at).trim();
    if (key) data[key] = line.slice(at + 1).trim();
  }
  return { data, body: text.slice(match[0].length).trim() };
}

/** 只在必要时加引号，让写出来的头部保持可读。 */
const NEEDS_QUOTE = /[:#'"]|^\s|\s$|^[[{>|*&!-]/;
const scalar = (v) => {
  const s = String(v ?? '').trim();
  return NEEDS_QUOTE.test(s) ? `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : s;
};

export function stringifyFrontMatter(meta) {
  const lines = [];
  const push = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      lines.push(`${key}: ${scalar(value)}`);
    }
  };
  push('title', meta.title);
  push('date', meta.date);
  push('summary', meta.summary);
  if (meta.tags && meta.tags.length) {
    lines.push(`tags: [${meta.tags.map((t) => scalar(t)).join(', ')}]`);
  }
  push('lang', meta.lang);
  return lines.length ? `---\n${lines.join('\n')}\n---\n\n` : '';
}

const parseTagList = (raw) => {
  const s = String(raw ?? '').trim();
  const inner = s.startsWith('[') && s.endsWith(']') ? s.slice(1, -1) : s;
  return inner.split(',').map((p) => unquote(p)).filter(Boolean);
};

/* ── 读 ──────────────────────────────────────────────────────── */

const isPost = (name) => /\.md$/i.test(name) && !name.startsWith('.');

function fileToPost(name, { withBody = false } = {}) {
  const slug = name.replace(/\.md$/i, '');
  const full = join(BLOG_DIR, name);
  const raw = readFileSync(full, 'utf8');
  const { data, body } = parseFrontMatter(raw);
  const st = statSync(full);
  const lang = unquote(data.lang ?? '').toLowerCase();
  const post = {
    slug,
    title: unquote(data.title ?? '') || slug,
    date: unquote(data.date ?? ''),
    summary: unquote(data.summary ?? ''),
    tags: data.tags ? parseTagList(data.tags) : [],
    lang: lang === 'zh' || lang === 'en' ? lang : '',
    bytes: st.size,
    mtime: st.mtime.toISOString(),
  };
  return withBody ? { ...post, body } : post;
}

/** 全部文章，按日期倒序（没有日期的排在最后，按文件名）。 */
export function listPosts() {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter(isPost)
    .map((name) => fileToPost(name))
    .sort((a, b) => {
      if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      if (a.date) return -1;
      if (b.date) return 1;
      return a.slug.localeCompare(b.slug);
    });
}

export function readPost(slug) {
  const s = assertSlug(slug);
  const full = join(BLOG_DIR, `${s}.md`);
  if (!existsSync(full)) throw new Error(`找不到文章 ${s}.md`);
  return fileToPost(`${s}.md`, { withBody: true });
}

/* ── 写 ──────────────────────────────────────────────────────── */

/** 覆盖或删除之前，先把旧文件另存一份（在 data/backups/blog/ 下）。 */
function backupPost(slug) {
  const full = join(BLOG_DIR, `${slug}.md`);
  if (!existsSync(full)) return null;
  mkdirSync(BLOG_BACKUP_DIR, { recursive: true });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
  const name = `${slug}-${stamp}.md`;
  copyFileSync(full, join(BLOG_BACKUP_DIR, name));
  return name;
}

const trimTags = (tags) =>
  (Array.isArray(tags) ? tags : [])
    .map((t) => String(t ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);

/**
 * 写入一篇文章。`originalSlug` 与 `slug` 不同时视为重命名
 * （旧文件会先备份再删除）。
 */
export function writePost({ slug, originalSlug, title, date, summary, tags, lang, body }) {
  const nextSlug = assertSlug(slug);
  if (!String(title ?? '').trim()) throw new Error('标题不能为空。');

  const rawDate = String(date ?? '').trim();
  if (rawDate && !DATE_RE.test(rawDate)) {
    throw new Error('日期要写成 2026-09-13 这样的格式。');
  }
  const rawLang = String(lang ?? '').trim().toLowerCase();
  if (rawLang && rawLang !== 'zh' && rawLang !== 'en') {
    throw new Error('语言只能填 zh 或 en。');
  }

  mkdirSync(BLOG_DIR, { recursive: true });
  const backup = backupPost(nextSlug);

  const meta = {
    title: String(title).trim(),
    date: rawDate || new Date().toISOString().slice(0, 10),
    summary: String(summary ?? '').trim(),
    tags: trimTags(tags),
    lang: rawLang,
  };
  const text = stringifyFrontMatter(meta) + String(body ?? '').replace(/^\n+/, '').trimEnd() + '\n';
  writeFileSync(join(BLOG_DIR, `${nextSlug}.md`), text, 'utf8');

  // 改过文件名就把旧文件删掉（它已经备份过了）。
  if (originalSlug && String(originalSlug) !== nextSlug) {
    const oldSlug = assertSlug(originalSlug);
    const oldFull = join(BLOG_DIR, `${oldSlug}.md`);
    if (existsSync(oldFull)) {
      backupPost(oldSlug);
      unlinkSync(oldFull);
    }
  }

  return { slug: nextSlug, backup, post: readPost(nextSlug) };
}

export function deletePost(slug) {
  const s = assertSlug(slug);
  const full = join(BLOG_DIR, `${s}.md`);
  if (!existsSync(full)) throw new Error(`找不到文章 ${s}.md`);
  const backup = backupPost(s);
  unlinkSync(full);
  return { slug: s, backup };
}
