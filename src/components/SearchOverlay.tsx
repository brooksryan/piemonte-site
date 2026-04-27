import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchIndex } from '../data/catalog';
import type { SearchRecord, EntityType } from '../data/catalog';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const GROUP_ORDER: EntityType[] = [
  'town',
  'lodging',
  'restaurant',
  'winery',
  'beach',
  'cultural-site',
  'map',
  'drive',
  'region-narrative',
];

const GROUP_LABELS: Record<EntityType, string> = {
  town: 'Towns',
  lodging: 'Lodging',
  restaurant: 'Restaurants',
  winery: 'Wineries',
  beach: 'Beaches',
  'cultural-site': 'Cultural Sites',
  map: 'Maps',
  drive: 'Drives',
  'region-narrative': 'Regions',
};

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      // Let the DOM settle before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 0);

  const filtered: SearchRecord[] = tokens.length > 0
    ? searchIndex.filter(r => {
        const haystack = [r.name, r.town ?? '', ...(r.tags ?? [])].join(' ').toLowerCase();
        return tokens.every(t => haystack.includes(t));
      })
    : searchIndex;

  // Group by type
  const grouped = new Map<EntityType, SearchRecord[]>();
  for (const r of filtered) {
    const list = grouped.get(r.type) ?? [];
    list.push(r);
    grouped.set(r.type, list);
  }

  function handleSelect(r: SearchRecord) {
    navigate(`/entity/${r.type}/${r.slug}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 top-14 z-40 bg-paper flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search"
          className="flex-1 h-9 bg-surface border border-border rounded-lg px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={onClose}
          aria-label="Close search"
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-ink transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-muted">[ placeholder ] no matches</p>
        ) : (
          GROUP_ORDER.map(type => {
            const items = grouped.get(type);
            if (!items || items.length === 0) return null;
            return (
              <div key={type}>
                <p className="px-4 pt-4 pb-1 text-xs font-semibold text-muted uppercase tracking-wide">
                  {GROUP_LABELS[type]}
                </p>
                {items.map(r => (
                  <button
                    key={`${r.type}-${r.slug}`}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-4 py-3 flex flex-col gap-0.5 hover:bg-surface transition-colors"
                  >
                    <span className="text-sm font-medium text-ink">{r.name}</span>
                    {r.town && (
                      <span className="text-xs text-muted">{r.town}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
