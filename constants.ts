import { Profile, Paper, CustomCardData } from './types';

export const PROFILE: Profile = {
  name: "Dr. Elena Vance",
  title: "Associate Professor of Computer Science",
  affiliation: "Institute of Advanced Intelligence",
  email: "elena.vance@uni.edu",
  avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  bio: `I research the intersection of Generative AI and Human-Computer Interaction, creating systems that augment rather than replace human creativity. My work focuses on controllable generation, interpretive interfaces, and the cognitive impacts of AI collaboration.`,
  socials: {
    github: "https://github.com",
    scholar: "https://scholar.google.com",
    twitter: "https://twitter.com"
  },
  education: [
    {
      degree: "Ph.D. in Computer Science",
      institution: "Stanford University",
      year: "2018"
    },
    {
      degree: "B.S. in Mathematics",
      institution: "MIT",
      year: "2013"
    }
  ],
  experience: [
    {
      role: "Associate Professor",
      institution: "Institute of Advanced Intelligence",
      period: "2023 - Present"
    },
    {
      role: "Assistant Professor",
      institution: "University of Tech",
      period: "2019 - 2023"
    },
    {
      role: "Postdoctoral Researcher",
      institution: "Google Research",
      period: "2018 - 2019"
    }
  ],
  news: [
    {
      id: "n1",
      date: "Oct 2024",
      title: "Best Paper Award at UIST 2024 for work on Generative UI",
      category: "Award"
    },
    {
      id: "n2",
      date: "Sep 2024",
      title: "Keynote: 'The Future of Co-Creativity' at AI4UI Conference",
      category: "Talk"
    },
    {
      id: "n3",
      date: "Aug 2024",
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