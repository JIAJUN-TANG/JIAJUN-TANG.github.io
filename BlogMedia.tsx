import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  X,
} from 'lucide-react';
import { resolveAsset } from './blog';
import { useLang } from './i18n';

/**
 * Media rendering for blog posts.
 *
 * Authors write plain Markdown - no custom syntax to learn, because the *file
 * extension* decides how something is rendered:
 *
 *   ![封面](cover.png)          → figure + caption, click to enlarge
 *   ![演示](demo.mp4)           → <video controls>
 *   ![播客](ep1.mp3)            → <audio controls>
 *   ![论文](paper.pdf)          → document card
 *   https://youtu.be/xxxx       → embedded player (its own paragraph only)
 *
 * Local paths go through `resolveAsset`, which maps them onto the hashed file
 * Vite emitted at build time (see `blog.ts`). Nothing here does a network
 * request, so a post renders instantly even fully offline.
 */

/* ── 类型判定 ───────────────────────────────────────────────── */

const extOf = (src: string): string => {
  const clean = String(src ?? '').split(/[?#]/)[0];
  const match = /\.([a-z0-9]+)$/i.exec(clean);
  return match ? match[1].toLowerCase() : '';
};

const VIDEO = new Set(['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v', 'mkv']);
const AUDIO = new Set(['mp3', 'wav', 'm4a', 'flac', 'aac', 'opus', 'oga']);
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff']);

type MediaKind = 'image' | 'video' | 'audio' | 'pdf' | 'file';

function kindOf(src: string): MediaKind {
  const ext = extOf(src);
  if (VIDEO.has(ext)) return 'video';
  if (AUDIO.has(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (IMAGE.has(ext)) return 'image';
  return 'file';
}

/**
 * `![alt](src)` means image, so an unrecognised *extension* only demotes it to a
 * download card when there is one; a URL with no extension at all (very common
 * for CDN links carrying query strings, e.g. `…/u/1?v=4`) stays an image.
 */
const looksLikeImage = (src: string): boolean => {
  const kind = kindOf(src);
  return kind === 'image' || (kind === 'file' && !extOf(src));
};

/**
 * Recognise the video sites people actually paste from. Returns an iframe src,
 * or null when the link is just a link. Bilibili needs its own player host.
 */
function embedUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) return href;
    const id = url.searchParams.get('v');
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    const shorts = /^\/shorts\/([^/]+)/.exec(url.pathname);
    return shorts ? `https://www.youtube-nocookie.com/embed/${shorts[1]}` : null;
  }
  if (host === 'bilibili.com' || host === 'm.bilibili.com') {
    const bv = /\/(BV[0-9A-Za-z]+)/.exec(url.pathname);
    if (bv) return `https://player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0`;
    const av = /\/av(\d+)/i.exec(url.pathname);
    return av ? `https://player.bilibili.com/player.html?aid=${av[1]}&autoplay=0` : null;
  }
  if (host === 'player.bilibili.com') return href;
  if (host === 'vimeo.com') {
    const id = /^\/(\d+)/.exec(url.pathname);
    return id ? `https://player.vimeo.com/video/${id[1]}` : null;
  }
  return null;
}

/** The base name of a relative or absolute path, for showing in a card. */
const baseName = (src: string): string => {
  const clean = String(src ?? '').split(/[?#]/)[0];
  try {
    return decodeURIComponent(clean.replace(/^.*\//, '')) || clean;
  } catch {
    return clean.replace(/^.*\//, '');
  }
};

/* ── 上下文：当前文章的 slug + 打开灯箱 ─────────────────────── */

interface MediaContextValue {
  slug: string;
  /** Pass the clicked `<img>`: position, not URL, identifies it in the set. */
  open: (img: HTMLImageElement | null) => void;
}

const MediaContext = React.createContext<MediaContextValue>({ slug: '', open: () => {} });

const useMedia = () => React.useContext(MediaContext);

/* ── 各类媒体块 ─────────────────────────────────────────────── */

const Caption = ({ children }: { children: React.ReactNode }) =>
  children ? <figcaption>{children}</figcaption> : null;

const VideoBlock = ({ src, caption }: { src: string; caption?: string }) => (
  <figure className="blog-figure blog-media-block">
    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
    <video className="blog-video" src={src} controls playsInline preload="metadata" />
    <Caption>{caption}</Caption>
  </figure>
);

const AudioBlock = ({ src, caption }: { src: string; caption?: string }) => (
  <figure className="blog-figure blog-media-block">
    <audio className="blog-audio" src={src} controls preload="metadata" />
    <Caption>{caption}</Caption>
  </figure>
);

const PdfBlock = ({ src, caption }: { src: string; caption?: string }) => {
  const { t } = useLang();
  return (
    <figure className="blog-figure blog-media-block">
      <a className="blog-file" href={src} target="_blank" rel="noreferrer">
        <span className="blog-file-icon">
          <FileText size={18} />
        </span>
        <span className="blog-file-text">
          <span className="blog-file-name">{caption || baseName(src)}</span>
          <span className="blog-file-hint">
            {t('mediaDoc')} · {t('mediaOpen')}
          </span>
        </span>
        <ExternalLink size={14} className="blog-file-go" />
      </a>
    </figure>
  );
};

/** Generic non-media link that happens to live in the asset folder. */
const FileBlock = ({ src, caption }: { src: string; caption?: string }) => {
  const { t } = useLang();
  return (
    <p className="blog-file-line">
      <a href={src} target="_blank" rel="noreferrer">
        <Download size={14} /> {caption || baseName(src)} · {t('mediaDownload')}
      </a>
    </p>
  );
};

const EmbedFrame = ({ src, caption }: { src: string; caption?: string }) => (
  <figure className="blog-figure blog-media-block">
    <div className="blog-embed">
      <iframe
        src={src}
        title={caption || 'embed'}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
    <Caption>{caption}</Caption>
  </figure>
);

/**
 * Markdown `![alt](src)` lands here. The extension picks the renderer, so one
 * piece of syntax covers stills, clips, audio and PDFs.
 */
export const MarkdownImage = ({ src, alt }: { src?: string; alt?: string }) => {
  const { slug, open } = useMedia();
  const { t } = useLang();
  const url = resolveAsset(slug, src);
  if (!url) return null;

  const caption = alt && alt !== url ? alt : undefined;

  switch (kindOf(url)) {
    case 'video':
      return <VideoBlock src={url} caption={caption} />;
    case 'audio':
      return <AudioBlock src={url} caption={caption} />;
    case 'pdf':
      return <PdfBlock src={url} caption={caption} />;
    default:
      if (!looksLikeImage(url)) return <FileBlock src={url} caption={caption} />;
      return (
        <figure className="blog-figure">
          <button
            type="button"
            className="blog-zoom"
            onClick={(event) =>
              open(event.currentTarget.querySelector('img') as HTMLImageElement | null)
            }
            title={t('mediaZoom')}
          >
            <img className="blog-media-img" src={url} alt={caption ?? ''} loading="lazy" />
          </button>
          <Caption>{caption}</Caption>
        </figure>
      );
  }
};

/** Links: local asset paths get resolved too, external ones open in a new tab. */
export const MarkdownAnchor = ({
  href,
  children,
  title,
}: {
  href?: string;
  children?: React.ReactNode;
  title?: string;
}) => {
  const { slug } = useMedia();
  const url = resolveAsset(slug, href);
  const external = /^https?:\/\//i.test(url);
  return (
    <a
      href={url}
      title={title}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
    </a>
  );
};

/**
 * True when a React node eventually renders a `<figure>`-producing media block.
 * Looks one level down too, so `[![alt](x.png)](url)` is caught.
 */
const containsMedia = (node: React.ReactNode): boolean => {
  if (Array.isArray(node)) return node.some(containsMedia);
  if (!React.isValidElement(node)) return false;
  const props = node.props as { src?: unknown; children?: React.ReactNode };
  if (typeof props.src === 'string') return true;
  return containsMedia(props.children);
};

/**
 * A paragraph needs a say because a bare URL sitting on its own line should
 * become a player, and a paragraph holding media must not stay a `<p>` - a
 * `<figure>` (or `<figcaption>`) inside one is invalid HTML.
 */
export const MarkdownParagraph = ({ children }: { children?: React.ReactNode }) => {
  const kids = React.Children.toArray(children).filter(
    (kid) => !(typeof kid === 'string' && kid.trim() === ''),
  );

  const only = kids.length === 1 && React.isValidElement(kids[0]) ? kids[0] : null;
  if (only) {
    const props = only.props as { src?: string; href?: string; title?: string };

    if (typeof props.href === 'string') {
      const embed = embedUrl(props.href);
      if (embed) return <EmbedFrame src={embed} caption={props.title} />;
    }
  }

  if (kids.some(containsMedia)) return <div className="blog-para">{children}</div>;
  return <p>{children}</p>;
};

/* ── 灯箱 ───────────────────────────────────────────────────── */

/** Every zoomable image currently on the page, in document order. */
const imageNodes = (): HTMLImageElement[] =>
  Array.from(document.querySelectorAll<HTMLImageElement>('.blog-body img.blog-media-img'));

const urlOf = (img: HTMLImageElement): string => img.currentSrc || img.src;

interface Preview {
  list: string[];
  index: number;
}

const Lightbox = ({
  preview,
  onClose,
  onIndex,
}: {
  preview: Preview | null;
  onClose: () => void;
  onIndex: (index: number) => void;
}) => {
  const { t } = useLang();
  const { list, index } = preview ?? { list: [], index: 0 };
  const many = list.length > 1;
  const current = preview ? list[index] : null;

  React.useEffect(() => {
    if (!preview) return;
    const step = (delta: number) => {
      if (list.length < 2) return;
      onIndex((index + delta + list.length) % list.length);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [preview, index, list, onClose, onIndex]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            {many && (
              <span className="lightbox-count">
                {index + 1} / {list.length}
              </span>
            )}
            <a
              className="lightbox-btn"
              href={current}
              download
              title={t('mediaDownload')}
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} />
            </a>
            <button
              type="button"
              className="lightbox-btn"
              onClick={onClose}
              title={t('mediaClose')}
              aria-label={t('mediaClose')}
            >
              <X size={18} />
            </button>
          </div>

          {many && (
            <button
              type="button"
              className="lightbox-nav prev"
              title={t('mediaPrev')}
              aria-label={t('mediaPrev')}
              onClick={(e) => {
                e.stopPropagation();
                onIndex((index - 1 + list.length) % list.length);
              }}
            >
              <ChevronLeft size={26} />
            </button>
          )}

          <motion.img
            key={current}
            className="lightbox-img"
            src={current}
            alt=""
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          />

          {many && (
            <button
              type="button"
              className="lightbox-nav next"
              title={t('mediaNext')}
              aria-label={t('mediaNext')}
              onClick={(e) => {
                e.stopPropagation();
                onIndex((index + 1) % list.length);
              }}
            >
              <ChevronRight size={26} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Wrap a post body with this. It supplies the slug used to resolve relative
 * asset paths, and owns the lightbox so every image in the post can zoom.
 */
export const MediaProvider = ({ slug, children }: { slug: string; children: React.ReactNode }) => {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const close = React.useCallback(() => setPreview(null), []);

  /**
   * Resolve the clicked element to a position in the page's image list. Using
   * the DOM index (not the URL) matters: a post may legitimately show the same
   * picture twice, and then the two would be indistinguishable by URL.
   */
  const open = React.useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    const nodes = imageNodes();
    const index = nodes.indexOf(img);
    if (index < 0) return;
    setPreview({ list: nodes.map(urlOf), index });
  }, []);

  const value = React.useMemo<MediaContextValue>(() => ({ slug, open }), [slug, open]);

  // Navigating to another post must not leave a stale overlay behind.
  React.useEffect(() => setPreview(null), [slug]);

  const goTo = React.useCallback(
    (index: number) => setPreview((prev) => (prev ? { ...prev, index } : prev)),
    [],
  );

  return (
    <MediaContext.Provider value={value}>
      {children}
      {createPortal(
        <Lightbox preview={preview} onClose={close} onIndex={goTo} />,
        document.body,
      )}
    </MediaContext.Provider>
  );
};

/** Markdown component overrides, ready to hand to ReactMarkdown. */
export const MEDIA_COMPONENTS = {
  img: MarkdownImage,
  a: MarkdownAnchor,
  p: MarkdownParagraph,
};
