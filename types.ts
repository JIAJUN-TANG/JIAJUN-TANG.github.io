export enum Tab {
  HOME = 'home',
  PUBLICATIONS = 'publications',
  EXPERIENCES = 'experiences',
  RESEARCH_NOTES = 'research_notes'
}

/** 'zh' renders the Chinese site, 'en' the English one. */
export type Lang = 'zh' | 'en';

/** A piece of copy that exists in both site languages. */
export interface L10n {
  zh: string;
  en: string;
}

/**
 * Which university crest to show next to an entry. The two degree-granting
 * universities (NJU, CSU) also appear as page watermarks; the exchange and
 * summer-school partners (NCCU, NUS) only show as a small badge.
 */
export type CrestKey = 'nju' | 'csu' | 'nccu' | 'nus';

export interface Paper {
  id: string;
  title: L10n;
  authors: string[];
  venue: L10n;
  year: number;
  url?: string;
  abstract?: string;
  /** Language the abstract is written in, so the other locale can label it. */
  abstractLang?: Lang;
  citationCount?: number | null;
  type?: 'cn' | 'en';
  tags?: { text: string; color: string }[];
  publicationType?: 'authored' | 'contributed';
  /** Google Scholar publication id, e.g. "cXJ2lKAAAAAJ:u-x6o8ySG0sC".
   *  Optional: without it the paper is matched by normalised title. */
  scholarPubId?: string;
}

export interface ResearchProject {
  id: string;
  title: L10n;
  role: L10n;
  institution: L10n;
  period: L10n;
  description?: L10n;
  status: 'completed' | 'ongoing';
}

export interface ConferencePaper {
  id: string;
  title: L10n;
  /** Contribution role, e.g. 第一作者 / First author. */
  role: L10n;
  conference: L10n;
  location: L10n;
  year: number;
  type?: 'oral' | 'poster';
  award?: L10n;
  url?: string;
}

/** Education, exchange semesters and summer schools. */
export interface AcademicExperience {
  id: string;
  degree: L10n;
  department: L10n;
  university: L10n;
  period: L10n;
  location?: L10n;
  detail?: L10n;
  kind: 'degree' | 'exchange' | 'summer';
  crest?: CrestKey;
}

/** Book chapters, software and other non-project academic output. */
export interface OtherExperience {
  id: string;
  title: L10n;
  organization: L10n;
  period: L10n;
  type: 'award' | 'workshop' | 'certification' | 'book' | 'development' | 'other';
  description?: L10n;
}

export interface CustomCardData {
  id: string;
  type: 'markdown';
  title?: L10n;
  content: L10n; // Markdown content
}

export interface Education {
  degree: L10n;
  department: L10n;
  university: L10n;
  year: L10n;
  crest?: CrestKey;
}

export interface Experience {
  role: L10n;
  department: L10n;
  university: L10n;
  period: L10n;
  crest?: CrestKey;
}

export interface NewsItem {
  id: string;
  title: L10n;
  date: L10n;
  category: 'Publication' | 'Talk' | 'Award' | 'News';
  link?: string;
}

export interface Profile {
  name: L10n;
  title: L10n;
  affiliation: L10n;
  email: string;
  bio: L10n;
  avatarUrl: string;
  socials: {
    twitter?: string;
    github?: string;
    scholar?: string;
    orcid?: string;
  };
  education: Education[];
  experience: Experience[];
  news: NewsItem[];
}
