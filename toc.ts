import React from 'react';

/**
 * Table of contents for long-form Markdown (blog posts).
 *
 * The article body is rendered by `react-markdown`, which does not emit heading
 * ids on its own. So we do it in two passes over the same source:
 *
 *   1. `extractHeadings()` scans the raw Markdown to build the outline list;
 *   2. the heading overrides in `App.tsx` look their id up by heading text.
 *
 * Both passes share `stripInlineMarkdown` + `slugifyHeading`, which is what
 * keeps a TOC link and the element it points at in sync. Nothing here touches
 * the DOM at parse time, so it stays cheap and renders identically on the
 * server-free static build.
 */

/** One entry in the outline. `id` is the DOM id of the rendered heading. */
export interface TocHeading {
  id: string;
  /** Display text — Markdown syntax already removed. */
  text: string;
  /** 1 = `#`, 2 = `##`, ... */
  level: number;
}

/** Turn heading text into a URL/DOM-safe fragment. CJK is kept as-is. */
export function slugifyHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

/**
 * Drop inline Markdown so the same string can be produced from the raw source
 * and from the rendered React tree: links keep their label, code keeps its
 * content, emphasis markers disappear.
 */
export function stripInlineMarkdown(text: string): string {
  const out = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // image -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // link -> label
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/<[^>]+>/g, ' '); // inline HTML
  return out.replace(/\s+/g, ' ').trim();
}

/** Collapse whitespace so two views of the same heading compare equal. */
export const normalizeHeadingText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Read the plain text out of a rendered React node tree. */
export function nodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (React.isValidElement(node)) {
    return nodeText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/**
 * Collect the ATX headings (`# ...`) of a Markdown document, in document order.
 * Fenced code blocks and indented code are skipped, so a `#` inside a sample
 * snippet never shows up in the outline. Duplicate titles get `-1`, `-2` …
 * suffixes, matching what the render pass produces.
 */
export function extractHeadings(markdown: string, maxLevel = 3): TocHeading[] {
  const headings: TocHeading[] = [];
  const seen = new Map<string, number>();
  let fence: { char: string; size: number } | null = null;

  for (const rawLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();

    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      if (!fence) fence = { char, size: fenceMatch[1].length };
      else if (fence.char === char) fence = null;
      continue;
    }
    if (fence) continue;
    // Indented code block — not a heading even though it starts with `#`.
    if (/^( {4,}|\t)/.test(rawLine)) continue;

    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    if (level > maxLevel) continue;

    const text = stripInlineMarkdown(match[2].replace(/\s*#+\s*$/, ''));
    if (!text) continue;

    const base = slugifyHeading(text);
    const used = seen.get(base) ?? 0;
    seen.set(base, used + 1);
    headings.push({ id: used ? `${base}-${used}` : base, text, level });
  }

  return headings;
}

/**
 * Briefly tint a heading so the eye lands with the scroll. Done in JS rather
 * than with `:target`, which browsers do not re-evaluate after `replaceState`.
 */
function flashHeading(el: HTMLElement): void {
  el.classList.remove('toc-flash');
  void el.offsetWidth; // restart the animation when the same link is re-clicked
  el.classList.add('toc-flash');
  window.setTimeout(() => el.classList.remove('toc-flash'), 1800);
}

/** Scroll to a heading, leaving room for the fixed navigation bar. */
export function scrollToHeading(id: string, offset = 96): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  // Keeps the URL shareable. `replaceState` (unlike setting `location.hash`)
  // does not scroll by itself, so it never fights the animation above.
  window.history.replaceState(null, '', `#${id}`);
  flashHeading(el);
}

/**
 * Follow the reader down the page: returns the heading currently at the top of
 * the viewport plus overall scroll progress (0–1) for the progress bar.
 */
export function useHeadingSpy(ids: string[], offset = 96) {
  const [active, setActive] = React.useState<string | null>(ids[0] ?? null);
  const [progress, setProgress] = React.useState(0);

  // `ids` is rebuilt on every render; the joined key keeps the effect stable.
  const key = ids.join('|');
  const idsRef = React.useRef(ids);
  idsRef.current = ids;

  React.useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const list = idsRef.current;
      let current: string | null = list[0] ?? null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - offset <= 1) current = id;
        else break;
      }
      setActive(current);

      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [key, offset]);

  return { active, progress };
}
