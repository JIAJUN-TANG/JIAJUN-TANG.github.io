/**
 * ORCID 公共 API 同步：把 ORCID 上的作品拉下来，跟站点里的论文对号入座。
 *
 * 只读公共接口（不需要 token）：https://pub.orcid.org/v3.0/<id>/works
 * 匹配顺序：DOI → 归一化标题。命中就只补空字段，绝不清空你手填的内容。
 */

import { normDoi, normTitle, paperTitles } from '../schema.mjs';

const API = 'https://pub.orcid.org/v3.0';

/** ORCID iD 允许带 https://orcid.org/ 前缀和末位校验码 X。 */
export const normalizeOrcidId = (input) => {
  const m = /(\d{4}-\d{4}-\d{4}-\d{3}[\dXx])/.exec(String(input ?? '').trim());
  return m ? m[1].toUpperCase() : '';
};

async function orcidFetch(path, { timeout = 20000 } = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`ORCID API ${res.status} ${res.statusText} (${path})`);
  return res.json();
}

const txt = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(txt).join('').trim();
  if (typeof v === 'object') {
    if (typeof v.value === 'string') return v.value.trim();
    if (typeof v.text === 'string') return v.text.trim();
  }
  return '';
};

const YEAR = (summary) => {
  const y = summary?.['publication-date']?.year?.value;
  const n = Number(y);
  return Number.isFinite(n) ? n : undefined;
};

const DOI = (summary) => {
  const ids = summary?.['external-ids']?.['external-id'] ?? [];
  const hit = ids.find((x) => String(x?.['external-id-type'] ?? '').toLowerCase() === 'doi');
  return hit ? txt(hit['external-id-value']) : '';
};

/** 从 work-summary 抽出站点需要的字段。 */
const fromSummary = (summary, putCode) => ({
  putCode,
  title: txt(summary?.title?.title),
  venue: txt(summary?.['journal-title']) || txt(summary?.['book-title']),
  year: YEAR(summary),
  type: summary?.type ?? '',
  doi: DOI(summary),
  url: txt(summary?.url) || '',
});

const isJournalish = (type) =>
  ['journal-article', 'conference-paper', 'conference-abstract', 'book-chapter', 'book', 'posted-content'].includes(type);

/** 拉取作品列表；明细（作者）按需再取，最多 detailLimit 次。 */
export async function fetchOrcidWorks(orcidId, { detailLimit = 12 } = {}) {
  const id = normalizeOrcidId(orcidId);
  if (!id) throw new Error('ORCID iD 格式不对，应该是 0000-0000-0000-0000 这样。');

  const data = await orcidFetch(`/${id}/works`);
  const groups = Array.isArray(data?.group) ? data.group : [];
  const works = [];
  for (const group of groups) {
    const summary = group?.['work-summary']?.[0];
    if (!summary) continue;
    const work = fromSummary(summary, String(summary['put-code'] ?? ''));
    if (work.title) works.push(work);
  }

  const { authors, descriptions } = await fetchDetails(id, works, detailLimit);
  for (const work of works) {
    work.authors = authors.get(work.putCode) ?? [];
    work.description = descriptions.get(work.putCode) ?? '';
  }

  return { orcid: id, works, total: groups.length };
}

async function fetchDetails(orcidId, works, limit) {
  const authors = new Map();
  const descriptions = new Map();
  const wanted = works.filter((w) => w.putCode).slice(0, limit);
  for (const work of wanted) {
    try {
      const d = await orcidFetch(`/${orcidId}/work/${work.putCode}`, { timeout: 15000 });
      const names = (d?.contributors?.contributor ?? [])
        .map((c) => txt(c?.['credit-name']) || [txt(c?.['given-names']), txt(c?.['family-name'])].filter(Boolean).join(' '))
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length) authors.set(work.putCode, names);
      const desc = txt(d?.['short-description']);
      if (desc) descriptions.set(work.putCode, desc);
      if (!work.venue) work.venue = txt(d?.['journal-title']);
    } catch {
      /* 明细是加分项，取不到不影响主流程 */
    }
  }
  return { authors, descriptions };
}

const isCjk = (s) => /[\u3400-\u4dbf\u4e00-\u9fff]/.test(String(s ?? ''));

