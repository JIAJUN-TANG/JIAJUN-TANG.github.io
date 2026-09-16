/**
 * 中台的 git 操作：看状态、提交、推送。
 *
 * 之所以放在中台里做，是因为「改完内容 → 提交 → 推送」本来就是一条动作；
 * 手动的话要在终端敲三条命令。
 */

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, CONFIG_FILE, readJson } from './content.mjs';

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
 * 联网的 git 命令：先直连，直连不通再走 `admin/config.json` 里配置的代理，
 * 代理也再给一次机会（本机那个代理本身就不稳，实测三次里能成一次）。
 *
 * 为什么需要这个：这台机器上 GitHub 直连时通时不通，而中台以前只会直连 ——
 * 于是一次 fetch 都成功不了，「远程有新提交」的提示永远弹不出来。
 * `gitProxy` 留空则只直连，行为跟以前完全一样。改完保存 config.json 即生效。
 */
async function gitNetwork(args, { timeout = 60000, cwd = ROOT } = {}) {
  const proxy = String(readJson(CONFIG_FILE, {})?.gitProxy ?? '').trim();
  const tries = proxy
    ? [[], ['-c', `http.proxy=${proxy}`], ['-c', `http.proxy=${proxy}`]]
    : [[]];

  let last = { ok: false, stdout: '', stderr: '' };
  for (const extra of tries) {
    last = await git([...extra, ...args], { timeout, cwd });
    if (last.ok) return last;
  }
  return last;
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

/* ── 远程分支当前指向哪 ──────────────────────────────────────
 *
 * 为什么不直接用 `@{upstream}` / `refs/remotes/origin/*`：
 * 本仓库所在的卷上，git 无法在 `.git/refs/` 下新建子目录（静默失败，退出码还是 0），
 * 于是 `refs/remotes/origin/main` 根本存不住，`@{upstream}` 永远解析不出来，
 * ahead/behind 会一路显示 0 —— 中台因此从不提示「远程有新提交」，
 * 用户一点推送就撞上 `rejected (fetch first)`。
 *
 * 所以改成自己记录远程分支的 sha，按可靠性依次尝试三个来源：
 *   1. 调用方刚 fetch 到的 sha（最准，refresh / push 路径用这个）
 *   2. 上次成功 fetch 时写下的缓存（`.git/admin-remote-head.json`）
 *   3. `.git/FETCH_HEAD` —— 注意 fetch **失败**时 git 会把它清空
 * 三个都拿不到就返回 null：此时 behind/ahead 报 0，但 `compared=false`，
 * 界面必须显示「远程状态未知」，不能假装「已是最新」。
 */

const CACHE_FILE = (cwd) => join(cwd, '.git', 'admin-remote-head.json');

function readRemoteCache(cwd, branch) {
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE(cwd), 'utf8'));
    if (data?.sha && (!branch || data.branch === branch)) return data;
  } catch {
    /* 缓存不存在或坏了，交给下一个来源 */
  }
  return null;
}

function writeRemoteCache(cwd, branch, sha) {
  try {
    writeFileSync(
      CACHE_FILE(cwd),
      JSON.stringify({ branch, sha, fetchedAt: new Date().toISOString() }, null, 2),
    );
  } catch {
    /* 缓存写不进去不影响主流程，只是下次要多联网一次 */
  }
}

