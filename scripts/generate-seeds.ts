import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { SeedSchema, SearchRecordSchema, type Seed, type SearchRecord } from '../src/data/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_ROOT = path.resolve(__dirname, '..');
const SEEDS_DIR = path.join(SITE_ROOT, 'src', 'data', 'seeds');
const FOLIO_PATH = path.resolve(__dirname, '../..', 'folios', 'options', 'v4', 'folio.data.json');

// ─── Load folio ───────────────────────────────────────────────────────────────
const folio = JSON.parse(fs.readFileSync(FOLIO_PATH, 'utf-8'));

const langheBlurbs: Array<{ n: number; name: string; drive: string; register: string; body: string; link?: { label: string; url: string } }> =
  folio['utility-langhe'].blurbs;

const finaleBlurbs: Array<{ n: number; name: string; drive: string; register: string; body: string; link?: { label: string; url: string } }> =
  folio['utility-finale'].blurbs;

const atlasEntries: Array<{
  name: string; town: string; register: string; 'place-id': string; url: string;
  booking: string; 'what-to-order': string;
}> = folio.atlas.entries;

const regionsPre: Array<{
  heading: string; tagline: string; narrative: string[];
  anchors: Array<{ name?: string; label?: string; note: string; url?: string; 'place-id'?: string }>;
  food?: Array<{ name?: string; label?: string; note: string; register: string; url?: string }>;
}> = folio['regions-pre'];

