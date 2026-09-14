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

/**
 * 「你的输入不对」而不是「服务器炸了」。带上 400，中台就按 4xx 返回，
 * 浏览器控制台不会留下一条吓人的 500。
 */
const userError = (message) => Object.assign(new Error(message), { status: 400 });

/** 只允许小写字母、数字与连字符：既为 URL 友好，也是路径穿越的第一道闸。 */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertSlug(slug) {
  const s = String(slug ?? '').trim();
  if (!SLUG_RE.test(s)) {
    throw userError(
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
  if (!existsSync(full)) throw userError(`找不到文章 ${s}.md`);
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
  if (!String(title ?? '').trim()) throw userError('标题不能为空。');

  const rawDate = String(date ?? '').trim();
  if (rawDate && !DATE_RE.test(rawDate)) {
    throw userError('日期要写成 2026-09-13 这样的格式。');
  }
  const rawLang = String(lang ?? '').trim().toLowerCase();
  if (rawLang && rawLang !== 'zh' && rawLang !== 'en') {
    throw userError('语言只能填 zh 或 en。');
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
  if (!existsSync(full)) throw userError(`找不到文章 ${s}.md`);
  const backup = backupPost(s);
  unlinkSync(full);
  return { slug: s, backup };
}

/* ═══════════════════════════════════════════════
   文章素材（blog/<slug>/ 里的图片、视频、音频、PDF）

   站点侧由 `blog.ts` 的 `resolveAsset` 读同一批文件，正文里只写相对路径
   （`![封面](cover.png)`）。中台负责把文件放进去、列出来、删掉。
   ═══════════════════════════════════════════════ */

const ASSET_BACKUP_DIR = join(BACKUP_DIR, 'blog', 'assets');

/** 允许放进仓库的类型。白名单而不是黑名单：blog/ 会在构建时被打进产物。 */
export const ASSET_EXT = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp',
  'mp4', 'webm', 'ogv', 'mov', 'm4v',
  'mp3', 'wav', 'm4a', 'ogg', 'oga', 'flac', 'aac',
  'pdf',
];

export const ASSET_MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp']);
const VIDEO_EXT = new Set(['mp4', 'webm', 'ogv', 'mov', 'm4v']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'm4a', 'ogg', 'oga', 'flac', 'aac']);

export const assetKind = (name) => {
  const ext = String(name).split('.').pop().toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'file';
};

/**
 * 把上传的文件名收拾干净：去掉目录、替换不安全字符、强制保留合法扩展名。
 * 上传一律落在文章目录的**第一层**，子目录留给作者自己整理。
 */
export function safeAssetName(raw) {
  const input = String(raw ?? '').trim();
  // 只留最后一段 —— 顺手挡掉 `../` 与绝对路径。
  const base = input.split(/[\\/]/).filter(Boolean).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) throw userError('文件名要有扩展名，例如 cover.png。');

  const ext = base.slice(dot + 1).toLowerCase();
  if (!ASSET_EXT.includes(ext)) {
    throw userError(`不支持 .${ext} 文件。可用的类型：${ASSET_EXT.join('、')}`);
  }

  const stem = base
    .slice(0, dot)
    .replace(/[^\w\u4e00-\u9fff.-]+/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
  if (!stem) throw userError('文件名不能全是符号，给它起个名字。');

  return `${stem}.${ext}`;
}

/** 素材路径的每一段：中文、字母、数字、下划线、点、连字符，且不以点开头。 */
const SEG_RE = /^[\w\u4e00-\u9fff][\w\u4e00-\u9fff.-]{0,60}$/;

/**
 * 校验一个**已存在**素材的相对路径（`sub/deep.png`），最多三层。
 * 和 safeAssetName 一样是安全边界：删除操作直接拼路径，必须先卡死穿越。
 */
export function assertAssetPath(raw) {
  const input = String(raw ?? '').trim().replace(/\\/g, '/');
  if (!input) throw userError('缺少素材文件名。');
  if (input.startsWith('/') || /^[a-z]:/i.test(input)) {
    throw userError('素材路径必须是相对路径。');
  }

  const parts = input.split('/').filter((p) => p && p !== '.');
  if (!parts.length || parts.length > 3) throw userError('素材路径不对。');
  for (const part of parts) {
    if (part === '..' || !SEG_RE.test(part)) throw userError(`素材路径里有非法字符：${part}`);
  }

  const name = parts[parts.length - 1];
  const ext = name.split('.').pop().toLowerCase();
  if (name === ext || !ASSET_EXT.includes(ext)) {
    throw userError(`不支持 .${ext} 文件。可用的类型：${ASSET_EXT.join('、')}`);
  }
  return parts.join('/');
}

const assetDirOf = (slug) => join(BLOG_DIR, assertSlug(slug));

/** 该文章已经放了哪些素材（含子目录，最多三层）；`used` 表示正文里是否已引用。 */
export function listAssets(slug) {
  const dir = assetDirOf(slug);
  if (!existsSync(dir)) return [];

  let body = '';
  const postFile = join(BLOG_DIR, `${assertSlug(slug)}.md`);
  if (existsSync(postFile)) body = readFileSync(postFile, 'utf8');

  const out = [];
  const walk = (rel, depth) => {
    if (depth > 2) return;
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(child, depth + 1);
        continue;
      }
      const st = statSync(join(dir, child));
      out.push({
        name: child,
        kind: assetKind(child),
        size: st.size,
        mtime: st.mtime.toISOString(),
        // 正文里写 `deep.png` 或 `sub/deep.png` 都算引用。
        used: body.includes(child) || body.includes(entry.name),
      });
    }
  };
  walk('', 0);
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** 覆盖同名素材前先留一份，避免手滑把好不容易做的图冲掉。 */
function backupAsset(slug, name) {
  const full = join(assetDirOf(slug), name);
  if (!existsSync(full)) return null;
  mkdirSync(ASSET_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  // 备份是平铺的，把子目录的斜杠换成连字符。
  const flat = name.replace(/\//g, '-');
  const target = `${stamp}-${assertSlug(slug)}-${flat}`;
  copyFileSync(full, join(ASSET_BACKUP_DIR, target));
  pruneAssetBackups();
  return target;
}

function pruneAssetBackups() {
  try {
    const items = readdirSync(ASSET_BACKUP_DIR)
      .map((name) => ({ name, mtime: statSync(join(ASSET_BACKUP_DIR, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const item of items.slice(30)) {
      try {
        unlinkSync(join(ASSET_BACKUP_DIR, item.name));
      } catch {
        /* 留着也不影响使用 */
      }
    }
  } catch {
    /* 备份目录还不存在 */
  }
}

/**
 * 落盘一个素材。`base64` 来自浏览器 FileReader，是完整 data URL 或纯 base64。
 * 返回可直接粘进正文的 Markdown 片段。
 */
export function saveAsset({ slug, name, base64 }) {
  const s = assertSlug(slug);
  const safe = safeAssetName(name);

  const payload = String(base64 ?? '').replace(/^data:[^;,]+;base64,/, '');
  if (!payload) throw userError('没有收到文件内容。');

  const buf = Buffer.from(payload, 'base64');
  if (!buf.length) throw userError('文件内容解析失败，重试一次。');
  if (buf.length > ASSET_MAX_BYTES) {
    throw userError(`文件 ${(buf.length / 1048576).toFixed(1)}MB，超过 ${ASSET_MAX_BYTES / 1048576}MB 上限。先压缩一下。`);
  }

  const dir = join(BLOG_DIR, s);
  mkdirSync(dir, { recursive: true });
  const backup = backupAsset(s, safe);
  writeFileSync(join(dir, safe), buf);

  return { slug: s, name: safe, bytes: buf.length, backup, markdown: `![说明](${safe})` };
}

export function deleteAsset({ slug, name }) {
  const s = assertSlug(slug);
  const safe = assertAssetPath(name);
  const full = join(BLOG_DIR, s, safe);
  if (!existsSync(full)) throw userError(`找不到素材 ${safe}。`);
  const backup = backupAsset(s, safe);
  unlinkSync(full);
  return { slug: s, name: safe, backup };
}

