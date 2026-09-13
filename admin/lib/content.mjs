/**
 * content.json 的读写、校验与备份。
 *
 * 这里是数据的「保险柜」：中台每次保存都会先跑一遍校验，
 * 校验不过就不落盘；落盘前还会留一份带时间戳的快照，随时能回滚。
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COLLECTIONS, ORDER, nextId } from '../schema.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_FILE = join(ROOT, 'data', 'content.json');
export const SCHOLAR_FILE = join(ROOT, 'data', 'scholar.json');
export const BACKUP_DIR = join(ROOT, 'data', 'backups');
export const CONFIG_FILE = join(ROOT, 'admin', 'config.json');

const KEEP_BACKUPS = 30;

/* ── 读 ─────────────────────────────────────────────────────── */

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export const readContent = () => readJson(CONTENT_FILE, {});

/* ── 校验 ───────────────────────────────────────────────────── */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const coerceL10n = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return value.trim() ? { zh: value.trim(), en: value.trim() } : undefined;
  if (isPlainObject(value)) {
    const zh = typeof value.zh === 'string' ? value.zh.trim() : '';
    const en = typeof value.en === 'string' ? value.en.trim() : '';
    if (!zh && !en) return undefined;
    return { zh: zh || en, en: en || zh };
  }
  return undefined;
};

const coerceNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const coerceList = (value) => {
  if (value === undefined || value === null) return undefined;
  const arr = Array.isArray(value)
    ? value
    : String(value)
        .split(/[;；,，]/)
        .map((s) => s.trim());
  const out = arr.map((s) => String(s).trim()).filter(Boolean);
  return out.length ? out : undefined;
};

const coerceTags = (value) => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((t) => {
      if (typeof t === 'string') return { text: t.trim(), color: '#4A5F7E' };
      if (!isPlainObject(t)) return null;
      const text = String(t.text ?? '').trim();
      if (!text) return null;
      return { text, color: String(t.color ?? '#4A5F7E').trim() || '#4A5F7E' };
    })
    .filter(Boolean);
  return out.length ? out : undefined;
};

/**
 * 规整一个分区。
 * 返回 { entries, errors, warnings }；errors 非空时调用方不要落盘。
 */
export function normalizeSection(collectionKey, rawEntries) {
  const def = COLLECTIONS[collectionKey];
  const errors = [];
  const warnings = [];
  const list = Array.isArray(rawEntries) ? rawEntries : [];
  const seenIds = new Set();
  const entries = [];

  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    if (!isPlainObject(raw)) {
      errors.push(`${def.label} 第 ${i + 1} 条不是对象，已跳过`);
      continue;
    }
    const entry = {};

    for (const field of def.fields) {
      const v = raw[field.key];
      switch (field.kind) {
        case 'id':
          break;
        case 'l10n': {
          const l = coerceL10n(v);
          if (l) entry[field.key] = l;
          else if (field.required) warnings.push(`${def.label} 第 ${i + 1} 条缺少「${field.label}」`);
          break;
        }
        case 'text':
        case 'textarea': {
          const s = typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim();
          if (s) entry[field.key] = s;
          break;
        }
        case 'number': {
          const n = coerceNumber(v);
          if (n !== undefined) entry[field.key] = n;
          break;
        }
        case 'list': {
          const l = coerceList(v);
          if (l) entry[field.key] = l;
          break;
        }
        case 'tags': {
          const t = coerceTags(v);
          if (t) entry[field.key] = t;
          break;
        }
        case 'select': {
          const s = v === undefined || v === null ? '' : String(v).trim();
          if (!s) break;
          const values = field.options.map(([val]) => val);
          // 取值不在选项里时保留原值、只提醒：宁可留着让用户看见，
          // 也绝不静默丢字段（丢过一次 abstractLang，教训）。
          if (!values.includes(s)) {
            warnings.push(
              `${def.label} 第 ${i + 1} 条的「${field.label}」值 ${s} 不在可选范围（${values.filter(Boolean).join(' / ')}），已原样保留`,
            );
          }
          entry[field.key] = s;
          break;
        }
        default:
          break;
      }
    }

    // 固定 type（奖励 / 著作 / 系统开发）由分区决定，避免手改出错。
    if (def.typeFixed) entry.type = def.typeFixed;

    let id = String(raw.id ?? '').trim();
    if (!id || seenIds.has(id)) {
      const candidate = nextId(collectionKey, [...entries, ...list.slice(i + 1)]);
      if (id) warnings.push(`${def.label}「${id}」重复，已改为 ${candidate}`);
      id = candidate;
    }
    seenIds.add(id);
    // 保持 id 在对象的第一位，diff 看起来更顺眼
    entries.push({ id, ...entry });
  }

  return { entries, errors, warnings };
}

/**
 * 校验整份内容。
 * @param {object} content
 * @param {{ allowEmpty?: boolean }} opts
 */
export function validateContent(content, { allowEmpty = false, previous = null } = {}) {
  const errors = [];
  const warnings = [];
  const result = {};

  if (!isPlainObject(content)) {
    return { ok: false, errors: ['内容不是对象'], warnings, content: null, emptySections: [] };
  }

  const emptySections = [];
  for (const key of ORDER) {
    const { entries, errors: errs, warnings: warns } = normalizeSection(key, content[key]);
    errors.push(...errs);
    warnings.push(...warns);
    result[key] = entries;

    const before = Array.isArray(previous?.[key]) ? previous[key].length : 0;
    if (before > 0 && entries.length === 0) emptySections.push(COLLECTIONS[key].label);
  }

  if (errors.length) {
    return { ok: false, errors, warnings, content: null, emptySections };
  }
  if (emptySections.length && !allowEmpty) {
    return {
      ok: false,
      errors: [],
      warnings,
      content: null,
      emptySections,
      message: `以下分区会被清空：${emptySections.join('、')}。确认无误请再次保存。`,
    };
  }

  return { ok: true, errors: [], warnings, content: result, emptySections };
}

/* ── 备份 ───────────────────────────────────────────────────── */

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

export function backupContent() {
  if (!readJson(CONTENT_FILE)) return null;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `content-${stamp()}.json`;
  writeFileSync(join(BACKUP_DIR, name), readFileSync(CONTENT_FILE));
  pruneBackups();
  return name;
}

export function listBackups() {
  try {
    return readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((name) => {
        const st = statSync(join(BACKUP_DIR, name));
        return { name, size: st.size, mtime: st.mtime.toISOString() };
      })
      .sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

function pruneBackups() {
  const items = listBackups();
  for (const item of items.slice(KEEP_BACKUPS)) {
    try {
      unlinkSync(join(BACKUP_DIR, item.name));
    } catch {
      /* 删不掉就算了，不值得让保存失败 */
    }
  }
}

/* ── 写 ─────────────────────────────────────────────────────── */

const HEADER_COMMENT =
  '由本地管理中台（npm run admin）维护。手动改也可以，但记得保持同样的结构：id 唯一、双语字段写 {zh,en}。';

export function writeContent(content) {
  mkdirSync(dirname(CONTENT_FILE), { recursive: true });
  const ordered = { $comment: HEADER_COMMENT };
  for (const key of ORDER) ordered[key] = content[key] ?? [];
  writeFileSync(CONTENT_FILE, JSON.stringify(ordered, null, 2) + '\n');
  return ordered;
}

/** 各分区条数，给中台侧栏显示。 */
export function sectionCounts(content) {
  const out = {};
  for (const key of ORDER) out[key] = Array.isArray(content?.[key]) ? content[key].length : 0;
  return out;
}
