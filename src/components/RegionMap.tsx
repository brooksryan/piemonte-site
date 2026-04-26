import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { seeds } from '@/data/catalog';
import type { Seed, Region } from '@/data/catalog';

// ---------------------------------------------------------------------------
// Blurb helper — mirrors EntityCard's getBlurb inline
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Coordinate lookup — every entity we want to pin
// lat/lon sourced from open data; slug keys follow catalog kebab-case rules
// ---------------------------------------------------------------------------
const LOCATIONS: Record<string, { lat: number; lon: number; type: string }> = {
  // Towns — Langhe
  'barolo':                { lat: 44.6094, lon: 7.9460,  type: 'town' },
  'la-morra':              { lat: 44.6358, lon: 7.9347,  type: 'town' },
  'monforte-dalba':        { lat: 44.5544, lon: 7.9700,  type: 'town' },
  'castiglione-falletto':  { lat: 44.6175, lon: 7.9669,  type: 'town' },
  'serralunga-dalba':      { lat: 44.6133, lon: 7.9961,  type: 'town' },
  'barbaresco':            { lat: 44.7233, lon: 8.0870,  type: 'town' },
  'treiso':                { lat: 44.7017, lon: 8.0644,  type: 'town' },
  'neive':                 { lat: 44.7333, lon: 8.1167,  type: 'town' },
  'diano-dalba':           { lat: 44.6592, lon: 8.0472,  type: 'town' },
  'grinzane-cavour':       { lat: 44.6486, lon: 7.9923,  type: 'town' },

  // Towns — Liguria
  'albenga':               { lat: 44.0519, lon: 8.2167,  type: 'town' },
  'alassio':               { lat: 44.0061, lon: 8.1714,  type: 'town' },
  'laigueglia':            { lat: 43.9783, lon: 8.1583,  type: 'town' },
  'sestri-levante':        { lat: 44.2719, lon: 9.3958,  type: 'town' },
  'camogli':               { lat: 44.3500, lon: 9.1561,  type: 'town' },

  // Beaches
  'varigotti-baia-dei-saraceni': { lat: 44.1850, lon: 8.4111, type: 'beach' },
  'noli':                  { lat: 44.2056, lon: 8.4119,  type: 'beach' },
  'spotorno':              { lat: 44.2308, lon: 8.4197,  type: 'beach' },
  'bergeggi':              { lat: 44.2475, lon: 8.4517,  type: 'beach' },

  // Lodging
  'palazzo-finati':        { lat: 44.7011, lon: 8.0344,  type: 'lodging' },
  'hotel-calissano':       { lat: 44.7028, lon: 8.0356,  type: 'lodging' },
  'le-case-della-saracca': { lat: 44.5544, lon: 7.9700,  type: 'lodging' },
  'casa-scaparone':        { lat: 44.7172, lon: 7.9886,  type: 'lodging' },
  'hotel-medusa':          { lat: 44.1689, lon: 8.3439,  type: 'lodging' },
  'hotel-punta-est':       { lat: 44.1714, lon: 8.3550,  type: 'lodging' },
  'hotel-florenz':         { lat: 44.1733, lon: 8.3450,  type: 'lodging' },
  'hotel-helvetia':        { lat: 44.2728, lon: 9.3958,  type: 'lodging' },
  'hotel-vis-a-vis':       { lat: 44.2742, lon: 9.4019,  type: 'lodging' },
  'hotel-miramare-and-spa':{ lat: 44.2733, lon: 9.3950,  type: 'lodging' },
  'antica-locanda-solferino': { lat: 45.4753, lon: 9.1872, type: 'lodging' },
  'senato-hotel-milano':   { lat: 45.4717, lon: 9.1981,  type: 'lodging' },
  'hotel-berna':           { lat: 45.4839, lon: 9.2019,  type: 'lodging' },

  // Cultural sites
  'castello-di-grinzane-cavour':          { lat: 44.6494, lon: 7.9908, type: 'cultural-site' },
  'wimu-castello-falletti':               { lat: 44.6094, lon: 7.9460, type: 'cultural-site' },
  'chiesetta-di-tremlett':                { lat: 44.7339, lon: 8.1697, type: 'cultural-site' },
  'la-morra-belvedere-cappella-del-barolo': { lat: 44.6358, lon: 7.9347, type: 'cultural-site' },
  'grotte-di-toirano':                    { lat: 44.1283, lon: 8.2089, type: 'cultural-site' },
  'finalborgo-medieval-village':          { lat: 44.1733, lon: 8.3450, type: 'cultural-site' },
  'sentiero-del-pellegrino':              { lat: 44.1900, lon: 8.4117, type: 'cultural-site' },
  'abbazia-di-san-fruttuoso':             { lat: 44.3158, lon: 9.1731, type: 'cultural-site' },

  // Wineries
  'gd-vajra':                 { lat: 44.6133, lon: 7.9347, type: 'winery' },
  'cantina-mascarello-bartolo': { lat: 44.6094, lon: 7.9460, type: 'winery' },
  'punta-crena':              { lat: 44.1850, lon: 8.4111, type: 'winery' },

  // Restaurants
  'losteria-del-vignaiolo':         { lat: 44.6358, lon: 7.9347, type: 'restaurant' },
  'trattoria-della-posta':          { lat: 44.5544, lon: 7.9700, type: 'restaurant' },
  'osteria-dellarco':               { lat: 44.7011, lon: 8.0344, type: 'restaurant' },
  'macelleria-guido':               { lat: 44.7011, lon: 8.0344, type: 'restaurant' },
  'panetteria-giacosa':             { lat: 44.7011, lon: 8.0344, type: 'restaurant' },
  'bottega-manera':                 { lat: 44.7011, lon: 8.0344, type: 'restaurant' },
  'il-polpo-ubriaco':               { lat: 44.1850, lon: 8.4111, type: 'restaurant' },
  'ai-cuattru-canti':               { lat: 44.1733, lon: 8.3450, type: 'restaurant' },
  'ristorante-del-borgo':           { lat: 44.1733, lon: 8.3450, type: 'restaurant' },
  'ponte-antico':                   { lat: 44.2056, lon: 8.4119, type: 'restaurant' },
  'vescovado-noli':                 { lat: 44.2056, lon: 8.4119, type: 'restaurant' },
  'da-u-cicci':                     { lat: 44.1689, lon: 8.3439, type: 'restaurant' },
  'giorgio-il-fornaio':             { lat: 44.1733, lon: 8.3450, type: 'restaurant' },
  'polpo-mario':                    { lat: 44.2719, lon: 9.3958, type: 'restaurant' },
  'manuelina-recco':                { lat: 44.3625, lon: 9.1417, type: 'restaurant' },
  'agriturismo-olivenere-lavagna':  { lat: 44.3083, lon: 9.3450, type: 'restaurant' },
  'osteria-papa-nicola':            { lat: 45.4839, lon: 9.2019, type: 'restaurant' },
  'trattoria-trippa':               { lat: 45.4561, lon: 9.1958, type: 'restaurant' },
  'le-vitel-etonne':                { lat: 45.0703, lon: 7.6869, type: 'restaurant' },
};

