import { Profile, Paper, CustomCardData } from './types';
// 使用import导入图片，这样Vite才能正确处理和打包资源
import avatarImage from './image/avatar.jpeg';

export const PROFILE: Profile = {
  name: "Mr. JIAJUN (Griffin) TANG",
  title: "Master's Student in Library, Information & Archival Management",
  affiliation: "School of Information Management, Nanjing University",
  email: "jiajuntang1101@smail.nju.edu.cn",
  avatarUrl: avatarImage,
  bio: `I research the intersection of Intelligent Communication and International Communication, creating systems that augment rather than replace human creativity. My work focuses on human-computer interaction, human-centered design, and the cognitive impacts of AI.`,
  socials: {
    github: "https://github.com/JIAJUN-TANG",
    scholar: "https://scholar.google.com/citations?user=cXJ2lKAAAAAJ&hl=en",
    orcid: "https://orcid.org/0000-0003-2620-2789"
  },
  education: [
    {
      degree: "Exchange Student",
      department: "Graduate Institute of Library, Information & Archival Studies",
      university: "National Chengchi University",
      year: "2025"
    },
    {
      degree: "B.A. in Communication",
      department: "School of Humanities",
      university: "Central South University",
      year: "2019"
    }
  ],
  experience: [
    {
      role: "M.M. In Library, Information & Archival Management",
      department: "School of Information Management",
      university: "Nanjing University",
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
      title: "Conference: Presented at the Forum on Games.",
      category: "News"
    },
    {
      id: "n3",
      date: "Aug 2025",
      title: "One paper is accepted.",
      category: "Publication"
    }
  ]
};