/** 从 `.git/FETCH_HEAD` 里挑出目标分支的 sha（不联网）。 */
function readFetchHead(cwd, branch) {
  const file = join(cwd, '.git', 'FETCH_HEAD');
  if (!existsSync(file)) return null;

  let lines;
  try {
    lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  } catch {
    return null;
  }

  const shaOf = (line) => (/^([0-9a-f]{40})\b/i.exec(line)?.[1] ?? null);

  // 行格式： <sha>\t\tbranch 'main' of https://…
  for (const line of lines) {
    const sha = shaOf(line);
    if (sha && branch && new RegExp(`branch '${branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(line)) {
      return { sha, fetchedAt: null };
    }
  }
  // 只 fetch 了单个 ref 时没写 branch 名，取第一条即可。
  const first = lines.map(shaOf).find(Boolean);
  return first ? { sha: first, fetchedAt: null } : null;
}

/**
 * 解析「远程这个分支现在指向哪个 commit」。
 * @param override 刚 fetch 完可以直接把 sha 传进来，跳过缓存
 */
function resolveRemote({ cwd = ROOT, branch, override = null } = {}) {
  if (typeof override === 'string' && /^[0-9a-f]{40}$/i.test(override)) {
    return { sha: override, fetchedAt: new Date().toISOString() };
  }
  return readRemoteCache(cwd, branch) ?? readFetchHead(cwd, branch);
}

/** 当前分支名（分离 HEAD 时返回空串）。 */
export async function currentBranch({ cwd = ROOT } = {}) {
  const res = await git(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  const name = res.stdout;
  return res.ok && name && name !== 'HEAD' ? name : '';
}

/** 分支在配置里声明的远程 + 远程分支 ref（`branch.<name>.remote` / `.merge`）。 */
async function upstreamConfig(branch, { cwd = ROOT } = {}) {
  if (!branch) return null;
  const [remote, merge] = await Promise.all([
    git(['config', '--get', `branch.${branch}.remote`], { cwd }),
    git(['config', '--get', `branch.${branch}.merge`], { cwd }),
  ]);
  // `git config --get` 在键不存在时退出码是 1，所以要看 ok 而不是 stdout 是否为空。
  if (!remote.ok || !merge.ok || !remote.stdout || !merge.stdout) return null;
  return { remote: remote.stdout, ref: merge.stdout };
}

export async function gitStatus({ cwd = ROOT, remoteSha = null } = {}) {
  const opts = { cwd };
  const branch = await currentBranch({ cwd });
  const up = await upstreamConfig(branch, { cwd });

  const [changed, log, remote] = await Promise.all([
    git(['status', '--porcelain', '-uall'], opts),
    git(['log', '-5', '--pretty=format:%h|%s|%ad', '--date=format:%m-%d %H:%M'], opts),
    git(['remote', 'get-url', 'origin'], opts),
  ]);

  const base = resolveRemote({ cwd, branch, override: remoteSha });

  // `rev-list --left-right --count A...B` 左边是 A 独有的（= 我们落后的），右边是 B 独有的。
  let behind = 0;
  let ahead = 0;
  let compared = false;
  if (base?.sha) {
    const counts = await git(['rev-list', '--left-right', '--count', `${base.sha}...HEAD`], opts);
    const [b, a] = counts.stdout.split(/\s+/).map(Number);
    if (counts.ok && Number.isFinite(b) && Number.isFinite(a)) {
      behind = b;
      ahead = a;
      compared = true;
    }
  }

  return {
    branch: branch || '(unknown)',
    // 展示用：`origin/main`。拿不到远程状态时留空，别编一个出来。
    upstream: compared && up ? `${up.remote}/${up.ref.replace(/^refs\/heads\//, '')}` : '',
    remote: remote.ok ? remote.stdout : '',
    changed: parsePorcelain(changed.raw),
    behind,
    ahead,
    /** false = 拿不到远程 sha，behind/ahead 不可信，界面要如实说明。 */
    compared,
    remoteSha: base?.sha ?? '',
    /** 远程 sha 是什么时候拿到的；null 表示来自 FETCH_HEAD，时间未知。 */
    remoteCheckedAt: base?.fetchedAt ?? null,
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
 * 拉取远程引用（只更新 refs 与 FETCH_HEAD，**不动工作区**）。
 *
 * ⚠️ 这一步是必须的，别省：不在联网状态下刷新一次，中台手里的「远程指向哪」
 * 就是上次的旧值，远程真前进了也看不出来，用户看着「已是最新」一点推送，
 * 就撞上 git 那句晦涩的 `rejected ... (fetch first)` —— 这正是踩过的坑。
 *
 * 网络失败不致命（离线时就当没这回事），所以只把结果报出去，不抛异常。
 * 失败时 git 会清空 FETCH_HEAD，所以成功的结果额外写进 admin-remote-head.json 缓存。
 */
export async function gitFetch({ cwd = ROOT } = {}) {
  const branch = await currentBranch({ cwd });
  const res = await gitNetwork(['fetch', 'origin'], { timeout: 90000, cwd });
  if (!res.ok) return { ok: false, log: res.stderr || res.stdout || '', sha: null };

  const found = readFetchHead(cwd, branch);
  if (found?.sha) writeRemoteCache(cwd, branch, found.sha);
  return { ok: true, log: '', sha: found?.sha ?? null };
}

/**
 * `git pull --rebase`：把远程新提交垫在本地提交下面。
 *
 * 冲突时**必须 `--abort`**，别把仓库丢在 rebase 中间态 —— 那种状态下
 * 用户下次打开中台会看到一堆莫名其妙的「未完成的操作」，且没法正常提交。
 */
export async function gitPullRebase({ cwd = ROOT } = {}) {
  const branch = (await currentBranch({ cwd })) || 'main';
  const res = await gitNetwork(['pull', '--rebase', 'origin', branch], { timeout: 180000, cwd });

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
    // 用刚 fetch 到的 sha 比对，别让 gitStatus 退回可能过期的缓存。
    const status = await gitStatus({ cwd, remoteSha: fetched.sha });

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

  const res = await gitNetwork(['push', 'origin', 'HEAD'], { timeout: 180000, cwd });
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
