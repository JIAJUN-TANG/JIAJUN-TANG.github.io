/**
 * 内容字段定义 —— 中台 UI、本地服务器、CI 脚本共用的一份「唯一真相」。
 *
 * 加字段 / 改标签只需要改这里：表单会自动多出一项，校验也跟着走。
 *
 * 字段类型 kind：
 *   id        条目标识（自动生成，一般不用手改）
 *   text      单行文本
 *   textarea  多行文本
 *   l10n      双语文案，展开成「中 / EN」两个输入框；只填一边时另一边自动兜底
 *   l10ntext  双语多行文案（带中 / EN 切换）
 *   number    数字
 *   list      字符串数组（回车添加）
 *   tags      彩色标签数组（文字 + 颜色）
 *   select    单选
 */

/** 各分区的条目 ID 前缀，新增条目时按这个生成 p1 / p2 … */
export const ID_PREFIX = {
  papers: 'p',
  conferences: 'c',
  projects: 'r',
  academic: 'a',
  awards: 'o',
  books: 'o',
  software: 's',
  news: 'n',
  cards: 'c',
};

/** 写进 content.json 的顺序，也是中台左侧栏的顺序。 */
export const ORDER = [
  'papers',
  'conferences',
  'projects',
  'academic',
  'awards',
  'books',
  'software',
  'news',
  'cards',
];

const LANG_OPTIONS = [
  ['cn', '中文'],
  ['en', '英文'],
];

/** 摘要正文的语言，取值是 zh / en（站点按这个决定要不要显示「英文摘要」小标）。 */
const ABSTRACT_LANG_OPTIONS = [
  ['zh', '中文'],
  ['en', '英文'],
];

/**
 * 荣誉奖励 / 学术著作 / 系统开发三张表共用 OtherExperience 类型，
 * 用固定 type 区分；这里写死，界面上不出现该字段。
 */
const OTHER_FIELDS = [
  { key: 'id', label: 'ID', kind: 'id' },
  { key: 'title', label: '名称', kind: 'l10n', required: true },
  { key: 'organization', label: '授予方 / 出版方 / 承担方式', kind: 'l10n' },
  { key: 'period', label: '时间', kind: 'l10n', hint: '如 2025.11 或 2025.11 – 至今' },
  { key: 'description', label: '说明', kind: 'l10n' },
];

