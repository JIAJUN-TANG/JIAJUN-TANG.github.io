import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { L10n, Lang } from './types';

/**
 * Tiny two-locale i18n layer.
 *
 * Anything that is *copy* lives in the UI dictionary below; anything that is
 * *content* (papers, projects, education…) carries its own {zh, en} pair and is
 * resolved with `tr()`. No dependency, no async loading - the whole dictionary
 * is a few hundred bytes and both locales ship in the bundle.
 */

export const LANGS: Lang[] = ['zh', 'en'];

/** Resolve a localised value, passing plain strings straight through. */
export function tr(value: L10n, lang: Lang): string;
export function tr(value: string | L10n | undefined | null, lang: Lang): string;
export function tr(value: string | L10n | undefined | null, lang: Lang): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : value[lang];
}

export const UI = {
  /* ── Navigation ─────────────────────────────── */
  brand: { zh: '唐嘉骏', en: 'Jiajun Tang' },
  navHome: { zh: '主页', en: 'Home' },
  navPublications: { zh: '论文', en: 'Publications' },
  navExperiences: { zh: '经历', en: 'Experiences' },
  navTrackers: { zh: '追踪', en: 'Trackers' },

  /* ── Controls ───────────────────────────────── */
  themeLabel: { zh: '主题', en: 'Theme' },
  themeLight: { zh: '浅色', en: 'Light' },
  themeDark: { zh: '深色', en: 'Dark' },
  themeSystem: { zh: '跟随系统', en: 'System' },
  langLabel: { zh: '语言', en: 'Language' },

  /* ── Home ───────────────────────────────────── */
  homeBackground: { zh: '教育与经历', en: 'Background' },
  homeHighlights: { zh: '近期动态', en: 'Recent Highlights' },
  homeOpenSource: { zh: '开源动态', en: 'Open Source' },

  /* ── Publications ───────────────────────────── */
  statPapers: { zh: '论文', en: 'Papers' },
  statCitations: { zh: '引用', en: 'Citations' },
  statHIndex: { zh: 'h 指数', en: 'h-index' },
  pubNote: {
    zh: '* 通讯作者。统计与 h 指数仅计入署名文章。',
    en: '* Corresponding author. Statistics and h-index count the signed publications above.',
  },
  yearLabel: { zh: '年份', en: 'Year' },
  yearAll: { zh: '全部', en: 'All' },
  authoredTitle: { zh: '署名文章', en: 'Authored Publications' },
  contributedTitle: { zh: '参与论文', en: 'Contributed Publications' },
  fulltext: { zh: '全文', en: 'Fulltext' },
  notAvailable: { zh: '暂无链接', en: 'Not available' },
  citationsUnit: { zh: '次引用', en: 'citations' },
  abstractZh: { zh: '中文原文', en: 'Chinese original' },
  abstractEn: { zh: '英文原文', en: 'English original' },
  emptyPublications: { zh: '该分类下暂无论文。', en: 'No publications in this section yet.' },

  /* ── Experiences ────────────────────────────── */
  experiencesTitle: { zh: '个人经历', en: 'Experiences' },
  academicExperience: { zh: '学习经历', en: 'Academic Experience' },
  researchProjects: { zh: '科研项目', en: 'Research Projects' },
  conferencePapers: { zh: '学术会议', en: 'Conference Papers' },
  awardsHonors: { zh: '荣誉奖励', en: 'Awards & Honors' },
  booksTitle: { zh: '学术著作', en: 'Books & Chapters' },
  softwareTitle: { zh: '系统开发', en: 'Software' },
  emptyAcademic: { zh: '暂无学习经历记录。', en: 'No academic experience listed yet.' },
  emptyProjects: { zh: '暂无科研项目记录。', en: 'No research projects listed yet.' },
  emptyConferences: { zh: '暂无学术会议记录。', en: 'No conference papers listed yet.' },
  emptyAwards: { zh: '暂无荣誉奖励记录。', en: 'No awards listed yet.' },
  emptyBooks: { zh: '暂无著作记录。', en: 'No books or chapters listed yet.' },
  emptySoftware: { zh: '暂无系统开发记录。', en: 'No software listed yet.' },

  /* ── Badges ─────────────────────────────────── */
  badgeOngoing: { zh: '进行中', en: 'Ongoing' },
  badgeCompleted: { zh: '已完成', en: 'Completed' },
  badgeOral: { zh: '口头报告', en: 'Oral' },
  badgePoster: { zh: '海报', en: 'Poster' },
  badgeAward: { zh: '荣誉', en: 'Award' },
  badgeWorkshop: { zh: '工作坊', en: 'Workshop' },
  badgeCertification: { zh: '证书', en: 'Certification' },
  badgeBook: { zh: '著作', en: 'Book' },
  badgeDevelopment: { zh: '系统开发', en: 'Development' },
  badgeOther: { zh: '其他', en: 'Other' },
  badgeDegree: { zh: '学位', en: 'Degree' },
  badgeExchange: { zh: '交换', en: 'Exchange' },
  badgeSummer: { zh: '暑校', en: 'Summer School' },

  /* ── Trackers ───────────────────────────────── */
  trackersTitle: { zh: '追踪', en: 'Trackers' },
  noteLabel: { zh: '笔记', en: 'Note' },

  /* ── Highlight categories ───────────────────── */
  catAward: { zh: '荣誉', en: 'Award' },
  catPublication: { zh: '论文', en: 'Publication' },
  catTalk: { zh: '报告', en: 'Talk' },
  catNews: { zh: '动态', en: 'News' },

  /* ── GitHub card ────────────────────────────── */
  ghSyncing: { zh: '同步中', en: 'syncing' },
  ghOffline: { zh: '离线', en: 'offline' },
  ghNoActivity: { zh: '暂无公开动态。', en: 'No public activity yet.' },
  ghRefresh: { zh: '刷新 GitHub 动态', en: 'Refresh GitHub activity' },

  /* ── Footer ─────────────────────────────────── */
  footerRights: { zh: '保留所有权利。', en: 'All rights reserved.' },

  /* ── Document ───────────────────────────────── */
  docTitle: {
    zh: '唐嘉骏 — 南京大学新闻传播学院',
    en: 'Jiajun (Griffin) Tang — Nanjing University',
  },
} as const;

