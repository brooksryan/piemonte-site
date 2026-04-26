import { useEffect, useRef, useState } from 'react';
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

export default function CountrysidePage() {
  const [activeUser] = useActiveUser();
  const { favSet, favMap, setFavSet, setFavMap } = useFavorites(activeUser);

  // Keep a stable ref for favMap inside toggle callbacks
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

  const langhe = (seeds: Seed[]) => seeds.filter(s => s.region === 'langhe');

  const sections: Array<{ heading: string; seeds: Seed[] }> = [
    { heading: 'Towns', seeds: langhe(seedsByType['town']) },
    { heading: 'Lodging', seeds: langhe(seedsByType['lodging']) },
    { heading: 'Wineries', seeds: langhe(seedsByType['winery']) },
    { heading: 'Restaurants', seeds: langhe(seedsByType['restaurant']) },
    { heading: 'Cultural sites', seeds: langhe(seedsByType['cultural-site']) },
  ];

  return (
    <div className="px-4 py-4 max-w-screen-md mx-auto space-y-8">
      {sections.map(({ heading, seeds }) =>
        seeds.length === 0 ? null : (
          <section key={heading}>
            <h2 className="text-lg font-bold text-ink mb-3">{heading}</h2>
            <div className="space-y-3">
              {seeds.map(seed => {
                const key = `${seed.type}:${seed.slug}`;
                return (
                  <EntityCard
                    key={seed.slug}
                    seed={seed}
                    favorited={favSet.has(key)}
                    onToggleFavorite={() => handleToggle(seed)}
                  />
                );
              })}
            </div>
          </section>
        )
      )}
    </div>
  );
}
