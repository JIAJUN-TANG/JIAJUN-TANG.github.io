import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen, 
  Home as HomeIcon, 
  Grid, 
  Github, 
  Twitter, 
  Mail, 
  GraduationCap, 
  Search, 
  RefreshCw,
  ExternalLink,
  Briefcase,
  Sparkles
} from 'lucide-react';
import { Tab, Paper, CustomCardData } from './types';
import { PROFILE, INITIAL_PAPERS, INITIAL_CARDS } from './constants';
import { fetchCitationCount } from './utils/gemini';

// --- Components ---

const NavButton = ({ tab, current, onClick, icon: Icon, label }: any) => (
  <button
    onClick={() => onClick(tab)}
    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
      current === tab 
        ? 'bg-slate-900 text-white shadow-lg scale-105' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </button>
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
        {PROFILE.socials.twitter && <SocialLink href={PROFILE.socials.twitter} icon={Twitter} />}
        <SocialLink href={`mailto:${PROFILE.email}`} icon={Mail} />
      </div>
    </motion.div>

    {/* Details Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl border-t border-slate-100 pt-12">
      
      {/* Education & Experience */}
      <motion.div variants={itemVariants}>
        <h3 className="text-xl font-serif font-semibold mb-8 flex items-center gap-2 text-slate-800">
          <Briefcase size={20} className="text-indigo-600"/> Background
        </h3>
        
        <div className="space-y-8 relative border-l border-slate-200 ml-3 pl-8 pb-2">
          {PROFILE.experience.map((exp, i) => (
            <div key={`exp-${i}`} className="relative group">
               <span className="absolute -left-[39px] top-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full group-hover:scale-125 transition-transform" />
               <h4 className="font-medium text-slate-900 leading-none mb-1.5">{exp.role}</h4>
               <p className="text-slate-600 text-sm">{exp.institution}</p>
               <p className="text-slate-400 text-xs font-mono mt-1">{exp.period}</p>
            </div>
          ))}
          
          <div className="my-6 border-b border-dashed border-slate-200 w-full" />

          {PROFILE.education.map((edu, i) => (
             <div key={`edu-${i}`} className="relative group">
               <span className="absolute -left-[39px] top-1.5 w-3 h-3 bg-white border-2 border-slate-300 rounded-full group-hover:border-indigo-400 group-hover:scale-125 transition-all" />
               <h4 className="font-medium text-slate-900 leading-none mb-1.5">{edu.degree}</h4>
               <p className="text-slate-600 text-sm">{edu.institution}</p>
               <p className="text-slate-400 text-xs font-mono mt-1">{edu.year}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Highlights */}
      <motion.div variants={itemVariants}>
        <h3 className="text-xl font-serif font-semibold mb-8 flex items-center gap-2 text-slate-800">
          <Sparkles size={20} className="text-amber-500"/> Recent Highlights
        </h3>
        <div className="space-y-4">
           {PROFILE.news.map((item) => (
             <motion.div 
                key={item.id} 
                whileHover={{ y: -2 }}
                className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-default"
             >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.category === 'Award' ? 'bg-amber-100 text-amber-700' :
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
  const [papers, setPapers] = useState<Paper[]>(INITIAL_PAPERS);

  const handleFetchCitation = async (id: string, title: string) => {
    setPapers(prev => prev.map(p => p.id === id ? { ...p, loadingCitation: true } : p));
    const count = await fetchCitationCount(title);
    setPapers(prev => prev.map(p => p.id === id ? { ...p, citationCount: count, loadingCitation: false } : p));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-4 py-8"
    >
      <h2 className="text-3xl font-serif font-bold mb-8 text-slate-900">Selected Publications</h2>
      <div className="space-y-6">
        {papers.map((paper, index) => (
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
                  <span>{paper.year}</span>
                </div>
                {paper.abstract && (
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 border-l-2 border-slate-100 pl-3">
                    {paper.abstract}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-4">
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => handleFetchCitation(paper.id, paper.title)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    disabled={paper.loadingCitation}
                 >
                   {paper.loadingCitation ? (
                     <RefreshCw className="animate-spin" size={14} />
                   ) : (
                     <Search size={14} />
                   )}
                   {paper.citationCount !== undefined && paper.citationCount !== null 
                     ? `${paper.citationCount} Citations` 
                     : "Check Citations"}
                 </button>
                 {paper.citationCount !== undefined && paper.citationCount !== null && (
                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">
                      Verified via Google Scholar
                    </span>
                 )}
               </div>
               {paper.url && (
                 <a href={paper.url} className="text-slate-400 hover:text-slate-900">
                   <ExternalLink size={16} />
                 </a>
               )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const DashboardTab = () => {
  const [cards, setCards] = useState<CustomCardData[]>(INITIAL_CARDS);
  const [newTitle, setNewTitle] = useState("");

  const handleUpdateTracker = async (id: string, title?: string) => {
    if (!title) return;
    setCards(prev => prev.map(c => c.id === id ? { ...c, loadingCitation: true } : c));
    const count = await fetchCitationCount(title);
    setCards(prev => prev.map(c => c.id === id ? { ...c, citationCount: count, loadingCitation: false, lastUpdated: new Date().toLocaleDateString() } : c));
  };

  const addTracker = () => {
    if(!newTitle.trim()) return;
    const newCard: CustomCardData = {
      id: Date.now().toString(),
      type: 'paper-tracker',
      title: newTitle,
      content: 'Tracking citations for this paper.',
      citationCount: null,
      lastUpdated: new Date().toLocaleDateString()
    };
    setCards([...cards, newCard]);
    setNewTitle("");
    handleUpdateTracker(newCard.id, newCard.title);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-4 py-8"
    >
       <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <h2 className="text-3xl font-serif font-bold text-slate-900">Research Notes & Trackers</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Add paper to track..." 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
          />
          <button 
            onClick={addTracker}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[200px] ${
              card.type === 'paper-tracker' 
                ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-100' 
                : 'bg-white border-slate-100 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                   card.type === 'paper-tracker' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {card.type === 'paper-tracker' ? 'Citation Tracker' : 'Note'}
                </span>
                {card.type === 'paper-tracker' && (
                  <button 
                    onClick={() => handleUpdateTracker(card.id, card.title)}
                    className="text-slate-400 hover:text-indigo-600"
                    disabled={card.loadingCitation}
                  >
                    <RefreshCw className={card.loadingCitation ? "animate-spin" : ""} size={16} />
                  </button>
                )}
              </div>

              {card.type === 'paper-tracker' ? (
                <div>
                   <h3 className="font-serif font-bold text-lg leading-tight mb-4 text-slate-800">{card.title}</h3>
                   <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-bold text-indigo-600">
                       {card.loadingCitation ? "..." : (card.citationCount ?? "—")}
                     </span>
                     <span className="text-sm text-slate-500 font-medium">citations</span>
                   </div>
                   <p className="text-xs text-slate-400 mt-2">Source: Google Scholar</p>
                </div>
              ) : (
                <div className="markdown-body text-sm text-slate-600">
                  {card.title && <h3 className="font-serif font-bold text-lg mb-2 text-slate-900">{card.title}</h3>}
                  <ReactMarkdown>{card.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        ))}
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
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-xl border border-white/50 ring-1 ring-black/5">
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
            tab={Tab.RESEARCH_NOTES} 
            current={activeTab} 
            onClick={setActiveTab} 
            icon={Grid} 
            label="Research" 
          />
        </div>
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