export type UIKey = keyof typeof UI;

/* ═══════════════════════════════════════════════
   Context
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = 'lang';

export const isLang = (v: unknown): v is Lang => v === 'zh' || v === 'en';

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* private mode */
  }
  if (typeof navigator !== 'undefined' && /^zh\b/i.test(navigator.language || '')) return 'zh';
  return 'en';
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** UI copy lookup. */
  t: (key: UIKey) => string;
  /** Resolve a {zh, en} content value. */
  tr: (value: L10n | string | undefined | null) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  toggle: () => {},
  t: (key) => UI[key].en,
  tr: (value) => (typeof value === 'string' ? value : value?.en ?? ''),
});

const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = UI.docTitle[lang];
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang((prev) => (prev === 'zh' ? 'en' : 'zh')),
      t: (key) => UI[key][lang],
      tr: (v) => tr(v as L10n, lang),
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);

export { LangProvider };

/* ═══════════════════════════════════════════════
   Localised formatters
   ═══════════════════════════════════════════════ */

/** "3 天前" / "3d ago" */
export function timeAgoI18n(iso: string | number | null | undefined, lang: Lang): string {
  if (!iso) return '';
  const ts = typeof iso === 'number' ? iso : new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';

  const diff = Date.now() - ts;
  const zh = lang === 'zh';
  if (diff < 60000) return zh ? '刚刚' : 'just now';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return zh ? `${minutes} 分钟前` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return zh ? `${hours} 小时前` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return zh ? `${days} 天前` : `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return zh ? `${months} 个月前` : `${months}mo ago`;

  return zh ? `${Math.floor(months / 12)} 年前` : `${Math.floor(months / 12)}y ago`;
}

/**
 * "刚刚同步" / "3 分钟前同步" / "synced 3m ago".
 * Word order differs between the two languages, so the whole phrase is built here
 * rather than concatenating a fixed label with a relative timestamp.
 */
export function syncedLabel(iso: string | number | null | undefined, lang: Lang): string {
  const ago = timeAgoI18n(iso, lang);
  if (!ago) return '';
  if (lang === 'zh') return ago === '刚刚' ? '刚刚同步' : `${ago}同步`;
  return `synced ${ago}`;
}

/** Unit that follows a repository count, correctly pluralised. */
export function repoUnit(n: number, lang: Lang): string {
  if (lang === 'zh') return '个仓库';
  return n === 1 ? 'repo' : 'repos';
}

/** Unit that follows a follower count, correctly pluralised. */
export function followerUnit(n: number, lang: Lang): string {
  if (lang === 'zh') return '位关注者';
  return n === 1 ? 'follower' : 'followers';
}
