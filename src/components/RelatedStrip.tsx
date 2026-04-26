import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { seeds } from '../data/catalog';
import type { Seed } from '../data/catalog';
import { addFavorite, listFavorites, removeFavorite } from '../lib/api';
import type { Favorite } from '../lib/api';
import { getRelated } from '../lib/related';
import { useActiveUser } from '../lib/user';

interface RelatedStripProps {
  seed: Seed;
}

interface RelatedCardProps {
  seed: Seed;
  favorited: boolean;
  onToggleFavorite: (seed: Seed) => void;
}

function seedKey(seed: Pick<Seed, 'type' | 'slug'>): string {
  return `${seed.type}:${seed.slug}`;
}

function favoriteKey(favorite: Pick<Favorite, 'entity_type' | 'entity_slug'>): string {
  return `${favorite.entity_type}:${favorite.entity_slug}`;
}

function getSubline(seed: Seed): string {
  switch (seed.type) {
    case 'town':
      return seed.region;
    case 'lodging':
      return [seed.region, seed.rateBand].filter(Boolean).join(' · ');
    case 'restaurant':
      return [seed.town, seed.register].filter(Boolean).join(' · ');
    case 'winery':
      return seed.town;
    case 'beach':
      return seed.town;
    case 'cultural-site':
      return [seed.town, seed.category].filter(Boolean).join(' · ');
    case 'map':
      return seed.kind;
    case 'drive':
      return `${seed.from} → ${seed.to}`;
    case 'region-narrative':
      return seed.region;
  }
}

function RelatedCard({ seed, favorited, onToggleFavorite }: RelatedCardProps) {
  function handleFavoriteClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(seed);
  }

  return (
    <Link to={`/entity/${seed.type}/${seed.slug}`} className="snap-start flex-shrink-0 w-60 bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
      {seed.type === 'beach' && seed.imageUrl ? (
        <img src={seed.imageUrl} alt={seed.name} loading="lazy" className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-liguria/10 flex items-center justify-center text-liguria font-semibold text-base px-2 text-center line-clamp-2">{seed.name}</div>
      )}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{seed.name}</p>
          <p className="text-xs text-muted truncate">{getSubline(seed)}</p>
        </div>
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className={`h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-full transition-colors ${favorited ? 'text-accent' : 'text-muted hover:text-ink'}`}
        >
          {favorited ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </Link>
  );
}

export default function RelatedStrip({ seed }: RelatedStripProps) {
  const [activeUser] = useActiveUser();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    let cancelled = false;
    setFavorites([]);

    listFavorites()
      .then(loadedFavorites => {
        if (cancelled) return;
        setFavorites(loadedFavorites);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('Failed to load related favorites:', err);
        setFavorites([]);
      });

    return () => { cancelled = true; };
  }, [activeUser]);

  const favoriteIdByKey = useMemo(() => {
    const map = new Map<string, string>();

    for (const favorite of favorites) {
      map.set(favoriteKey(favorite), favorite.id);
    }

    return map;
  }, [favorites]);

  const related = useMemo(() => getRelated(seed, seeds, favorites), [seed, favorites]);

  function handleToggleFavorite(relatedSeed: Seed) {
    const key = seedKey(relatedSeed);
    const favoriteId = favoriteIdByKey.get(key);

    if (favoriteId != null) {
      removeFavorite(favoriteId)
        .then(() => {
          setFavorites(prev => prev.filter(favorite => favorite.id !== favoriteId && favoriteKey(favorite) !== key));
        })
        .catch(err => console.warn('Failed to remove favorite:', err));
      return;
    }

    addFavorite({ entity_type: relatedSeed.type, entity_slug: relatedSeed.slug })
      .then(favorite => {
        setFavorites(prev => [
          ...prev.filter(existing => favoriteKey(existing) !== key),
          favorite,
        ]);
      })
      .catch(err => console.warn('Failed to add favorite:', err));
  }

  if (related.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-ink mb-3 px-4">Related</h2>
      <div className="flex overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 gap-3">
        {related.map(relatedSeed => {
          const key = seedKey(relatedSeed);
          return (
            <RelatedCard
              key={key}
              seed={relatedSeed}
              favorited={favoriteIdByKey.has(key)}
              onToggleFavorite={handleToggleFavorite}
            />
          );
        })}
      </div>
    </section>
  );
}
