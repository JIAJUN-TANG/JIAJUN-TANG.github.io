import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Home as HomeIcon,
  Grid,
  Github,
  Mail,
  ExternalLink,
  Sparkles,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Users,
  MapPin,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  ArrowUp,
  Clock,
  ListTree,
  PenLine,
  type LucideIcon
} from 'lucide-react';
import {
  Tab,
  Paper,
  CustomCardData,
  ResearchProject,
  ConferencePaper,
  AcademicExperience,
  OtherExperience,
  CrestKey,
  Lang,
  NewsItem,
  BlogPost,
} from './types';
import {
  PROFILE,
  INITIAL_PAPERS,
  INITIAL_CARDS,
  INITIAL_PROJECTS,
  INITIAL_CONFERENCES,
  INITIAL_ACADEMIC,
  INITIAL_OTHER_EXPERIENCES,
  SCHOLAR_STATS,
} from './constants';
import { GitHubActivityCard, GitHubSectionHeading } from './GitHubActivity';
import { CrestBackground, CrestBadge } from './CrestBackground';
import {
  LangProvider,
  useLang,
  syncedLabel,
  formatPostDate,
  readingMinutes,
  type UIKey,
} from './i18n';
import { BLOG_POSTS, findPost } from './blog';
import { MEDIA_COMPONENTS, MediaProvider } from './BlogMedia';
import {
  extractHeadings,
  nodeText,
  normalizeHeadingText,
  scrollToHeading,
  useHeadingSpy,
  type TocHeading,
} from './toc';

// ═══════════════════════════════════════════
// Theme System
// ═══════════════════════════════════════════

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
});

const useTheme = () => React.useContext(ThemeContext);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme, resolved]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ═══════════════════════════════════════════
// Animation Variants
// ═══════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.25, 0, 1] } },
};

// ═══════════════════════════════════════════
// Navigation Components
// ═══════════════════════════════════════════

const GITHUB_LOGIN =
  PROFILE.socials.github?.replace(/\/+$/, '').split('/').pop() || 'JIAJUN-TANG';

const NAV_ITEMS: { tab: Tab; icon: LucideIcon; key: UIKey }[] = [
  { tab: Tab.HOME, icon: HomeIcon, key: 'navHome' },
  { tab: Tab.PUBLICATIONS, icon: BookOpen, key: 'navPublications' },
  { tab: Tab.EXPERIENCES, icon: Briefcase, key: 'navExperiences' },
  { tab: Tab.BLOG, icon: PenLine, key: 'navBlog' },
  { tab: Tab.RESEARCH_NOTES, icon: Grid, key: 'navTrackers' },
];

const NavItem = ({ tab, current, onClick, icon: Icon, label }: {
  tab: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  icon: LucideIcon;
  label: string;
}) => {
  const isActive = current === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 ${
        isActive ? 'text-white dark:text-primary' : 'text-tertiary hover:text-primary'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="navPill"
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: 'var(--nav-active-bg)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon size={15} className="relative z-10" />
      <span className="relative z-10 hidden md:inline">{label}</span>
    </button>
  );
};