export const INITIAL_PAPERS: Paper[] = [
  {
    id: 'p1',
    title: "数字时代出版编辑人才胜任力模型优化研究",
    authors: ["杨海林", "唐嘉骏", "马子寒", "王鹏涛"],
    venue: "中国数字出版",
    year: 2025,
    url: "https://kns.cnki.net/kcms2/article/abstract?v=35M_ufc67zv1NxqOzzrx3b--0XjL4oIKreoKNHMvJt_wTmXOeGBGlF0xw83mQb9bs7mhSa-vTLf1bz7rIFfTNJsYn9Xhud5mGTCoNPd5WY_wk90CYgMxWZ7cVAcRj_HSFVpQ3YUpIEhFCZwIjJUOsCWX6RtMa4yonefU8MlUneWoq2QPwzRZjCLeHX2dYVfI39KkXEjD4j8=&uniplatform=NZKPT&language=CHS",
    abstract: "新一轮科学和产业革命背景下，出版编辑的人才培养是出版学研究的重点方向之一。文章基于文献内容和招聘数据的双重分析，对出版学业界的胜任力模型要素进行了梳理并呈现，以帮助弥合学业界共同培养人才的信息差。分析结果构建了出版编辑人才胜任力要素6个一级指标，22个二级指标，并提出价值观要求和知识业务能力是出版编辑的核心要素；个人背景和工作经历是出版编辑的基础要素；数字意识和数字能力是出版编辑不可或缺的关键性要素。本研究填补了行业对胜任力模型的空白，为出版企业在职业评定、人才选拔和培养上提供一定参考依据，并帮助学界优化人才培养目标以实现人岗匹配。",
    citationCount: 1,
    type: 'cn'
  },
  {
    id: 'p2',
    title: "“从人工到智能——AI时代的历史与人文探索”工作坊综述",
    authors: ["唐嘉骏", "金伯文"],
    venue: "数字人文研究",
    year: 2025,
    url: "https://kns.cnki.net/kcms2/article/abstract?v=35M_ufc67ztzCaLcjqodBUT-di3nfKoVExJg-8UgZsnh_wUCsHdWxi-KsijdhYuWqdKVjIt3VJTOcpvgkNBVRtIG3t9Nap-c62yXzMOssE0k21Fp-upxQJhiB2-QQJIa4a55OWQrXR1Vz3NN47IbZk5avh4wXeWjzV_jHalCskJGuWKTVfCHtKEf5-9yiTdHWamA7yCdd9d84xeodxcmgQ==&uniplatform=NZKPT&language=CHS",
    abstract: "“从人工到智能——AI时代的历史与人文探索”工作坊聚焦人工智能技术与历史研究的交叉领域，系统探讨了数字史学的理论框架与实践路径。工作坊围绕大语言模型在史料分析、翻译及知识生产中的应用展开深入讨论，揭示了技术赋能下历史研究在效率提升与范式转型方面的潜力。尽管生成式人工智能能够加速文献处理与模式识别，但其“幻觉问题”与缺乏历史语境理解的局限性仍需警惕。圆桌讨论强调，技术应用应服务于学术创新而非替代人文思考，需通过跨学科合作解决数据质量、版权管理及研究主体性等挑战。人工智能可成为拓展历史研究广度的工具，但批判性思维与问题意识仍是学术深度的核心保障，未来需在技术整合与学科传统间寻求平衡。",
    citationCount: 1,
    type: 'cn'
  },
  {
    id: 'p3',
    title: "出版人工智能研究：概念、技术、影响与进路——一项系统性文献综述",
    authors: ["唐嘉骏", "杨海林", "马子寒"],
    venue: "数字出版研究",
    year: 2025,
    url: "https://kns.cnki.net/kcms2/article/abstract?v=35M_ufc67zs14hJ1zFzgMVnmg7RiCWHcyIN5qsii6P08f0ptx2caGbzbeixrEkFyqd-rQARxlVHv5PcT2RgWr92iRspBCCfmnOJ6J2UiDcBsIIlMB0EmrKgmBLXOy4-2c_TADLbnl87jDrymlxDpX1uOIO7Sr9cAohYDnZ0ZsVqVLu91sRQJ-Mj15T_MLxXmdvKR0hUxtR3W7I5wSo0ntQ==&uniplatform=NZKPT&language=CHS",
    abstract: "梳理我国出版人工智能的研究现状，有助于明确出版行业的发展方向，促进出版学科自主知识体系的构建和完善。本研究采用系统性文献综述方法，检索、筛选并分析了522篇相关文献，系统归纳了出版人工智能的核心概念、技术架构、行业影响及应对进路。学界认为智能技术正深度介入出版全流程，尤其是生成式人工智能在内容创作和知识生产中的应用，为出版行业的智能化升级提供了重要支撑。但人工智能也带来伦理和实践问题，生成内容的版权归属和原创性争论尤为突出。出版业应充分发挥在内容资源上的优势，向“知识服务提供商”和“知识把关人”角色转变，探索“出版即服务”模式，努力构建以高质量知识资源为核心的智能出版新生态。",
    citationCount: 1,
    type: 'cn'
  },
  {
    id: 'p4',
    title: "基于行动者网络理论的国产游戏国际传播策略研究——以《黑神话：悟空》为例",
    authors: ["丁佳仪", "唐嘉骏*"],
    venue: "中国数字出版",
    year: 2025,
    url: "https://kns.cnki.net/kcms2/article/abstract?v=35M_ufc67zu1QCH3Fvq3Uh363nj646dMcAVFZYeIUe-XxuWqp26dDyzroN6yXJjUOH3IofKDTj_UdBeYxJ4x91FvO-BK5Oh-rhOamA-CmUUhKvtcwv2KYe4PU4gwNuJ7WbWwRwyGvyvcsYSsG4ZZ_sKaxdQdlWCoUXo4hk1uB_d2QvdBnIrgl5klhoBEyOndhT68w6BkHhen5etMlVc6EQ==&uniplatform=NZKPT&language=CHS",
    abstract: "研究基于行动者网络理论，以国产3A游戏《黑神话：悟空》成功的国际传播为例，深入探讨国产游戏海外推广的策略。在全球化背景下，中国国产游戏在国际传播过程中面临文化差异、市场准入和技术壁垒等多重挑战。通过行动者网络理论的分析框架，文章揭示政府、行业组织、研发和发行企业、出版方、游戏平台、媒体及玩家等多元行动者在游戏海外传播过程中所扮演的角色及其互动机制。特别是中华优秀传统文化和游戏技术，作为异质性行动者，在游戏文化叙事的重塑过程中发挥关键作用，推动游戏的国际化和中华优秀传统文化的深度传播。通过《黑神话：悟空》的案例，文章总结其在技术创新、文化传播和国际市场拓展方面的成功经验，以期为其他国产游戏提供可借鉴的策略和启示。构建多元化的行动者网络，优化转译机制，推动中华优秀传统文化通过游戏进行跨文化传播，这是推动中国国产游戏国际传播成功的重要途径。",
    citationCount: 1,
    type: 'cn'
  },
  {
    id: 'p5',
    title: "Persuasion Strategies of the Major Powers on Social Media: An Analysis of the Metadiscourse from the Chinese and American Spokespersons' Tweets",
    authors: ["Jie Feng", "Jiajun Tang", "Yalong Xiao", "Chengzhang Zhu"],
    venue: "Emerging Media",
    year: 2024,
    url: "https://kns.cnki.net/kcms2/article/abstract?v=35M_ufc67zu1QCH3Fvq3Uh363nj646dMcAVFZYeIUe-XxuWqp26dDyzroN6yXJjUOH3IofKDTj_UdBeYxJ4x91FvO-BK5Oh-rhOamA-CmUUhKvtcwv2KYe4PU4gwNuJ7WbWwRwyGvyvcsYSsG4ZZ_sKaxdQdlWCoUXo4hk1uB_d2QvdBnIrgl5klhoBEyOndhT68w6BkHhen5etMlVc6EQ==&uniplatform=NZKPT&language=CHS",
    abstract: "Despite the significant progress in studies on metadiscourse, scarce attention has been paid to it in the digital context. Social media platforms including Twitter have become arenas for the current Sino-U.S. discourse competition. In this regard, Twitter can be used to observe the diverse usage of metadiscourse by different political figures and uncover the underlying mechanisms. Combining computer-aided metadiscourse extraction and critical discourse analysis, the paper explores metadiscourse markers from the Chinese and American spokespersons’ tweets to reveal their rhetoric and social functions based on Foucault's “power discourse theory.” The results show that the American spokespersons are more inclined to use emotional persuasion and define some specific objects, which is part of the division & rejection system. In contrast, utterances of the Chinese spokespersons constitute a semantic terrain to …",
    citationCount: 2,
    type: 'gs',
    googleScholarId: 'cXJ2lKAAAAAJ:d1gkVwhDpl0C'
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
    title: "出版人工智能研究：概念、技术、影响与进路——一项系统性文献综述",
    content: "Newest Citation",
    citationCount: 1,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'c3',
    type: 'markdown',
    content: `### Upcoming Events\n\n- None`,
    title: "Schedule"
  },
  {
    id: 'c3',
    type: 'markdown',
    content: `**Platform Development**\n\n- [南京大学数智文献平台](https://digitalilab.cn)\n\n- DocuManager\n\n**Available Dataset**\n\n- [Tweets Dataset of 4 Chinese and US spokespersons](https://www.scidb.cn/en/detail?dataSetId=b21b348b814b4419b8dd30b9c7b89809&version=V1)`,
    title: "Public Contributions"
  }
];