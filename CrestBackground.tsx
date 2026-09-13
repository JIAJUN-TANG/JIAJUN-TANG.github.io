import React from 'react';
import type { CrestKey } from './types';
import njuCrest from './image/nju-crest.svg';
import csuCrest from './image/csu-crest.svg';
import nccuCrest from './image/nccu-crest.png';
import nusCrest from './image/nus-crest.png';

/**
 * University crests.
 *
 * Nanjing University and Central South University are the official single-colour
 * vector emblems (NJU purple #6A005F, CSU blue #006FA8), so they stay crisp at any
 * size and read well as a faint watermark.
 *
 * National Chengchi University and NUS are the official colour emblems, sourced as
 * raster (PNG) because no freely served vector original was reachable. Both are
 * square-normalised to 256px and used only as small badges, never as watermarks.
 */

export const CREST_SRC: Record<CrestKey, string> = {
  nju: njuCrest,
  csu: csuCrest,
  nccu: nccuCrest,
  nus: nusCrest,
};

export const CREST_NAME: Record<CrestKey, string> = {
  nju: 'Nanjing University',
  csu: 'Central South University',
  nccu: 'National Chengchi University',
  nus: 'National University of Singapore',
};

/** Only the two alma maters carry the full-page watermark. */
const WATERMARKS: CrestKey[] = ['nju', 'csu'];

/**
 * The two colour emblems lose more definition to transparency than the flat
 * single-colour vectors do, so they sit at a slightly higher opacity.
 */
const COLOUR_CRESTS: CrestKey[] = ['nccu', 'nus'];

/** Fixed, non-interactive watermark layer sitting behind the whole page. */
export const CrestBackground: React.FC = () => (
  <div className="crest-layer" aria-hidden="true">
    {WATERMARKS.map((key) => (
      <img
        key={key}
        className={`crest crest-${key}`}
        src={CREST_SRC[key]}
        alt=""
        draggable={false}
      />
    ))}
  </div>
);

/** Small inline crest badge, used next to education entries. */
export const CrestBadge: React.FC<{ crest?: CrestKey; size?: number }> = ({ crest, size = 18 }) => {
  if (!crest) return null;
  return (
    <img
      className={COLOUR_CRESTS.includes(crest) ? 'crest-badge is-colour' : 'crest-badge'}
      src={CREST_SRC[crest]}
      alt={CREST_NAME[crest]}
      title={CREST_NAME[crest]}
      draggable={false}
      style={{ width: size, height: size }}
    />
  );
};