/** ORCID 作品 → content.json 的论文对象（id 由调用方补）。 */
export function workToPaper(work) {
  const doi = normDoi(work.doi);
  const url = doi ? `https://doi.org/${doi}` : work.url || undefined;
  const cjk = isCjk(work.title);
  return {
    title: cjk ? { zh: work.title, en: '' } : { zh: work.title, en: work.title },
    authors: work.authors?.length ? work.authors : undefined,
    venue: work.venue ? { zh: work.venue, en: work.venue } : undefined,
    year: work.year,
    url,
    doi: doi || undefined,
    type: cjk ? 'cn' : 'en',
    publicationType: 'authored',
    abstract: work.description || undefined,
    abstractLang: work.description ? (isCjk(work.description) ? 'zh' : 'en') : undefined,
  };
}

/** 站内论文与 ORCID 作品配对。 */
function matchPaper(paper, byDoi, byTitle) {
  const doi = normDoi(paper.doi) || normDoi(paper.url);
  if (doi && byDoi.has(doi)) return byDoi.get(doi);
  for (const t of paperTitles(paper)) {
    if (byTitle.has(t)) return byTitle.get(t);
  }
  return null;
}

/**
 * 生成同步报告（只读，不改任何文件）。
 * @returns {{orcid:string, fetched:number, matched:Array, newWorks:Array, inSiteNotInOrcid:Array, skipped:Array}}
 */
export async function buildOrcidReport(paperEntries, orcidId, opts = {}) {
  const { orcid, works, total } = await fetchOrcidWorks(orcidId, opts);

  const byDoi = new Map();
  const byTitle = new Map();
  for (const work of works) {
    const doi = normDoi(work.doi);
    if (doi) byDoi.set(doi, work);
    byTitle.set(normTitle(work.title), work);
  }

  const matched = [];
  const usedWorks = new Set();
  const inSiteNotInOrcid = [];

  for (const paper of paperEntries ?? []) {
    const work = matchPaper(paper, byDoi, byTitle);
    if (!work) {
      inSiteNotInOrcid.push({ id: paper.id, title: paper.title?.zh || paper.title?.en || '' });
      continue;
    }
    usedWorks.add(work);
    const changes = diffPaper(paper, work);
    matched.push({
      id: paper.id,
      putCode: work.putCode,
      title: paper.title?.zh || paper.title?.en || '',
      orcidTitle: work.title,
      changes,
    });
  }

  const newWorks = works
    .filter((w) => !usedWorks.has(w))
    .filter((w) => isJournalish(w.type) || !w.type)
    .map((w, i) => ({ key: normDoi(w.doi) || normTitle(w.title) || `orcid-${i}`, work: w, paper: workToPaper(w) }));

  const skipped = works.filter((w) => !usedWorks.has(w) && !newWorks.some((n) => n.work === w));

  return { orcid, fetched: works.length, total, matched, newWorks, inSiteNotInOrcid, skipped };
}

/** 逐字段比出「ORCID 能补的」东西；已有值不动。 */
function diffPaper(paper, work) {
  const changes = [];
  const push = (field, label, from, to) => {
    if (to === undefined || to === null || to === '') return;
    if (String(from ?? '').trim() === String(to).trim()) return;
    changes.push({ field, label, from: from ?? '', to });
  };

  if (!paper.year && work.year) push('year', '年份', paper.year, work.year);
  if (!paper.venue?.en && work.venue && paper.venue?.zh !== work.venue) {
    push('venue.en', '期刊（英）', paper.venue?.en ?? '', work.venue);
  }
  const doi = normDoi(work.doi);
  if (!normDoi(paper.doi) && doi) push('doi', 'DOI', paper.doi ?? '', doi);
  if (!paper.url && (doi || work.url)) {
    push('url', '链接', paper.url ?? '', doi ? `https://doi.org/${doi}` : work.url);
  }
  if (work.authors?.length && !(paper.authors ?? []).length) {
    push('authors', '作者', '', work.authors.join(', '));
  }
  if (!paper.title?.en && work.title && paper.title?.zh !== work.title && !isCjk(work.title)) {
    push('title.en', '标题（英）', '', work.title);
  }
  return changes;
}

/** 把 changes 应用到一个论文对象上（返回新对象）。 */
export function applyChanges(paper, changes) {
  const next = { ...paper };
  for (const { field, to } of changes) {
    if (field === 'year') next.year = Number(to);
    else if (field === 'venue.en') next.venue = { ...(next.venue ?? {}), en: to, zh: next.venue?.zh ?? to };
    else if (field === 'title.en') next.title = { ...(next.title ?? {}), en: to, zh: next.title?.zh ?? to };
    else if (field === 'authors') next.authors = String(to).split(/[,;；]/).map((s) => s.trim()).filter(Boolean);
    else next[field] = to;
  }
  return next;
}
