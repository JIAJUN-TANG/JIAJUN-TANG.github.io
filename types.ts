export enum Tab {
  HOME = 'home',
  PUBLICATIONS = 'publications',
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
  loadingCitation?: boolean;
  type?: 'cn' | 'gs';
}

export interface CustomCardData {
  id: string;
  type: 'markdown' | 'paper-tracker';
  title?: string; // Used for tracker paper title
  content: string; // Markdown content
  citationCount?: number | null;
  loadingCitation?: boolean;
  lastUpdated?: string;
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