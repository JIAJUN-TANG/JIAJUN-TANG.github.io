import { useCallback, useEffect, useState } from 'react';

/**
 * Live GitHub activity for the homepage.
 *
 * Uses the unauthenticated GitHub REST API, which allows CORS but is rate limited
 * to 60 requests/hour per IP. Results are cached in localStorage so switching tabs
 * or reloading does not burn through that budget. If the request fails the page
 * simply renders without this card - the site never depends on a third party.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = 'v1';
const EVENT_LIMIT = 6;

export interface GithubEvent {
  id: string;
  type: string;
  repo: string;
  repoUrl: string;
  message: string;
  url: string | null;
  createdAt: string;
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
    if (!parsed || typeof parsed.fetchedAt !== 'number') return null;
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

function describeEvent(event: any): { message: string; url: string | null } {
  const repo = event.repo?.name ?? '';
  const payload = event.payload ?? {};

  switch (event.type) {
    case 'PushEvent': {
      const commits = payload.commits ?? [];
      const count = payload.size ?? commits.length ?? 0;
      const last = commits[commits.length - 1]?.message ?? '';
      const branch = (payload.ref ?? '').replace('refs/heads/', '');
      return {
        message: count > 0
          ? `${count} commit${count === 1 ? '' : 's'} · ${last.split('\n')[0]}`
          : `Pushed to ${branch}`,
        url: branch ? `https://github.com/${repo}/commits/${branch}` : `https://github.com/${repo}`,
      };
    }
    case 'WatchEvent':
      return { message: 'Starred', url: `https://github.com/${repo}` };
    case 'ForkEvent':
      return {
        message: `Forked to ${payload.forkee?.full_name ?? 'a new repo'}`,
        url: payload.forkee?.html_url ?? null,
      };
    case 'CreateEvent':
      return {
        message: `Created ${payload.ref_type ?? 'repository'}${payload.ref ? ` ${payload.ref}` : ''}`,
        url: `https://github.com/${repo}`,
      };
    case 'DeleteEvent':
      return { message: `Deleted ${payload.ref_type} ${payload.ref ?? ''}`, url: null };
    case 'IssuesEvent':
      return { message: `${payload.action ?? 'updated'} an issue`, url: payload.issue?.html_url ?? null };
    case 'PullRequestEvent':
      return {
        message: `${payload.action ?? 'updated'} a pull request`,
        url: payload.pull_request?.html_url ?? null,
      };
    case 'ReleaseEvent':
      return {
        message: `Released ${payload.release?.tag_name ?? ''}`,
        url: payload.release?.html_url ?? null,
      };
    case 'IssueCommentEvent':
      return { message: 'Commented on an issue', url: payload.comment?.html_url ?? null };
    case 'PublicEvent':
      return { message: 'Made repository public', url: `https://github.com/${repo}` };
    default:
      return {
        message: event.type.replace(/Event$/, '').replace(/([A-Z])/g, ' $1').trim(),
        url: null,
      };
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
    const { message, url } = describeEvent(event);
    return {
      id: String(event.id ?? `${event.type}-${event.created_at}`),
      type: event.type ?? 'UnknownEvent',
      repo: event.repo?.name ?? '',
      repoUrl: `https://github.com/${event.repo?.name ?? ''}`,
      message,
      url,
      createdAt: event.created_at ?? new Date().toISOString(),
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

export function timeAgo(iso: string | number | null | undefined): string {
  if (!iso) return '';
  const ts = typeof iso === 'number' ? iso : new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';

  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}
