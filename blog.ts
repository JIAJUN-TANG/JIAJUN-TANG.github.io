import type { BlogPost, Lang } from './types';

/**
 * Blog posts are plain Markdown files under `blog/`.
 *
 * Adding a post = dropping a new `.md` file into that folder. Vite picks it up
 * at build time through `import.meta.glob`, so there is no index file to keep
 * in sync and no CMS in the loop. Everything before the closing `---` is a
 * small front-matter header:
 *
 *   ---
 *   title: 这个网站是怎么搭起来的
 *   date: 2026-09-13
 *   summary: 一句话说明这篇文章讲什么
 *   tags: [技术, 建站]
 *   lang: zh
 *   ---
 *
 *  正文 Markdown...
 *
 * Only `key: value` lines and `[a, b, c]` lists are supported - that covers
 * everything a post header needs, and keeps this file dependency-free.
 */

const RAW = import.meta.glob('./blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Drop a surrounding quote pair, unescaping the common cases. */
function unquote(value: string): string {
  const s = value.trim();
  const quoted =
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")));
  return quoted ? s.slice(1, -1).replace(/\\(["'\\])/g, '$1') : s;
}

/** `[a, b, c]` → ['a', 'b', 'c']; a bare value becomes a one-element list. */
function parseList(value: string): string[] {
  const s = value.trim();
  const inner = s.startsWith('[') && s.endsWith(']') ? s.slice(1, -1) : s;
  return inner
    .split(',')
    .map((part) => unquote(part))
    .filter(Boolean);
}

interface ParsedFile {
  data: Record<string, string>;
  body: string;
}

/**
 * Split a Markdown file into front-matter fields and body text. The fence is
 * only recognised at the very top of the file, so horizontal rules in the body
 * are left alone. A file with no header is treated as pure content.
 */
function parseFrontMatter(raw: string): ParsedFile {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---[ \t]*\n?/.exec(text);
  if (!match) return { data: {}, body: text.trim() };

  const data: Record<string, string> = {};
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

/** `blog/how-this-site-works.md` → `how-this-site-works`. */
const slugOf = (path: string): string => path.replace(/^.*\//, '').replace(/\.md$/i, '');

function toPost(path: string, raw: string): BlogPost {
  const { data, body } = parseFrontMatter(raw);
  const slug = slugOf(path);
  const lang = unquote(data.lang ?? '').toLowerCase();
  return {
    slug,
    title: unquote(data.title ?? '') || slug,
    date: unquote(data.date ?? ''),
    summary: data.summary ? unquote(data.summary) : undefined,
    tags: data.tags ? parseList(data.tags) : undefined,
    lang: lang === 'zh' || lang === 'en' ? (lang as Lang) : undefined,
    body,
  };
}

/** Every post, newest first. Undated files sink to the bottom, sorted by slug. */
export const BLOG_POSTS: BlogPost[] = Object.entries(RAW)
  .map(([path, raw]) => toPost(path, raw))
  .sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });

export const findPost = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((post) => post.slug === slug);
