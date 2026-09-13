import { useCallback, useEffect, useState } from 'react';
import type { Lang } from './types';

/**
 * Live GitHub activity for the homepage.
 *
 * Uses the unauthenticated GitHub REST API, which allows CORS but is rate limited
 * to 60 requests/hour per IP. Results are cached in localStorage so switching tabs
 * or reloading does not burn through that budget. If the request fails the page
 * simply renders without this card - the site never depends on a third party.
 *
 * Events are cached as *structured* data and only turned into sentences at render
 * time, so a single cache entry serves both the Chinese and the English page.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = 'v2';
const EVENT_LIMIT = 6;

export interface GithubEventData {
  /** Number of commits in a push. */
  count?: number;
  /** Last commit message, tag name, or other free-form detail. */
  detail?: string;
  branch?: string;
  refType?: string;
  ref?: string;
  action?: string;
  /** Fork target, e.g. "user/repo". */
  target?: string;
}

export interface GithubEvent {
  id: string;
  type: string;
  repo: string;
  repoUrl: string;
  url: string | null;
  createdAt: string;
  data: GithubEventData;
}

export interface GithubActivity {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  publicRepos: number;
  followers: number;
  events: GithubEvent[];
  fetchedAt: number;
}

const cacheKey = (login: string) => `gh-activity:${CACHE_VERSION}:${login}`;

