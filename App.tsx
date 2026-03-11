import React, { useState } from 'react';
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
  ChevronUp,
  BarChart3,
  FileText,
  Languages,
  Briefcase,
  Award,
  GraduationCap,
  Users,
  MapPin
} from 'lucide-react';
import { Tab, Paper, CustomCardData, ResearchProject, ConferencePaper, OtherExperience } from './types';
import { PROFILE, INITIAL_PAPERS, INITIAL_CARDS, INITIAL_PROJECTS, INITIAL_CONFERENCES, INITIAL_OTHER_EXPERIENCES } from './constants';

// --- Components ---

const NavButton = ({ tab, current, onClick, icon: Icon, label }: any) => (
  <motion.button
    onClick={() => onClick(tab)}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 ${
      current === tab
        ? 'text-white shadow-md'
        : 'text-slate-600 hover:text-slate-900'
    }`}
    style={{
      background: current === tab
        ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)'
        : 'transparent',
      boxShadow: current === tab
        ? '0 4px 16px rgba(15, 23, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        : 'none'
    }}
  >
    {current === tab && (
      <motion.div
        layoutId="navHighlight"
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
          zIndex: -1,
          borderRadius: '9999px'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    )}
    <Icon size={18} className="relative z-10" />
    <span className="text-sm font-medium relative z-10">{label}</span>
  </motion.button>
);

const SocialLink = ({ href, icon: Icon }: any) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all duration-300 border border-transparent hover:border-slate-200"
  >
    <Icon size={20} />
  </a>
);

// --- Animations ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// --- Pages ---

const HomeTab = () => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    exit={{ opacity: 0, y: -20 }}
    className="flex flex-col items-center min-h-[60vh] max-w-4xl mx-auto px-4 pb-12"
  >
    {/* Hero Section */}
    <motion.div
      variants={itemVariants}
      className="text-center max-w-2xl mx-auto"
    >
      <div className="relative mb-8 group inline-block">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
        <img
          src={PROFILE.avatarUrl}
          alt={PROFILE.name}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-xl relative z-10"
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
        {PROFILE.name}
      </h1>
      <p className="text-lg text-slate-600 mb-2 font-light">{PROFILE.title}</p>
      <p className="text-slate-500 mb-8 font-medium bg-slate-100 px-4 py-1 rounded-full text-sm inline-block">
        {PROFILE.affiliation}
      </p>

      <p className="text-lg text-slate-700 leading-relaxed mb-8 font-serif">
        {PROFILE.bio}
      </p>

      <div className="flex justify-center gap-4 mb-16">
        {PROFILE.socials.github && <SocialLink href={PROFILE.socials.github} icon={Github} />}
        {PROFILE.socials.scholar && <SocialLink href={PROFILE.socials.scholar} icon={GraduationCap} />}
        {PROFILE.socials.orcid && <SocialLink href={PROFILE.socials.orcid} icon={BookOpen} />}
        <SocialLink href={`mailto:${PROFILE.email}`} icon={Mail} />
      </div>
    </motion.div>

    {/* Details Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl border-t border-slate-100 pt-12">

      {/* Education & Experience */}
      <motion.div variants={itemVariants}>
        <h3 className="text-xl font-serif font-semibold mb-8 flex items-center gap-2 text-slate-800">
          <Briefcase size={20} className="text-indigo-600" /> Background
        </h3>

        <div className="space-y-8 relative border-l border-slate-200 ml-3 pl-8 pb-2">
          {PROFILE.experience.map((exp, i) => (
            <div key={`exp-${i}`} className="relative group">
              <span className="absolute -left-[39px] top-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover:scale-125 transition-transform" />
              <h4 className="font-medium text-slate-900 leading-none mb-1.5">{exp.role}</h4>
              {exp.department && <p className="text-slate-600 text-sm">{exp.department}</p>}
              <p className="text-slate-600 text-sm">{exp.university}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">{exp.period}</p>
            </div>
          ))}

          <div className="my-6 border-b border-dashed border-slate-200 w-full" />

          {PROFILE.education.map((edu, i) => (
            <div key={`edu-${i}`} className="relative group">
              <span className="absolute -left-[39px] top-1.5 w-3 h-3 bg-white border-2 border-slate-300 rounded-full group-hover:border-indigo-400 group-hover:scale-125 transition-all" />
              <h4 className="font-medium text-slate-900 leading-none mb-1.5">{edu.degree}</h4>
              {edu.department && <p className="text-slate-600 text-sm">{edu.department}</p>}
              <p className="text-slate-600 text-sm">{edu.university}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">{edu.year}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Highlights */}
      <motion.div variants={itemVariants}>
        <h3 className="text-xl font-serif font-semibold mb-8 flex items-center gap-2 text-slate-800">
          <Sparkles size={20} className="text-amber-500" /> Recent Highlights
        </h3>
        <div className="space-y-4">
          {PROFILE.news.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-default"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.category === 'Award' ? 'bg-amber-100 text-amber-700' :
                    item.category === 'Publication' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                  }`}>
                  {item.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">{item.date}</span>
              </div>
              <p className="font-medium text-slate-800 leading-relaxed text-sm">{item.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

    </div>
  </motion.div>
);

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

  const sortPapers = (papersToSort: Paper[]): Paper[] => {
    return [...papersToSort].sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      if (a.type !== b.type) {
        return a.type === 'en' ? -1 : 1;
      }
      const aIsFirst = isFirstAuthor(a);
      const bIsFirst = isFirstAuthor(b);
      if (aIsFirst !== bIsFirst) {
        return aIsFirst ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
  };

  const authoredPapers = sortPapers(papers.filter(p => p.publicationType === 'authored'));
  const contributedPapers = sortPapers(papers.filter(p => p.publicationType === 'contributed'));

  const yearStats = papers.reduce((acc, paper) => {
    acc[paper.year] = (acc[paper.year] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const typeStats = papers.reduce((acc, paper) => {
    const type = paper.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCount = Math.max(...Object.values(yearStats));
  const totalPapers = papers.length;
  const totalCitations = papers.reduce((sum, paper) => sum + (paper.citationCount || 0), 0);

  const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  const PaperCard = ({ paper, index }: { paper: Paper; index: number }) => (
    <motion.div
      key={paper.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-serif font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
            {paper.title}
          </h3>
          <p className="text-slate-600 italic mb-2 text-sm">{paper.authors.join(", ")}</p>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{paper.venue}</span>
            {paper.tags?.map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="px-2 py-1 rounded text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.text}
              </span>
            ))}
            <span>{paper.year}</span>
          </div>
          {paper.abstract && (
            <p className="text-slate-500 text-sm leading-relaxed mb-4 border-l-2 border-slate-100 pl-3">
              {paper.abstract.length > 100 ? paper.abstract.substring(0, 100) + '...' : paper.abstract}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-50 pt-4">
        {/* 第一列：原文 URL */}
        <div className="col-span-1">
          {paper.url ? (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-indigo-600 hover:underline flex items-center gap-1.5"
            >
              <ExternalLink size={12} />
              Fulltext Link
            </a>
          ) : (
            <span className="ml-2 text-xs text-slate-300">Not available</span>
          )}
        </div>

        {/* 第二列：引用数 */}
        <div className="col-span-1 flex items-center gap-2 justify-start">
          {paper.citationCount !== undefined && paper.citationCount !== null ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              {paper.citationCount} Citations
            </span>
          ) : (
            <span className="text-xs text-slate-400">No citation data</span>
          )}
          {paper.type === 'cn' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100">
              Verified Through CNKI
            </span>
          ) : paper.type === 'en' ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-green-50 text-green-600 border-green-100">
              Verified Through Google Scholar
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto px-4 py-8"
    >
      {/* Statistics Overview */}
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold mb-6 text-slate-900 flex items-center gap-2">
          <BarChart3 size={24} className="text-indigo-600" />
          Publication Statistics
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Total Publications"
            value={totalPapers}
            color="bg-indigo-600"
          />
          <StatCard
            icon={BarChart3}
            label="Total Citations"
            value={totalCitations}
            color="bg-emerald-600"
          />
          <StatCard
            icon={Languages}
            label="Languages"
            value={`${typeStats['en'] || 0} EN / ${typeStats['cn'] || 0} CN`}
            color="bg-amber-600"
          />
        </div>

        {/* Year Distribution Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm mb-6">
          <h3 className="text-lg font-serif font-semibold mb-4 text-slate-800">Publications by Year</h3>
          <div className="flex items-end gap-4 h-40">
            {Object.entries(yearStats)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([year, count]) => {
                const height = (count / maxCount) * 100;
                return (
                  <div key={year} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg relative group"
                      style={{ minHeight: '8px' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {count} papers
                      </div>
                    </motion.div>
                    <span className="text-xs font-medium text-slate-600">{year}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Type Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-serif font-semibold mb-4 text-slate-800">Publication Type</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-600">English</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPapers > 0 ? ((typeStats['en'] || 0) / totalPapers) * 100 : 0}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{typeStats['en'] || 0}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-600">Chinese</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPapers > 0 ? ((typeStats['cn'] || 0) / totalPapers) * 100 : 0}%` }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{typeStats['cn'] || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-serif font-semibold mb-4 text-slate-800">Author Contribution</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-sm text-slate-600">Authored</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPapers > 0 ? (authoredPapers.length / totalPapers) * 100 : 0}%` }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{authoredPapers.length}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-sm text-slate-600">Contributed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalPapers > 0 ? (contributedPapers.length / totalPapers) * 100 : 0}%` }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="h-full bg-slate-400"
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{contributedPapers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authored Publications Section */}
      <div className="mb-8">
        <button
          onClick={() => setAuthoredExpanded(!authoredExpanded)}
          className="w-full flex items-center justify-between mb-4 group"
        >
          <h2 className="text-3xl font-serif font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Authored Publications
          </h2>
          <motion.div
            animate={{ rotate: authoredExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors"
          >
            {authoredExpanded ? <ChevronUp size={24} className="text-slate-600" /> : <ChevronDown size={24} className="text-slate-600" />}
          </motion.div>
        </button>

        <AnimatePresence>
          {authoredExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-6">
                {authoredPapers.map((paper, index) => (
                  <PaperCard key={paper.id} paper={paper} index={index} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contributed Publications Section */}
      <div className="mb-8">
        <button
          onClick={() => setContributedExpanded(!contributedExpanded)}
          className="w-full flex items-center justify-between mb-4 group"
        >
          <h2 className="text-3xl font-serif font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Contributed Publications
          </h2>
          <motion.div
            animate={{ rotate: contributedExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors"
          >
            {contributedExpanded ? <ChevronUp size={24} className="text-slate-600" /> : <ChevronDown size={24} className="text-slate-600" />}
          </motion.div>
        </button>

        <AnimatePresence>
          {contributedExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-6">
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

const DashboardTab = () => {
  const [cards] = useState<CustomCardData[]>(INITIAL_CARDS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-8"
    >
      <h2 className="text-3xl font-serif font-bold text-slate-900 mb-8">Trackers</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[200px] bg-white border-slate-100 hover:shadow-lg"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  Note
                </span>
              </div>

              <div className="markdown-body text-sm text-slate-600">
                {card.title && <h3 className="font-serif font-bold text-lg mb-2 text-slate-900">{card.title}</h3>}
                <ReactMarkdown>{card.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const ExperienceTab = () => {
  const [projects] = useState<ResearchProject[]>(INITIAL_PROJECTS);
  const [conferences] = useState<ConferencePaper[]>(INITIAL_CONFERENCES);
  const [otherExperiences] = useState<OtherExperience[]>(INITIAL_OTHER_EXPERIENCES);

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [conferencesExpanded, setConferencesExpanded] = useState(true);
  const [othersExpanded, setOthersExpanded] = useState(true);

  const SectionCard = ({ 
    icon: Icon, 
    title, 
    expanded, 
    onToggle, 
    children, 
    color 
  }: { 
    icon: any; 
    title: string; 
    expanded: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    color: string;
  }) => (
    <div className="mb-8">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-3xl font-serif font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {title}
        </h2>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="p-2 rounded-full bg-slate-100 group-hover:bg-indigo-100 transition-colors"
        >
          {expanded ? <ChevronUp size={24} className="text-slate-600" /> : <ChevronDown size={24} className="text-slate-600" />}
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const ExperienceCard = ({ 
    title, 
    subtitle, 
    metadata, 
    description, 
    badge, 
    badgeColor,
    index 
  }: { 
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-serif font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
            {title}
          </h3>
          {subtitle && (
            <p className="text-slate-600 italic mb-2 text-sm">{subtitle}</p>
          )}
          {metadata && (
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {metadata}
            </div>
          )}
          {badge && (
            <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
          {description && (
            <p className="text-slate-500 text-sm leading-relaxed mb-4 border-l-2 border-slate-100 pl-3 mt-3">
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
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <h2 className="text-3xl font-serif font-bold mb-8 text-slate-900">Experiences</h2>

      <div className="space-y-6">
        {/* Research Projects */}
        <SectionCard
          icon={Briefcase}
          title="Research Projects"
          expanded={projectsExpanded}
          onToggle={() => setProjectsExpanded(!projectsExpanded)}
          color="bg-indigo-600"
        >
          {projects.map((project, index) => (
            <ExperienceCard
              key={project.id}
              index={index}
              title={project.title}
              metadata={
                <>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {project.role}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap size={14} />
                    {project.institution}
                  </span>
                  <span>{project.period}</span>
                </>
              }
              badge={project.status === 'ongoing' ? 'Ongoing' : 'Completed'}
              badgeColor={
                project.status === 'ongoing'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-200 text-slate-600'
              }
              description={project.description}
            />
          ))}
        </SectionCard>

        {/* Conference Papers */}
        <SectionCard
          icon={FileText}
          title="Conference Papers"
          expanded={conferencesExpanded}
          onToggle={() => setConferencesExpanded(!conferencesExpanded)}
          color="bg-emerald-600"
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
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {conference.location}
                  </span>
                  <span>{conference.year}</span>
                </>
              }
              badge={conference.type === 'oral' ? 'Oral' : 'Poster'}
              badgeColor={
                conference.type === 'oral'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }
            />
          ))}
        </SectionCard>

        {/* Other Experiences */}
        <SectionCard
          icon={Award}
          title="Awards & Activities"
          expanded={othersExpanded}
          onToggle={() => setOthersExpanded(!othersExpanded)}
          color="bg-amber-600"
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
                exp.type === 'award' ? 'bg-amber-100 text-amber-700' :
                exp.type === 'workshop' ? 'bg-purple-100 text-purple-700' :
                exp.type === 'certification' ? 'bg-cyan-100 text-cyan-700' :
                'bg-slate-100 text-slate-600'
              }
              description={exp.description}
            />
          ))}
        </SectionCard>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);

  return (
    <div className="min-h-screen pb-20 bg-[#fafafa]">
      {/* Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
          className="flex items-center gap-1 px-2 py-2 rounded-[24px] backdrop-blur-2xl shadow-2xl border border-white/40 ring-1 ring-black/5"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.85) 100%)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.8),
              inset 0 -1px 0 rgba(0, 0, 0, 0.05)
            `
          }}
        >
          <NavButton
            tab={Tab.HOME}
            current={activeTab}
            onClick={setActiveTab}
            icon={HomeIcon}
            label="Home"
          />
          <NavButton
            tab={Tab.PUBLICATIONS}
            current={activeTab}
            onClick={setActiveTab}
            icon={BookOpen}
            label="Publications"
          />
          <NavButton
            tab={Tab.EXPERIENCES}
            current={activeTab}
            onClick={setActiveTab}
            icon={Briefcase}
            label="Experiences"
          />
          <NavButton
            tab={Tab.RESEARCH_NOTES}
            current={activeTab}
            onClick={setActiveTab}
            icon={Grid}
            label="Trackers"
          />
        </motion.div>
      </nav>

      {/* Content */}
      <main className="pt-12 md:pt-20">
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
              <DashboardTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}