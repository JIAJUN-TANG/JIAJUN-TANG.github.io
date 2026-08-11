import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
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
  Monitor
} from 'lucide-react';
import { Tab, Paper, CustomCardData, ResearchProject, ConferencePaper, OtherExperience } from './types';
import { PROFILE, INITIAL_PAPERS, INITIAL_CARDS, INITIAL_PROJECTS, INITIAL_CONFERENCES, INITIAL_OTHER_EXPERIENCES } from './constants';

// ═══════════════════════════════════════════
// Theme System
// ═══════════════════════════════════════════

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
}>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
});

const useTheme = () => useContext(ThemeContext);

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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolved = theme === 'system'
    ? (systemDark ? 'dark' : 'light')
    : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    try { localStorage.setItem('theme', theme); } catch {}
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.25, 0, 1] } }
};

// ═══════════════════════════════════════════
// Navigation Components
// ═══════════════════════════════════════════

const NAV_ITEMS = [
  { tab: Tab.HOME, icon: HomeIcon, label: 'Home' },
  { tab: Tab.PUBLICATIONS, icon: BookOpen, label: 'Publications' },
  { tab: Tab.EXPERIENCES, icon: Briefcase, label: 'Experiences' },
  { tab: Tab.RESEARCH_NOTES, icon: Grid, label: 'Trackers' },
];

