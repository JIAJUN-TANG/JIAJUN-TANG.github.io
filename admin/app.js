/**
 * 内容中台前端 —— 原生 JS，无构建步骤。
 *
 * 数据流很简单：/api/state 拉一份 content.json 进内存当草稿（state.content），
 * 所有编辑都改这份草稿，点「保存」才 PUT /api/save。
 * 编辑器直接绑定字段对象，所以输入时不会整页重渲染、不丢焦点。
 */

const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/* ── 状态 ───────────────────────────────────────────────────── */

/** 博客不是 content.json 里的分区，而是 blog/ 下的 Markdown 文件。 */
const BLOG_KEY = '__blog';

const state = {
  schema: null,
  content: null,
  counts: {},
  posts: [],
  backups: [],
  config: {},
  git: {},
  active: 'papers',
  open: new Set(),
  filter: '',
  dirty: false,
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`接口返回了非 JSON：${text.slice(0, 160)}`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── 提示条 ─────────────────────────────────────────────────── */

function toast(message, kind = '') {
  const stack = $('#toasts');
  const node = el('div', { class: `toast ${kind}`, text: message });
  stack.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .2s, transform .2s';
    node.style.opacity = '0';
    node.style.transform = 'translateY(6px)';
    setTimeout(() => node.remove(), 220);
  }, kind === 'bad' ? 6000 : 3200);
}

/* ── 小工具 ─────────────────────────────────────────────────── */

/** 双语字段取一个能看的字符串。 */
const displayText = (v) => {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return String(v.zh || v.en || '');
};

const textOf = (v) => (typeof v === 'string' ? v : displayText(v));

function nextId(key, entries) {
  const prefix = state.schema.prefix[key] ?? 'x';
  const used = new Set((entries ?? []).map((e) => String(e?.id ?? '')).filter(Boolean));
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

const openKey = (collection, id) => `${collection}:${id}`;

/* ── 弹窗 ───────────────────────────────────────────────────── */

/**
 * 弹窗是**可叠加**的：确认框、选择框经常从另一个弹窗里弹出来
 * （比如「编辑文章」里删素材要二次确认）。
 * 早先的实现在打开前会清空 #modal-root，结果一开确认框就把外面那个弹窗
 * 连同未保存的编辑内容一起抹掉。现在每个弹窗只管自己那对 mask + modal，
 * 关掉时只摘掉自己，DOM 顺序天然保证后开的在上面。
 */
const modalStack = [];

function openModal({ title, subtitle, body, footer, width, onDismiss }) {
  const root = $('#modal-root');

  const mask = el('div', { class: 'modal-mask' });
  const modal = el('div', { class: 'modal' }, [
    el('div', { class: 'modal-head' }, [
      el('h2', {}, [title]),
      subtitle ? el('span', { class: 'sub' }, [subtitle]) : null,
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn ghost sm', id: 'modal-x' }, ['关闭']),
    ]),
  ]);
  if (width) modal.style.width = width;

  const bodyEl = el('div', { class: 'modal-body' });
  if (body) bodyEl.appendChild(body);
  modal.appendChild(bodyEl);
  if (footer) modal.appendChild(el('div', { class: 'modal-foot' }, footer));

  const entry = { mask, modal };
  modalStack.push(entry);
  root.append(mask, modal);
  root.classList.add('show');

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    const at = modalStack.indexOf(entry);
    if (at >= 0) modalStack.splice(at, 1);
    mask.remove();
    modal.remove();
    if (!modalStack.length) root.classList.remove('show');
    onDismiss?.();
  };
  mask.onclick = close;
  $('#modal-x', modal).onclick = close;

  return { close, body: bodyEl, modal };
}

function confirmModal({ title, message, confirmText = '确认', danger = false, extra }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      m.close();
      resolve(v);
    };
    const m = openModal({
      title,
      body: el('div', {}, [
        el('div', { class: `note ${danger ? 'bad' : ''}` }, [message]),
        extra ?? null,
      ]),
      footer: [
        el('button', { class: 'btn', onClick: () => finish(false) }, ['取消']),
        el('div', { class: 'grow' }),
        el('button', { class: `btn ${danger ? 'danger' : 'primary'}`, onClick: () => finish(true) }, [confirmText]),
      ],
      onDismiss: () => finish(false),
    });
  });
}

/**
 * 单选弹窗：resolve 选中项的 value，点取消 / 关掉则 resolve null。
 * 第一个选项默认是主操作。用于「提交哪些改动」「还有文件没提交怎么办」这类岔路口。
 */
function chooseModal({ title, subtitle, options, cancelText = '取消' }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      m.close();
      resolve(v);
    };
    const m = openModal({
      title,
      subtitle,
      body: el(
        'div',
        { class: 'choices' },
        options.map((o, i) =>
          el(
            'button',
            {
              class: `choice${i === 0 ? ' primary' : ''}${o.danger ? ' danger' : ''}`,
              onClick: () => finish(o.value),
            },
            [el('div', { class: 't' }, [o.label]), o.desc ? el('div', { class: 'd' }, [o.desc]) : null],
          ),
        ),
      ),
      footer: [el('div', { class: 'grow' }), el('button', { class: 'btn', onClick: () => finish(null) }, [cancelText])],
      onDismiss: () => finish(null),
    });
  });
}

/* ── 顶栏 / 侧栏 ────────────────────────────────────────────── */

function renderGit() {
  const g = state.git || {};
  const parts = [g.branch || '—'];
  if (g.ahead) parts.push(`↑${g.ahead}`);
  if (g.behind) parts.push(`↓${g.behind}`);
  const n = (g.changed || []).length;
  if (n) parts.push(`${n} 项改动`);
  $('#git-text').textContent = parts.join(' · ');
  $('#git-chip').className = `chip ${state.dirty ? 'dirty' : n ? '' : 'ok'}`;
  $('#git-chip').title = state.dirty ? '有未保存的改动' : n ? '有未提交的改动' : '工作区干净';
}

function setDirty(dirty) {
  state.dirty = dirty;
  $('#savebar').classList.toggle('show', dirty);
  renderGit();
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';

  const item = (key, icon, label, count) =>
    el('button', {
      class: `nav-item ${state.active === key ? 'active' : ''}`,
      onClick: () => {
        state.active = key;
        state.filter = '';
        renderNav();
        renderMain();
      },
    }, [
      el('span', { class: 'ico' }, [icon]),
      el('span', {}, [label]),
      el('span', { class: 'count' }, [String(count)]),
    ]);

  for (const key of state.schema.order) {
    const def = state.schema.collections[key];
    nav.appendChild(item(key, def.icon, def.label, state.content[key]?.length ?? 0));
  }

  // 博客是 blog/ 下的 Markdown 文件，不在 content.json 里，单独挂在最后。
  nav.appendChild(item(BLOG_KEY, '📝', '博客', state.posts.length));
}

/* ── 字段编辑器 ─────────────────────────────────────────────── */

function l10nEditor(obj, onChange, { multiline = false, rows = 4, mono = false } = {}) {
  const grid = el('div', { class: 'l10n' });
  for (const [code, label] of [['zh', '中文'], ['en', 'EN']]) {
    const node = multiline
      ? el('textarea', { class: `textarea${mono ? ' mono' : ''}`, rows })
      : el('input', { class: 'input' });
    node.value = obj[code] ?? '';
    node.oninput = () => {
      obj[code] = node.value;
      onChange();
    };
    grid.appendChild(el('div', {}, [el('span', { class: 'tag-mini' }, [label]), node]));
  }
  return grid;
}

