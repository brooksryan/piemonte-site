import { useEffect, useRef, useState } from 'react';
import RegionMap from '@/components/RegionMap';
import EntityCard from '../components/EntityCard';
import { seedsByType } from '../data/catalog';
import type { Seed } from '../data/catalog';
import { listFavorites, addFavorite, removeFavorite } from '../lib/api';
import { useActiveUser } from '../lib/user';

function useFavorites(user: string) {
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    listFavorites()
      .then(favorites => {
        if (cancelled) return;
        const newSet = new Set<string>();
        const newMap = new Map<string, string>();
        for (const f of favorites) {
          const key = `${f.entity_type}:${f.entity_slug}`;
          newSet.add(key);
          newMap.set(key, f.id);
        }
        setFavSet(newSet);
        setFavMap(newMap);
      })
      .catch(err => {
        console.warn('Failed to load favorites:', err);
      });
    return () => { cancelled = true; };
  }, [user]);

  return { favSet, favMap, setFavSet, setFavMap };
}

export default function CoastalPage() {
  const [activeUser] = useActiveUser();
  const { favSet, favMap, setFavSet, setFavMap } = useFavorites(activeUser);

  const favMapRef = useRef(favMap);
  favMapRef.current = favMap;
  const favSetRef = useRef(favSet);
  favSetRef.current = favSet;

  function handleToggle(seed: Seed) {
    const key = `${seed.type}:${seed.slug}`;
    const currentMap = favMapRef.current;
    const currentSet = favSetRef.current;

    if (currentSet.has(key)) {
      const id = currentMap.get(key);
      if (id == null) return;
      removeFavorite(id).then(() => {
        setFavSet(prev => { const next = new Set(prev); next.delete(key); return next; });
        setFavMap(prev => { const next = new Map(prev); next.delete(key); return next; });
      }).catch(err => console.warn('Failed to remove favorite:', err));
    } else {
      addFavorite({ entity_type: seed.type, entity_slug: seed.slug }).then(fav => {
        setFavSet(prev => new Set(prev).add(key));
        setFavMap(prev => new Map(prev).set(key, fav.id));
      }).catch(err => console.warn('Failed to add favorite:', err));
    }
  }

  const coastal = (seeds: Seed[]) =>
    seeds.filter(s => s.region === 'finale-arc' || s.region === 'sestri-arc');

  const townsAndBeaches = [
    ...coastal(seedsByType['town']),
    ...coastal(seedsByType['beach']),
  ];

  const lodgingSestri = seedsByType['lodging'].filter(s => s.region === 'sestri-arc');
  const lodgingFinale = seedsByType['lodging'].filter(s => s.region === 'finale-arc');
  const wineries = coastal(seedsByType['winery']);
  const restaurants = coastal(seedsByType['restaurant']);
  const culturalSites = coastal(seedsByType['cultural-site']);

  function renderCards(seeds: Seed[]) {
    return seeds.map(seed => {
      const key = `${seed.type}:${seed.slug}`;
      return (
        <EntityCard
          key={`${seed.type}:${seed.slug}`}
          seed={seed}
          favorited={favSet.has(key)}
          onToggleFavorite={() => handleToggle(seed)}
        />
      );
    });
  }

  return (
    <div className="px-4 py-4 max-w-screen-md mx-auto space-y-8">
      <RegionMap regionFilter={['finale-arc', 'sestri-arc']} height="280px" />
      {townsAndBeaches.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">Towns and beaches</h2>
          <div className="space-y-3">{renderCards(townsAndBeaches)}</div>
        </section>
      )}

      {(lodgingSestri.length > 0 || lodgingFinale.length > 0) && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">Lodging</h2>
          {lodgingSestri.length > 0 && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-ink mb-2">Lodging — Sestri-arc</h3>
              <div className="space-y-3">{renderCards(lodgingSestri)}</div>
            </div>
          )}
          {lodgingFinale.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-ink mb-2">Lodging — Finale-arc</h3>
              <div className="space-y-3">{renderCards(lodgingFinale)}</div>
            </div>
          )}
        </section>
      )}

      {wineries.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">Wineries</h2>
          <div className="space-y-3">{renderCards(wineries)}</div>
        </section>
      )}

      {restaurants.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">Restaurants</h2>
          <div className="space-y-3">{renderCards(restaurants)}</div>
        </section>
      )}

      {culturalSites.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink mb-3">Cultural sites and trails</h2>
          <div className="space-y-3">{renderCards(culturalSites)}</div>
        </section>
      )}
    </div>
  );
}