const regionsCoast: Array<{
  heading: string; tagline: string; narrative: string[];
  anchors: Array<{ name?: string; label?: string; note: string; url?: string; 'place-id'?: string }>;
  food?: Array<{ name?: string; label?: string; note: string; register: string; url?: string }>;
}> = folio['regions-coast'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDriveMin(drive: string): number {
  const m = drive.match(/^(\d+)\s*min/);
  return m ? parseInt(m[1], 10) : 0;
}

function anchorName(a: { name?: string; label?: string }): string {
  return (a.name ?? a.label ?? '').trim();
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────
const catalog: Seed[] = [];

// ── Maps (4) ──────────────────────────────────────────────────────────────────
catalog.push({
  slug: 'route-v3',
  name: 'Route Map v3',
  type: 'map',
  region: 'other',
  sourceLocator: 'folios/options/v4/folio.data.json :: v4.map',
  svgPath: '/folios/shared/assets/maps/route-v3.svg',
  kind: 'route',
  blurbs: [],
});

catalog.push({
  slug: 'route-final',
  name: 'Route Map Final',
  type: 'map',
  region: 'other',
  sourceLocator: 'folios/shared/assets/maps/route-final.svg :: final.map',
  svgPath: '/folios/shared/assets/maps/route-final.svg',
  kind: 'route',
  blurbs: [],
});

catalog.push({
  slug: 'utility-langhe-towns',
  name: 'Langhe Towns Map',
  type: 'map',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: v4.utility-langhe.svg-path',
  svgPath: '/folios/shared/assets/maps/utility-langhe-towns.svg',
  kind: 'utility-langhe',
  blurbs: langheBlurbs.map((b, i) => ({
    index: i,
    title: b.name,
    body: b.body,
  })),
});

catalog.push({
  slug: 'utility-finale-beaches',
  name: 'Finale Beaches Map',
  type: 'map',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: v4.utility-finale.svg-path',
  svgPath: '/folios/shared/assets/maps/utility-finale-beaches.svg',
  kind: 'utility-finale',
  blurbs: finaleBlurbs.map((b, i) => ({
    index: i,
    title: b.name,
    body: b.body,
  })),
});

// ── Langhe Towns (10) ─────────────────────────────────────────────────────────
const langheSlugMap: Record<string, string> = {
  'Barolo': 'barolo',
  'La Morra': 'la-morra',
  "Monforte d'Alba": 'monforte-dalba',
  'Castiglione Falletto': 'castiglione-falletto',
  "Serralunga d'Alba": 'serralunga-dalba',
  'Barbaresco': 'barbaresco',
  'Treiso': 'treiso',
  'Neive': 'neive',
  "Diano d'Alba": 'diano-dalba',
  'Grinzane Cavour': 'grinzane-cavour',
};

langheBlurbs.forEach((b, i) => {
  const slug = langheSlugMap[b.name];
  if (!slug) throw new Error(`No slug mapping for Langhe town: ${b.name}`);
  catalog.push({
    slug,
    name: b.name,
    type: 'town',
    region: 'langhe',
    sourceLocator: `folios/options/v4/folio.data.json :: utility-langhe.blurbs[${i}]`,
    blurb: b.body,
    driveTimeMin: parseDriveMin(b.drive),
    url: b.link?.url,
  });
});

// ── Liguria Towns (5) ─────────────────────────────────────────────────────────

// Albenga, Alassio, Laigueglia from utility-finale.blurbs[5,6,7]
const liguriaTownBlurbMap: Array<{ idx: number; slug: string; region: 'finale-arc' | 'sestri-arc' }> = [
  { idx: 5, slug: 'albenga', region: 'finale-arc' },
  { idx: 6, slug: 'alassio', region: 'finale-arc' },
  { idx: 7, slug: 'laigueglia', region: 'finale-arc' },
];

liguriaTownBlurbMap.forEach(({ idx, slug, region }) => {
  const b = finaleBlurbs[idx];
  catalog.push({
    slug,
    name: b.name,
    type: 'town',
    region,
    sourceLocator: `folios/options/v4/folio.data.json :: utility-finale.blurbs[${idx}]`,
    blurb: b.body,
    driveTimeMin: parseDriveMin(b.drive),
    url: b.link?.url,
  });
});

// Sestri Levante from regions-coast[0]
const sestriCoast = regionsCoast[0];
catalog.push({
  slug: 'sestri-levante',
  name: 'Sestri Levante',
  type: 'town',
  region: 'sestri-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[0]',
  blurb: sestriCoast.narrative.join('\n\n'),
  url: 'https://www.comune.sestri-levante.ge.it/',
});

// Camogli from regions-coast[0].anchors[3]
const camogliAnchor = sestriCoast.anchors[3];
catalog.push({
  slug: 'camogli',
  name: 'Camogli',
  type: 'town',
  region: 'sestri-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[0].anchors[3]',
  blurb: camogliAnchor.note,
  url: camogliAnchor.url,
});

// ── Beaches (4) from utility-finale.blurbs[0,1,2,3] ──────────────────────────
const beachDef = [
  { idx: 0, slug: 'varigotti-baia-dei-saraceni', town: 'Varigotti' },
  { idx: 1, slug: 'noli', town: 'Noli' },
  { idx: 2, slug: 'spotorno', town: 'Spotorno' },
  { idx: 3, slug: 'bergeggi', town: 'Bergeggi' },
];

beachDef.forEach(({ idx, slug, town }) => {
  const b = finaleBlurbs[idx];
  catalog.push({
    slug,
    name: b.name,
    type: 'beach',
    region: 'finale-arc',
    sourceLocator: `folios/options/v4/folio.data.json :: utility-finale.blurbs[${idx}]`,
    town,
    character: b.register,
    driveTimeMin: parseDriveMin(b.drive),
    blurb: b.body,
  });
});

// ── Lodging (13) ──────────────────────────────────────────────────────────────
catalog.push({
  slug: 'palazzo-finati',
  name: 'Palazzo Finati',
  type: 'lodging',
  region: 'langhe',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:77-87',
  base: 'alba-langhe',
  platform: 'direct',
  url: 'https://www.palazzofinati.it',
  address: 'Via Vernazza 8, 12051 Alba CN',
  placeId: 'ChIJB_Ps5AWz0hIRIdMarYW3ga8',
  rateBand: '€180-220/night',
  why: 'Nine-room boutique in a 19th-century palazzo, two blocks from Piazza Risorgimento and Via Vittorio Emanuele. Walkable to every Alba pick the Food expert is likely to surface (Osteria dell\'Arco, La Piola, Locanda del Pilone, etc.), and walkable to the Saturday market at Piazza Marconi. Frescoed ceilings, real breakfast, parking arranged. No on-site kitchen, so technically violates the rural-kitchen rule — but Alba qualifies as "city" under the traveler profile (walkable to restaurants), not "rural," so the kitchen rule does not bind.',
});

catalog.push({
  slug: 'hotel-calissano',
  name: 'Hotel Calissano',
  type: 'lodging',
  region: 'langhe',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:88-98',
  base: 'alba-langhe',
  platform: 'direct',
  url: 'https://www.hotelcalissano.com',
  address: 'Via Pola 8, 12051 Alba CN',
  placeId: 'ChIJmY1yD2az0hIR4eu_OVyRhAw',
  rateBand: '€170-200/night',
  why: 'Larger four-star a 6-minute walk from the historic center, near the train station. More predictable than Palazzo Finati if Brooks wants amenities (parking on site, gym, lounge) over historic-palazzo character. Fits the "really nice but not resort" register.',
});

catalog.push({
  slug: 'le-case-della-saracca',
  name: 'Le Case della Saracca',
  type: 'lodging',
  region: 'langhe',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:112-122',
  base: 'alba-langhe',
  platform: 'direct',
  url: 'https://www.saracca.com',
  address: "Via Cavour 3/5, 12065 Monforte d'Alba CN",
  placeId: 'ChIJb-0kaBqw0hIRbTcKpHFd3ac',
  rateBand: '€180-260/night',
  why: "Cave-cut rooms inside the medieval village, walkable to the village's two-restaurant strip. Kitchen is not in-room, but the property has a real downstairs enoteca and the Food expert's Monforte picks are walkable. Drive to Alba is 26 min for the Saturday market.",
});

catalog.push({
  slug: 'casa-scaparone',
  name: 'Casa Scaparone',
  type: 'lodging',
  region: 'langhe',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:123-133',
  base: 'alba-langhe',
  platform: 'direct',
  url: 'https://www.casascaparone.it',
  address: 'Strada Scaparoni 45, 12051 Alba CN',
  placeId: 'ChIJm93Ftc-y0hIReDaFsqUEhg0',
  rateBand: '€140-180/night',
  why: 'Working agriturismo with restaurant, organic garden, vineyard view. Three apartments with kitchens. Six minutes\' drive from Alba center. Honors the kitchen requirement and the Angela-loves-agriturismo preference, while staying close enough to Alba to walk into market on Saturday after a 7-min drive + park.',
});

catalog.push({
  slug: 'hotel-helvetia',
  name: 'Hotel Helvetia',
  type: 'lodging',
  region: 'sestri-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:146-155',
  base: 'sestri',
  platform: 'direct',
  url: 'https://www.hotelhelvetia.it',
  address: 'Via Cappuccini 43, 16039 Sestri Levante GE',
  placeId: 'ChIJ_3NmgA6X1BIRENl-zBP6mjA',
  rateBand: '€260-340/night',
  why: 'Twenty-one rooms, two-minute walk down the steps to the Bay of Silence, family-run since 1928. Garden, sea views, no resort apparatus. The kind of place a Ligurian family takes its grandparents. Walkable to the entire Sestri restaurant strip on the isthmus.',
});

catalog.push({
  slug: 'hotel-vis-a-vis',
  name: 'Hotel Vis a Vis',
  type: 'lodging',
  region: 'sestri-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:157-167',
  base: 'sestri',
  platform: 'direct',
  url: 'https://www.hotelvisavis.com',
  address: 'Via della Chiusa 28, 16039 Sestri Levante GE',
  placeId: 'ChIJ5wGJwg6X1BIRzgY0aL5Hak0',
  rateBand: '€280-380/night',
  why: 'Set above the town with a panoramic terrace, connected to the historic center by a private elevator that drops you in town. Pool. The "really nice with a view" pick for Angela\'s slow-roof-with-a-view register. Larger than Helvetia and edges into resort territory; I would still call it inside the boundary because it lacks a casino-bar-conference apparatus.',
});

catalog.push({
  slug: 'hotel-miramare-and-spa',
  name: 'Hotel Miramare and Spa',
  type: 'lodging',
  region: 'sestri-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:168-177',
  base: 'sestri',
  platform: 'direct',
  url: 'https://www.miramaresestrilevante.com',
  address: 'Via V. Cappellini 9, 16039 Sestri Levante GE',
  placeId: 'ChIJqfjiSAyX1BIRxnBC5ve9qew',
  rateBand: '€300-420/night',
  why: 'Directly on the Bay of Silence — front rooms open to the bay. A bit more "spa-and-restaurant" than Helvetia, fewer family-pension cues. Take this over Helvetia only if direct sand access from the elevator is the deciding factor.',
});

catalog.push({
  slug: 'hotel-medusa',
  name: 'Hotel Medusa',
  type: 'lodging',
  region: 'finale-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:204-211',
  base: 'finale',
  platform: 'direct',
  url: 'https://www.medusahotel.it',
  address: 'Vico Bricchieri 7, 17024 Finale Ligure SV',
  placeId: 'ChIJr8ludYf50hIRbII2QmHSFR0',
  rateBand: '€140-200/night',
  why: 'Three-star family-run inside Finalmarina\'s small old streets, two blocks from the beach. Reads more apartment-block than resort. 4.6 Google rating across 740+ reviews is real — that\'s not a freshly-launched-and-padded review profile. Walkable to Finalborgo via the lungomare (20 min flat).',
});

catalog.push({
  slug: 'hotel-punta-est',
  name: 'Hotel Punta Est',
  type: 'lodging',
  region: 'finale-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:213-222',
  base: 'finale',
  platform: 'direct',
  url: 'https://www.puntaest.com',
  address: 'Via Aurelia 1, 17024 Finale Ligure SV',
  placeId: 'ChIJV581stz70hIRrYTZf2xlCFM',
  rateBand: '€230-320/night',
  why: '18th-century villa with sea-view garden, on the headland between Finalmarina and Varigotti. The "really nice with character" pick. Pool in a stone garden, not a resort pool. Walking down to a swimmable beach is 8-10 min and uphill back; if Angela has any knee opinion this is a tradeoff. Take this over Medusa if Brooks wants a property with quiet-villa register.',
});

catalog.push({
  slug: 'hotel-florenz',
  name: 'Hotel Florenz',
  type: 'lodging',
  region: 'finale-arc',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:223-233',
  base: 'finale',
  platform: 'direct',
  url: 'https://www.florenzhotel.com',
  address: 'Via Domenico Brunenghi 124, 17024 Finale Ligure SV',
  placeId: 'ChIJWf3nwSH60hIRCNHyljR5YOY',
  rateBand: '€150-220/night',
  why: 'Central Finalmarina, 5-min walk to the beach. Modern rather than historic. Useful as a backup if Medusa and Punta Est are full on the dates.',
});

catalog.push({
  slug: 'antica-locanda-solferino',
  name: 'Antica Locanda Solferino',
  type: 'lodging',
  region: 'city',
  sourceLocator: 'itineraries/data/lodging-shortlist-v3-milan.md:26-38',
  base: 'milan',
  platform: 'direct',
  url: 'https://www.anticalocandasolferino.it',
  address: 'Via Castelfidardo 2, 20121 Milano MI',
  placeId: 'ChIJl6bNKjrGhkcRMGLPb0mElFs',
  rateBand: '€260-340/night',
  why: 'Eleven rooms, family-run since 1926, set inside Brera\'s pedestrian inner streets — the kind of small pension that takes a continuous 2-night booking without comment, the kind of address Milanese actors and writers used between the wars. No restaurant, no spa, no resort apparatus. The neighborhood does dinner; the locanda does sleep.',
});

catalog.push({
  slug: 'senato-hotel-milano',
  name: 'Senato Hotel Milano',
  type: 'lodging',
  region: 'city',
  sourceLocator: 'itineraries/data/lodging-shortlist-v3-milan.md:53-66',
  base: 'milan',
  platform: 'direct',
  url: 'https://www.senatohotelmilano.it/en',
  address: 'Via Senato 22, 20121 Milano MI',
  placeId: 'ChIJ_QIctFjGhkcRRb3Ub2oXPDc',
  rateBand: '€380-520/night',
  why: "Forty-three-room boutique 4-star inside an early-1900s building with an internal stone courtyard. Rooftop terrace, lounge bar, no resort overlay. Closest of these picks to the Quadrilatero's western edge — Via Sant'Andrea is ~5 min on foot. Reads as the \"splurge with a quiet courtyard\" pick if Brooks wants a hotel register more substantial than Antica Locanda.",
});

catalog.push({
  slug: 'hotel-berna',
  name: 'Hotel Berna',
  type: 'lodging',
  region: 'city',
  sourceLocator: 'itineraries/data/lodging-shortlist.md:21-31',
  base: 'milan',
  platform: 'direct',
  url: 'https://www.hotelberna.com',
  address: 'Via Napo Torriani 18, 20124 Milano MI',
  placeId: 'ChIJ5WPqpcXGhkcRrOGVM1wS6nQ',
  rateBand: '€240-280/night',
  why: 'Family-run, four-star independent two blocks east of Centrale. About a 4-minute walk to the platforms. Has a real on-site restaurant (Mediterranea) which solves the 11:00 PM jet-lag arrival problem on May 25. Rooms are unfussy and quiet. It avoids the chain-hotel register that Brooks and Angela have explicitly opted against.',
});

// ── Wineries (3) ──────────────────────────────────────────────────────────────
const vajra = atlasEntries[11];
catalog.push({
  slug: 'gd-vajra',
  name: 'G.D. Vajra',
  type: 'winery',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: atlas.entries[11]',
  town: vajra.town,
  visitPolicy: vajra.booking,
  placeId: vajra['place-id'],
  url: vajra.url,
  blurb: vajra['what-to-order'],
});

const mascarello = atlasEntries[13];
catalog.push({
  slug: 'cantina-mascarello-bartolo',
  name: 'Cantina Mascarello Bartolo',
  type: 'winery',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: atlas.entries[13]',
  town: mascarello.town,
  visitPolicy: mascarello.booking,
  placeId: mascarello['place-id'],
  blurb: mascarello['what-to-order'],
});

const puntaCrenaBlurb = finaleBlurbs[4];
catalog.push({
  slug: 'punta-crena',
  name: 'Punta Crena',
  type: 'winery',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: utility-finale.blurbs[4]',
  town: 'Varigotti',
  visitPolicy: 'by appt',
  url: puntaCrenaBlurb.link?.url,
  blurb: puntaCrenaBlurb.body,
});

// ── Restaurants (19) ──────────────────────────────────────────────────────────

// Langhe restaurants from atlas
const langheRestaurantDefs: Array<{ idx: number; slug: string; region: 'langhe' }> = [
  { idx: 10, slug: 'losteria-del-vignaiolo', region: 'langhe' },
  { idx: 12, slug: 'trattoria-della-posta', region: 'langhe' },
  { idx: 9,  slug: 'osteria-dellarco', region: 'langhe' },
  { idx: 6,  slug: 'macelleria-guido', region: 'langhe' },
  { idx: 7,  slug: 'panetteria-giacosa', region: 'langhe' },
  { idx: 8,  slug: 'bottega-manera', region: 'langhe' },
];

langheRestaurantDefs.forEach(({ idx, slug, region }) => {
  const e = atlasEntries[idx];
  catalog.push({
    slug,
    name: e.name,
    type: 'restaurant',
    region,
    sourceLocator: `folios/options/v4/folio.data.json :: atlas.entries[${idx}]`,
    town: e.town,
    register: e.register,
    placeId: e['place-id'] || undefined,
    url: e.url || undefined,
    blurb: e['what-to-order'],
  });
});

// Finale-arc restaurants from atlas
const finaleRestaurantDefs: Array<{ idx: number; slug: string }> = [
  { idx: 16, slug: 'il-polpo-ubriaco' },
  { idx: 15, slug: 'ai-cuattru-canti' },
  { idx: 17, slug: 'ristorante-del-borgo' },
  { idx: 18, slug: 'ponte-antico' },
  { idx: 19, slug: 'vescovado-noli' },
  { idx: 14, slug: 'da-u-cicci' },
  { idx: 20, slug: 'giorgio-il-fornaio' },
];

finaleRestaurantDefs.forEach(({ idx, slug }) => {
  const e = atlasEntries[idx];
  catalog.push({
    slug,
    name: e.name,
    type: 'restaurant',
    region: 'finale-arc',
    sourceLocator: `folios/options/v4/folio.data.json :: atlas.entries[${idx}]`,
    town: e.town,
    register: e.register,
    placeId: e['place-id'] || undefined,
    url: e.url || undefined,
    blurb: e['what-to-order'],
  });
});

// Milan/Turin restaurants from atlas entries 1, 2, 3
const cityRestaurantDefs: Array<{ idx: number; slug: string; region: 'city' }> = [
  { idx: 1, slug: 'osteria-papa-nicola', region: 'city' },
  { idx: 2, slug: 'trattoria-trippa', region: 'city' },
  { idx: 3, slug: 'le-vitel-etonne', region: 'city' },
];

cityRestaurantDefs.forEach(({ idx, slug, region }) => {
  const e = atlasEntries[idx];
  catalog.push({
    slug,
    name: e.name,
    type: 'restaurant',
    region,
    sourceLocator: `folios/options/v4/folio.data.json :: atlas.entries[${idx}]`,
    town: e.town,
    register: e.register,
    placeId: e['place-id'] || undefined,
    url: e.url || undefined,
    blurb: e['what-to-order'],
  });
});

// Sestri-arc restaurants from regions-coast[0].food
const sestriFood = sestriCoast.food ?? [];
// food[0] = Polpo Mario, food[2] = Manuelina Recco, food[4] = Agriturismo Olivenere Lavagna
const sestriRestaurantDefs: Array<{ foodIdx: number; slug: string; name: string; town: string }> = [
  { foodIdx: 0, slug: 'polpo-mario', name: 'Polpo Mario', town: 'Sestri Levante' },
  { foodIdx: 2, slug: 'manuelina-recco', name: 'Manuelina, Recco', town: 'Recco' },
  { foodIdx: 4, slug: 'agriturismo-olivenere-lavagna', name: 'Agriturismo Olivenere, Lavagna', town: 'Lavagna' },
];

sestriRestaurantDefs.forEach(({ foodIdx, slug, name, town }) => {
  const f = sestriFood[foodIdx];
  catalog.push({
    slug,
    name,
    type: 'restaurant',
    region: 'sestri-arc',
    sourceLocator: `folios/options/v4/folio.data.json :: regions-coast[0].food[${foodIdx}]`,
    town,
    register: f.register,
    url: f.url || undefined,
    blurb: f.note,
  });
});

// ── Cultural Sites (8) ────────────────────────────────────────────────────────
const langheAnchors = regionsPre[2].anchors;

// WiMu / Castello Falletti — from utility-langhe.blurbs[0] (Barolo), combined with Langhe narrative mention
catalog.push({
  slug: 'wimu-castello-falletti',
  name: 'WiMu / Castello Falletti',
  type: 'cultural-site',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: utility-langhe.blurbs[0]',
  town: 'Barolo',
  category: 'museum',
  url: 'https://www.wimubarolo.it/',
  blurb: 'Castello Falletti and the WiMu wine museum, walkable cobble streets between four enotecas. Lunch at La Cantinetta. Buy the Cannubi at the cellar, not the gift shop.',
});

// Langhe anchors[1] = Chiesetta di Tremlett, anchors[2] = Castello di Grinzane Cavour, anchors[3] = La Morra Belvedere
// Note: regionsPre[2].anchors[0] = Tuesday Alba market (not a cultural site)
// anchors[1] = Chiesetta di Tremlett
const tremblett = langheAnchors[1];
catalog.push({
  slug: 'chiesetta-di-tremlett',
  name: 'Chiesetta di Tremlett',
  type: 'cultural-site',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[2].anchors[1]',
  town: 'Coazzolo',
  category: 'chapel',
  url: tremblett.url,
  blurb: tremblett.note,
});

// anchors[2] = Castello di Grinzane Cavour
const grinzane = langheAnchors[2];
catalog.push({
  slug: 'castello-di-grinzane-cavour',
  name: 'Castello di Grinzane Cavour',
  type: 'cultural-site',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[2].anchors[2]',
  town: 'Grinzane Cavour',
  category: 'castle',
  url: grinzane.url,
  blurb: grinzane.note,
});

// anchors[3] = La Morra Belvedere / Cappella del Barolo
const cappella = langheAnchors[3];
catalog.push({
  slug: 'cappella-del-barolo',
  name: 'La Morra Belvedere / Cappella del Barolo',
  type: 'cultural-site',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[2].anchors[3]',
  town: 'La Morra',
  category: 'chapel',
  url: cappella.url,
  blurb: cappella.note,
});

// Coastal cultural sites from regions-coast[1].anchors[0,2,3] and regions-coast[0].anchors[2]
const finaleAnchors = regionsCoast[1].anchors;

// anchors[0] = Grotte di Toirano
const toirano = finaleAnchors[0];
catalog.push({
  slug: 'grotte-di-toirano',
  name: 'Grotte di Toirano',
  type: 'cultural-site',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[1].anchors[0]',
  town: 'Toirano',
  category: 'cave',
  url: toirano.url,
  blurb: toirano.note,
});

// anchors[2] = Sentiero del Pellegrino
const sentiero = finaleAnchors[2];
catalog.push({
  slug: 'sentiero-del-pellegrino',
  name: 'Sentiero del Pellegrino',
  type: 'cultural-site',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[1].anchors[2]',
  town: 'Varigotti',
  category: 'trail',
  url: sentiero.url,
  blurb: sentiero.note,
});

// anchors[3] = Finalborgo medieval village
const finalborgo = finaleAnchors[3];
catalog.push({
  slug: 'finalborgo',
  name: 'Finalborgo medieval village',
  type: 'cultural-site',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[1].anchors[3]',
  town: 'Finalborgo',
  category: 'medieval-village',
  url: finalborgo.url,
  blurb: finalborgo.note,
});

// regions-coast[0].anchors[2] = Abbazia di San Fruttuoso
const abbazia = sestriCoast.anchors[2];
catalog.push({
  slug: 'abbazia-di-san-fruttuoso',
  name: 'Abbazia di San Fruttuoso',
  type: 'cultural-site',
  region: 'sestri-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[0].anchors[2]',
  town: 'Camogli',
  category: 'abbey',
  url: abbazia.url,
  blurb: abbazia.note,
});

// ── Region Narratives (5) ──────────────────────────────────────────────────────

// Milan — regions-pre[0]
const milanRegion = regionsPre[0];
catalog.push({
  slug: 'region-milan',
  name: 'Milan',
  type: 'region-narrative',
  region: 'city',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[0]',
  body: milanRegion.narrative.join('\n\n'),
  anchors: milanRegion.anchors.map(a => ({
    name: anchorName(a),
    blurb: a.note,
    url: a.url,
  })),
});

// Turin — regions-pre[1]
const turinRegion = regionsPre[1];
catalog.push({
  slug: 'region-turin',
  name: 'Turin',
  type: 'region-narrative',
  region: 'city',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[1]',
  body: turinRegion.narrative.join('\n\n'),
  anchors: turinRegion.anchors.map(a => ({
    name: anchorName(a),
    blurb: a.note,
    url: a.url,
  })),
});

// Langhe — regions-pre[2]
const langheRegion = regionsPre[2];
catalog.push({
  slug: 'region-langhe',
  name: 'Langhe',
  type: 'region-narrative',
  region: 'langhe',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-pre[2]',
  body: langheRegion.narrative.join('\n\n'),
  anchors: langheRegion.anchors.map(a => ({
    name: anchorName(a),
    blurb: a.note,
    url: a.url,
  })),
});

// Sestri Levante — regions-coast[0]
catalog.push({
  slug: 'region-sestri-levante',
  name: 'Sestri Levante',
  type: 'region-narrative',
  region: 'sestri-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[0]',
  body: sestriCoast.narrative.join('\n\n'),
  anchors: sestriCoast.anchors.map(a => ({
    name: anchorName(a),
    blurb: a.note,
    url: a.url,
  })),
});

// Finale Ligure — regions-coast[1]
const finaleRegion = regionsCoast[1];
catalog.push({
  slug: 'region-finale-ligure',
  name: 'Finale Ligure',
  type: 'region-narrative',
  region: 'finale-arc',
  sourceLocator: 'folios/options/v4/folio.data.json :: regions-coast[1]',
  body: finaleRegion.narrative.join('\n\n'),
  anchors: finaleRegion.anchors.map(a => ({
    name: anchorName(a),
    blurb: a.note,
    url: a.url,
  })),
});

// ─── Validate and write seeds ─────────────────────────────────────────────────
const typeCounts: Record<string, number> = {};

for (const seed of catalog) {
  // Validate
  const validated = SeedSchema.parse(seed);

  // Ensure directory exists
  const typeDir = path.join(SEEDS_DIR, validated.type);
  fs.mkdirSync(typeDir, { recursive: true });

  // Write file
  const outPath = path.join(typeDir, `${validated.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');

  typeCounts[validated.type] = (typeCounts[validated.type] ?? 0) + 1;
}

// ─── Build and write search index ─────────────────────────────────────────────
const searchIndex: SearchRecord[] = catalog.map(seed => {
  const tags: string[] = [seed.type, seed.region];

  if ('town' in seed && seed.town) tags.push(seed.town);
  if ('register' in seed && seed.register) tags.push(seed.register);
  if ('character' in seed && seed.character) tags.push(seed.character);
  if ('category' in seed && seed.category) tags.push(seed.category);
  if ('base' in seed && seed.base) tags.push(seed.base);
  if ('platform' in seed && seed.platform) tags.push(seed.platform);
  if ('kind' in seed && seed.kind) tags.push(seed.kind);

  const record: SearchRecord = {
    slug: seed.slug,
    type: seed.type,
    name: seed.name,
    region: seed.region,
    tags: [...new Set(tags)],
  };

  if ('town' in seed && seed.town) record.town = seed.town;

  return SearchRecordSchema.parse(record);
});

fs.writeFileSync(
  path.join(SITE_ROOT, 'src', 'data', 'search-index.json'),
  JSON.stringify(searchIndex, null, 2) + '\n',
  'utf-8',
);

// ─── Summary ──────────────────────────────────────────────────────────────────
const totalSeeds = catalog.length;
const totalTypes = Object.keys(typeCounts).length;
console.log(`wrote ${totalSeeds} seeds across ${totalTypes} types; search index has ${searchIndex.length} records`);
console.log('breakdown:', typeCounts);