function chipEditor(values, onChange, { colored = false } = {}) {
  const wrap = el('div', { class: 'chips' });
  const input = el('input', { class: 'bare', placeholder: '输入后回车添加' });

  const paint = () => {
    wrap.querySelectorAll('.chipx').forEach((n) => n.remove());
    values.forEach((v, i) => {
      const chip = el('span', { class: 'chipx' });
      if (colored) {
        const picker = el('input', { type: 'color', value: v.color || '#4A5F7E', title: '标签颜色' });
        picker.oninput = () => {
          values[i].color = picker.value;
          onChange();
        };
        chip.appendChild(picker);
      }
      chip.appendChild(el('span', {}, [colored ? v.text : v]));
      chip.appendChild(
        el('button', { type: 'button', title: '移除', onClick: () => { values.splice(i, 1); onChange(); paint(); } }, ['×']),
      );
      wrap.insertBefore(chip, input);
    });
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      if (colored) values.push({ text: t, color: '#4A5F7E' });
      else values.push(t);
      input.value = '';
      onChange();
      paint();
    } else if (e.key === 'Backspace' && !input.value && values.length) {
      values.pop();
      onChange();
      paint();
    }
  };

  // input 必须先挂进 wrap，paint() 才能用 insertBefore(chip, input) 插到它前面
  wrap.appendChild(input);
  paint();
  return wrap;
}

function fieldNode(collectionKey, entry, field, onChange) {
  const wrap = el('div', { class: `field ${field.full ? 'full' : ''}` });
  const label = el('label', {}, [field.label]);
  if (field.hint) label.appendChild(el('span', { class: 'hint' }, [`· ${field.hint}`]));
  wrap.appendChild(label);

  switch (field.kind) {
    case 'id': {
      wrap.appendChild(el('input', { class: 'input', value: entry.id ?? '', readonly: 'readonly' }));
      break;
    }
    case 'text':
    case 'textarea': {
      const node =
        field.kind === 'textarea'
          ? el('textarea', {
              class: `textarea${field.mono ? ' mono' : ''}`,
              rows: field.rows ?? 4,
            })
          : el('input', { class: 'input' });
      node.value = entry[field.key] ?? '';
      node.oninput = () => {
        entry[field.key] = node.value;
        onChange();
      };
      wrap.appendChild(node);
      break;
    }
    case 'number': {
      const node = el('input', { class: 'input', type: 'number' });
      node.value = entry[field.key] ?? '';
      node.oninput = () => {
        if (node.value === '') delete entry[field.key];
        else entry[field.key] = Number(node.value);
        onChange();
      };
      wrap.appendChild(node);
      break;
    }
    case 'l10n': {
      if (!entry[field.key] || typeof entry[field.key] !== 'object') entry[field.key] = { zh: '', en: '' };
      wrap.appendChild(l10nEditor(entry[field.key], onChange));
      break;
    }
    case 'l10ntext': {
      if (!entry[field.key] || typeof entry[field.key] !== 'object') entry[field.key] = { zh: '', en: '' };
      wrap.appendChild(
        l10nEditor(entry[field.key], onChange, {
          multiline: true,
          rows: field.rows ?? 4,
          mono: !!field.mono,
        }),
      );
      break;
    }
    case 'list': {
      if (!Array.isArray(entry[field.key])) entry[field.key] = entry[field.key] ? [entry[field.key]] : [];
      wrap.appendChild(chipEditor(entry[field.key], onChange));
      break;
    }
    case 'tags': {
      if (!Array.isArray(entry[field.key])) entry[field.key] = [];
      wrap.appendChild(chipEditor(entry[field.key], onChange, { colored: true }));
      break;
    }
    case 'select': {
      const node = el('select', { class: 'select' });
      node.appendChild(el('option', { value: '' }, ['（未设置）']));
      for (const [value, text] of field.options) node.appendChild(el('option', { value }, [text]));
      node.value = entry[field.key] ?? '';
      node.onchange = () => {
        if (node.value) entry[field.key] = node.value;
        else delete entry[field.key];
        onChange();
      };
      wrap.appendChild(node);
      break;
    }
    default:
      wrap.appendChild(el('div', { class: 'note' }, [`未支持的字段类型：${field.kind}`]));
  }
  return wrap;
}

/* ── 条目卡片 ───────────────────────────────────────────────── */

function miniPills(collectionKey, entry) {
  const box = el('div', { class: 'mini' });
  if (collectionKey === 'papers') {
    if (entry.citationCount) box.appendChild(el('span', { class: 'pill on' }, [`${entry.citationCount} 次引用`]));
    if (entry.publicationType === 'contributed') box.appendChild(el('span', { class: 'pill' }, ['参与']));
    for (const t of entry.tags ?? []) box.appendChild(el('span', { class: 'pill', style: { color: t.color, background: `${t.color}1a` } }, [t.text]));
  } else if (collectionKey === 'projects') {
    const on = entry.status === 'ongoing';
    box.appendChild(el('span', { class: `pill ${on ? 'on' : 'done'}` }, [on ? '在研' : '已结题']));
  } else if (collectionKey === 'academic') {
    const map = { degree: '学位', exchange: '交换', summer: '暑校' };
    if (entry.kind) box.appendChild(el('span', { class: 'pill' }, [map[entry.kind] ?? entry.kind]));
    if (entry.crest) box.appendChild(el('span', { class: 'pill' }, [entry.crest]));
  } else if (collectionKey === 'news') {
    if (entry.category) box.appendChild(el('span', { class: 'pill' }, [entry.category]));
  } else if (collectionKey === 'conferences') {
    if (entry.year) box.appendChild(el('span', { class: 'pill' }, [String(entry.year)]));
  }
  return box;
}

function renderEntry(collectionKey, entry, index, list) {
  const def = state.schema.collections[collectionKey];
  const key = openKey(collectionKey, entry.id);
  const isOpen = state.open.has(key);
  const card = el('div', { class: `entry ${isOpen ? 'open' : ''}` });

  const head = el('div', { class: 'entry-head' }, [
    el('span', { class: 'caret' }, ['▸']),
    el('span', { class: 'id' }, [entry.id]),
    el('div', { class: 'titling' }, [
      el('div', { class: 't1' }, [textOf(entry[def.titleField]) || '（未命名）']),
      el('div', { class: 't2' }, [textOf(entry[def.subField]) || '—']),
    ]),
    miniPills(collectionKey, entry),
  ]);
  head.onclick = () => {
    if (isOpen) state.open.delete(key);
    else state.open.add(key);
    renderMain();
  };
  card.appendChild(head);

  if (!isOpen) return card;

  const body = el('div', { class: 'entry-body' });
  const grid = el('div', { class: 'grid' });
  for (const field of def.fields) {
    grid.appendChild(fieldNode(collectionKey, entry, field, () => setDirty(true)));
  }
  body.appendChild(grid);

  body.appendChild(
    el('div', { class: 'entry-foot' }, [
      el('button', { class: 'btn sm', disabled: index === 0 ? 'disabled' : null, onClick: () => { const t = list[index - 1]; list[index - 1] = list[index]; list[index] = t; setDirty(true); renderMain(); } }, ['↑ 上移']),
      el('button', { class: 'btn sm', disabled: index === list.length - 1 ? 'disabled' : null, onClick: () => { const t = list[index + 1]; list[index + 1] = list[index]; list[index] = t; setDirty(true); renderMain(); } }, ['↓ 下移']),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn sm danger', onClick: () => removeEntry(collectionKey, index, entry) }, ['删除']),
    ]),
  );
  card.appendChild(body);
  return card;
}

