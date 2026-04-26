import { Link } from 'react-router-dom';
import RegionMap from '@/components/RegionMap';
import { seeds } from '@/data/catalog';

// ---------------------------------------------------------------------------
// Printable map seeds (slugs known from catalog)
// ---------------------------------------------------------------------------
const PRINTABLE_MAP_SLUGS = [
  'route-v3',
  'route-final',
  'utility-langhe-towns',
  'utility-finale-beaches',
] as const;

const printableMaps = PRINTABLE_MAP_SLUGS.map((slug) => ({
  slug,
  seed: seeds.find((s) => s.type === 'map' && s.slug === slug),
}));

export default function MapsPage() {
  return (
    <div className="px-4 py-4">
      <RegionMap height="60vh" />

      {/* Printable maps section */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink mb-2">Printable maps</h2>
        <ul className="space-y-1">
          {printableMaps.map(({ slug, seed }) => (
            <li key={slug}>
              <Link
                to={`/entity/map/${slug}`}
                className="flex items-center gap-2 py-2 text-sm text-accent hover:underline"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M1 5h12" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M9 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {seed?.name ?? slug}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
