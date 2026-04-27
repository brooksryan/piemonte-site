import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSeed } from '../data/catalog';
import type { Seed, EntityType } from '../data/catalog';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  addCalendarItem,
} from '../lib/api';
import { useActiveUser } from '../lib/user';
import { googleMapsHref } from '../lib/google-maps';
import RelatedStrip from '../components/RelatedStrip';

const PLAN_DATES = [
  '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29',
  '2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02', '2026-06-03',
  '2026-06-04',
];

const DATE_STORAGE_KEY = 'piemonte.activeDate';
const FALLBACK_DATE = '2026-05-25';

function getDefaultDate(): string {
  try {
    const stored = localStorage.getItem(DATE_STORAGE_KEY);
    if (stored && PLAN_DATES.includes(stored)) return stored;
  } catch {
    // ignore
  }
  return FALLBACK_DATE;
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block text-xs bg-paper border border-border rounded-full px-2 py-0.5 text-muted">
      {label}
    </span>
  );
}

function LabeledRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted min-w-[6rem] shrink-0">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

interface FavoriteState {
  loaded: boolean;
  isFav: boolean;
  favId: string | null;
}

function useFavoriteForSeed(seed: Seed, user: string) {
  const [state, setState] = useState<FavoriteState>({ loaded: false, isFav: false, favId: null });

  useEffect(() => {
    let cancelled = false;
    listFavorites()
      .then(favorites => {
        if (cancelled) return;
        const match = favorites.find(
          f => f.entity_type === seed.type && f.entity_slug === seed.slug,
        );
        setState({ loaded: true, isFav: !!match, favId: match?.id ?? null });
      })
      .catch(err => {
        console.warn('Failed to load favorites:', err);
        setState({ loaded: true, isFav: false, favId: null });
      });
    return () => { cancelled = true; };
  }, [seed.type, seed.slug, user]);

  return { state, setState };
}

interface SeedBodyProps {
  seed: Seed;
}

