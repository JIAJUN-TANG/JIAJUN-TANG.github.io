/**
 * 中台的 git 操作：看状态、提交、推送。
 *
 * 之所以放在中台里做，是因为「改完内容 → 提交 → 推送」本来就是一条动作；
 * 手动的话要在终端敲三条命令。
 */

import { execFile } from 'node:child_process';

import { ROOT } from './content.mjs';

/** .gitattributes 里的历史遗留写法会让每条命令都刷 7 行警告，这里过滤掉。 */
const NOISE = /is not a valid attribute name/;

const clean = (s) =>
  String(s ?? '')
    .split('\n')
    .filter((line) => !NOISE.test(line))
    .join('\n')
    .trim();

export function git(args, { timeout = 120000, env = {}, cwd = ROOT } = {}) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', cwd, ...args],
      { timeout, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error?.code ?? 0,
          stdout: clean(stdout),
          stderr: clean(stderr),
          // 原始输出。解析 `--porcelain` 必须用它：状态位的两格里可能含空格
          // （` M` = 工作区改动），而 clean() 的 trim 会把首行那个空格吃掉，
          // 于是路径的第一个字符被当成状态位切掉（App.tsx → pp.tsx）。
          raw: String(stdout ?? ''),
        });
      },
    );
  });
}

/**
 * 解析 `git status --porcelain -uall` 的输出。
 * 每行格式是 `XY <path>`：X = 暂存区状态，Y = 工作区状态，都可能是空格。
 */
const parsePorcelain = (raw) =>
  String(raw ?? '')
    .split('\n')
    .filter((line) => line.trim().length > 2)
    .map((line) => {
      const [x = ' ', y = ' '] = [line[0] ?? ' ', line[1] ?? ' '];
      return {
        status: (x + y).trim() || '?',
        x,
        y,
        // 重命名会写成 `old -> new`，取新路径。
        file: line.slice(3).replace(/^.* -> /, ''),
      };
    });

export async function gitStatus({ cwd = ROOT } = {}) {
  const opts = { cwd };
  const [branch, changed, upstream, log, remote] = await Promise.all([
    git(['rev-parse', '--abbrev-ref', 'HEAD'], opts),
    git(['status', '--porcelain', '-uall'], opts),
    // 分支自己的 upstream，比写死 origin/HEAD 准（HEAD 是符号引用，可能指向别的分支）。
    git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], opts),
    git(['log', '-5', '--pretty=format:%h|%s|%ad', '--date=format:%m-%d %H:%M'], opts),
    git(['remote', 'get-url', 'origin'], opts),
  ]);

  // 没有 upstream（新分支 / 裸仓库当远程）时退回 origin/HEAD；再不行就退化成全 0。
  const base = upstream.ok && upstream.stdout ? upstream.stdout : 'origin/HEAD';
  const counts = (await git(['rev-list', '--left-right', '--count', `${base}...HEAD`], opts))
    .stdout.split(/\s+/)
    .map(Number);

  return {
    branch: branch.stdout || '(unknown)',
    upstream: upstream.ok ? upstream.stdout : '',
    remote: remote.ok ? remote.stdout : '',
    changed: parsePorcelain(changed.raw),
    behind: Number.isFinite(counts[0]) ? counts[0] : 0,
    ahead: Number.isFinite(counts[1]) ? counts[1] : 0,
    commits: log.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, date] = line.split('|');
        return { hash, subject, date };
      }),
  };
}

/**
 * 拉取远程引用（只更新 refs，**不动工作区**）。
 *
 * ⚠️ 这一步是必须的，别省：`gitStatus()` 里的 behind 用的是**本地缓存的**
 * 远程引用。不先 fetch 的话，远程真的前进了，中台依然显示「落后 0」，
 * 用户看着「已是最新」一点推送，就撞上 git 那句晦涩的
 * `rejected ... (fetch first)` —— 这正是踩过的坑。
 *
 * 网络失败不致命（离线时就当没这回事），所以只把结果报出去，不抛异常。
 */
export async function gitFetch({ cwd = ROOT } = {}) {
  const res = await git(['fetch', 'origin'], { timeout: 60000, cwd });
  return { ok: res.ok, log: res.stderr || res.stdout || '' };
}