async function removeEntry(collectionKey, index, entry) {
  const def = state.schema.collections[collectionKey];
  const ok = await confirmModal({
    title: `删除这条${def.label}？`,
    message: `「${textOf(entry[def.titleField]) || entry.id}」将从列表中移除。保存前都还能撤销（不保存直接刷新即可恢复）。`,
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  state.content[collectionKey].splice(index, 1);
  state.open.delete(openKey(collectionKey, entry.id));
  setDirty(true);
  renderMain();
  renderNav();
}

/* ── 主区 ───────────────────────────────────────────────────── */

function renderMain() {
  const key = state.active;
  if (key === BLOG_KEY) return renderBlog();
  const def = state.schema.collections[key];
  const list = state.content[key] ?? [];
  const main = $('#main');
  main.innerHTML = '';

  main.appendChild(
    el('div', { class: 'page-head' }, [
      el('div', {}, [el('h1', {}, [`${def.icon} ${def.label}`]), el('p', {}, [def.blurb ?? ''])]),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn primary', onClick: () => addEntry(key) }, ['＋ 新增']),
    ]),
  );

  if (list.length > 6) {
    const search = el('input', { class: 'input', placeholder: `在 ${list.length} 条里筛选…`, style: { marginBottom: '14px', maxWidth: '340px' } });
    search.value = state.filter;
    search.oninput = () => {
      state.filter = search.value;
      renderList();
    };
    main.appendChild(search);
  }

  const holder = el('div', { id: 'list-holder' });
  main.appendChild(holder);
  renderList();

  function renderList() {
    const holderEl = $('#list-holder');
    if (!holderEl) return;
    holderEl.innerHTML = '';
    const q = state.filter.trim().toLowerCase();
    const items = list
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !q || JSON.stringify(entry).toLowerCase().includes(q));

    if (!items.length) {
      holderEl.appendChild(
        el('div', { class: 'empty' }, [
          list.length ? '没有匹配的条目。' : `「${def.label}」还是空的，点右上角「＋ 新增」加第一条。`,
        ]),
      );
      return;
    }
    const wrap = el('div', { class: 'list' });
    for (const { entry, index } of items) wrap.appendChild(renderEntry(key, entry, index, list));
    holderEl.appendChild(wrap);
  }
}

/* ── 博客 ───────────────────────────────────────────────────── */

/** 把文件的 ISO 时间戳格式化成「2026-09-13 23:54」；取不到就返回空串。 */
function formatStamp(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 只拉取文章列表，不动界面。失败时保留已有数据（不清零），并留下日志。 */
async function loadPosts() {
  try {
    state.posts = (await api('/api/blog')).posts ?? [];
  } catch (e) {
    console.warn('[admin] 读取 blog/ 失败：', e.message);
  }
}

/** 拉列表并重绘左侧导航（侧栏计数跟着变）。 */
async function refreshPosts() {
  await loadPosts();
  renderNav();
}

function renderBlog() {
  const main = $('#main');
  main.innerHTML = '';

  main.appendChild(
    el('div', { class: 'page-head' }, [
      el('div', {}, [
        el('h1', {}, ['📝 博客']),
        el('p', {}, ['每篇文章是 blog/ 目录下的一个 Markdown 文件，保存后站点构建时会自动收录。']),
      ]),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn primary', onClick: () => openPostEditor(null) }, ['＋ 写一篇']),
    ]),
  );

  if (!state.posts.length) {
    main.appendChild(el('div', { class: 'empty' }, ['还没有文章。点右上角「＋ 写一篇」开始。']));
    return;
  }

  const list = el('div', { class: 'list' });

  for (const post of state.posts) {
    list.appendChild(
      el('div', { class: 'entry' }, [
        el('div', { class: 'entry-head' }, [
          el('div', { class: 'titling' }, [
            el('div', { class: 't1' }, [post.title]),
            el('div', { class: 't2' }, [post.summary || '（没有摘要）']),
          ]),
          el('div', { class: 'mini' }, [
            el('span', { class: 'pill' }, [`${post.slug}.md`]),
            post.date ? el('span', { class: 'pill' }, [post.date]) : null,
            post.lang ? el('span', { class: 'pill on' }, [post.lang === 'zh' ? '中文' : 'EN']) : null,
            ...(post.tags ?? []).map((tag) => el('span', { class: 'pill' }, [tag])),
          ]),
        ]),
        el('div', { class: 'entry-foot inset' }, [
          el('button', { class: 'btn sm primary', onClick: () => openPostEditor(post.slug) }, ['编辑']),
          el('button', { class: 'btn sm danger', onClick: () => removePost(post) }, ['删除']),
          el('div', { class: 'grow' }),
          el('span', { class: 'meta' }, [
            `${(post.bytes / 1024).toFixed(1)} KB`,
            el('span', { class: 'sep', 'aria-hidden': 'true' }, ['·']),
            `改于 ${formatStamp(post.mtime)}`,
          ]),
        ]),
      ]),
    );
  }

  main.appendChild(list);
}

/** 编辑既有文章（传 slug）或新建一篇（传 null）。 */
function openPostEditor(slug) {
  const isNew = !slug;
  let post = {
    slug: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    tags: [],
    lang: 'zh',
    body: '',
  };

  const build = () => {
    const slugInput = el('input', { class: 'input', placeholder: 'how-this-site-works' });
    slugInput.value = post.slug;
    const titleInput = el('input', { class: 'input', placeholder: '文章标题' });
    titleInput.value = post.title;
    const dateInput = el('input', { class: 'input', placeholder: '2026-09-13' });
    dateInput.value = post.date ?? '';
    const summaryInput = el('input', { class: 'input', placeholder: '一句话摘要，显示在列表里' });
    summaryInput.value = post.summary ?? '';
    const tagsInput = el('input', { class: 'input', placeholder: '建站, 前端, 工具' });
    tagsInput.value = (post.tags ?? []).join(', ');
    const langSelect = el('select', { class: 'select' }, [
      el('option', { value: '' }, ['不标注']),
      el('option', { value: 'zh' }, ['中文']),
      el('option', { value: 'en' }, ['English']),
    ]);
    langSelect.value = post.lang ?? '';
    const bodyArea = el('textarea', { class: 'textarea blog-editor', placeholder: '正文，Markdown 格式…' });
    bodyArea.value = post.body ?? '';

    const saveBtn = el('button', { class: 'btn primary' }, [isNew ? '创建' : '保存']);

    // 素材挂在「已落盘的文件名」上：没保存过的文章还没有目录可放。
    const assets = assetPanel({
      getSlug: () => (isNew ? null : slug),
      slugInput,
      bodyArea,
    });

    const modal = openModal({
      title: isNew ? '写一篇' : `编辑：${post.title}`,
      subtitle: isNew ? '新文章会写成 blog/<文件名>.md' : `blog/${post.slug}.md`,
      width: '920px',
      body: el('div', { class: 'grid' }, [
        el('div', { class: 'field' }, [
          el('label', {}, ['文件名', el('span', { class: 'hint' }, ['英文小写与连字符，改它会重命名文件'])]),
          slugInput,
        ]),
        el('div', { class: 'field' }, [el('label', {}, ['日期']), dateInput]),
        el('div', { class: 'field' }, [el('label', {}, ['标题']), titleInput]),
        el('div', { class: 'field' }, [el('label', {}, ['语言']), langSelect]),
        el('div', { class: 'field full' }, [el('label', {}, ['摘要']), summaryInput]),
        el('div', { class: 'field full' }, [el('label', {}, ['标签', el('span', { class: 'hint' }, ['逗号分隔'])]), tagsInput]),
        el('div', { class: 'field full' }, [
          el('label', {}, ['正文', el('span', { class: 'hint' }, ['Markdown；不用再写一级标题，页面标题取自上面的「标题」；粘贴截图会自动上传'])]),
          bodyArea,
        ]),
        assets,
      ]),
      footer: [
        el('button', { class: 'btn', onClick: () => modal.close() }, ['取消']),
        el('div', { class: 'grow' }),
        saveBtn,
      ],
    });

    saveBtn.onclick = async () => {
      saveBtn.disabled = 'disabled';
      try {
        const r = await api('/api/blog/save', {
          method: 'POST',
          body: {
            slug: slugInput.value.trim(),
            originalSlug: isNew ? null : slug,
            title: titleInput.value,
            date: dateInput.value.trim(),
            summary: summaryInput.value,
            tags: tagsInput.value.split(',').map((s) => s.trim()).filter(Boolean),
            lang: langSelect.value,
            body: bodyArea.value,
          },
        });
        toast(`已保存 blog/${r.slug}.md`, 'ok');
        modal.close();
        await refreshPosts();
        renderMain();
      } catch (e) {
        toast(`保存失败：${e.message}`, 'bad');
      } finally {
        saveBtn.disabled = null;
      }
    };
  };

  if (isNew) {
    build();
    return;
  }

  api('/api/blog/read', { method: 'POST', body: { slug } })
    .then((r) => {
      post = r.post;
      build();
    })
    .catch((e) => toast(`读取失败：${e.message}`, 'bad'));
}

async function removePost(post) {
  const ok = await confirmModal({
    title: `删除《${post.title}》？`,
    message: `会删除 blog/${post.slug}.md。删之前会自动备份到 data/backups/blog/，但站点上这篇文章就消失了。`,
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  try {
    await api('/api/blog/delete', { method: 'POST', body: { slug: post.slug } });
    toast(`已删除 ${post.slug}.md`, 'ok');
    await refreshPosts();
    renderMain();
  } catch (e) {
    toast(`删除失败：${e.message}`, 'bad');
  }
}

/* ── 文章素材（blog/<slug>/） ─────────────────────────────────── */

const ASSET_ACCEPT = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp',
  'mp4', 'webm', 'ogv', 'mov', 'm4v',
  'mp3', 'wav', 'm4a', 'ogg', 'oga', 'flac', 'aac',
  'pdf',
].map((e) => `.${e}`).join(',');

const ASSET_GLYPH = { image: '🖼', video: '🎬', audio: '🎵', pdf: '📄', file: '📎' };
const ASSET_LABEL = { image: '图片', video: '视频', audio: '音频', pdf: 'PDF', file: '文件' };

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** FileReader → 纯 base64（服务端只认载荷，不认 data URL 前缀）。 */
const readAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;,]+;base64,/, ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });

/**
 * 文章素材面板：拖拽 / 选择 / 粘贴上传，列出现有素材，一键把 Markdown 插到光标处。
 *
 * @param getSlug  返回**已落盘**的文件名（没保存过的文章返回 null）
 * @param bodyArea 正文 textarea，用来插入 `![](name)`
 */
function assetPanel({ getSlug, slugInput, bodyArea }) {
  const input = el('input', {
    type: 'file',
    multiple: 'multiple',
    accept: ASSET_ACCEPT,
    style: { display: 'none' },
  });

  const drop = el('div', { class: 'dropzone' }, [
    el('div', { class: 'dz-t' }, ['把文件拖到这里，或']),
    el('button', { class: 'btn sm primary', type: 'button', onClick: () => input.click() }, ['选择文件']),
    el('div', { class: 'dz-d' }, [
      `支持 ${ASSET_ACCEPT.split(',').length} 种格式（图片 / 视频 / 音频 / PDF），单个不超过 8MB`,
    ]),
  ]);

  const grid = el('div', { class: 'asset-grid' });
  const warn = el('div', { class: 'note warn', style: { display: 'none' } });

  /** 在光标处插入一段 Markdown，前后补到「空一行」，插完光标落在片段之后。 */
  function insertMarkdown(md) {
    const start = bodyArea.selectionStart ?? bodyArea.value.length;
    const end = bodyArea.selectionEnd ?? start;
    const before = bodyArea.value.slice(0, start);
    const after = bodyArea.value.slice(end);

    // 目标：片段前后各空一行。已经空好了就不动，只有一个换行就再补一个。
    const pad = (text, where) => {
      if (!text) return '';
      const edge = where === 'before' ? /(\n\n|\n)$/.exec(text) : /^(\n\n|\n)/.exec(text);
      if (!edge) return '\n\n';
      return edge[1] === '\n' ? '\n' : '';
    };
    const lead = pad(before, 'before');
    const tail = pad(after, 'after');

    bodyArea.value = `${before}${lead}${md}${tail}${after}`;
    const caret = (before + lead + md).length;
    bodyArea.focus();
    bodyArea.setSelectionRange(caret, caret);
  }

  async function upload(files, { insert = false } = {}) {
    const list = [...files].filter(Boolean);
    if (!list.length) return;
    const slug = getSlug();
    if (!slug) return toast('先把文章保存一次，素材才有地方放。', 'warn');

    for (const file of list) {
      try {
        const base64 = await readAsBase64(file);
        const r = await api('/api/blog/asset/save', {
          method: 'POST',
          body: { slug, name: file.name, base64 },
        });
        if (insert) insertMarkdown(r.markdown);
        toast(`已上传 ${r.name}（${formatBytes(r.bytes)}）`, 'ok');
      } catch (e) {
        toast(`${file.name} 上传失败：${e.message}`, 'bad');
      }
    }
    await refresh();
  }

  function assetCard(slug, asset) {
    const thumb = el('div', { class: 'asset-thumb' });
    // 子目录要逐段编码，整串 encodeURIComponent 会把 `/` 也编掉。
    const path = asset.name.split('/').map(encodeURIComponent).join('/');
    const url = `/blog/${encodeURIComponent(slug)}/${path}`;
    if (asset.kind === 'image') {
      thumb.appendChild(el('img', { src: url, alt: asset.name, loading: 'lazy' }));
    } else if (asset.kind === 'video') {
      thumb.appendChild(el('video', { src: url, muted: 'muted', preload: 'metadata' }));
    } else {
      thumb.appendChild(el('div', { class: 'asset-glyph' }, [ASSET_GLYPH[asset.kind] ?? '📎']));
    }

    return el('div', { class: 'asset-card' }, [
      thumb,
      el('div', { class: 'asset-info' }, [
        el('div', { class: 'asset-name', title: asset.name }, [asset.name]),
        el('div', { class: 'asset-sub' }, [
          `${ASSET_GLYPH[asset.kind] ?? '📎'} ${ASSET_LABEL[asset.kind] ?? '文件'} · ${formatBytes(asset.size)}`,
          asset.used ? el('span', { class: 'pill on' }, ['正文已引用']) : el('span', { class: 'pill' }, ['未引用']),
        ]),
      ]),
      el('div', { class: 'asset-actions' }, [
        el(
          'button',
          {
            class: 'btn sm',
            type: 'button',
            onClick: () => {
              insertMarkdown(`![说明](${asset.name})`);
              toast('已插入正文，记得把「说明」改成图片描述', 'ok');
            },
          },
          ['插入正文'],
        ),
        el(
          'button',
          {
            class: 'btn sm ghost',
            type: 'button',
            onClick: async () => {
              try {
                await navigator.clipboard.writeText(`![说明](${asset.name})`);
                toast('Markdown 片段已复制', 'ok');
              } catch {
                toast(`复制失败，手动写：![说明](${asset.name})`, 'warn');
              }
            },
          },
          ['复制路径'],
        ),
        el(
          'button',
          {
            class: 'btn sm danger',
            type: 'button',
            onClick: async () => {
              const ok = await confirmModal({
                title: `删除素材 ${asset.name}？`,
                message: '会从 blog/<文章名>/ 里移除这个文件，并备份到 data/backups/blog/assets/。正文里的引用会变成裂图。',
                confirmText: '删除',
                danger: true,
              });
              if (!ok) return;
              try {
                await api('/api/blog/asset/delete', {
                  method: 'POST',
                  body: { slug, name: asset.name },
                });
                toast(`已删除 ${asset.name}`, 'ok');
                await refresh();
              } catch (e) {
                toast(`删除失败：${e.message}`, 'bad');
              }
            },
          },
          ['删除'],
        ),
      ]),
    ]);
  }

  async function refresh() {
    const slug = getSlug();
    grid.innerHTML = '';
    warn.style.display = 'none';

    if (!slug) {
      grid.appendChild(
        el('div', { class: 'asset-empty' }, ['文章先保存一次，素材目录 blog/<文件名>/ 才会创建。']),
      );
      return;
    }
    // 文件名改了但还没保存：上传会落到旧目录，先说清楚。
    if (slugInput && slugInput.value.trim() && slugInput.value.trim() !== slug) {
      warn.textContent = `文件名已改成「${slugInput.value.trim()}」，但还没保存 —— 现在上传的素材会放进旧目录 blog/${slug}/。先保存再上传。`;
      warn.style.display = '';
    }

    let assets = [];
    try {
      assets = (await api('/api/blog/assets', { method: 'POST', body: { slug } })).assets ?? [];
    } catch (e) {
      toast(`读取素材失败：${e.message}`, 'bad');
      return;
    }

    if (!assets.length) {
      grid.appendChild(el('div', { class: 'asset-empty' }, ['还没有素材。']));
      return;
    }
    for (const asset of assets) grid.appendChild(assetCard(slug, asset));
  }

  input.addEventListener('change', () => {
    upload(input.files);
    input.value = '';
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    upload(e.dataTransfer?.files ?? []);
  });

  // 直接往正文里粘贴截图时自动上传并插入 —— 这是最顺手的贴图路径。
  bodyArea.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (!files.length) return;
    e.preventDefault();
    upload(files, { insert: true });
  });

  refresh();

  return el('div', { class: 'field full' }, [
    el('label', {}, [
      '素材',
      el('span', { class: 'hint' }, [
        '放在 blog/<文件名>/ 里；正文写 ![](文件名) 即可，不用管构建后的路径',
      ]),
    ]),
    el('div', { class: 'asset-wrap' }, [drop, input, warn, grid]),
  ]);
}