function SeedBody({ seed }: SeedBodyProps) {
  switch (seed.type) {
    case 'region-narrative':
      return (
        <div className="space-y-4">
          {seed.body.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm text-ink leading-relaxed">{para}</p>
          ))}
          {seed.anchors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-base font-semibold text-ink mb-2">Anchors</h3>
              <ul className="space-y-2">
                {seed.anchors.map(a => (
                  <li key={a.name} className="text-sm">
                    <span className="font-medium text-ink">{a.name}</span>
                    {a.blurb && <span className="text-muted"> — {a.blurb}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );

    case 'lodging':
      return (
        <div className="space-y-2">
          {seed.address && <LabeledRow label="Address" value={seed.address} />}
          {seed.placeId && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted min-w-[6rem] shrink-0">Place ID</span>
              <code className="text-xs text-ink font-mono break-all">{seed.placeId}</code>
            </div>
          )}
          <LabeledRow label="Rate band" value={seed.rateBand} />
          <p className="text-sm text-ink leading-relaxed mt-2">{seed.why}</p>
        </div>
      );

    case 'restaurant':
      return (
        <div className="space-y-2">
          <LabeledRow label="Town" value={seed.town} />
          <LabeledRow label="Register" value={seed.register} />
          {seed.blurb && <p className="text-sm text-ink leading-relaxed mt-2">{seed.blurb}</p>}
        </div>
      );

    case 'winery':
      return (
        <div className="space-y-2">
          <LabeledRow label="Town" value={seed.town} />
          <LabeledRow label="Visit policy" value={seed.visitPolicy} />
          {seed.blurb && <p className="text-sm text-ink leading-relaxed mt-2">{seed.blurb}</p>}
        </div>
      );

    case 'cultural-site':
      return (
        <div className="space-y-2">
          <LabeledRow label="Town" value={seed.town} />
          <LabeledRow label="Category" value={seed.category} />
          {seed.blurb && <p className="text-sm text-ink leading-relaxed mt-2">{seed.blurb}</p>}
        </div>
      );

    case 'beach':
      return (
        <div className="space-y-2">
          {seed.imageUrl ? (
            <>
              <img
                src={seed.imageUrl}
                alt={seed.name}
                loading="lazy"
                className="w-full h-64 object-cover rounded-xl mb-2"
              />
              {seed.imageCredit && (
                <p className="text-xs text-muted mb-4">Photo: {seed.imageCredit}</p>
              )}
            </>
          ) : (
            <div className="w-full h-48 rounded-xl bg-liguria/10 flex items-center justify-center text-liguria text-xl font-semibold mb-4">
              {seed.name}
            </div>
          )}
          <LabeledRow label="Town" value={seed.town} />
          <LabeledRow label="Character" value={seed.character} />
          {seed.blurb && <p className="text-sm text-ink leading-relaxed mt-2">{seed.blurb}</p>}
        </div>
      );

    case 'town':
      return (
        <div className="space-y-2">
          {seed.blurb && <p className="text-sm text-ink leading-relaxed">{seed.blurb}</p>}
        </div>
      );

    case 'map':
      return (
        <div className="space-y-4">
          <img src={seed.svgPath} className="w-full" alt={seed.name} />
          {seed.blurbs.length > 0 && (
            <ul className="space-y-2">
              {seed.blurbs.map(b => (
                <li key={b.index} className="text-sm">
                  <span className="font-medium text-ink">{b.title}</span>
                  {b.body && <span className="text-muted"> — {b.body}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case 'drive':
      return (
        <div className="space-y-2">
          <LabeledRow label="From" value={seed.from} />
          <LabeledRow label="To" value={seed.to} />
          <LabeledRow label="Duration" value={`${seed.durationMin} min`} />
        </div>
      );
  }
}

export default function DetailPage() {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const [activeUser] = useActiveUser();

  const seed = getSeed(type as EntityType, slug ?? '');

  const { state: favState, setState: setFavState } = useFavoriteForSeed(
    // If seed not found we still need a stable object; the component will bail early
    seed ?? { type: 'town', slug: '', name: '', region: 'other', sourceLocator: '', blurb: '' },
    activeUser,
  );

  // Action sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!seed) {
    return (
      <div className="p-4">
        [ placeholder ] no entity for {type}/{slug}
      </div>
    );
  }

  function toggleFavorite() {
    if (!seed) return;
    if (favState.isFav && favState.favId != null) {
      removeFavorite(favState.favId).then(() => {
        setFavState({ loaded: true, isFav: false, favId: null });
      }).catch(err => console.warn('Failed to remove favorite:', err));
    } else {
      addFavorite({ entity_type: seed.type, entity_slug: seed.slug }).then(fav => {
        setFavState({ loaded: true, isFav: true, favId: fav.id });
      }).catch(err => console.warn('Failed to add favorite:', err));
    }
  }

  function handleAddToPlan() {
    if (!seed) return;
    addCalendarItem({
      on_date: selectedDate,
      entity_type: seed.type,
      entity_slug: seed.slug,
    }).then(() => {
      try { localStorage.setItem(DATE_STORAGE_KEY, selectedDate); } catch { /* ignore */ }
      setSheetOpen(false);
      showToast(`Added to ${selectedDate}`);
    }).catch(err => {
      console.warn('Failed to add calendar item:', err);
      setSheetOpen(false);
      showToast('Failed to add — backend may be offline');
    });
  }

  return (
    <div className="px-4 py-4 max-w-screen-md mx-auto">
      {/* Header row */}
      <div className="flex items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-ink">{seed.name}</h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Tag label={seed.type} />
            <Tag label={seed.region} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0 mt-0.5">
          {/* Add to plan */}
          <button
            onClick={() => setSheetOpen(true)}
            className="h-10 px-3 text-sm font-medium bg-accent text-white rounded-lg"
            aria-label="Add to plan"
          >
            + Plan
          </button>

          {/* Heart toggle */}
          {favState.loaded && (
            <button
              onClick={toggleFavorite}
              aria-label={favState.isFav ? 'Remove from favorites' : 'Add to favorites'}
              className={`h-10 w-10 flex items-center justify-center rounded-full border border-border transition-colors ${favState.isFav ? 'text-accent' : 'text-muted hover:text-ink'}`}
            >
              {favState.isFav ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                  <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M9 15.5S2 10.5 2 6a4 4 0 0 1 7-2.7A4 4 0 0 1 16 6c0 4.5-7 9.5-7 9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="mb-6">
        <SeedBody seed={seed} />
      </div>

      <RelatedStrip seed={seed} />

      {/* Google Maps link */}
      <div className="mb-4">
        <a
          href={googleMapsHref(seed)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent underline"
        >
          Open in Google Maps
        </a>
      </div>

      {/* Source */}
      <div className="border-t border-border pt-4 text-sm text-muted">
        Source: <code className="text-xs font-mono break-all">{seed.sourceLocator}</code>
      </div>

      {/* Add-to-plan action sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative bg-paper rounded-t-2xl p-4 space-y-4 pb-8">
            <h2 className="text-base font-semibold text-ink">Add to a Plan day</h2>
            <div className="grid grid-cols-4 gap-2">
              {PLAN_DATES.map(date => {
                const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${selectedDate === date ? 'bg-accent text-white border-accent' : 'border-border text-ink hover:bg-surface'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddToPlan}
                className="flex-1 py-3 bg-accent text-white text-sm font-semibold rounded-xl"
              >
                Add to {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 py-3 border border-border text-ink text-sm font-semibold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
}
