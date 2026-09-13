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

const state = {
  schema: null,
  content: null,
  counts: {},
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

function openModal({ title, subtitle, body, footer, width, onDismiss }) {
  const root = $('#modal-root');
  root.innerHTML = '';

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

  root.append(mask, modal);
  root.classList.add('show');

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.classList.remove('show');
    root.innerHTML = '';
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
  for (const key of state.schema.order) {
    const def = state.schema.collections[key];
    const count = state.content[key]?.length ?? 0;
    nav.appendChild(
      el('button', {
        class: `nav-item ${state.active === key ? 'active' : ''}`,
        onClick: () => {
          state.active = key;
          state.filter = '';
          renderNav();
          renderMain();
        },
      }, [
        el('span', { class: 'ico' }, [def.icon]),
        el('span', {}, [def.label]),
        el('span', { class: 'count' }, [String(count)]),
      ]),
    );
  }
}

/* ── 字段编辑器 ─────────────────────────────────────────────── */

function l10nEditor(obj, onChange, { multiline = false } = {}) {
  const grid = el('div', { class: 'l10n' });
  for (const [code, label] of [['zh', '中文'], ['en', 'EN']]) {
    const node = multiline
      ? el('textarea', { class: 'textarea', rows: 4 })
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
          ? el('textarea', { class: 'textarea', rows: 4 })
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
      wrap.appendChild(l10nEditor(entry[field.key], onChange, { multiline: true }));
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

async function commitFlow() {
  if (state.dirty) {
    const ok = await confirmModal({
      title: '还有未保存的改动',
      message: '先把内容保存到 data/content.json，再一起提交？',
      confirmText: '先保存再提交',
    });
    if (!ok) return;
    await save();
  }
  const fallback = `content: 更新站点数据 ${new Date().toISOString().slice(0, 10)}`;
  const message = await promptModal({
    title: '提交改动',
    label: '提交信息',
    value: fallback,
    confirmText: '提交',
  });
  if (message === null) return;
  try {
    const r = await api('/api/git/commit', { method: 'POST', body: { message: message || fallback } });
    if (!r.ok) return toast(r.log || '提交失败', 'bad');
    toast(r.skipped ? r.log : '已提交', r.skipped ? 'warn' : 'ok');
    state.git = r.git;
    renderGit();
  } catch (e) {
    toast(`提交失败：${e.message}`, 'bad');
  }
}

async function pushFlow() {
  const ok = await confirmModal({
    title: '推送到 GitHub？',
    message: '会把当前分支推送到 origin。GitHub Pages 构建完成后站点自动更新。',
    confirmText: '推送',
  });
  if (!ok) return;
  try {
    const r = await api('/api/git/push', { method: 'POST', body: {} });
    if (r.ok) toast('已推送', 'ok');
    else toast(r.log || '推送失败（若是本机代理问题，可在终端手动 git push）', 'bad');
    state.git = r.git;
    renderGit();
  } catch (e) {
    toast(`推送失败：${e.message}`, 'bad');
  }
}

async function openGitTool() {
  const out = el('div');
  const m = openModal({
    title: '仓库状态',
    subtitle: '内容改完记得提交并推送',
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
    out.innerHTML = '';
    out.appendChild(
      el('div', { class: 'section' }, [
        el('h3', {}, ['工作区', el('span', { class: 'badge' }, [g.branch || '—'])]),
        el('div', { class: 'note' }, [`远程 ${g.remote || '（未配置）'} · 领先 ${g.ahead ?? 0} · 落后 ${g.behind ?? 0}`]),
        (g.changed ?? []).length
          ? el(
              'div',
              { class: 'filelist', style: { marginTop: '10px' } },
              g.changed.map((c) => el('div', {}, [el('span', { class: `st ${String(c.status).toLowerCase()}` }, [c.status]), c.file])),
            )
          : el('div', { class: 'note ok', style: { marginTop: '10px' } }, ['工作区干净，没有未提交的改动。']),
      ]),
    );
    out.appendChild(
      el('div', { class: 'section' }, [
        el('h3', {}, ['最近提交']),
        el('div', { class: 'filelist' }, (g.commits ?? []).map((c) => el('div', {}, [`${c.hash}  ${c.date}  ${c.subject}`]))),
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
$('#btn-push').onclick = () => pushFlow();
$('#btn-backup').onclick = async () => {
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