function addEntry(key) {
  const def = state.schema.collections[key];
  const list = state.content[key] ?? (state.content[key] = []);
  const entry = { id: nextId(key, list) };
  if (def.typeFixed) entry.type = def.typeFixed;
  for (const f of def.fields) {
    if (f.kind === 'l10n' || f.kind === 'l10ntext') entry[f.key] = { zh: '', en: '' };
  }
  list.unshift(entry);
  state.open.add(openKey(key, entry.id));
  setDirty(true);
  renderMain();
  renderNav();
}

/* ── 保存 ───────────────────────────────────────────────────── */

async function save({ allowEmpty = false } = {}) {
  try {
    const res = await api('/api/save', { method: 'POST', body: { content: state.content, allowEmpty } });
    if (!res.ok) {
      if (res.emptySections?.length && !allowEmpty) {
        const ok = await confirmModal({
          title: '确认清空这些分区？',
          message: `保存后以下分区会变成空列表：${res.emptySections.join('、')}。如果这不是你想要的，点取消。`,
          confirmText: '确认清空并保存',
          danger: true,
        });
        if (ok) return save({ allowEmpty: true });
        return;
      }
      toast(res.message || '保存失败', 'bad');
      for (const e of res.errors ?? []) toast(e, 'bad');
      return;
    }
    state.content = res.content;
    state.counts = res.counts;
    setDirty(false);
    renderNav();
    renderMain();
    toast(res.warnings?.length ? `已保存 · 有 ${res.warnings.length} 条提醒` : '已保存', 'ok');
    for (const w of (res.warnings ?? []).slice(0, 5)) toast(w, 'warn');
    if (res.backup) toast(`快照 ${res.backup}`, '');
  } catch (e) {
    toast(`保存失败：${e.message}`, 'bad');
  }
}

async function reload() {
  const s = await api('/api/state');
  state.content = s.content;
  state.counts = s.counts;
  state.backups = s.backups;
  state.git = s.git;
  state.config = s.config;
  await loadPosts();
  setDirty(false);
  renderNav();
  renderMain();
  renderGit();
}

/* ── 工具：ORCID ────────────────────────────────────────────── */