/**
 * `git pull --rebase`：把远程新提交垫在本地提交下面。
 *
 * 冲突时**必须 `--abort`**，别把仓库丢在 rebase 中间态 —— 那种状态下
 * 用户下次打开中台会看到一堆莫名其妙的「未完成的操作」，且没法正常提交。
 */
export async function gitPullRebase({ cwd = ROOT } = {}) {
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd })).stdout || 'main';
  const res = await git(['pull', '--rebase', 'origin', branch], { timeout: 180000, cwd });

  if (res.ok) return { ok: true, branch, log: res.stdout };

  await git(['rebase', '--abort'], { cwd });
  return {
    ok: false,
    branch,
    conflict: true,
    log: res.stderr || res.stdout,
  };
}

/** 内容数据 + 抓取快照，保存内容时会写入的文件。 */
export const CONTENT_FILES = ['data/content.json', 'data/scholar.json'];

/**
 * 暂存并提交。
 *
 * scope='all'（默认）—— 提交工作区里的全部改动，包括源码 `App.tsx` / `blog.ts` /
 *   `blog/*.md` / `admin/*`。**站点的功能变更必须走这个范围**：只提交 `data/`
 *   的话，push 上去的是「新内容 + 旧代码」，线上看不到新功能。
 * scope='content'    —— 只提交 data/ 下的内容数据，适合纯粹更新一条论文这种场景。
 *
 * 两者都遵循 `.gitignore`（`git add -A -- .` 不会碰 node_modules / dist /
 * data/backups / .workbuddy）。
 */
export async function gitCommit(message, { scope = 'all' } = {}) {
  const target = scope === 'content' ? CONTENT_FILES : ['.'];

  const pending = await git(['status', '--porcelain', '-uall', '--', ...target]);
  if (!pending.ok) return { ok: false, log: pending.stderr || '无法读取仓库状态' };

  const files = parsePorcelain(pending.raw).map((c) => c.file);
  if (!files.length) return { ok: true, skipped: true, log: '没有需要提交的改动。' };

  const add = await git(['add', '-A', '--', ...target]);
  if (!add.ok) return { ok: false, log: add.stderr || add.stdout };

  const commit = await git(['commit', '-m', message || 'content: update via admin console']);
  return {
    ok: commit.ok,
    scope,
    files,
    log: [add.stdout, commit.stdout, commit.stderr].filter(Boolean).join('\n'),
  };
}

/**
 * 推送到 origin。
 *
 * 和裸 `git push` 的区别：**先 fetch 看清远程状态**。
 * 远程有本地没有的提交时（每天的引用数 workflow 就是一个固定来源），
 * 直接 push 会被非快进拒绝。这里不把 git 的原始报错丢给用户，而是返回
 * `{ diverged: true, behind }`，由界面决定是「先合并再推」还是放弃。
 *
 * @param merge  true = 落后时自动 `pull --rebase` 后继续推送（界面确认过再用）
 */
export async function gitPush({ cwd = ROOT, merge = false } = {}) {
  // fetch 失败（离线 / 代理不通）不致命 —— 也许本来就能推上去，继续试。
  const fetched = await gitFetch({ cwd });

  if (fetched.ok) {
    const status = await gitStatus({ cwd });

    if (status.behind > 0) {
      if (!merge) {
        return {
          ok: false,
          diverged: true,
          behind: status.behind,
          ahead: status.ahead,
          log:
            `远程有 ${status.behind} 个新提交还没并进来（常见来源：每天的引用数自动更新、` +
            `或在别处推送过）。直接推送会被拒绝。`,
        };
      }

      const pulled = await gitPullRebase({ cwd });
      if (!pulled.ok) {
        return {
          ok: false,
          conflict: true,
          log:
            '合并远程新提交时发生冲突，已回滚到合并前（仓库是干净的，可以放心）。\n' +
            '需要手动解决后再推送：\n' +
            pulled.log,
        };
      }
    }
  }

  const res = await git(['push', 'origin', 'HEAD'], { timeout: 180000, cwd });
  return {
    ok: res.ok,
    fetched: fetched.ok,
    log: [res.stdout, res.stderr].filter(Boolean).join('\n'),
  };
}

export const gitDiff = async () => {
  const res = await git(['diff', '--stat', '--', 'data']);
  const full = await git(['diff', '--', 'data/content.json']);
  return { stat: res.stdout, diff: full.stdout.slice(0, 60000) };
};
