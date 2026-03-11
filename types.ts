export enum Tab {
  HOME = 'home',
  PUBLICATIONS = 'publications',
  EXPERIENCES = 'experiences',
  RESEARCH_NOTES = 'research_notes'
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: number;
  url?: string;
  abstract?: string;
  citationCount?: number | null;
  type?: 'cn' | 'en';
  tags?: { text: string; color: string }[];
  publicationType?: 'authored' | 'contributed';
}

export interface ResearchProject {
  id: string;
  title: string;
  role: string;
  institution: string;
  period: string;
  description?: string;
  status: 'completed' | 'ongoing';
}

export interface ConferencePaper {
  id: string;
  title: string;
  authors: string[];
  conference: string;
  location: string;
  year: number;
  type?: 'oral' | 'poster';
  url?: string;
}

export interface OtherExperience {
  id: string;
  title: string;
  organization: string;
  period: string;
  type: 'award' | 'workshop' | 'certification' | 'other';
  description?: string;
}

export interface CustomCardData {
  id: string;
  type: 'markdown';
  title?: string;
  content: string; // Markdown content
}

export interface Education {
  degree: string;
  department: string;
  university: string;
  year: string;
}

export interface Experience {
  role: string;
  department: string;
  university: string;
  period: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: 'Publication' | 'Talk' | 'Award' | 'News';
  link?: string;
}

export interface Profile {
  name: string;
  title: string;
  affiliation: string;
  email: string;
  bio: string;
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