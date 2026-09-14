import {
  Profile,
  Paper,
  CustomCardData,
  ResearchProject,
  ConferencePaper,
  AcademicExperience,
  OtherExperience,
  NewsItem,
  Experience,
} from './types';
import avatarImage from './image/avatar.jpeg';
import scholarData from './data/scholar.json';
import content from './data/content.json';

/* ═══════════════════════════════════════════════
   Google Scholar 引用合并

   引用数由 .github/workflows/update-citations.yml 抓取，写入 data/scholar.json。
   匹配时优先用论文的 scholarPubId，没有就按归一化标题比对（去掉标点、空格与
   大小写，所以 CNKI 与 Scholar 的标题变体仍能对上）。中英两个标题都会试，
   因此中文论文挂在英文标题下也能匹配。
   匹配不上的论文保留自己手填的 citationCount，所以抓取失败绝不会让站点上的
   数字变成空白或 0。
   ═══════════════════════════════════════════════ */

interface ScholarPublication {
  pub_id?: string;
  title?: string;
  citations?: number;
}

const normalizeTitle = (title: string) =>
  title.toLowerCase().replace(/[^0-9a-z\u4e00-\u9fff]/g, '');

const scholarPublications = (scholarData.publications ?? []) as unknown as ScholarPublication[];

const citationsByTitle = new Map<string, number>();
const citationsByPubId = new Map<string, number>();
scholarPublications.forEach((pub) => {
  const citations = pub.citations ?? 0;
  if (pub.title) citationsByTitle.set(normalizeTitle(pub.title), citations);
  if (pub.pub_id) citationsByPubId.set(pub.pub_id, citations);
});

const applyScholarCitations = (papers: Paper[]): Paper[] =>
  papers.map((paper) => {
    if (paper.scholarPubId) {
      const byId = citationsByPubId.get(paper.scholarPubId);
      if (byId !== undefined) return { ...paper, citationCount: byId };
    }
    for (const candidate of [paper.title.zh, paper.title.en]) {
      const live = citationsByTitle.get(normalizeTitle(candidate));
      if (live !== undefined) return { ...paper, citationCount: live };
    }
    return paper;
  });

const scholarProfile = scholarData.profile as unknown as {
  total_citations: number;
  h_index: number;
  i10_index: number;
  citations_per_year: Record<string, number>;
};

export const SCHOLAR_STATS = {
  updated: (scholarData.updated ?? null) as string | null,
  scholarId: scholarData.scholar_id as string,
  totalCitations: scholarProfile.total_citations ?? 0,
  hIndex: scholarProfile.h_index ?? 0,
  i10Index: scholarProfile.i10_index ?? 0,
  citationsPerYear: scholarProfile.citations_per_year ?? {},
};

/* ═══════════════════════════════════════════════
   内容数据

   下面的条目全部来自 data/content.json，用本机的中台改：
   `npm run admin` → http://127.0.0.1:4399/

   分区与字段定义在 admin/schema.mjs，那里是唯一的真相来源；
   手改 JSON 也可以，但要保持结构（id 唯一、双语字段写 {zh, en}）。

   个人简介、社交链接与首页卡片属于低频内容，仍然写在代码里。
   ═══════════════════════════════════════════════ */

export const INITIAL_PAPERS: Paper[] = applyScholarCitations(content.papers as Paper[]);
export const INITIAL_CONFERENCES: ConferencePaper[] = content.conferences as ConferencePaper[];
export const INITIAL_PROJECTS: ResearchProject[] = content.projects as ResearchProject[];
export const INITIAL_ACADEMIC: AcademicExperience[] = content.academic as AcademicExperience[];
export const INITIAL_NEWS: NewsItem[] = content.news as NewsItem[];

/** 「追踪」页的卡片（Markdown 自由文本），同样由中台管理。 */
export const INITIAL_CARDS: CustomCardData[] = (content.cards ?? []) as CustomCardData[];

/** 荣誉奖励、学术著作、系统开发共用 OtherExperience，按 type 区分。 */
export const INITIAL_OTHER_EXPERIENCES: OtherExperience[] = [
  ...(content.awards as OtherExperience[]),
  ...(content.books as OtherExperience[]),
  ...(content.software as OtherExperience[]),
];

/* ═══════════════════════════════════════════════
   个人信息
   ═══════════════════════════════════════════════ */

/**
 * 首页「教育与经历」直接取学习经历表里的学位条目，不再单独维护一份，
 * 避免同一段经历要在两个地方各改一次。
 */
const degreeToExperience = (entry: AcademicExperience): Experience => ({
  role: entry.degree,
  department: entry.department,
  university: entry.university,
  period: entry.period,
  crest: entry.crest,
});

export const PROFILE: Profile = {
  name: { zh: '唐嘉骏', en: 'Jiajun Tang' },
  title: {
    zh: '博士研究生',
    en: 'PhD Student in Communication',
  },
  affiliation: {
    zh: '南京大学新闻传播学院',
    en: 'School of Journalism and Communication, Nanjing University',
  },
  email: 'jiajuntang1101@smail.nju.edu.cn',
  avatarUrl: avatarImage,
  bio: {
    zh: '研究聚焦智能传播与国际传播的交叉领域，致力于构建增强而非替代人类创造力的系统。主要关注人机交互、以人为中心的设计，以及人工智能带来的认知影响。',
    en: 'I research the intersection of Intelligent Communication and International Communication, creating systems that augment rather than replace human creativity. My work focuses on human-computer interaction, human-centered design, and the cognitive impacts of AI.',
  },
  socials: {
    github: 'https://github.com/JIAJUN-TANG',
    scholar: 'https://scholar.google.com/citations?user=cXJ2lKAAAAAJ&hl=en',
    orcid: 'https://orcid.org/0000-0003-2620-2789',
  },
  experience: INITIAL_ACADEMIC.filter((entry) => entry.kind === 'degree').map(degreeToExperience),
  // 学位条目已并入上面的时间线，这里留空即可（渲染时为无内容）。
  education: [],
  news: INITIAL_NEWS,
};