async function openOrcidTool() {
  const picks = { apply: new Map(), add: new Set() };
  const out = el('div');
  const idInput = el('input', { class: 'input' });
  idInput.value = state.config.orcidId || '';

  const status = el('div', { class: 'note' }, ['输入 ORCID iD 后点「拉取」。只补空缺字段：已有内容不会被覆盖。']);
  const applyBtn = el('button', { class: 'btn primary', disabled: 'disabled' }, ['应用选中']);
  const fetchBtn = el('button', { class: 'btn' }, ['拉取 ORCID']);

  const m = openModal({
    title: '🔗 ORCID 同步',
    subtitle: '按 DOI / 标题自动对号入座',
    body: el('div', {}, [
      el('div', { class: 'field full', style: { marginBottom: '14px' } }, [el('label', {}, ['ORCID iD']), idInput]),
      status,
      out,
    ]),
    footer: [fetchBtn, el('div', { class: 'grow' }), applyBtn],
  });

  const refreshApplyState = () => {
    const n = [...picks.apply.values()].reduce((a, s) => a + s.size, 0) + picks.add.size;
    applyBtn.disabled = n ? null : 'disabled';
    applyBtn.textContent = n ? `应用选中的 ${n} 项` : '应用选中';
  };

  fetchBtn.onclick = async () => {
    fetchBtn.disabled = true;
    status.className = 'note';
    status.textContent = '正在拉取 ORCID…';
    out.innerHTML = '';
    picks.apply.clear();
    picks.add.clear();
    refreshApplyState();
    try {
      const r = await api('/api/orcid/report', { method: 'POST', body: { orcidId: idInput.value } });
      if (!r.ok) {
        status.className = 'note bad';
        status.textContent = r.error;
        return;
      }
      status.className = 'note ok';
      status.textContent = `ORCID ${r.orcid}：拉到 ${r.fetched} 条作品，其中 ${r.matched.length} 条能对上站内论文。`;
      render(r);
    } catch (e) {
      status.className = 'note bad';
      status.textContent = `拉取失败：${e.message}`;
    } finally {
      fetchBtn.disabled = null;
    }
  };

  const render = (r) => {
    // 可补充字段
    const withChanges = r.matched.filter((x) => x.changes.length);
    if (withChanges.length) {
      const sec = el('div', { class: 'section' }, [el('h3', {}, ['可以从 ORCID 补充的字段', el('span', { class: 'badge' }, [String(withChanges.length)])])]);
      for (const item of withChanges) {
        const card = el('div', { class: 'row-card' }, [
          el('div', { class: 'rc-title' }, [item.title || item.id]),
          el('div', { class: 'rc-sub' }, [`站内 ${item.id} · ORCID: ${item.orcidTitle}`]),
        ]);
        for (const c of item.changes) {
          const cb = el('input', { type: 'checkbox' });
          cb.onchange = () => {
            const set = picks.apply.get(item.id) ?? new Set();
            if (cb.checked) set.add(c.field);
            else set.delete(c.field);
            if (set.size) picks.apply.set(item.id, set);
            else picks.apply.delete(item.id);
            refreshApplyState();
          };
          card.appendChild(
            el('label', { class: 'check' }, [
              cb,
              el('div', { class: 'ck-main' }, [
                el('div', {}, [c.label]),
                el('div', { class: 'delta' }, [el('s', {}, [String(c.from || '（空）')]), ' → ', el('b', {}, [String(c.to)])]),
              ]),
            ]),
          );
        }
        sec.appendChild(card);
      }
      out.appendChild(sec);
    }

    // 新作品
    if (r.newWorks.length) {
      const sec = el('div', { class: 'section' }, [el('h3', {}, ['ORCID 上有、站点还没有的作品', el('span', { class: 'badge' }, [String(r.newWorks.length)])])]);
      for (const item of r.newWorks) {
        const w = item.work;
        const cb = el('input', { type: 'checkbox' });
        cb.onchange = () => {
          if (cb.checked) picks.add.add(item.key);
          else picks.add.delete(item.key);
          refreshApplyState();
        };
        sec.appendChild(
          el('label', { class: 'check' }, [
            cb,
            el('div', { class: 'ck-main' }, [
              el('div', {}, [w.title]),
              el('div', { class: 'rc-sub' }, [[w.venue, w.year, w.type, w.doi].filter(Boolean).join(' · ')]),
            ]),
          ]),
        );
      }
      out.appendChild(sec);
    }

    if (!withChanges.length && !r.newWorks.length) {
      out.appendChild(el('div', { class: 'note ok' }, ['站内论文与 ORCID 已完全一致，没有要补的东西。']));
    }

    if (r.inSiteNotInOrcid.length) {
      out.appendChild(
        el('div', { class: 'section' }, [
          el('h3', {}, ['站内有、ORCID 没有', el('span', { class: 'badge' }, [String(r.inSiteNotInOrcid.length)])]),
          el('div', { class: 'note' }, [r.inSiteNotInOrcid.map((x) => `${x.id} ${x.title}`).join('　·　')]),
          el('div', { class: 'note', style: { marginTop: '8px' } }, ['这些论文（多为中文刊）不在 ORCID 里，保持手填内容不变。']),
        ]),
      );
    }
  };

  applyBtn.onclick = async () => {
    applyBtn.disabled = 'disabled';
    try {
      const res = await api('/api/orcid/apply', {
        method: 'POST',
        body: {
          orcidId: idInput.value,
          apply: [...picks.apply.entries()].map(([id, fields]) => ({ id, fields: [...fields] })),
          add: [...picks.add],
        },
      });
      if (!res.ok) {
        toast(res.message || res.errors?.join('；') || res.error || '合并失败', 'bad');
        return;
      }
      toast(res.noop ? res.message : `已合并：补了 ${res.fieldUpdates ?? 0} 个字段，新增 ${res.added ?? 0} 条论文`, 'ok');
      if (res.addedSkipped?.length) toast(`${res.addedSkipped.length} 条因重复被跳过`, 'warn');
      m.close();
      await reload();
    } catch (e) {
      toast(`合并失败：${e.message}`, 'bad');
    } finally {
      applyBtn.disabled = null;
    }
  };
}

/* ── 工具：BibTeX ───────────────────────────────────────────── */

function openBibtexTool() {
  const ta = el('textarea', { class: 'textarea', rows: 8, placeholder: '@article{key,\n  title={...},\n  author={Tang, Jiajun and ...},\n  journal={...},\n  year={2025}\n}' });
  const out = el('div');
  const importBtn = el('button', { class: 'btn primary', disabled: 'disabled' }, ['导入选中']);
  const parseBtn = el('button', { class: 'btn' }, ['解析']);

  let parsed = [];
  const picked = new Set();

  const m = openModal({
    title: '📥 BibTeX 导入',
    subtitle: '从 Scholar / Zotero / 期刊网站复制',
    body: el('div', {}, [
      el('div', { class: 'note', style: { marginBottom: '12px' } }, ['把 .bib 内容整段贴进来，解析成结构化论文后再导入。按 DOI / 标题自动去重。']),
      ta,
      out,
    ]),
    footer: [parseBtn, el('div', { class: 'grow' }), importBtn],
  });

  const refresh = () => {
    importBtn.disabled = picked.size ? null : 'disabled';
    importBtn.textContent = picked.size ? `导入选中的 ${picked.size} 条` : '导入选中';
  };

  parseBtn.onclick = async () => {
    out.innerHTML = '';
    parsed = [];
    picked.clear();
    refresh();
    try {
      const r = await api('/api/bibtex/parse', { method: 'POST', body: { text: ta.value } });
      parsed = r.papers;
      if (!parsed.length) {
        out.appendChild(el('div', { class: 'note bad', style: { marginTop: '12px' } }, ['没解析出条目，确认贴的是 BibTeX。']));
        return;
      }
      const sec = el('div', { class: 'section', style: { marginTop: '14px' } }, [
        el('h3', {}, ['解析结果', el('span', { class: 'badge' }, [String(parsed.length)])]),
      ]);
      parsed.forEach((p, i) => {
        picked.add(String(i));
        const cb = el('input', { type: 'checkbox', checked: 'checked' });
        cb.onchange = () => {
          if (cb.checked) picked.add(String(i));
          else picked.delete(String(i));
          refresh();
        };
        sec.appendChild(
          el('label', { class: 'check' }, [
            cb,
            el('div', { class: 'ck-main' }, [
              el('div', {}, [p.title?.en || p.title?.zh || '(无标题)']),
              el('div', { class: 'rc-sub' }, [[displayText(p.venue), p.year, (p.authors ?? []).join(', '), p.doi].filter(Boolean).join(' · ')]),
            ]),
          ]),
        );
      });
      out.appendChild(sec);
      refresh();
    } catch (e) {
      out.appendChild(el('div', { class: 'note bad' }, [`解析失败：${e.message}`]));
    }
  };

  importBtn.onclick = async () => {
    importBtn.disabled = 'disabled';
    try {
      const res = await api('/api/bibtex/import', { method: 'POST', body: { text: ta.value, selected: [...picked] } });
      if (!res.ok && !res.noop) {
        toast(res.message || res.error || '导入失败', 'bad');
        return;
      }
      if (res.noop) {
        toast(res.message, 'warn');
      } else {
        toast(`已导入 ${res.added} 条论文`, 'ok');
        if (res.skipped?.length) toast(`${res.skipped.length} 条重复被跳过`, 'warn');
      }
      m.close();
      state.active = 'papers';
      await reload();
    } catch (e) {
      toast(`导入失败：${e.message}`, 'bad');
    } finally {
      importBtn.disabled = null;
    }
  };
}