const NavItem = ({ tab, current, onClick, icon: Icon, label }: {
  tab: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) => {
  const isActive = current === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200 ${
        isActive
          ? 'text-white dark:text-primary'
          : 'text-tertiary hover:text-primary'
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

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      className="p-2 rounded-full text-tertiary hover:text-primary transition-colors"
      title={`Theme: ${theme}`}
    >
      <Icon size={15} />
    </button>
  );
};

const Navigation = ({ activeTab, setActiveTab }: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) => (
  <nav className="fixed top-0 inset-x-0 z-50">
    <div
      className="mx-auto mt-3 max-w-xl px-3 py-1.5 rounded-2xl flex items-center justify-between gap-2 border"
      style={{
        backgroundColor: 'var(--nav-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderColor: 'var(--nav-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Brand */}
      <span className="font-serif text-[15px] text-primary pl-2 select-none tracking-tight">
        Jiajun Tang
      </span>

      {/* Tab Items */}
      <div className="flex items-center gap-0.5">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.tab}
            tab={item.tab}
            current={activeTab}
            onClick={setActiveTab}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>

      {/* Theme Toggle */}
      <div className="pr-1">
        <ThemeToggle />
      </div>
    </div>
  </nav>
);

// ═══════════════════════════════════════════
// Social Link
// ═══════════════════════════════════════════

const SocialLink = ({ href, icon: Icon }: { href: string; icon: React.ComponentType<{ size?: number }> }) => (
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

const HomeTab = () => (
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
          alt={PROFILE.name}
          className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 shadow-lg relative z-10 transition-transform duration-500 group-hover:scale-[1.03]"
          style={{
            borderColor: 'var(--card-border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px var(--card-border)',
          }}
        />
      </div>

      {/* Name */}
      <h1 className="text-4xl md:text-5xl font-serif font-normal text-primary mb-3 tracking-tight leading-tight">
        {PROFILE.name}
      </h1>

      {/* Title */}
      <p className="text-base text-secondary mb-2 font-normal">{PROFILE.title}</p>

      {/* Affiliation */}
      <p className="text-sm text-tertiary mb-8">
        {PROFILE.affiliation}
      </p>

      {/* Bio */}
      <p className="text-base text-secondary leading-[1.8] mb-8 max-w-xl mx-auto">
        {PROFILE.bio}
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
          <Briefcase size={14} /> Background
        </h3>

        <div className="space-y-7 relative border-l ml-2 pl-7 pb-2" style={{ borderColor: 'var(--color-subtle)' }}>
          {PROFILE.experience.map((exp, i) => (
            <React.Fragment key={`exp-${i}`}>
              {i > 0 && PROFILE.experience[i - 1].period.includes('Present') && !exp.period.includes('Present') && (
                <div className="my-5 border-b border-dashed" style={{ borderColor: 'var(--color-subtle)' }} />
              )}
              <div className="relative group">
                <span
                  className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-200 group-hover:scale-125"
                  style={{
                    borderColor: exp.period.includes('Present') ? 'var(--color-accent)' : 'var(--color-tertiary)',
                    backgroundColor: 'var(--color-card)',
                  }}
                />
                <h4 className="font-medium text-primary text-sm leading-snug mb-1">{exp.role}</h4>
                {exp.department && <p className="text-secondary text-xs">{exp.department}</p>}
                <p className="text-secondary text-xs">{exp.university}</p>
                <p className="text-tertiary text-[11px] font-mono mt-1">{exp.period}</p>
              </div>
            </React.Fragment>
          ))}

          {PROFILE.education.map((edu, i) => (
            <div key={`edu-${i}`} className="relative group">
              <span
                className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-200 group-hover:scale-125"
                style={{
                  borderColor: 'var(--color-tertiary)',
                  backgroundColor: 'var(--color-card)',
                }}
              />
              <h4 className="font-medium text-primary text-sm leading-snug mb-1">{edu.degree}</h4>
              {edu.department && <p className="text-secondary text-xs">{edu.department}</p>}
              <p className="text-secondary text-xs">{edu.university}</p>
              <p className="text-tertiary text-[11px] font-mono mt-1">{edu.year}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Highlights */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-sans font-semibold uppercase tracking-[0.15em] text-tertiary mb-6 flex items-center gap-2">
          <Sparkles size={14} /> Recent Highlights
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
                  {item.category}
                </span>
                <span className="text-[11px] text-tertiary font-mono">{item.date}</span>
              </div>
              <p className="font-medium text-primary text-sm leading-relaxed">{item.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════
// Publications Page
// ═══════════════════════════════════════════

const PublicationsTab = () => {
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
    const ifTag = paper.tags?.find(t => t.text.startsWith('IF'));
    return ifTag ? parseFloat(ifTag.text.replace('IF ', '')) : 0;
  };

  const sortPapers = (papersToSort: Paper[]): Paper[] => {
    return [...papersToSort].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const bIF = getIF(b);
      const aIF = getIF(a);
      if (aIF !== bIF) return bIF - aIF;
      const aIsFirst = isFirstAuthor(a);
      const bIsFirst = isFirstAuthor(b);
      if (aIsFirst !== bIsFirst) return aIsFirst ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  };

  // Year filter
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const availableYears = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);

  const authoredPapers = sortPapers(
    papers.filter(p => p.publicationType === 'authored' && (selectedYear === null || p.year === selectedYear))
  );
  const contributedPapers = sortPapers(
    papers.filter(p => p.publicationType === 'contributed' && (selectedYear === null || p.year === selectedYear))
  );

  const totalPapers = authoredPapers.length;
  const totalCitations = authoredPapers.reduce((sum, paper) => sum + (paper.citationCount || 0), 0);

  const calculateHIndex = (papers: Paper[]): number => {
    const citations = papers.map(p => p.citationCount || 0).sort((a, b) => b - a);
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
        {paper.title}
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
          {paper.venue}
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
        <p className="text-tertiary text-sm leading-relaxed mb-4 pl-3 border-l-2" style={{ borderColor: 'var(--color-subtle)' }}>
          {paper.abstract.length > 200 ? paper.abstract.substring(0, 200) + '...' : paper.abstract}
        </p>
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
            Fulltext
          </a>
        ) : (
          <span className="text-[12px] text-tertiary">Not available</span>
        )}

        {paper.citationCount !== undefined && paper.citationCount !== null && (
          <span className="text-[12px] text-secondary">
            {paper.citationCount} citations
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
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">Papers</span>
        </div>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-subtle)' }} />
        <div>
          <span className="text-2xl font-serif font-semibold text-primary">{totalCitations}</span>
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">Citations</span>
        </div>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--color-subtle)' }} />
        <div>
          <span className="text-2xl font-serif font-semibold text-primary">{hIndex}</span>
          <span className="text-xs text-tertiary ml-1.5 uppercase tracking-wide">h-index</span>
        </div>
      </div>
      <p className="text-[11px] text-tertiary mb-8 -mt-2">
        * Corresponding author. Statistics count authored publications only.
      </p>

      {/* Year Filter */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        <span className="text-xs text-tertiary uppercase tracking-wider mr-1">Year</span>
        <button
          onClick={() => setSelectedYear(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
            selectedYear === null
              ? 'bg-primary text-white dark:bg-primary dark:text-page'
              : 'text-tertiary hover:text-primary'
          }`}
          style={selectedYear === null ? {} : { backgroundColor: 'var(--color-subtle)' }}
        >
          All
        </button>
        {availableYears.map(year => (
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
          title="Authored Publications"
          expanded={authoredExpanded}
          onToggle={() => setAuthoredExpanded(!authoredExpanded)}
        />
        <AnimatePresence>
          {authoredExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {authoredPapers.map((paper, index) => (
                  <PaperCard key={paper.id} paper={paper} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contributed Publications */}
      <div className="mb-8">
        <SectionHeader
          title="Contributed Publications"
          expanded={contributedExpanded}
          onToggle={() => setContributedExpanded(!contributedExpanded)}
        />
        <AnimatePresence>
          {contributedExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.25, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {contributedPapers.map((paper, index) => (
                  <PaperCard key={paper.id} paper={paper} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Trackers Page
// ═══════════════════════════════════════════

const TrackersTab = () => {
  const [cards] = useState<CustomCardData[]>(INITIAL_CARDS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto px-5 py-8"
    >
      <h2 className="text-xl font-serif font-semibold text-primary mb-8">Trackers</h2>

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
                Note
              </span>
            </div>

            <div className="markdown-body text-sm flex-1">
              {card.title && (
                <h3 className="font-serif font-semibold text-base mb-2 text-primary">{card.title}</h3>
              )}
              <ReactMarkdown>{card.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Experiences Page
// ═══════════════════════════════════════════

const ExperienceTab = () => {
  const [projects] = useState<ResearchProject[]>(INITIAL_PROJECTS);
  const [conferences] = useState<ConferencePaper[]>(INITIAL_CONFERENCES);
  const [otherExperiences] = useState<OtherExperience[]>(INITIAL_OTHER_EXPERIENCES);

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [conferencesExpanded, setConferencesExpanded] = useState(true);
  const [othersExpanded, setOthersExpanded] = useState(true);

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
            <div className="space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const ExperienceCard = ({ title, subtitle, metadata, description, badge, badgeColor, index }: {
    title: string;
    subtitle?: string;
    metadata?: React.ReactNode;
    description?: string;
    badge?: string;
    badgeColor?: string;
    index: number;
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
      <h2 className="text-xl font-serif font-semibold text-primary mb-8">Experiences</h2>

      <div className="space-y-10">
        <SectionCard
          title="Research Projects"
          expanded={projectsExpanded}
          onToggle={() => setProjectsExpanded(!projectsExpanded)}
        >
          {projects.map((project, index) => (
            <ExperienceCard
              key={project.id}
              index={index}
              title={project.title}
              metadata={
                <>
                  <span className="flex items-center gap-1"><Users size={12} /> {project.role}</span>
                  <span className="flex items-center gap-1"><GraduationCap size={12} /> {project.institution}</span>
                  <span>{project.period}</span>
                </>
              }
              badge={project.status === 'ongoing' ? 'Ongoing' : 'Completed'}
              badgeColor={
                project.status === 'ongoing'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
              }
              description={project.description}
            />
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">No research projects listed yet.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Conference Papers"
          expanded={conferencesExpanded}
          onToggle={() => setConferencesExpanded(!conferencesExpanded)}
        >
          {conferences.map((conference, index) => (
            <ExperienceCard
              key={conference.id}
              index={index}
              title={conference.title}
              subtitle={conference.authors.join(', ')}
              metadata={
                <>
                  <span>{conference.conference}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {conference.location}</span>
                  <span>{conference.year}</span>
                </>
              }
              badge={conference.type === 'oral' ? 'Oral' : 'Poster'}
              badgeColor={
                conference.type === 'oral'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }
            />
          ))}
          {conferences.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">No conference papers listed yet.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Awards & Activities"
          expanded={othersExpanded}
          onToggle={() => setOthersExpanded(!othersExpanded)}
        >
          {otherExperiences.map((exp, index) => (
            <ExperienceCard
              key={exp.id}
              index={index}
              title={exp.title}
              metadata={
                <>
                  <span>{exp.organization}</span>
                  <span>{exp.period}</span>
                </>
              }
              badge={
                exp.type === 'award' ? 'Award' :
                exp.type === 'workshop' ? 'Workshop' :
                exp.type === 'certification' ? 'Certification' : 'Other'
              }
              badgeColor={
                exp.type === 'award' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                exp.type === 'workshop' ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' :
                exp.type === 'certification' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400' :
                'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
              }
              description={exp.description}
            />
          ))}
          {otherExperiences.length === 0 && (
            <p className="text-sm text-tertiary py-4 text-center">No awards or activities listed yet.</p>
          )}
        </SectionCard>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-page transition-colors duration-300">
        {/* Subtle noise texture */}
        <div className="noise-overlay" />

        {/* Navigation */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content */}
        <main className="pt-20">
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
            {activeTab === Tab.RESEARCH_NOTES && (
              <motion.div key="notes">
                <TrackersTab />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="pb-8 pt-4 text-center">
          <p className="text-[11px] text-tertiary tracking-wide">
            &copy; {new Date().getFullYear()} Jiajun Tang. All rights reserved.
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
}