// ---------------------------------------------------------------------------
// Color mapping by entity type / region
// ---------------------------------------------------------------------------
function markerColor(slug: string, type: string): string {
  if (type === 'town' || type === 'beach') {
    const seed = seedBySlugAndType(slug, type);
    if (seed && seed.region === 'langhe') return '#b08a3e';
    return '#2f6b8a'; // finale-arc, sestri-arc, city, other → liguria-blue (or default)
  }
  if (type === 'lodging')       return '#8c2f1f';
  if (type === 'winery')        return '#3a5a40';
  if (type === 'restaurant')    return '#1a1a1a';
  if (type === 'cultural-site') return '#6b6b66';
  return '#6b6b66';
}

// ---------------------------------------------------------------------------
// Build index of seeds by type:slug for fast lookup
// ---------------------------------------------------------------------------
const seedBySlug = new Map<string, Seed>();
for (const seed of seeds) {
  seedBySlug.set(`${seed.type}:${seed.slug}`, seed);
}
const seedBySlugAndType = (slug: string, type: string): Seed | undefined =>
  seedBySlug.get(`${type}:${slug}`);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface RegionMapProps {
  regionFilter?: Region[];
  height?: string;
  fitToFiltered?: boolean;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

interface Selected {
  slug: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RegionMap({
  regionFilter,
  height = '60vh',
  fitToFiltered = regionFilter !== undefined,
  defaultCenter = [8.4, 44.5],
  defaultZoom = 7.5,
}: RegionMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  const selectedSeed = selected
    ? seedBySlugAndType(selected.slug, selected.type)
    : null;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: defaultCenter,
      zoom: defaultZoom,
      pitchWithRotate: false,
    });

    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    mapRef.current = map;

    map.on('load', () => {
      // ---------------------------------------------------------------------------
      // Build a unified candidate list merging seed-driven mapPin coords with the
      // legacy LOCATIONS fallback. Seeds with mapPin take precedence; LOCATIONS
      // entries are only included when no seed-driven entry already covers that
      // slug+type pair (de-duplication by slug+type key).
      // ---------------------------------------------------------------------------
      interface Candidate {
        slug: string;
        type: string;
        lat: number;
        lon: number;
      }

      const candidates: Candidate[] = [];
      const seedDrivenKeys = new Set<string>();

      // Source (a): every seed in the catalog whose mapPin is truthy
      for (const seed of seeds) {
        if ('mapPin' in seed && seed.mapPin) {
          candidates.push({
            slug: seed.slug,
            type: seed.type,
            lat: seed.mapPin.lat,
            lon: seed.mapPin.lon,
          });
          seedDrivenKeys.add(`${seed.type}:${seed.slug}`);
        }
      }

      // Source (b): LOCATIONS entries not already covered by a seed-driven entry
      for (const [slug, loc] of Object.entries(LOCATIONS)) {
        if (!seedDrivenKeys.has(`${loc.type}:${slug}`)) {
          candidates.push({ slug, type: loc.type, lat: loc.lat, lon: loc.lon });
        }
      }

      // Collect kept entries for potential fitBounds
      const keptCoords: [number, number][] = [];

      for (const candidate of candidates) {
        const seed = seedBySlugAndType(candidate.slug, candidate.type);
        if (!seed) continue;

        // Apply region filter if provided
        if (regionFilter !== undefined && !regionFilter.includes(seed.region as Region)) {
          continue;
        }

        const color = markerColor(candidate.slug, candidate.type);
        keptCoords.push([candidate.lon, candidate.lat]);

        const el = document.createElement('div');
        el.style.cssText = `
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          cursor: pointer;
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([candidate.lon, candidate.lat])
          .addTo(map);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelected({ slug: candidate.slug, type: candidate.type });
        });

        void marker;
      }

      // Fit bounds to filtered pins if requested and we have at least 2 points
      if (fitToFiltered && keptCoords.length >= 2) {
        const bounds = keptCoords.reduce(
          (b, coord) => b.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(keptCoords[0], keptCoords[0])
        );
        map.fitBounds(bounds, { padding: 32, maxZoom: 13 });
      } else if (fitToFiltered && keptCoords.length === 1) {
        map.setCenter(keptCoords[0]);
        map.setZoom(13);
      }
    });

    map.on('click', () => {
      setSelected(null);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ height }}
    >
      {/* Map canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom sheet — absolute to the map container, not the viewport */}
      {selected && (
        <>
          {/* Transparent scrim to capture taps outside the sheet */}
          <div
            className="absolute inset-0 z-10"
            onClick={() => setSelected(null)}
          />

          {/* Sheet panel */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
            <div className="bg-surface border border-border rounded-2xl shadow-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  {selectedSeed ? (
                    <>
                      <p className="text-base font-semibold text-ink leading-snug">
                        {selectedSeed.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5 capitalize">
                        {selectedSeed.region} · {selectedSeed.type.replace('-', ' ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-semibold text-ink">{selected.slug}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="h-8 w-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-paper transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {selectedSeed && (
                <>
                  {(() => {
                    const blurb = getBlurb(selectedSeed);
                    return blurb ? (
                      <p className="text-sm text-ink line-clamp-3 mb-3">{blurb}</p>
                    ) : null;
                  })()}
                  <Link
                    to={`/entity/${selected.type}/${selected.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent"
                    onClick={() => setSelected(null)}
                  >
                    View detail
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </>
              )}

              {!selectedSeed && (
                <p className="text-sm text-muted">No catalog entry found for this location.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