/* ── 工具：引用同步 ─────────────────────────────────────────── */

function openScholarTool() {
  const idInput = el('input', { class: 'input' });
  idInput.value = state.config.scholarId || '';
  const out = el('div');
  const runBtn = el('button', { class: 'btn primary' }, ['立即同步']);

  const m = openModal({
    title: '🎓 Google Scholar 引用同步',
    subtitle: '抓每篇论文的引用数',
    body: el('div', {}, [
      el('div', { class: 'note', style: { marginBottom: '12px' } }, [
        '同步会跑一次 scripts/update_scholar_citations.py，把引用数写入 data/scholar.json；站点构建时按标题自动合并。抓不到数据时脚本不会覆盖旧文件，所以失败是安全的。',
      ]),
      el('div', { class: 'field full', style: { marginBottom: '14px' } }, [el('label', {}, ['Scholar ID']), idInput]),
      out,
    ]),
    footer: [runBtn],
  });

  runBtn.onclick = async () => {
    runBtn.disabled = 'disabled';
    runBtn.textContent = '同步中…';
    out.innerHTML = '';
    try {
      const r = await api('/api/scholar/sync', { method: 'POST', body: { scholarId: idInput.value } });
      const cls = r.ok ? 'ok' : 'bad';
      const head = r.ok
        ? `完成 · 用时 ${r.seconds}s · 抓到 ${r.publications} 篇 · 更新时间 ${r.updatedAt ?? '—'}`
        : `抓取失败`;
      out.appendChild(el('div', { class: `note ${cls}` }, [head]));
      if (r.hint) out.appendChild(el('div', { class: 'note warn', style: { marginTop: '8px' } }, [r.hint]));
      if (r.changes?.length) {
        const sec = el('div', { class: 'section', style: { marginTop: '14px' } }, [el('h3', {}, ['引用数变化', el('span', { class: 'badge' }, [String(r.changes.length)])])]);
        for (const c of r.changes) {
          sec.appendChild(
            el('div', { class: 'row-card' }, [
              el('div', { class: 'rc-title' }, [c.title || '(无标题)']),
              el('div', { class: 'delta' }, [c.added ? '新收录 · ' : '', el('s', {}, [String(c.from ?? '—')]), ' → ', el('b', {}, [String(c.to)])]),
            ]),
          );
        }
        out.appendChild(sec);
      } else if (r.ok) {
        out.appendChild(el('div', { class: 'note', style: { marginTop: '8px' } }, ['引用数与上次一致，没有变化。']));
      }
      if (r.log) out.appendChild(el('pre', { class: 'log' }, [r.log]));
      await reload();
    } catch (e) {
      out.appendChild(el('div', { class: 'note bad' }, [`同步失败：${e.message}`]));
    } finally {
      runBtn.disabled = null;
      runBtn.textContent = '立即同步';
    }
  };
}

/* ── 工具：备份 ─────────────────────────────────────────────── */

async function openBackupsTool() {
  const out = el('div');
  const nowBtn = el('button', { class: 'btn' }, ['立即打快照']);

  const m = openModal({
    title: '🕘 备份与回滚',
    subtitle: '每次保存前自动留一份',
    body: el('div', {}, [
      el('div', { class: 'note', style: { marginBottom: '12px' } }, ['最近 30 份快照，保存在 data/backups/。回滚会先把你当前的内容也存一份，所以误点也能救回来。']),
      out,
    ]),
    footer: [nowBtn],
  });

  const paint = () => {
    out.innerHTML = '';
    if (!state.backups.length) {
      out.appendChild(el('div', { class: 'note' }, ['还没有快照。第一次保存时会自动生成。']));
      return;
    }
    for (const b of state.backups) {
      const m2 = b.name.match(/content-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json/);
      const when = m2 ? `${m2[1]}-${m2[2]}-${m2[3]} ${m2[4]}:${m2[5]}:${m2[6]}` : b.name;
      out.appendChild(
        el('div', { class: 'bk' }, [
          el('span', { class: 'when' }, [when]),
          el('span', { class: 'size' }, [`${(b.size / 1024).toFixed(1)} KB`]),
          el('div', { class: 'grow' }),
          el('button', {
            class: 'btn sm',
            onClick: async () => {
              const ok = await confirmModal({
                title: '回滚到这份快照？',
                message: `当前内容会先自动备份，然后用 ${when} 的快照覆盖 data/content.json。`,
                confirmText: '回滚',
                danger: true,
              });
              if (!ok) return;
              try {
                const r = await api('/api/restore', { method: 'POST', body: { name: b.name } });
                if (!r.ok) return toast(r.error || '回滚失败', 'bad');
                toast(`已回滚到 ${when}`, 'ok');
                m.close();
                await reload();
              } catch (e) {
                toast(`回滚失败：${e.message}`, 'bad');
              }
            },
          }, ['回滚']),
        ]),
      );
    }
  };

  nowBtn.onclick = async () => {
    try {
      const r = await api('/api/backup', { method: 'POST', body: {} });
      state.backups = r.backups;
      toast(`已生成快照 ${r.backup}`, 'ok');
      paint();
    } catch (e) {
      toast(`快照失败：${e.message}`, 'bad');
    }
  };

  paint();
}

/* ── 工具：仓库状态 ─────────────────────────────────────────── */

function promptModal({ title, label, value, confirmText = '确认' }) {
  return new Promise((resolve) => {
    const input = el('input', { class: 'input' });
    input.value = value ?? '';
    let done = false;
    const fin = (v) => {
      if (done) return;
      done = true;
      m.close();
      resolve(v);
    };
    const m = openModal({
      title,
      body: el('div', { class: 'field full' }, [el('label', {}, [label]), input]),
      footer: [
        el('button', { class: 'btn', onClick: () => fin(null) }, ['取消']),
        el('div', { class: 'grow' }),
        el('button', { class: 'btn primary', onClick: () => fin(input.value.trim()) }, [confirmText]),
      ],
      onDismiss: () => fin(null),
    });
    input.focus();
  });
}

