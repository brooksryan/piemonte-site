import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { seedsByType, getSeed, searchIndex } from '@/data/catalog';
import type { EntityType } from '@/data/catalog';
import type { SearchRecord } from '@/data/catalog';
import { useActiveUser } from '@/lib/user';
import {
  listCalendar,
  addCalendarItem,
  updateCalendarItem,
  removeCalendarItem,
} from '@/lib/api';
import type { CalendarItem } from '@/lib/api';

// ─── Trip dates ──────────────────────────────────────────────────────────────

const TRIP_DATES = [
  '2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29',
  '2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02', '2026-06-03',
  '2026-06-04',
] as const;

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function formatDay(iso: string): { letter: string; day: number; monthLabel?: string } {
  const [, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(`${iso}T12:00:00`);
  const letter = WEEKDAY_LETTERS[date.getDay()];
  return {
    letter,
    day: d,
    monthLabel: m === 6 ? 'Jun' : undefined,
  };
}

// ─── Entity types excluded from the catalog picker ───────────────────────────

const EXCLUDED_FROM_PICKER: EntityType[] = ['region-narrative', 'map', 'drive'];

// ─── Tiny toast ──────────────────────────────────────────────────────────────

function OfflineToast({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
      [ placeholder ] backend offline — changes not persisted
    </div>
  );
}

// ─── Inline time-anchor editor ───────────────────────────────────────────────

function TimeAnchorEditor({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue);

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        className="flex-1 border border-border rounded px-2 py-1 text-sm bg-surface text-ink"
        placeholder="time anchor (e.g. lunch, 16:00)"
        value={val}
        onChange={e => setVal(e.target.value)}
        autoFocus
      />
      <button
        className="text-sm text-accent font-medium min-h-[44px] px-2"
        onClick={() => onSave(val)}
      >
        Save
      </button>
      <button
        className="text-sm text-muted min-h-[44px] px-2"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Lodging picker bottom sheet ─────────────────────────────────────────────

function LodgingPickerSheet({
  onPick,
  onClose,
}: {
  onPick: (slug: string) => void;
  onClose: () => void;
}) {
  const lodgings = seedsByType['lodging'];

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-paper rounded-t-2xl max-h-[60vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-2 text-sm font-semibold text-muted uppercase tracking-wide">
          Choose a hotel
        </div>
        {lodgings.map(l => (
          <button
            key={l.slug}
            className="w-full text-left px-4 py-3 min-h-[44px] border-t border-border text-ink hover:bg-surface"
            onClick={() => onPick(l.slug)}
          >
            <span className="font-medium">{l.name}</span>
            <span className="ml-2 text-xs text-muted">{l.region}</span>
          </button>
        ))}
        <button
          className="w-full text-center px-4 py-4 min-h-[44px] text-muted text-sm border-t border-border"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Catalog picker bottom sheet ─────────────────────────────────────────────

function CatalogPickerSheet({
  onPick,
  onClose,
}: {
  onPick: (type: EntityType, slug: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const filtered: SearchRecord[] = query.trim()
    ? searchIndex.filter(r => {
        if ((EXCLUDED_FROM_PICKER as string[]).includes(r.type)) return false;
        const q = query.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.town ?? '').toLowerCase().includes(q) ||
          r.tags.some(t => t.toLowerCase().includes(q))
        );
      })
    : searchIndex
        .filter(r => !(EXCLUDED_FROM_PICKER as string[]).includes(r.type))
        .slice(0, 40);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-paper rounded-t-2xl flex flex-col max-h-[75vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-2">
          <input
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface text-ink"
            placeholder="Search catalog…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(r => (
            <button
              key={`${r.type}:${r.slug}`}
              className="w-full text-left px-4 py-3 min-h-[44px] border-t border-border text-ink hover:bg-surface"
              onClick={() => onPick(r.type as EntityType, r.slug)}
            >
              <span className="font-medium">{r.name}</span>
              <span className="ml-2 text-xs text-muted">{r.type}</span>
              {r.town && <span className="ml-1 text-xs text-muted">· {r.town}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-muted text-sm text-center">No results</p>
          )}
        </div>
        <button
          className="w-full text-center px-4 py-4 min-h-[44px] text-muted text-sm border-t border-border"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Add custom entry modal ───────────────────────────────────────────────────

function CustomEntryForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (title: string, body: string, timeAnchor: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [timeAnchor, setTimeAnchor] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), body.trim(), timeAnchor.trim());
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-paper rounded-t-2xl px-4 pt-4 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-ink mb-4">Add custom entry</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide">Title *</label>
            <input
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface text-ink"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Cheese shop in Alba"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide">Notes (optional)</label>
            <textarea
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface text-ink resize-none"
              rows={2}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Any notes…"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide">Time anchor (optional)</label>
            <input
              className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface text-ink"
              value={timeAnchor}
              onChange={e => setTimeAnchor(e.target.value)}
              placeholder="e.g. morning, 10am, after lunch"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 bg-accent text-paper font-medium rounded-xl py-3 min-h-[44px] text-sm"
            >
              Add
            </button>
            <button
              type="button"
              className="flex-1 bg-surface text-ink rounded-xl py-3 min-h-[44px] text-sm"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add action sheet ─────────────────────────────────────────────────────────

function AddActionSheet({
  onAddFromCatalog,
  onAddCustom,
  onClose,
}: {
  onAddFromCatalog: () => void;
  onAddCustom: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-paper rounded-t-2xl px-4 pt-4 pb-8 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="w-full bg-surface text-ink text-base font-medium rounded-xl py-4 min-h-[44px] text-left px-5"
          onClick={() => { onClose(); onAddFromCatalog(); }}
        >
          Add from catalog
        </button>
        <button
          className="w-full bg-surface text-ink text-base font-medium rounded-xl py-4 min-h-[44px] text-left px-5"
          onClick={() => { onClose(); onAddCustom(); }}
        >
          Add custom entry
        </button>
        <button
          className="w-full text-muted text-sm py-3 min-h-[44px]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Custom entry row ─────────────────────────────────────────────────────────

function CustomRow({
  item,
  onEdit,
  onRemove,
}: {
  item: CalendarItem;
  onEdit: (id: string, timeAnchor: string, customTitle: string, customBody: string) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  function handleSaveAnchor(anchor: string) {
    onEdit(item.id, anchor, item.custom_title ?? '', item.custom_body ?? '');
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-ink">{item.custom_title}</span>
          {item.time_anchor && (
            <span className="ml-2 text-xs bg-surface text-accent-2 rounded px-1.5 py-0.5">
              {item.time_anchor}
            </span>
          )}
          {item.custom_body && (
            <p
              className={clsx(
                'text-sm text-muted mt-0.5 cursor-pointer',
                !expanded && 'line-clamp-2',
              )}
              onClick={() => setExpanded(v => !v)}
            >
              {item.custom_body}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted"
            onClick={() => setEditing(v => !v)}
            aria-label="Edit time anchor"
          >
            ✏️
          </button>
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted"
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
          >
            🗑
          </button>
        </div>
      </div>
      {editing && (
        <TimeAnchorEditor
          initialValue={item.time_anchor ?? ''}
          onSave={handleSaveAnchor}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ─── Entity row (section 2) ───────────────────────────────────────────────────

function EntityRow({
  item,
  onEditAnchor,
  onRemove,
}: {
  item: CalendarItem;
  onEditAnchor: (id: string, anchor: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const seed =
    item.entity_type && item.entity_slug
      ? getSeed(item.entity_type as EntityType, item.entity_slug)
      : undefined;

  const displayName = seed?.name ?? item.entity_slug ?? '(unknown)';
  const detailPath = `/entity/${item.entity_type}/${item.entity_slug}`;

  function handleSave(anchor: string) {
    onEditAnchor(item.id, anchor);
    setEditing(false);
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between gap-2">
        <Link to={detailPath} className="flex-1 min-w-0 flex items-center gap-2 min-h-[44px]">
          <span className="font-medium text-ink truncate">{displayName}</span>
          <span className="text-xs text-muted shrink-0">{item.entity_type}</span>
          {item.time_anchor && (
            <span className="text-xs bg-surface text-accent-2 rounded px-1.5 py-0.5 shrink-0">
              {item.time_anchor}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted"
            onClick={() => setEditing(v => !v)}
            aria-label="Edit time anchor"
          >
            ✏️
          </button>
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted"
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
          >
            🗑
          </button>
        </div>
      </div>
      {editing && (
        <TimeAnchorEditor
          initialValue={item.time_anchor ?? ''}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const [activeUser] = useActiveUser();

  // Persist selected date
  const [selectedDate, setSelectedDateRaw] = useState<string>(
    () => localStorage.getItem('piemonte.activeDate') ?? '2026-05-25',
  );

  function setSelectedDate(iso: string) {
    localStorage.setItem('piemonte.activeDate', iso);
    setSelectedDateRaw(iso);
  }

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet/modal state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [lodgingPickerOpen, setLodgingPickerOpen] = useState(false);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);

  // Toast
  const [offlineToast, setOfflineToast] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    try {
      const data = await listCalendar();
      setItems(data);
    } catch (err) {
      console.warn('Failed to load calendar:', err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
  }, [activeUser, fetchItems]);

  // ── Mutation helpers ───────────────────────────────────────────────────────

  async function withRefresh(fn: () => Promise<unknown>) {
    try {
      await fn();
      await fetchItems();
    } catch (err) {
      console.warn('Calendar mutation failed:', err);
      setOfflineToast(true);
    }
  }

  // ── Per-date item buckets ──────────────────────────────────────────────────

  const dayItems = items.filter(i => i.on_date === selectedDate);

  const hotelItem = dayItems.find(
    i => i.entity_type === 'lodging' && i.time_anchor === 'overnight',
  );

  const softItems = dayItems
    .filter(i => i.entity_slug !== null && !(i.entity_type === 'lodging' && i.time_anchor === 'overnight'))
    .sort((a, b) => {
      const aHas = a.time_anchor != null;
      const bHas = b.time_anchor != null;
      if (aHas && bHas) return (a.time_anchor ?? '').localeCompare(b.time_anchor ?? '');
      if (aHas) return -1;
      if (bHas) return 1;
      return a.created_at.localeCompare(b.created_at);
    });

  const customItems = dayItems.filter(i => i.entity_slug === null);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-md mx-auto pb-32">

      {/* Day strip */}
      <div className="sticky top-14 bg-paper z-20 border-b border-border">
        <div className="flex overflow-x-auto snap-x snap-mandatory px-2 py-2">
          {TRIP_DATES.map(iso => {
            const { letter, day, monthLabel } = formatDay(iso);
            const count = items.filter(i => i.on_date === iso).length;
            const isSelected = iso === selectedDate;

            return (
              <button
                key={iso}
                className={clsx(
                  'snap-start flex-shrink-0 w-16 h-20 mx-1 rounded-xl flex flex-col items-center justify-center gap-0.5',
                  isSelected ? 'bg-accent text-paper' : 'bg-surface text-ink',
                )}
                onClick={() => setSelectedDate(iso)}
                aria-pressed={isSelected}
              >
                <span className="text-xs font-medium opacity-80">{letter}</span>
                <span className="text-xl font-bold leading-none">
                  {monthLabel ? `${day}` : day}
                </span>
                {monthLabel && (
                  <span className="text-xs opacity-80">{monthLabel}</span>
                )}
                {count > 0 && (
                  <span className={clsx(
                    'text-xs rounded-full px-1.5 font-medium',
                    isSelected ? 'bg-paper/30 text-paper' : 'bg-accent/20 text-accent',
                  )}>
                    {count}
                  </span>
                )}
                {count === 0 && <span className="h-4" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-4 text-muted text-sm">Loading plan…</div>
      )}

      {/* Day detail panel */}
      {!loading && (
        <div className="mt-4">

          {/* Section 1 — Hotel */}
          <div className="mb-4">
            <h2 className="px-4 pb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Hotel for the night
            </h2>
            {hotelItem ? (() => {
              const lodgingSeed =
                hotelItem.entity_slug
                  ? getSeed('lodging', hotelItem.entity_slug)
                  : undefined;
              return (
                <div className="mx-4 bg-surface rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <Link
                    to={`/entity/lodging/${hotelItem.entity_slug}`}
                    className="flex-1 min-h-[44px] flex items-center"
                  >
                    <span className="font-medium text-ink">
                      {lodgingSeed?.name ?? hotelItem.entity_slug}
                    </span>
                  </Link>
                  <button
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted"
                    onClick={() => withRefresh(() => removeCalendarItem(hotelItem.id))}
                    aria-label="Remove hotel"
                  >
                    🗑
                  </button>
                </div>
              );
            })() : (
              <button
                className="mx-4 w-[calc(100%-2rem)] bg-surface rounded-xl px-4 min-h-[44px] flex items-center text-muted text-sm"
                onClick={() => setLodgingPickerOpen(true)}
              >
                [ placeholder ] no hotel set
              </button>
            )}
          </div>

          {/* Section 2 — Soft-added entities */}
          <div className="mb-4">
            <h2 className="px-4 pb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Activities &amp; places
            </h2>
            {softItems.length === 0 ? (
              <p className="px-4 text-sm text-muted">None added yet.</p>
            ) : (
              <div className="bg-paper border-t border-border">
                {softItems.map(item => (
                  <EntityRow
                    key={item.id}
                    item={item}
                    onEditAnchor={(id, anchor) =>
                      withRefresh(() => updateCalendarItem(id, { time_anchor: anchor }))
                    }
                    onRemove={id => withRefresh(() => removeCalendarItem(id))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3 — Custom entries */}
          <div className="mb-4">
            <h2 className="px-4 pb-2 text-xs font-semibold text-muted uppercase tracking-wide">
              Custom notes
            </h2>
            {customItems.length === 0 ? (
              <p className="px-4 text-sm text-muted">None added yet.</p>
            ) : (
              <div className="bg-paper border-t border-border">
                {customItems.map(item => (
                  <CustomRow
                    key={item.id}
                    item={item}
                    onEdit={(id, anchor, _title, _body) =>
                      withRefresh(() =>
                        updateCalendarItem(id, { time_anchor: anchor || undefined }),
                      )
                    }
                    onRemove={id => withRefresh(() => removeCalendarItem(id))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating add button */}
      <button
        className="fixed bottom-20 right-4 z-30 bg-accent text-paper w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center"
        onClick={() => setAddSheetOpen(true)}
        aria-label="Add to plan"
      >
        +
      </button>

      {/* Action sheet */}
      {addSheetOpen && (
        <AddActionSheet
          onAddFromCatalog={() => setCatalogPickerOpen(true)}
          onAddCustom={() => setCustomFormOpen(true)}
          onClose={() => setAddSheetOpen(false)}
        />
      )}

      {/* Lodging picker */}
      {lodgingPickerOpen && (
        <LodgingPickerSheet
          onPick={slug =>
            withRefresh(() =>
              addCalendarItem({
                on_date: selectedDate,
                entity_type: 'lodging',
                entity_slug: slug,
                time_anchor: 'overnight',
              }),
            ).then(() => setLodgingPickerOpen(false))
          }
          onClose={() => setLodgingPickerOpen(false)}
        />
      )}

      {/* Catalog picker */}
      {catalogPickerOpen && (
        <CatalogPickerSheet
          onPick={(type, slug) =>
            withRefresh(() =>
              addCalendarItem({
                on_date: selectedDate,
                entity_type: type,
                entity_slug: slug,
              }),
            ).then(() => setCatalogPickerOpen(false))
          }
          onClose={() => setCatalogPickerOpen(false)}
        />
      )}

      {/* Custom entry form */}
      {customFormOpen && (
        <CustomEntryForm
          onSubmit={(title, body, timeAnchor) =>
            withRefresh(() =>
              addCalendarItem({
                on_date: selectedDate,
                custom_title: title,
                custom_body: body || undefined,
                time_anchor: timeAnchor || undefined,
              }),
            ).then(() => setCustomFormOpen(false))
          }
          onClose={() => setCustomFormOpen(false)}
        />
      )}

      {/* Offline toast */}
      {offlineToast && <OfflineToast onDismiss={() => setOfflineToast(false)} />}
    </div>
  );
}
