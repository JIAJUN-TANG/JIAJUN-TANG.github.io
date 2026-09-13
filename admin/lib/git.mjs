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

export function git(args, { timeout = 120000, env = {} } = {}) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', ROOT, ...args],
      { timeout, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error?.code ?? 0,
          stdout: clean(stdout),
          stderr: clean(stderr),
        });
      },
    );
  });
}

export async function gitStatus() {
  const [branch, changed, ahead, log, remote] = await Promise.all([
    git(['rev-parse', '--abbrev-ref', 'HEAD']),
    git(['status', '--porcelain']),
    git(['rev-list', '--left-right', '--count', 'origin/HEAD...HEAD']),
    git(['log', '-5', '--pretty=format:%h|%s|%ad', '--date=format:%m-%d %H:%M']),
    git(['remote', 'get-url', 'origin']),
  ]);

  const counts = ahead.stdout.split(/\s+/).map(Number);
  return {
    branch: branch.stdout || '(unknown)',
    remote: remote.ok ? remote.stdout : '',
    changed: changed.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ status: line.slice(0, 2).trim(), file: line.slice(3) })),
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

/** 只提交指定文件；默认提交内容数据与抓取快照。 */
export async function gitCommit(message, files = ['data/content.json', 'data/scholar.json']) {
  const existing = [];
  for (const file of files) {
    const check = await git(['status', '--porcelain', '--', file]);
    if (check.stdout) existing.push(file);
  }
  if (!existing.length) return { ok: true, skipped: true, log: '没有需要提交的改动。' };

  const add = await git(['add', '--', ...existing]);
  if (!add.ok) return { ok: false, log: add.stderr || add.stdout };

  const commit = await git(['commit', '-m', message || 'content: update via admin console']);
  return {
    ok: commit.ok,
    log: [add.stdout, commit.stdout, commit.stderr].filter(Boolean).join('\n'),
    files: existing,
  };
}

export async function gitPush() {
  const res = await git(['push', 'origin', 'HEAD'], { timeout: 180000 });
  return { ok: res.ok, log: [res.stdout, res.stderr].filter(Boolean).join('\n') };
}

export const gitDiff = async () => {
  const res = await git(['diff', '--stat', '--', 'data']);
  const full = await git(['diff', '--', 'data/content.json']);
  return { stat: res.stdout, diff: full.stdout.slice(0, 60000) };
};
