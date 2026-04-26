import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Seed } from '../data/catalog';

function getBlurb(seed: Seed): string {
  switch (seed.type) {
    case 'town':
    case 'beach':
    case 'restaurant':
    case 'winery':
    case 'cultural-site':
      return seed.blurb;
    case 'lodging':
      return seed.why;
    case 'region-narrative':
      return seed.body.split('\n')[0] ?? '';
    case 'map':
    case 'drive':
      return '';
  }
}

function getSubline(seed: Seed): string {
  switch (seed.type) {
    case 'restaurant':
      return [seed.town, seed.register].filter(Boolean).join(' · ');
    case 'winery':
      return [seed.town, seed.visitPolicy].filter(Boolean).join(' · ');
    case 'beach':
      return [seed.town, seed.character].filter(Boolean).join(' · ');
    case 'cultural-site':
      return [seed.town, seed.category].filter(Boolean).join(' · ');
    case 'lodging':
      return [seed.base, seed.rateBand].filter(Boolean).join(' · ');
    case 'map':
      return seed.kind;
    case 'drive':
      return `${seed.from} → ${seed.to}`;
    case 'town':
    case 'region-narrative':
      return seed.region;
  }
}

interface EntityCardProps {
  seed: Seed;
  favorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function EntityCard({ seed, favorited = false, onToggleFavorite }: EntityCardProps) {
  const blurb = getBlurb(seed);
  const subline = getSubline(seed);

  return (
    <div className="relative">
      <Link
        to={`/entity/${seed.type}/${seed.slug}`}
        className="bg-surface border border-border rounded-xl p-4 flex gap-3 items-start hover:bg-paper transition-colors block"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">{seed.name}</p>
          {subline && (
            <p className="text-xs text-muted mt-0.5">{subline}</p>
          )}
          {blurb && (
            <p className="text-sm text-ink mt-1 line-clamp-2">{blurb}</p>
          )}
        </div>
        {/* Spacer so text doesn't overlap heart button */}
        <div className="w-8 flex-shrink-0" />
      </Link>

      {/* Heart button — outside the Link to prevent nav */}
      {onToggleFavorite && (
        <button
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className={clsx(
            'absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full transition-colors',
            favorited ? 'text-accent' : 'text-muted hover:text-ink',
          )}
        >
          {favorited ? (
            // Filled heart
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" />
            </svg>
          ) : (
            // Outline heart
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