/** Compact 中 / EN segmented control. Sits just before the theme toggle. */
const LanguageToggle = () => {
  const { lang, setLang, t } = useLang();
  const options: { value: Lang; label: string; title: string }[] = [
    { value: 'zh', label: '中', title: '中文' },
    { value: 'en', label: 'EN', title: 'English' },
  ];

  return (
    <div
      role="group"
      aria-label={t('langLabel')}
      className="flex items-center gap-[2px] p-[2px] rounded-full"
      style={{ backgroundColor: 'var(--color-subtle)' }}
    >
      {options.map((option) => {
        const active = lang === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setLang(option.value)}
            aria-pressed={active}
            title={option.title}
            className={`px-[7px] py-[3px] rounded-full text-[10px] font-semibold leading-none transition-colors duration-200 ${
              active ? 'text-white dark:text-primary' : 'text-tertiary hover:text-primary'
            }`}
            style={active ? { backgroundColor: 'var(--nav-active-bg)' } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useLang();

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    setTheme(order[(order.indexOf(theme) + 1) % 3]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const name = theme === 'dark' ? t('themeDark') : theme === 'light' ? t('themeLight') : t('themeSystem');

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-full text-tertiary hover:text-primary transition-colors"
      title={`${t('themeLabel')}: ${name}`}
    >
      <Icon size={15} />
    </button>
  );
};

const Navigation = ({ activeTab, setActiveTab }: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) => {
  const { t } = useLang();

  return (
    <nav className="fixed top-0 inset-x-0 z-50">
      <div
        className="mx-auto mt-3 max-w-2xl px-3 py-1.5 rounded-2xl flex items-center justify-between gap-2 border"
        style={{
          backgroundColor: 'var(--nav-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderColor: 'var(--nav-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Brand — kept short so the tab row still breathes in English */}
        <span className="font-serif text-[15px] text-primary pl-2 select-none tracking-tight whitespace-nowrap">
          {t('brand')}
        </span>

        {/* Tab Items */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.tab}
              tab={item.tab}
              current={activeTab}
              onClick={setActiveTab}
              icon={item.icon}
              label={t(item.key)}
            />
          ))}
        </div>

        {/* Language + Theme */}
        <div className="flex items-center gap-0.5 pr-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════
// Social Link
// ═══════════════════════════════════════════

const SocialLink = ({ href, icon: Icon }: { href: string; icon: LucideIcon }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="p-2.5 text-tertiary hover:text-primary rounded-full transition-all duration-200 border border-transparent hover:border-subtle"
  >
    <Icon size={18} />
  </a>
);

// ═══════════════════════════════════════════
// Home Page
// ═══════════════════════════════════════════

const CATEGORY_KEY: Record<NewsItem['category'], UIKey> = {
  Award: 'catAward',
  Publication: 'catPublication',
  Talk: 'catTalk',
  News: 'catNews',
};

const HomeTab = () => {
  const { t, tr } = useLang();

  const TimelineItem = ({ title, department, university, period, crest }: {
    title: string;
    department: string;
    university: string;
    period: string;
    crest?: CrestKey;
  }) => (
    <div className="relative group flex items-start gap-3">
      <span
        className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-200 group-hover:scale-125"
        style={{
          borderColor: period.includes('Present') || period.includes('至今')
            ? 'var(--color-accent)'
            : 'var(--color-tertiary)',
          backgroundColor: 'var(--color-card)',
        }}
      />
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-primary text-sm leading-snug mb-1">{title}</h4>
        {department && <p className="text-secondary text-xs">{department}</p>}
        <p className="text-secondary text-xs">{university}</p>
        <p className="text-tertiary text-[11px] font-mono mt-1">{period}</p>
      </div>
      <CrestBadge crest={crest} size={22} />
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -12 }}
      className="flex flex-col items-center max-w-4xl mx-auto px-5 pb-16"
    >
      {/* Hero */}
      <motion.div variants={itemVariants} className="text-center max-w-2xl mx-auto pt-8">
        {/* Avatar */}
        <div className="relative mb-8 group inline-block">
          <img
            src={PROFILE.avatarUrl}
            alt={tr(PROFILE.name)}
            className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 shadow-lg relative z-10 transition-transform duration-500 group-hover:scale-[1.03]"
            style={{
              borderColor: 'var(--card-border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px var(--card-border)',
            }}
          />
        </div>

        {/* Name */}
        <h1 className="text-4xl md:text-5xl font-serif font-normal text-primary mb-3 tracking-tight leading-tight">
          {tr(PROFILE.name)}
        </h1>

        {/* Title */}
        <p className="text-base text-secondary mb-2 font-normal">{tr(PROFILE.title)}</p>

        {/* Affiliation */}
        <p className="text-sm text-tertiary mb-8">{tr(PROFILE.affiliation)}</p>

        {/* Bio */}
        <p className="text-base text-secondary leading-[1.8] mb-8 max-w-xl mx-auto">
          {tr(PROFILE.bio)}
        </p>

        {/* Social Links */}
        <div className="flex justify-center gap-2 mb-20">
          {PROFILE.socials.github && <SocialLink href={PROFILE.socials.github} icon={Github} />}
          {PROFILE.socials.scholar && <SocialLink href={PROFILE.socials.scholar} icon={GraduationCap} />}
          {PROFILE.socials.orcid && <SocialLink href={PROFILE.socials.orcid} icon={BookOpen} />}
          <SocialLink href={`mailto:${PROFILE.email}`} icon={Mail} />
        </div>
      </motion.div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-4xl">

        {/* Background */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-sans font-semibold uppercase tracking-[0.15em] text-tertiary mb-6 flex items-center gap-2">
            <Briefcase size={14} /> {t('homeBackground')}
          </h3>

          <div className="space-y-7 relative border-l ml-2 pl-7 pb-2" style={{ borderColor: 'var(--color-subtle)' }}>
            {PROFILE.experience.map((exp, i) => (
              <React.Fragment key={`exp-${i}`}>
                {i > 0 && PROFILE.experience[i - 1].period.en.includes('Present') && !exp.period.en.includes('Present') && (
                  <div className="my-5 border-b border-dashed" style={{ borderColor: 'var(--color-subtle)' }} />
                )}
                <TimelineItem
                  title={tr(exp.role)}
                  department={tr(exp.department)}
                  university={tr(exp.university)}
                  period={tr(exp.period)}
                  crest={exp.crest}
                />
              </React.Fragment>
            ))}

            {PROFILE.education.map((edu, i) => (
              <TimelineItem
                key={`edu-${i}`}
                title={tr(edu.degree)}
                department={tr(edu.department)}
                university={tr(edu.university)}
                period={tr(edu.year)}
                crest={edu.crest}
              />
            ))}
          </div>
        </motion.div>

        {/* Recent Highlights */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-sans font-semibold uppercase tracking-[0.15em] text-tertiary mb-6 flex items-center gap-2">
            <Sparkles size={14} /> {t('homeHighlights')}
          </h3>
          <div className="space-y-3">
            {PROFILE.news.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ y: -1 }}
                className="p-4 rounded-xl border transition-all duration-200"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
                }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.category === 'Award'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      : item.category === 'Publication'
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                  }`}>
                    {t(CATEGORY_KEY[item.category])}
                  </span>
                  <span className="text-[11px] text-tertiary font-mono">{tr(item.date)}</span>
                </div>
                <p className="font-medium text-primary text-sm leading-relaxed">{tr(item.title)}</p>
              </motion.div>
            ))}
          </div>

          {/* Open Source — separated from the highlights list above */}
          <GitHubSectionHeading className="mt-12" />
          <GitHubActivityCard login={GITHUB_LOGIN} />
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Publications Page
// ═══════════════════════════════════════════

const PublicationsTab = () => {
  const { lang, t, tr } = useLang();
  const [papers] = useState<Paper[]>(INITIAL_PAPERS);
  const [authoredExpanded, setAuthoredExpanded] = useState(true);
  const [contributedExpanded, setContributedExpanded] = useState(true);

  const isFirstAuthor = (paper: Paper): boolean => {
    if (paper.authors.length === 0) return false;
    const firstAuthor = paper.authors[0];
    const isTangFirst = firstAuthor.includes('唐嘉骏') || firstAuthor.includes('Jiajun Tang');
    if (isTangFirst) return true;
    const secondAuthor = paper.authors[1];
    if (secondAuthor && secondAuthor.includes('*')) {
      return isTangFirst;
    }
    return false;
  };

  const getIF = (paper: Paper): number => {
    const ifTag = paper.tags?.find((tag) => tag.text.startsWith('IF'));
    return ifTag ? parseFloat(ifTag.text.replace('IF ', '')) : 0;
  };

  const sortPapers = (papersToSort: Paper[]): Paper[] =>
    [...papersToSort].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const bIF = getIF(b);
      const aIF = getIF(a);
      if (aIF !== bIF) return bIF - aIF;
      const aIsFirst = isFirstAuthor(a);
      const bIsFirst = isFirstAuthor(b);
      if (aIsFirst !== bIsFirst) return aIsFirst ? -1 : 1;
      return a.title.en.localeCompare(b.title.en);
    });

  // Year filter
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const availableYears = [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a);

  const authoredPapers = sortPapers(
    papers.filter((p) => p.publicationType === 'authored' && (selectedYear === null || p.year === selectedYear))
  );
  const contributedPapers = sortPapers(
    papers.filter((p) => p.publicationType === 'contributed' && (selectedYear === null || p.year === selectedYear))
  );

  const totalPapers = authoredPapers.length;
  const totalCitations = authoredPapers.reduce((sum, paper) => sum + (paper.citationCount || 0), 0);

  const calculateHIndex = (list: Paper[]): number => {
    const citations = list.map((p) => p.citationCount || 0).sort((a, b) => b - a);
    let h = 0;
    for (let i = 0; i < citations.length; i++) {
      if (citations[i] >= i + 1) h = i + 1;
      else break;
    }
    return h;
  };

  const hIndex = calculateHIndex(authoredPapers);

  const PaperCard = ({ paper, index }: { paper: Paper; index: number }) => (
    <motion.div
      key={paper.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.25, 0.25, 0, 1] }}
      className="group p-5 md:p-6 rounded-xl border transition-all duration-200"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
      }}
    >
      {/* Title */}
      <h3 className="text-lg font-serif font-semibold text-primary mb-2 leading-snug group-hover:text-accent transition-colors duration-200">
        {tr(paper.title)}
      </h3>

      {/* Authors */}
      <p className="text-secondary text-sm mb-3 leading-relaxed">
        {paper.authors.map((author, i) => {
          const isCorresponding = author.includes('*');
          const cleanName = author.replace('*', '').trim();
          const isUser = cleanName.includes('唐嘉骏') || cleanName.includes('Jiajun Tang');
          return (
            <span key={i}>
              {i > 0 && ', '}
              {isUser ? (
                <strong className="font-semibold text-primary">{cleanName}{isCorresponding ? '*' : ''}</strong>
              ) : (
                <>{cleanName}{isCorresponding ? '*' : ''}</>
              )}
            </span>
          );
        })}
      </p>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--color-subtle)', color: 'var(--color-secondary)' }}>
          {tr(paper.venue)}
        </span>
        <span className="text-[11px] text-tertiary font-mono">{paper.year}</span>
        {paper.tags?.map((tag, tagIndex) => (
          <span
            key={tagIndex}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.text}
          </span>
        ))}
      </div>

      {/* Abstract */}
      {paper.abstract && (
        <div className="mb-4">
          {paper.abstractLang && paper.abstractLang !== lang && (
            <span className="inline-block text-[10px] uppercase tracking-wider text-tertiary mb-1.5">
              {paper.abstractLang === 'zh' ? t('abstractZh') : t('abstractEn')}
            </span>
          )}
          <p className="text-tertiary text-sm leading-relaxed pl-3 border-l-2" style={{ borderColor: 'var(--color-subtle)' }}>
            {paper.abstract.length > 200 ? paper.abstract.substring(0, 200) + '...' : paper.abstract}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-4 pt-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
        {paper.url ? (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-accent hover:underline flex items-center gap-1 transition-opacity"
          >
            <ExternalLink size={11} />
            {t('fulltext')}
          </a>
        ) : (
          <span className="text-[12px] text-tertiary">{t('notAvailable')}</span>
        )}

        {paper.citationCount !== undefined && paper.citationCount !== null && (
          <span className="text-[12px] text-secondary">
            {paper.citationCount} {t('citationsUnit')}
          </span>
        )}

        {paper.type === 'cn' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            CNKI
          </span>
        )}
        {paper.type === 'en' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            Google Scholar
          </span>
        )}
      </div>
    </motion.div>
  );

  const SectionHeader = ({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="w-full flex items-center justify-between mb-4 group py-1">
      <h2 className="text-xl font-serif font-semibold text-primary group-hover:text-accent transition-colors duration-200">
        {title}
      </h2>
      <motion.div
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={{ duration: 0.25 }}
        className="p-1.5 rounded-full transition-colors"
        style={{ backgroundColor: 'var(--color-subtle)' }}
      >
        <ChevronDown size={18} className="text-secondary" />
      </motion.div>
    </button>
  );

  const SectionBody = ({ expanded, papers: list }: { expanded: boolean; papers: Paper[] }) => (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1] }}
          className="overflow-hidden"
        >
          {list.length > 0 ? (
            <div className="space-y-4">
              {list.map((paper, index) => (
                <PaperCard key={paper.id} paper={paper} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyPublications')}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-5 py-8"
    >
      {/* Overview Stats — minimal inline */}
      <div className="flex items-center gap-6 mb-3 pb-6 border-b" style={{ borderColor: 'var(--color-subtle)' }}>
        <div>
          <span className="text-2xl font-serif font-semibold text-primary">{totalPapers}</span>
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">{t('statPapers')}</span>
        </div>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-subtle)' }} />
        <div>
          <span className="text-2xl font-serif font-semibold text-primary">{totalCitations}</span>
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">{t('statCitations')}</span>
        </div>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-subtle)' }} />
        <div>
          <span className="text-2xl font-serif font-semibold text-primary">{hIndex}</span>
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">{t('statHIndex')}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 mb-8 -mt-2">
        <p className="text-[11px] text-tertiary">{t('pubNote')}</p>
        {SCHOLAR_STATS.updated && (
          <span className="text-[10px] text-tertiary font-mono shrink-0">
            {syncedLabel(SCHOLAR_STATS.updated, lang)}
          </span>
        )}
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <span className="text-xs text-tertiary uppercase tracking-wider mr-1">{t('yearLabel')}</span>
        <button
          onClick={() => setSelectedYear(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
            selectedYear === null
              ? 'bg-primary text-white dark:bg-primary dark:text-page'
              : 'text-tertiary hover:text-primary'
          }`}
          style={selectedYear === null ? {} : { backgroundColor: 'var(--color-subtle)' }}
        >
          {t('yearAll')}
        </button>
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              selectedYear === year
                ? 'bg-primary text-white dark:bg-primary dark:text-page'
                : 'text-tertiary hover:text-primary'
            }`}
            style={selectedYear === year ? {} : { backgroundColor: 'var(--color-subtle)' }}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Authored Publications */}
      <div className="mb-10">
        <SectionHeader
          title={t('authoredTitle')}
          expanded={authoredExpanded}
          onToggle={() => setAuthoredExpanded(!authoredExpanded)}
        />
        <SectionBody expanded={authoredExpanded} papers={authoredPapers} />
      </div>

      {/* Contributed Publications */}
      <div className="mb-8">
        <SectionHeader
          title={t('contributedTitle')}
          expanded={contributedExpanded}
          onToggle={() => setContributedExpanded(!contributedExpanded)}
        />
        <SectionBody expanded={contributedExpanded} papers={contributedPapers} />
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Trackers Page
// ═══════════════════════════════════════════

const TrackersTab = () => {
  const { t, tr } = useLang();
  const [cards] = useState<CustomCardData[]>(INITIAL_CARDS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto px-5 py-8"
    >
      <h2 className="text-xl font-serif font-semibold text-primary mb-8">{t('trackersTitle')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="p-5 rounded-xl border transition-all duration-200 flex flex-col min-h-[180px]"
            style={{
              backgroundColor: 'var(--color-card)',
              borderColor: 'var(--card-border)',
              boxShadow: 'var(--card-shadow)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-subtle)', color: 'var(--color-tertiary)' }}>
                {t('noteLabel')}
              </span>
            </div>

            <div className="markdown-body text-sm flex-1">
              {card.title && (
                <h3 className="font-serif font-semibold text-base mb-2 text-primary">{tr(card.title)}</h3>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{tr(card.content)}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Blog Page
// ═══════════════════════════════════════════

/** Tiny pill used for the post language and its tags. */
const MetaPill = ({ children }: { children: React.ReactNode }) => (
  <span
    className="text-[10px] font-medium uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
    style={{ backgroundColor: 'var(--color-subtle)', color: 'var(--color-secondary)' }}
  >
    {children}
  </span>
);

/* ── Table of contents ───────────────────────── */

/** One clickable line of the outline. Indented by heading depth. */
const TocEntry = ({
  heading,
  active,
  onJump,
  itemRef,
}: {
  heading: TocHeading;
  active: boolean;
  onJump: (id: string) => void;
  itemRef?: React.Ref<HTMLButtonElement>;
}) => (
  <button
    ref={active ? itemRef : undefined}
    onClick={() => onJump(heading.id)}
    title={heading.text}
    aria-current={active ? 'location' : undefined}
    className={`toc-item${active ? ' is-active' : ''}`}
    style={{ paddingLeft: `${12 + (heading.level - 1) * 11}px` }}
  >
    <span className="toc-marker" style={{ transform: active ? 'scaleY(1)' : 'scaleY(0)' }} />
    {heading.text}
  </button>
);

/**
 * Sticky rail on the left of an open post: reading progress, the outline of the
 * article, the other posts, and a way back to the top. Hidden on narrow screens,
 * where `TocMobile` takes over.
 */
const TocRail = ({
  headings,
  active,
  progress,
  onJump,
  otherPosts,
  onOpenPost,
}: {
  headings: TocHeading[];
  active: string | null;
  progress: number;
  onJump: (id: string) => void;
  otherPosts: BlogPost[];
  onOpenPost: (slug: string) => void;
}) => {
  const { t } = useLang();
  const activeRef = React.useRef<HTMLButtonElement | null>(null);

  // A long outline scrolls inside the rail - keep the current section in view.
  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-tertiary">
            <ListTree size={12} />
            {t('blogToc')}
          </span>
          <span className="text-[10px] tabular-nums text-tertiary">
            {Math.round(progress * 100)}%
          </span>
        </div>

        {/* Reading progress for the whole page. */}
        <div
          className="h-[2px] w-full rounded-full overflow-hidden mb-4"
          style={{ backgroundColor: 'var(--color-subtle)' }}
        >
          <div
            className="toc-progress h-full rounded-full"
            style={{ width: `${progress * 100}%`, backgroundColor: 'var(--color-accent)' }}
          />
        </div>

        <nav className="toc-list toc-scroll max-h-[calc(100vh-17rem)] overflow-y-auto">
          {headings.length === 0 ? (
            <p className="pl-3 py-1 text-[12px] text-tertiary">{t('blogTocEmpty')}</p>
          ) : (
            headings.map((heading) => (
              <TocEntry
                key={heading.id}
                heading={heading}
                active={active === heading.id}
                onJump={onJump}
                itemRef={activeRef}
              />
            ))
          )}
        </nav>

        {otherPosts.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--color-subtle)' }}>
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-tertiary">
              {t('blogMorePosts')}
            </span>
            <div className="mt-2 space-y-0.5">
              {otherPosts.slice(0, 4).map((post) => (
                <button
                  key={post.slug}
                  onClick={() => onOpenPost(post.slug)}
                  title={post.title}
                  className="toc-item"
                  style={{ paddingLeft: '12px' }}
                >
                  {post.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={backToTop}
          className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-tertiary hover:text-accent transition-colors"
        >
          <ArrowUp size={12} />
          {t('blogBackToTop')}
        </button>
      </div>
    </aside>
  );
};

/** Collapsible outline for narrow screens, sitting right under the title. */
const TocMobile = ({
  headings,
  active,
  onJump,
}: {
  headings: TocHeading[];
  active: string | null;
  onJump: (id: string) => void;
}) => {
  const { t } = useLang();
  const [open, setOpen] = React.useState(false);

  if (headings.length === 0) return null;

  /**
   * Collapse first, jump second. Scrolling while the panel animates shut makes
   * the browser cancel the smooth scroll, because the page height changes
   * underneath it mid-flight. The delay matches the exit animation.
   */
  const jump = (id: string) => {
    setOpen(false);
    window.setTimeout(() => onJump(id), 260);
  };

  return (
    <div
      className="lg:hidden mb-8 rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--card-border)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-tertiary">
          <ListTree size={12} />
          {t('blogToc')}
        </span>
        <ChevronDown
          size={14}
          className="text-tertiary transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="toc-list mx-4 mb-3 pl-1">
              {headings.map((heading) => (
                <TocEntry
                  key={heading.id}
                  heading={heading}
                  active={active === heading.id}
                  onJump={jump}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** A single post: outline rail, header meta and the rendered Markdown body. */
const BlogPostView = ({
  post,
  onBack,
  onOpenPost,
}: {
  post: BlogPost;
  onBack: () => void;
  onOpenPost: (slug: string) => void;
}) => {
  const { t, lang } = useLang();

  // Opening a post should feel like a new page, not a jump into the middle of one.
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [post.slug]);

  const headings = React.useMemo(() => extractHeadings(post.body), [post.body]);
  const ids = React.useMemo(() => headings.map((h) => h.id), [headings]);
  const { active, progress } = useHeadingSpy(ids);

  // Same pass as `extractHeadings`, so rendered headings and outline links agree.
  const idByText = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const heading of headings) if (!map.has(heading.text)) map.set(heading.text, heading.id);
    return map;
  }, [headings]);

  const components = React.useMemo(() => {
    const make = (tag: 'h1' | 'h2' | 'h3') => {
      const Heading = ({ children }: { children?: React.ReactNode }) => {
        const id = idByText.get(normalizeHeadingText(nodeText(children)));
        const Tag = tag;
        return <Tag id={id}>{children}</Tag>;
      };
      return Heading;
    };
    return { ...MEDIA_COMPONENTS, h1: make('h1'), h2: make('h2'), h3: make('h3') };
  }, [idByText]);

  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto px-5 py-8"
    >
      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <TocRail
          headings={headings}
          active={active}
          progress={progress}
          onJump={scrollToHeading}
          otherPosts={others}
          onOpenPost={onOpenPost}
        />

        <div className="min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[13px] text-tertiary hover:text-accent transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            {t('blogBack')}
          </button>

          <header className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--color-subtle)' }}>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-primary leading-snug mb-3">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-tertiary">
              {post.date && <time dateTime={post.date}>{formatPostDate(post.date, lang)}</time>}
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {readingMinutes(post.body)} {t('blogMinRead')}
              </span>
              {post.lang && (
                <MetaPill>{post.lang === 'zh' ? t('postLangZh') : t('postLangEn')}</MetaPill>
              )}
            </div>
          </header>

          <TocMobile headings={headings} active={active} onJump={scrollToHeading} />

          <MediaProvider slug={post.slug}>
            <div className="markdown-body blog-body text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {post.body}
              </ReactMarkdown>
            </div>
          </MediaProvider>
        </div>
      </div>
    </motion.div>
  );
};

const BlogTab = () => {
  const { t, lang } = useLang();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = openSlug ? findPost(openSlug) : undefined;

  if (open) {
    return (
      <BlogPostView post={open} onBack={() => setOpenSlug(null)} onOpenPost={setOpenSlug} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-5 py-8"
    >
      <h2 className="text-xl font-serif font-semibold text-primary">{t('blogTitle')}</h2>
      <p className="text-sm text-tertiary mt-2 mb-8">{t('blogIntro')}</p>

      {BLOG_POSTS.length === 0 ? (
        <p className="text-sm text-tertiary py-10 text-center">{t('blogEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {BLOG_POSTS.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenSlug(post.slug)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenSlug(post.slug);
                  }
                }}
                className="group cursor-pointer w-full text-left p-5 rounded-xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--card-border)',
                  boxShadow: 'var(--card-shadow)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
                }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-tertiary mb-2">
                  {post.date && <time dateTime={post.date}>{formatPostDate(post.date, lang)}</time>}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />
                    {readingMinutes(post.body)} {t('blogMinRead')}
                  </span>
                  {post.lang && (
                    <MetaPill>{post.lang === 'zh' ? t('postLangZh') : t('postLangEn')}</MetaPill>
                  )}
                </div>

                <h3 className="font-serif text-lg font-semibold text-primary mb-2 transition-colors group-hover:text-accent">
                  {post.title}
                </h3>

                {post.summary && (
                  <p className="text-sm text-secondary leading-relaxed mb-3">{post.summary}</p>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.map((tag) => (
                      <MetaPill key={tag}>{tag}</MetaPill>
                    ))}
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Experiences Page
// ═══════════════════════════════════════════

const ACADEMIC_BADGE: Record<AcademicExperience['kind'], { key: UIKey; color: string }> = {
  degree: { key: 'badgeDegree', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
  exchange: { key: 'badgeExchange', color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
  summer: { key: 'badgeSummer', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
};

const OTHER_BADGE: Record<OtherExperience['type'], { key: UIKey; color: string }> = {
  award: { key: 'badgeAward', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  workshop: { key: 'badgeWorkshop', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' },
  certification: { key: 'badgeCertification', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400' },
  book: { key: 'badgeBook', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' },
  development: { key: 'badgeDevelopment', color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400' },
  other: { key: 'badgeOther', color: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
};

const ExperienceTab = () => {
  const { t, tr } = useLang();
  const [academic] = useState<AcademicExperience[]>(INITIAL_ACADEMIC);
  const [projects] = useState<ResearchProject[]>(INITIAL_PROJECTS);
  const [conferences] = useState<ConferencePaper[]>(INITIAL_CONFERENCES);
  const [otherExperiences] = useState<OtherExperience[]>(INITIAL_OTHER_EXPERIENCES);

  const [academicExpanded, setAcademicExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [conferencesExpanded, setConferencesExpanded] = useState(true);
  const [awardsExpanded, setAwardsExpanded] = useState(true);
  const [booksExpanded, setBooksExpanded] = useState(true);
  const [softwareExpanded, setSoftwareExpanded] = useState(true);

  const awards = otherExperiences.filter((exp) => exp.type === 'award');
  const books = otherExperiences.filter((exp) => exp.type === 'book');
  const software = otherExperiences.filter((exp) => exp.type === 'development');

  const SectionCard = ({ title, expanded, onToggle, children }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      <button onClick={onToggle} className="w-full flex items-center justify-between mb-4 group py-1">
        <h2 className="text-xl font-serif font-semibold text-primary group-hover:text-accent transition-colors duration-200">
          {title}
        </h2>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="p-1.5 rounded-full transition-colors"
          style={{ backgroundColor: 'var(--color-subtle)' }}
        >
          <ChevronDown size={18} className="text-secondary" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const ExperienceCard = ({ title, subtitle, metadata, description, badge, badgeColor, index, crest }: {
    title: string;
    subtitle?: string;
    metadata?: React.ReactNode;
    description?: string;
    badge?: string;
    badgeColor?: string;
    index: number;
    crest?: CrestKey;
  }) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group p-5 md:p-6 rounded-xl border transition-all duration-200"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)';
      }}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-primary mb-1.5 group-hover:text-accent transition-colors duration-200">
            {title}
          </h3>
          {subtitle && <p className="text-secondary text-sm mb-2">{subtitle}</p>}
          {metadata && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-tertiary uppercase tracking-wider mb-3">
              {metadata}
            </div>
          )}
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
          {description && (
            <p className="text-tertiary text-sm leading-relaxed mt-3 pl-3 border-l-2" style={{ borderColor: 'var(--color-subtle)' }}>
              {description}
            </p>
          )}
        </div>
        <CrestBadge crest={crest} size={26} />
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-5 py-8"
    >
      <h2 className="text-xl font-serif font-semibold text-primary mb-8">{t('experiencesTitle')}</h2>

      <div className="space-y-10">
        {/* Academic Experience */}
        <SectionCard
          title={t('academicExperience')}
          expanded={academicExpanded}
          onToggle={() => setAcademicExpanded(!academicExpanded)}
        >
          {academic.map((entry, index) => (
            <ExperienceCard
              key={entry.id}
              index={index}
              crest={entry.crest}
              title={tr(entry.degree)}
              subtitle={[tr(entry.department), tr(entry.university)].filter(Boolean).join(' · ')}
              metadata={
                <>
                  {entry.location && (
                    <span className="flex items-center gap-1"><MapPin size={12} /> {tr(entry.location)}</span>
                  )}
                  <span>{tr(entry.period)}</span>
                </>
              }
              badge={t(ACADEMIC_BADGE[entry.kind].key)}
              badgeColor={ACADEMIC_BADGE[entry.kind].color}
              description={entry.detail ? tr(entry.detail) : undefined}
            />
          ))}
          {academic.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyAcademic')}</p>
          )}
        </SectionCard>

        {/* Research Projects */}
        <SectionCard
          title={t('researchProjects')}
          expanded={projectsExpanded}
          onToggle={() => setProjectsExpanded(!projectsExpanded)}
        >
          {projects.map((project, index) => (
            <ExperienceCard
              key={project.id}
              index={index}
              title={tr(project.title)}
              metadata={
                <>
                  <span className="flex items-center gap-1"><Users size={12} /> {tr(project.role)}</span>
                  <span className="flex items-center gap-1"><GraduationCap size={12} /> {tr(project.institution)}</span>
                  <span>{tr(project.period)}</span>
                </>
              }
              badge={project.status === 'ongoing' ? t('badgeOngoing') : t('badgeCompleted')}
              badgeColor={
                project.status === 'ongoing'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
              }
              description={project.description ? tr(project.description) : undefined}
            />
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyProjects')}</p>
          )}
        </SectionCard>

        {/* Conference Papers */}
        <SectionCard
          title={t('conferencePapers')}
          expanded={conferencesExpanded}
          onToggle={() => setConferencesExpanded(!conferencesExpanded)}
        >
          {conferences.map((conference, index) => (
            <ExperienceCard
              key={conference.id}
              index={index}
              title={tr(conference.title)}
              subtitle={tr(conference.role)}
              metadata={
                <>
                  <span>{tr(conference.conference)}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {tr(conference.location)}</span>
                  <span>{conference.year}</span>
                </>
              }
              badge={
                conference.award
                  ? tr(conference.award)
                  : conference.type === 'oral'
                  ? t('badgeOral')
                  : t('badgePoster')
              }
              badgeColor={
                conference.award
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : conference.type === 'oral'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }
            />
          ))}
          {conferences.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyConferences')}</p>
          )}
        </SectionCard>

        {/* Awards & Honors */}
        <SectionCard
          title={t('awardsHonors')}
          expanded={awardsExpanded}
          onToggle={() => setAwardsExpanded(!awardsExpanded)}
        >
          {awards.map((exp, index) => (
            <ExperienceCard
              key={exp.id}
              index={index}
              title={tr(exp.title)}
              metadata={
                <>
                  <span>{tr(exp.organization)}</span>
                  <span>{tr(exp.period)}</span>
                </>
              }
              badge={t(OTHER_BADGE[exp.type].key)}
              badgeColor={OTHER_BADGE[exp.type].color}
              description={exp.description ? tr(exp.description) : undefined}
            />
          ))}
          {awards.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyAwards')}</p>
          )}
        </SectionCard>

        {/* Books & Chapters */}
        <SectionCard
          title={t('booksTitle')}
          expanded={booksExpanded}
          onToggle={() => setBooksExpanded(!booksExpanded)}
        >
          {books.map((exp, index) => (
            <ExperienceCard
              key={exp.id}
              index={index}
              title={tr(exp.title)}
              metadata={
                <>
                  <span>{tr(exp.organization)}</span>
                  <span>{tr(exp.period)}</span>
                </>
              }
              badge={t(OTHER_BADGE[exp.type].key)}
              badgeColor={OTHER_BADGE[exp.type].color}
              description={exp.description ? tr(exp.description) : undefined}
            />
          ))}
          {books.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptyBooks')}</p>
          )}
        </SectionCard>

        {/* Software */}
        <SectionCard
          title={t('softwareTitle')}
          expanded={softwareExpanded}
          onToggle={() => setSoftwareExpanded(!softwareExpanded)}
        >
          {software.map((exp, index) => (
            <ExperienceCard
              key={exp.id}
              index={index}
              title={tr(exp.title)}
              metadata={
                <>
                  <span>{tr(exp.organization)}</span>
                  <span>{tr(exp.period)}</span>
                </>
              }
              badge={t(OTHER_BADGE[exp.type].key)}
              badgeColor={OTHER_BADGE[exp.type].color}
              description={exp.description ? tr(exp.description) : undefined}
            />
          ))}
          {software.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">{t('emptySoftware')}</p>
          )}
        </SectionCard>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Shell
// ═══════════════════════════════════════════

const Shell = () => {
  const { t, tr } = useLang();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);

  return (
    <div className="min-h-screen bg-page transition-colors duration-300">
      {/* University crest watermarks */}
      <CrestBackground />

      {/* Subtle noise texture */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content */}
      <main className="relative z-10 pt-20">
        <AnimatePresence mode="wait">
          {activeTab === Tab.HOME && (
            <motion.div key="home">
              <HomeTab />
            </motion.div>
          )}
          {activeTab === Tab.PUBLICATIONS && (
            <motion.div key="publications">
              <PublicationsTab />
            </motion.div>
          )}
          {activeTab === Tab.EXPERIENCES && (
            <motion.div key="experiences">
              <ExperienceTab />
            </motion.div>
          )}
          {activeTab === Tab.BLOG && (
            <motion.div key="blog">
              <BlogTab />
            </motion.div>
          )}
          {activeTab === Tab.RESEARCH_NOTES && (
            <motion.div key="notes">
              <TrackersTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-8 pt-4 text-center">
        <p className="text-[11px] text-tertiary tracking-wide">
          &copy; {new Date().getFullYear()} {tr(PROFILE.name)}. {t('footerRights')}
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LangProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </LangProvider>
  );
}
