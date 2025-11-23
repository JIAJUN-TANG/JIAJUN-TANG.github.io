import { Profile, Paper, CustomCardData } from './types';

export const PROFILE: Profile = {
  name: "Mr. JIAJUN (Griffin) TANG",
  title: "Master's Student in Library, Information & Archival Management",
  affiliation: "School of Information Management, Nanjing University",
  email: "jiajuntang1101@smail.nju.edu.cn",
  avatarUrl: "./image/avatar.jpeg",
  bio: `I research the intersection of Intelligent Communication and International Communication, creating systems that augment rather than replace human creativity. My work focuses on human-computer interaction, human-centered design, and the cognitive impacts of AI.`,
  socials: {
    github: "https://github.com/JIAJUN-TANG",
    scholar: "https://scholar.google.com/citations?user=cXJ2lKAAAAAJ&hl=en",
    orcid: "https://orcid.org/0000-0003-2620-2789"
  },
  education: [
        {
      degree: "Exchange Student",
      institution: "National Chenchi University",
      year: "2025"
    },
    {
      degree: "B.A. in Communication",
      institution: "Central South University",
      year: "2019"
    }
  ],
  experience: [
    {
      role: "Master's Student",
      institution: "School of Information Management, Nanjing University",
      period: "2023 - Present"
    },
  ],
  news: [
    {
      id: "n1",
      date: "Nov 2025",
      title: "南京大学学业奖学金（一等）",
      category: "Award"
    },
    {
      id: "n2",
      date: "Aug 2025",
      title: "Conference: 'The Future of Co-Creativity' at AI4UI Conference",
      category: "News"
    },
    {
      id: "n3",
      date: "Aug 2025",
      title: "New paper on 'LLM Agents in IDEs' accepted to NeurIPS",
      category: "Publication"
    }
  ]
};

export const INITIAL_PAPERS: Paper[] = [
  {
    id: 'p1',
    title: "Large Language Models as Collaborative Agents in Software Engineering",
    authors: ["E. Vance", "J. Doe", "A. Smith"],
    venue: "ICSE",
    year: 2024,
    abstract: "This paper explores how LLMs can be integrated into the IDE to act as proactive pair programmers rather than just code completers.",
    citationCount: null
  },
  {
    id: 'p2',
    title: "Visualizing Attention Mechanisms in Transformer Models",
    authors: ["E. Vance", "K. Lee"],
    venue: "NeurIPS",
    year: 2023,
    abstract: "We propose a novel visualization technique 'AttnFlow' that simplifies the complexity of multi-head attention for non-experts.",
    citationCount: null
  },
  {
    id: 'p3',
    title: "The Ethics of Generative Art: A Survey",
    authors: ["M. Chen", "E. Vance"],
    venue: "CHI",
    year: 2023,
    abstract: "A comprehensive survey of artist opinions on generative models, highlighting key concerns around copyright and style mimicry.",
    citationCount: null
  }
];

export const INITIAL_CARDS: CustomCardData[] = [
  {
    id: 'c1',
    type: 'markdown',
    content: `## Research Philosophy\n\nI believe in **tools for thought**. Technology should expand our mental capacity. \n\n* "The computer is the most remarkable tool that we have ever come up with." - Steve Jobs`,
    title: "Philosophy"
  },
  {
    id: 'c2',
    type: 'paper-tracker',
    title: "Attention Is All You Need",
    content: "Tracking specific seminal papers in the field.",
    citationCount: null,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'c3',
    type: 'markdown',
    content: `### Upcoming Talks\n\n- **Oct 15**: Keynote at AI4UI\n- **Nov 02**: Guest Lecture at Stanford\n\nCheck back for slides!`,
    title: "Schedule"
  }
];