export const COLLECTIONS = {
  papers: {
    key: 'papers',
    label: '论文',
    icon: '📄',
    blurb: '论文页的条目。引用数由 Google Scholar 同步覆盖，其余字段以这里为准。',
    titleField: 'title',
    subField: 'venue',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'title', label: '标题', kind: 'l10n', required: true },
      {
        key: 'authors',
        label: '作者',
        kind: 'list',
        hint: '通讯作者在名字后加 *，例如 唐嘉骏*',
      },
      { key: 'venue', label: '期刊 / 会议', kind: 'l10n' },
      { key: 'year', label: '年份', kind: 'number' },
      { key: 'type', label: '语言', kind: 'select', options: LANG_OPTIONS },
      {
        key: 'publicationType',
        label: '署名类型',
        kind: 'select',
        options: [
          ['authored', '署名文章'],
          ['contributed', '参与论文'],
        ],
      },
      {
        key: 'citationCount',
        label: '引用数',
        kind: 'number',
        hint: 'Google Scholar 同步时按标题自动覆盖',
      },
      {
        key: 'tags',
        label: '标签',
        kind: 'tags',
        hint: '如 CSSCI / 北大核心 / IF 2.21，可单独配色',
      },
      { key: 'url', label: '链接', kind: 'text' },
      { key: 'doi', label: 'DOI', kind: 'text', hint: 'ORCID / CrossRef 同步时用来对号入座' },
      { key: 'scholarPubId', label: 'Scholar ID', kind: 'text' },
      { key: 'abstractLang', label: '摘要语言', kind: 'select', options: ABSTRACT_LANG_OPTIONS },
      { key: 'abstract', label: '摘要', kind: 'textarea', full: true },
    ],
  },

  conferences: {
    key: 'conferences',
    label: '学术会议',
    icon: '🎤',
    blurb: '会议报告列表，按年份倒序展示。',
    titleField: 'title',
    subField: 'conference',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'title', label: '题目', kind: 'l10n', required: true },
      { key: 'role', label: '角色', kind: 'l10n', hint: '第一作者 / 通讯作者 …' },
      { key: 'conference', label: '会议名称', kind: 'l10n' },
      { key: 'location', label: '地点', kind: 'l10n' },
      { key: 'year', label: '年份', kind: 'number' },
      {
        key: 'type',
        label: '形式',
        kind: 'select',
        options: [
          ['oral', '口头报告'],
          ['poster', '海报'],
        ],
      },
      { key: 'award', label: '获奖', kind: 'l10n' },
      { key: 'url', label: '链接', kind: 'text' },
    ],
  },

  projects: {
    key: 'projects',
    label: '科研项目',
    icon: '🔬',
    blurb: '在研项目排在已结题之前。',
    titleField: 'title',
    subField: 'institution',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'title', label: '项目名称', kind: 'l10n', required: true },
      { key: 'role', label: '角色', kind: 'l10n' },
      { key: 'institution', label: '资助机构', kind: 'l10n' },
      { key: 'period', label: '时间', kind: 'l10n' },
      {
        key: 'status',
        label: '状态',
        kind: 'select',
        options: [
          ['ongoing', '在研'],
          ['completed', '已结题'],
        ],
      },
      { key: 'description', label: '说明', kind: 'l10n' },
    ],
  },

  academic: {
    key: 'academic',
    label: '学习经历',
    icon: '🎓',
    blurb:
      '首页「教育与经历」时间线取这里 kind = degree 的条目；交换、暑校只出现在经历页。',
    titleField: 'degree',
    subField: 'university',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'degree', label: '学位 / 身份', kind: 'l10n', required: true },
      { key: 'department', label: '院系', kind: 'l10n' },
      { key: 'university', label: '学校', kind: 'l10n' },
      { key: 'period', label: '时间', kind: 'l10n' },
      { key: 'location', label: '地点', kind: 'l10n' },
      { key: 'detail', label: '备注', kind: 'l10n', hint: '导师、均分、排名等' },
      {
        key: 'kind',
        label: '类型',
        kind: 'select',
        options: [
          ['degree', '学位'],
          ['exchange', '交换'],
          ['summer', '暑校'],
        ],
      },
      {
        key: 'crest',
        label: '校徽',
        kind: 'select',
        options: [
          ['nju', '南京大学'],
          ['csu', '中南大学'],
          ['nccu', '政治大学（中国台湾）'],
          ['nus', '新加坡国立大学'],
          ['', '无'],
        ],
      },
    ],
  },

  awards: {
    key: 'awards',
    label: '荣誉奖励',
    icon: '🏅',
    blurb: '经历页「荣誉奖励」区块。',
    titleField: 'title',
    subField: 'organization',
    typeFixed: 'award',
    fields: OTHER_FIELDS,
  },

  books: {
    key: 'books',
    label: '学术著作',
    icon: '📚',
    blurb: '经历页「学术著作」区块。',
    titleField: 'title',
    subField: 'organization',
    typeFixed: 'book',
    fields: OTHER_FIELDS,
  },

  software: {
    key: 'software',
    label: '系统开发',
    icon: '🛠️',
    blurb: '经历页「系统开发」区块（平台、开源项目）。',
    titleField: 'title',
    subField: 'organization',
    typeFixed: 'development',
    fields: OTHER_FIELDS,
  },

  news: {
    key: 'news',
    label: '首页动态',
    icon: '📰',
    blurb: '首页右下角动态列表，最新的排最前面。',
    titleField: 'title',
    subField: 'date',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'date', label: '日期', kind: 'l10n' },
      { key: 'title', label: '内容', kind: 'l10n', required: true },
      {
        key: 'category',
        label: '分类',
        kind: 'select',
        options: [
          ['Publication', '论文'],
          ['Talk', '报告'],
          ['Award', '奖励'],
          ['News', '动态'],
        ],
      },
      { key: 'link', label: '链接', kind: 'text' },
    ],
  },

  /** 「追踪」页的卡片：中英各一份 Markdown，自由排版。 */
  cards: {
    key: 'cards',
    label: '追踪卡片',
    icon: '🧭',
    blurb:
      '「追踪」页的卡片，内容就是一段 Markdown（标题、加粗、列表、链接都能写），中英各一份。',
    titleField: 'title',
    subField: 'content',
    typeFixed: 'markdown',
    fields: [
      { key: 'id', label: 'ID', kind: 'id' },
      { key: 'title', label: '卡片标题', kind: 'l10n', required: true },
      {
        key: 'content',
        label: '内容',
        kind: 'l10ntext',
        rows: 14,
        mono: true,
        full: true,
        required: true,
        hint: 'Markdown：# 标题、**加粗**、- 列表、[文字](链接)',
      },
    ],
  },
};

/** 给界面用的一份纯数据（函数不外传）。 */
export const serializableSchema = () => ({
  order: ORDER,
  collections: COLLECTIONS,
  prefix: ID_PREFIX,
});

/** 该分区里下一个可用的 ID，例如 papers 已有 p1 p3 → p4。 */
export function nextId(collectionKey, entries) {
  const prefix = ID_PREFIX[collectionKey] ?? 'x';
  const used = new Set(
    (entries ?? []).map((e) => String(e?.id ?? '')).filter(Boolean),
  );
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const id of used) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  let n = max + 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** 标题里去掉标点空格与大小写，用于跨来源比对同一篇论文。 */
export const normTitle = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^0-9a-z\u4e00-\u9fff]/g, '');

/** 论文对象 → 用于比对的「主标题」。中英标题都会试。 */
export const paperTitles = (paper) =>
  [paper?.title?.zh, paper?.title?.en, typeof paper?.title === 'string' ? paper.title : '']
    .filter(Boolean)
    .map(normTitle);

/** 归一化 DOI：去掉 https://doi.org/ 前缀、doi: 前缀与大小写差异。 */
export const normDoi = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '');