function readCache(login: string): GithubActivity | null {
  try {
    const raw = localStorage.getItem(cacheKey(login));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GithubActivity;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(login: string, data: GithubActivity) {
  try {
    localStorage.setItem(cacheKey(login), JSON.stringify(data));
  } catch {
    /* private mode or quota exceeded - caching is best effort */
  }
}

function extractEvent(event: any): { data: GithubEventData; url: string | null } {
  const repo = event.repo?.name ?? '';
  const payload = event.payload ?? {};

  switch (event.type) {
    case 'PushEvent': {
      const commits = payload.commits ?? [];
      const branch = String(payload.ref ?? '').replace('refs/heads/', '');
      return {
        data: {
          count: payload.size ?? commits.length ?? 0,
          detail: String(commits[commits.length - 1]?.message ?? '').split('\n')[0],
          branch,
        },
        url: branch ? `https://github.com/${repo}/commits/${branch}` : `https://github.com/${repo}`,
      };
    }
    case 'WatchEvent':
      return { data: {}, url: `https://github.com/${repo}` };
    case 'ForkEvent':
      return {
        data: { target: payload.forkee?.full_name ?? '' },
        url: payload.forkee?.html_url ?? null,
      };
    case 'CreateEvent':
      return {
        data: { refType: payload.ref_type ?? 'repository', ref: payload.ref ?? '' },
        url: `https://github.com/${repo}`,
      };
    case 'DeleteEvent':
      return { data: { refType: payload.ref_type ?? '', ref: payload.ref ?? '' }, url: null };
    case 'IssuesEvent':
      return { data: { action: payload.action ?? 'updated' }, url: payload.issue?.html_url ?? null };
    case 'PullRequestEvent':
      return {
        data: { action: payload.action ?? 'updated' },
        url: payload.pull_request?.html_url ?? null,
      };
    case 'ReleaseEvent':
      return {
        data: { detail: payload.release?.tag_name ?? '' },
        url: payload.release?.html_url ?? null,
      };
    case 'IssueCommentEvent':
      return { data: {}, url: payload.comment?.html_url ?? null };
    case 'PublicEvent':
      return { data: {}, url: `https://github.com/${repo}` };
    default:
      return { data: {}, url: null };
  }
}

/** Build the human-readable label for an event in the given language. */
export function formatGithubEvent(event: GithubEvent, lang: Lang): string {
  const zh = lang === 'zh';
  const d = event.data ?? {};
  const repo = event.repo || '-';

  switch (event.type) {
    case 'PushEvent': {
      if ((d.count ?? 0) > 0) {
        const head = zh ? `${d.count} 次提交` : `${d.count} commit${d.count === 1 ? '' : 's'}`;
        return d.detail ? `${head} · ${d.detail}` : head;
      }
      return zh ? `推送到 ${d.branch || repo}` : `Pushed to ${d.branch || repo}`;
    }
    case 'WatchEvent':
      return zh ? '标星' : 'Starred';
    case 'ForkEvent':
      return zh
        ? `复刻至 ${d.target || '新仓库'}`
        : `Forked to ${d.target || 'a new repo'}`;
    case 'CreateEvent': {
      const kind = d.refType === 'tag' ? (zh ? '标签' : 'tag') : d.refType === 'branch' ? (zh ? '分支' : 'branch') : (zh ? '仓库' : 'repository');
      return zh
        ? `新建${kind}${d.ref ? ` ${d.ref}` : ''}`
        : `Created ${kind}${d.ref ? ` ${d.ref}` : ''}`;
    }
    case 'DeleteEvent': {
      const kind = d.refType === 'branch' ? (zh ? '分支' : 'branch') : (zh ? '标签' : 'tag');
      return zh ? `删除${kind} ${d.ref || ''}` : `Deleted ${kind} ${d.ref || ''}`.trim();
    }
    case 'IssuesEvent': {
      const map: Record<string, [string, string]> = {
        opened: ['创建了 issue', 'opened an issue'],
        closed: ['关闭了 issue', 'closed an issue'],
        reopened: ['重新打开 issue', 'reopened an issue'],
        updated: ['更新了 issue', 'updated an issue'],
      };
      const hit = map[d.action ?? 'updated'] ?? map.updated;
      return zh ? hit[0] : hit[1];
    }
    case 'PullRequestEvent': {
      const map: Record<string, [string, string]> = {
        opened: ['创建了拉取请求', 'opened a pull request'],
        closed: ['合并/关闭了拉取请求', 'closed a pull request'],
        reopened: ['重新打开拉取请求', 'reopened a pull request'],
        updated: ['更新了拉取请求', 'updated a pull request'],
      };
      const hit = map[d.action ?? 'updated'] ?? map.updated;
      return zh ? hit[0] : hit[1];
    }
    case 'ReleaseEvent':
      return zh ? `发布 ${d.detail || ''}`.trim() : `Released ${d.detail || ''}`.trim();
    case 'IssueCommentEvent':
      return zh ? '评论了 issue' : 'Commented on an issue';
    case 'PublicEvent':
      return zh ? '仓库转为公开' : 'Made repository public';
    default:
      return event.type.replace(/Event$/, '').replace(/([A-Z])/g, ' $1').trim();
  }
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub API rate limit reached');
  }
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`);
  }
  return res.json();
}

export async function fetchGithubActivity(login: string): Promise<GithubActivity> {
  const [user, events] = await Promise.all([
    getJson(`https://api.github.com/users/${login}`),
    getJson(`https://api.github.com/users/${login}/events/public?per_page=${EVENT_LIMIT}`),
  ]);

  const parsed: GithubEvent[] = (Array.isArray(events) ? events : []).map((event: any) => {
    const { data, url } = extractEvent(event);
    return {
      id: String(event.id ?? `${event.type}-${event.created_at}`),
      type: event.type ?? 'UnknownEvent',
      repo: event.repo?.name ?? '',
      repoUrl: `https://github.com/${event.repo?.name ?? ''}`,
      url,
      createdAt: event.created_at ?? new Date().toISOString(),
      data,
    };
  });

  return {
    login: user.login ?? login,
    avatarUrl: user.avatar_url ?? '',
    profileUrl: user.html_url ?? `https://github.com/${login}`,
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    events: parsed,
    fetchedAt: Date.now(),
  };
}

export function useGithubActivity(login: string) {
  const [data, setData] = useState<GithubActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const cached = readCache(login);
    const forced = nonce > 0;

    if (cached) {
      setData(cached);
      setLoading(false);
    }

    const stale = !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS;
    if (!stale && !forced) return () => { cancelled = true; };

    if (forced || !cached) setLoading(true);

    fetchGithubActivity(login)
      .then((fresh) => {
        if (cancelled) return;
        writeCache(login, fresh);
        setData(fresh);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [login, nonce]);

  return { data, loading, error, refresh };
}
