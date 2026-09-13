/**
 * BibTeX → 论文条目。
 *
 * 从 Google Scholar / Zotero / 期刊网站复制出来的 .bib 直接粘到中台里，
 * 就能变成一条结构化论文。解析器是自研的：不引第三方依赖，
 * 能处理嵌套花括号（{Immersion}）、\" 引号字段、\\textit{} 之类的 LaTeX 命令。
 */

/** 从 from 开始找顶层（不在一层花括号或引号内）的目标字符。 */
function findTopLevel(body, from, chars) {
  let depth = 0;
  let inQuote = false;
  for (let j = from; j < body.length; j++) {
    const c = body[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === '"') inQuote = !inQuote;
    if (inQuote) continue;
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0 && chars.includes(c)) return j;
  }
  return -1;
}

/** 去掉 LaTeX 保护括号与常见命令，压平空白。 */
function cleanValue(s) {
  let v = String(s ?? '');
  v = v.replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_').replace(/\\#/g, '#');
  v = v.replace(/\\'([a-zA-Z])/g, '$1').replace(/\\`([a-zA-Z])/g, '$1');
  v = v.replace(/\\"([a-zA-Z])/g, '$1').replace(/\\~([a-zA-Z])/g, '$1');
  v = v.replace(/\\[a-zA-Z]+\s*/g, '');
  v = v.replace(/[{}]/g, '');
  v = v.replace(/~/g, ' ');
  v = v.replace(/---/g, '—').replace(/--/g, '–');
  return v.replace(/\s+/g, ' ').trim();
}

function parseEntryBody(type, body) {
  const firstComma = findTopLevel(body, 0, ',');
  if (firstComma === -1) return null;
  const key = body.slice(0, firstComma).trim();
  const fields = {};
  let i = firstComma + 1;

  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;

    const nm = /^([A-Za-z][A-Za-z0-9_-]*)\s*=/.exec(body.slice(i));
    if (!nm) {
      const next = findTopLevel(body, i, ',');
      if (next === -1) break;
      i = next + 1;
      continue;
    }
    const name = nm[1].toLowerCase();
    i += nm[0].length;
    while (i < body.length && /\s/.test(body[i])) i++;

    let value = '';
    const c = body[i];
    if (c === '{') {
      let depth = 0;
      let j = i;
      for (; j < body.length; j++) {
        if (body[j] === '\\') {
          j++;
          continue;
        }
        if (body[j] === '{') depth++;
        else if (body[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      value = body.slice(i + 1, j);
      i = j + 1;
    } else if (c === '"') {
      let j = i + 1;
      for (; j < body.length; j++) {
        if (body[j] === '\\') {
          j++;
          continue;
        }
        if (body[j] === '"') break;
      }
      value = body.slice(i + 1, j);
      i = j + 1;
    } else {
      let j = i;
      while (j < body.length && body[j] !== ',' && !/\s/.test(body[j])) j++;
      value = body.slice(i, j);
      i = j;
    }

    fields[name] = cleanValue(value);
  }

  return Object.keys(fields).length ? { type, key, fields } : null;
}

export function parseBibtex(text) {
  const entries = [];
  const skip = new Set(['comment', 'preamble', 'string']);
  let i = 0;

  while (i < text.length) {
    const at = text.indexOf('@', i);
    if (at === -1) break;
    const m = /^@([a-zA-Z]+)\s*[({]/.exec(text.slice(at));
    if (!m) {
      i = at + 1;
      continue;
    }
    const type = m[1].toLowerCase();
    const openIdx = at + m[0].length - 1;
    const open = text[openIdx];
    const close = open === '{' ? '}' : ')';

    let depth = 0;
    let inQuote = false;
    let end = -1;
    for (let j = openIdx; j < text.length; j++) {
      const c = text[j];
      if (c === '\\') {
        j++;
        continue;
      }
      if (c === '"') inQuote = !inQuote;
      if (inQuote && open === '{') continue;
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) break;
    i = end + 1;

    if (skip.has(type)) continue;
    const entry = parseEntryBody(type, text.slice(openIdx + 1, end));
    if (entry) entries.push(entry);
  }

  return entries;
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const isCjk = (s) => CJK.test(String(s ?? ''));

/** "Yang, Hailin" → "Hailin Yang"；中文名与 "and" 连接保持不变。 */
function formatAuthor(a) {
  const t = a.trim();
  if (isCjk(t) || !t.includes(',')) return t;
  const parts = t.split(',').map((s) => s.trim());
  if (parts.length !== 2) return t;
  return `${parts[1]} ${parts[0]}`;
}

/** 解析出的 BibTeX → content.json 的论文条目（不含 id）。 */
export function bibtexToPapers(text) {
  const entries = parseBibtex(text);
  return entries
    .map((entry) => {
      const f = entry.fields;
      const title = f.title || '';
      if (!title) return null;
      const venue = f.journal || f.booktitle || f.publisher || f.eventtitle || '';
      const authors = (f.author || '')
        .split(/\s+and\s+/i)
        .map(formatAuthor)
        .filter(Boolean);
      const doi = (f.doi || '').replace(/^doi:\s*/i, '').trim();
      const url = f.url || (doi ? `https://doi.org/${doi}` : '');
      const cjkTitle = isCjk(title);
      const abstract = f.abstract || '';
      const year = Number((f.year || f.date || '').match(/\d{4}/)?.[0]);

      const paper = {
        title: cjkTitle ? { zh: title, en: '' } : { zh: '', en: title },
        authors,
        venue: venue ? { zh: venue, en: venue } : undefined,
        year: Number.isFinite(year) ? year : undefined,
        type: cjkTitle || isCjk(venue) ? 'cn' : 'en',
        publicationType: 'authored',
        url: url || undefined,
        doi: doi || undefined,
      };
      if (abstract) {
        paper.abstract = abstract;
        paper.abstractLang = isCjk(abstract) ? 'zh' : 'en';
      }
      return paper;
    })
    .filter(Boolean);
}
