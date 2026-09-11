import React from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  GitCommit,
  GitFork,
  GitPullRequest,
  MessageSquare,
  Plus,
  RefreshCw,
  Star,
  Tag,
  Trash2,
  Circle,
} from 'lucide-react';
import { GithubEvent, timeAgo, useGithubActivity } from './github';

const EVENT_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  PushEvent: GitCommit,
  WatchEvent: Star,
  ForkEvent: GitFork,
  CreateEvent: Plus,
  DeleteEvent: Trash2,
  PullRequestEvent: GitPullRequest,
  IssuesEvent: Circle,
  IssueCommentEvent: MessageSquare,
  ReleaseEvent: Tag,
};

const iconFor = (type: string) => EVENT_ICON[type] ?? Circle;

const EventRow: React.FC<{ event: GithubEvent; index: number }> = ({ event, index }) => {
  const Icon = iconFor(event.type);
  const Wrapper = event.url ? 'a' : 'div';
  const wrapperProps = event.url
    ? { href: event.url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.25, 0.25, 0, 1] }}
    >
      <Wrapper
        {...wrapperProps}
        className="flex items-start gap-2.5 py-2 group"
      >
        <Icon size={13} className="text-tertiary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-secondary leading-snug truncate group-hover:text-primary transition-colors duration-200">
            {event.message}
          </p>
          <p className="text-[11px] text-tertiary font-mono truncate mt-0.5">{event.repo}</p>
        </div>
        <span className="text-[10px] text-tertiary font-mono shrink-0 mt-0.5">
          {timeAgo(event.createdAt)}
        </span>
      </Wrapper>
    </motion.div>
  );
};

const Skeleton: React.FC = () => (
  <div className="space-y-3.5 py-1">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-2.5 animate-pulse">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-subtle)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 rounded" style={{ backgroundColor: 'var(--color-subtle)', width: `${70 - i * 12}%` }} />
          <div className="h-2 rounded" style={{ backgroundColor: 'var(--color-subtle)', width: '35%' }} />
        </div>
      </div>
    ))}
  </div>
);

export const GitHubActivityCard: React.FC<{ login: string }> = ({ login }) => {
  const { data, loading, error, refresh } = useGithubActivity(login);

  // Nothing cached and the API is unreachable or rate limited: render nothing.
  if (!data && error) return null;

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="live-dot absolute inline-flex h-full w-full rounded-full"
              style={{ backgroundColor: error ? 'var(--color-tertiary)' : 'var(--color-accent)' }}
            />
          </span>
          <span className="text-[11px] font-mono text-tertiary">
            {error ? 'offline' : loading ? 'syncing' : `synced ${timeAgo(data?.fetchedAt)}`}
          </span>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh GitHub activity"
          className="p-1 rounded-md text-tertiary hover:text-primary transition-colors duration-200 disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {data && (
        <div className="flex items-center gap-4 mb-3 pb-3 border-b" style={{ borderColor: 'var(--color-subtle)' }}>
          <a
            href={data.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-tertiary hover:text-accent transition-colors duration-200"
          >
            <span className="text-sm font-serif font-semibold text-primary">{data.publicRepos}</span> repos
          </a>
          <a
            href={`${data.profileUrl}?tab=followers`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-tertiary hover:text-accent transition-colors duration-200"
          >
            <span className="text-sm font-serif font-semibold text-primary">{data.followers}</span> followers
          </a>
        </div>
      )}

      {!data && loading ? (
        <Skeleton />
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--color-subtle)' }}>
          {data?.events.length ? (
            data.events.map((event, i) => <EventRow key={event.id} event={event} index={i} />)
          ) : (
            <p className="text-[12px] text-tertiary py-2">No public activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export const GitHubSectionHeading: React.FC = () => (
  <h3 className="text-sm font-sans font-semibold uppercase tracking-[0.15em] text-tertiary mb-6 flex items-center gap-2">
    <Github size={14} /> Open Source
  </h3>
);