async function refreshGitState() {
  try {
    const r = await api('/api/git');
    state.git = r.git;
    renderGit();
  } catch {
    /* 状态刷新失败不打扰用户 */
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * 提交改动。scope 传 'all' / 'content' 时直接提交，不传则先问用户。
 * 返回 true 表示确实提交成功了（调用方据此决定要不要接着推送）。
 */
async function commitFlow(scope) {
  if (state.dirty) {
    const ok = await confirmModal({
      title: '还有未保存的改动',
      message: '先把内容保存到 data/content.json，再一起提交？',
      confirmText: '先保存再提交',
    });
    if (!ok) return false;
    await save();
  }

  if (!scope) {
    // 弹选择框前先把状态刷新到最新，否则可能拿着过期的「有改动」去问用户。
    await refreshGitState();
    const n = (state.git?.changed ?? []).length;
    if (!n) {
      toast('没有需要提交的改动。', 'warn');
      return false;
    }
    scope = await chooseModal({
      title: '提交哪些改动？',
      subtitle: `工作区共 ${n} 个文件有改动`,
      options: [
        {
          value: 'all',
          label: `全部改动（${n} 个文件）`,
          desc: '源码、样式、博客、数据一起提交。站点新增功能要选这个 —— 只提数据的话，线上拿不到新功能。',
        },
        {
          value: 'content',
          label: '仅内容数据',
          desc: '只提交 data/content.json 与抓取快照，适合单纯更新了一条论文。',
        },
      ],
    });
    if (scope === null) return false;
  }

  const fallback =
    scope === 'content' ? `content: 更新站点数据 ${today()}` : `更新站点内容与功能 ${today()}`;

  const message = await promptModal({
    title: '提交改动',
    label: scope === 'content' ? '提交信息（仅内容数据）' : '提交信息（全部改动）',
    value: fallback,
    confirmText: '提交',
  });
  if (message === null) return false;

  try {
    const r = await api('/api/git/commit', { method: 'POST', body: { message: message || fallback, scope } });
    state.git = r.git;
    renderGit();
    if (!r.ok) {
      toast(r.log || '提交失败', 'bad');
      return false;
    }
    if (r.skipped) {
      toast(r.log, 'warn');
      return false;
    }
    toast(`已提交 ${r.files?.length ?? ''} 个文件`, 'ok');
    return true;
  } catch (e) {
    toast(`提交失败：${e.message}`, 'bad');
    return false;
  }
}

async function pushFlow() {
  const changed = state.git?.changed ?? [];

  // 关键防线：推送只上传「已提交」的内容。工作区还有改动时，线上不会包含它们
  // ——「功能明明做完了线上却没有」这个坑就是这么踩的。
  if (changed.length) {
    const choice = await chooseModal({
      title: `还有 ${changed.length} 个文件没提交`,
      subtitle: '推送只会上传已提交的内容',
      options: [
        {
          value: 'commit',
          label: '一起提交并推送',
          desc: `${changed.map((c) => c.file).slice(0, 6).join('、')}${changed.length > 6 ? ' 等' : ''} —— 这些改动会随本次推送上线。`,
        },
        {
          value: 'raw',
          label: '只推送已提交的部分',
          desc: '保持现状推送。工作区里这些改动不会出现在线上。',
          danger: true,
        },
      ],
    });
    if (choice === null) return;

    if (choice === 'commit') {
      const done = await commitFlow('all');
      if (!done) return;
    }
  } else {
    const ok = await confirmModal({
      title: '推送到 GitHub？',
      message: '会把当前分支推送到 origin。工作区没有未提交的改动，GitHub Pages 构建完成后站点自动更新。',
      confirmText: '推送',
    });
    if (!ok) return;
  }

  try {
    const r = await api('/api/git/push', { method: 'POST', body: {} });
    state.git = r.git;
    renderGit();
    if (r.ok) toast('已推送，等 GitHub Pages 构建完（约 1 分钟）刷新站点即可', 'ok');
    else toast(r.log || '推送失败（若是本机代理问题，可在终端手动 git push）', 'bad');
  } catch (e) {
    toast(`推送失败：${e.message}`, 'bad');
  }
}

async function openGitTool() {
  const out = el('div');
  const m = openModal({
    title: '仓库状态',
    subtitle: '改完内容记得提交 → 推送',
    body: out,
    footer: [
      el('button', { class: 'btn', onClick: () => commitFlow().then(paint) }, ['提交改动']),
      el('div', { class: 'grow' }),
      el('button', { class: 'btn primary', onClick: () => pushFlow().then(paint) }, ['推送到 GitHub']),
    ],
  });

  async function paint() {
    await refreshGitState();
    const g = state.git ?? {};
    const changed = g.changed ?? [];
    out.innerHTML = '';
    out.appendChild(
      el('div', { class: 'section' }, [
        el('h3', {}, ['工作区', el('span', { class: 'badge' }, [g.branch || '—'])]),
        el('div', { class: 'note' }, [`远程 ${g.remote || '（未配置）'} · 领先 ${g.ahead ?? 0} · 落后 ${g.behind ?? 0}`]),
        changed.length
          ? el('div', { class: 'note warn', style: { marginTop: '10px' } }, [
              `${changed.length} 个文件有改动，还没提交。推送不会带上它们 —— 线上不会生效。`,
            ])
          : el('div', { class: 'note ok', style: { marginTop: '10px' } }, ['工作区干净，没有未提交的改动。']),
        changed.length
          ? el(
              'div',
              { class: 'filelist', style: { marginTop: '8px' } },
              changed.map((c) => el('div', {}, [el('span', { class: `st ${String(c.status).toLowerCase()}` }, [c.status]), c.file])),
            )
          : null,
      ]),
    );
    out.appendChild(
      el('div', { class: 'section' }, [
        el('h3', {}, ['最近提交']),
        el('div', { class: 'filelist' }, (g.commits ?? []).map((c) => el('div', {}, [`${c.hash}  ${c.date}  ${c.subject}`]))),
      ]),
    );
    out.appendChild(
      el('div', { class: 'section' }, [
        el('h3', {}, ['提交范围怎么选']),
        el('div', { class: 'note' }, [
          '站点源码（App.tsx、blog.ts、blog/*.md、admin/*…）和内容数据在同一个仓库里。' +
            '新增功能属于源码改动，提交时要选「全部改动」；只选「仅内容数据」的话，' +
            '推上去的是「新内容 + 旧代码」，线上看不到新功能。',
        ]),
      ]),
    );
  }

  await paint();
  void m;
}

/* ── 启动 ───────────────────────────────────────────────────── */

const TOOLS = {
  orcid: openOrcidTool,
  bibtex: openBibtexTool,
  scholar: openScholarTool,
  backups: openBackupsTool,
};

async function boot() {
  try {
    const s = await api('/api/state');
    state.schema = s.schema;
    state.content = s.content;
    state.counts = s.counts;
    state.backups = s.backups;
    state.config = s.config;
    state.git = s.git;
    state.active = s.schema.order[0];
    await loadPosts();
    renderNav();
    renderMain();
    renderGit();
  } catch (e) {
    $('#main').appendChild(el('div', { class: 'note bad' }, [`读取失败：${e.message}`]));
  }
}

$('#btn-save').onclick = () => save();
$('#btn-discard').onclick = async () => {
  const ok = await confirmModal({ title: '放弃未保存的改动？', message: '会丢弃内存里的编辑，重新从 data/content.json 读取。', confirmText: '放弃', danger: true });
  if (ok) {
    await reload();
    toast('已重新载入', '');
  }
};
$('#git-chip').onclick = () => openGitTool();
$('#btn-commit').onclick = () => commitFlow();
$('#btn-push').onclick = () => pushFlow();$('#btn-backup').onclick = async () => {
  try {
    const r = await api('/api/backup', { method: 'POST', body: {} });
    toast(`已生成快照 ${r.backup}`, 'ok');
  } catch (e) {
    toast(`快照失败：${e.message}`, 'bad');
  }
};
document.querySelectorAll('[data-tool]').forEach((btn) => {
  btn.onclick = () => TOOLS[btn.dataset.tool]?.();
});

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (state.dirty) save();
  }
});

boot();
