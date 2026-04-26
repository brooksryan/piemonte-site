# Piemonte and Liguria Site - v1 PRD

This PRD is the binding spec for piemonte-dev and piemonte-devops. It assumes the resolved-decisions list at the top of `agent-prompts.md` and supersedes anything in `site-proposal.md` that contradicts the sections below.

## 1. Problem statement

Brooks and Angela own the trip-shape work themselves. The earlier folio passes over-planned around two competing options and a day-by-day grid, which collapsed the moment Brooks reviewed it. The site reverts that move: it is a catalog of every option the planning agents surfaced plus a thin curation layer that lets the two of them soft-add picks into a personal plan they assemble on their phones. The site does not pick Option A or Option B, does not propose a day-by-day shape, and does not push feedback to the planning agents. Brooks and Angela do the curation; the site holds the catalog and remembers what they pick.

## 2. Users

The two users are Brooks Ryan and Angela Bottarini. They use the site on their phones, primarily at home in San Francisco before the trip and on the train and in cafes during the trip itself. Desktop is a non-goal for v1; the layout is mobile-first and a desktop visit should still render legibly without bespoke breakpoints.

Soft-auth model:

- A circle avatar sits in the upper-left of the header. It shows the letter "A" or "B" depending on which user is active.
- Tapping the avatar opens a small "switch user" sheet with two rows, one labelled Brooks and one labelled Angela. Tapping a row sets the active user and dismisses the sheet.
- The active user persists in `localStorage` under the key `piemonte.activeUser` (values `brooks` or `angela`). On first load the active user defaults to `brooks`.
- Every API call sends the active user as the `x-user-name` request header. The Express server validates the header against the same `('brooks','angela')` set the database constraint enforces and rejects anything else with a 400.
- There is no password, no email, no session token, no logout. I am accepting that anyone with the URL can switch between the two users at will, because the URL is private and the data is not sensitive.

## 3. Success criteria for v1

A v1 release counts as done when Brooks confirms that, on his phone:

- He can view all sections.
- He can use the site as a resource for planning.
- He can ask Claude post-launch for more things to be seeded into the catalog for review and adding to the trip plan.
- Maps work.
- Search works.
- Per-entity detail pages work.

These are the binding criteria. Anything not in this list is either out of scope or a nice-to-have we do not block the URL share on.

## 4. Page list

The site has four top-level pages plus the per-entity Detail page pattern. Routes are flat under the root: `/`, `/maps`, `/countryside`, `/coastal`, `/plan`, `/entity/:type/:slug`. The root path redirects to `/maps`.

Every entity below cites its locator from `site-content-audit.md` so piemonte-dev can trace each catalog record back to source during seed generation.

### 4.1 Maps page (`/maps`)

The Maps page renders an interactive MapLibre GL JS map with OpenFreeMap tiles. Every catalog entity that carries a place_id, lat/lon, or named town anchor surfaces as a pin. Tapping a pin opens a bottom sheet with the entity's name, region, blurb, and a link to its Detail page. The four printable SVGs from the existing folio remain in the repo as fallback assets and are reachable from a small "printable maps" link at the bottom of the page; the live experience is the interactive map.

Pin sources, keyed to the audit:

- 10 Langhe towns - `site-content-audit.md` Countryside, `v4 :: utility-langhe.blurbs[0..9]`.
- 8 Finale-arc beach/town entries - Coastal, `v4 :: utility-finale.blurbs[0..7]`.
- 2 Liguria coast towns - Coastal, `v4 :: regions-coast[0]` (Sestri Levante) and `v4 :: regions-coast[0].anchors[3]` (Camogli).
- 13 lodging properties with place_ids - place_ids table at the bottom of `site-content-audit.md`.
- 4 Langhe cultural sites - Countryside, `v4 :: regions-pre[2].anchors[1..3]` plus `v4 :: utility-langhe.blurbs[0]`.
- 4 coastal cultural and trail sites - Coastal, `v4 :: regions-coast[1].anchors[0..3]` and `v4 :: regions-coast[0].anchors[2]`.

The four legacy SVGs remain seeded as `map`-type catalog records:

- route-v3.svg - Maps page, `v4.map`.
- route-final.svg - Maps page, `final.map`.
- utility-langhe-towns.svg - Maps page, `v4.utility-langhe.svg-path`.
- utility-finale-beaches.svg - Maps page, `v4.utility-finale.svg-path`.

### 4.2 Countryside page (`/countryside`)

A single-column scroll of cards grouped by entity type. Section order: Towns, Lodging, Wineries, Restaurants, Cultural sites. Each card carries the entity name, its region tag, a one-line blurb, and a tap target that routes to the Detail page. A heart icon on each card toggles the favorite for the active user.

Entities carried, with their audit locators:

- Towns (10): Barolo `v4 :: utility-langhe.blurbs[0]`, La Morra `[1]`, Monforte d'Alba `[2]`, Castiglione Falletto `[3]`, Serralunga d'Alba `[4]`, Barbaresco `[5]`, Treiso `[6]`, Neive `[7]`, Diano d'Alba `[8]`, Grinzane Cavour `[9]`.
- Lodging (4): Palazzo Finati `lodging-shortlist.md:77-87`, Hotel Calissano `:88-98`, Le Case della Saracca `:112-122`, Casa Scaparone `:123-133`.
- Wineries (2): G.D. Vajra `v4 :: atlas.entries[11]`, Cantina Mascarello Bartolo `v4 :: atlas.entries[13]`.
- Restaurants and bars (6): L'Osteria del Vignaiolo `v4 :: atlas.entries[10]`, Trattoria della Posta `[12]`, Osteria dell'Arco `[9]`, Macelleria Guido `[6]`, Panetteria Giacosa `[7]`, Bottega Manera `[8]`.
- Cultural sites (4): Castello di Grinzane Cavour `v4 :: regions-pre[2].anchors[2]`, WiMu / Castello Falletti `v4 :: utility-langhe.blurbs[0]`, Chiesetta di Tremlett `v4 :: regions-pre[2].anchors[1]`, La Morra Belvedere / Cappella del Barolo `v4 :: regions-pre[2].anchors[3]`.

### 4.3 Coastal page (`/coastal`)

Same single-column-of-cards layout as Countryside, with one structural difference: lodging is split into two parallel sub-sections, one for Sestri-arc and one for Finale-arc, presented as parallel catalog entries rather than as a comparison.

Entities carried, with their audit locators:

- Towns and beaches (10): Varigotti `v4 :: utility-finale.blurbs[0]`, Noli `[1]`, Spotorno `[2]`, Bergeggi `[3]`, Albenga `[5]`, Alassio `[6]`, Laigueglia `[7]`, Sestri Levante `v4 :: regions-coast[0]`, Camogli `v4 :: regions-coast[0].anchors[3]`. Punta Crena appears as a winery entry rather than a town entry.
- Lodging - Sestri-arc (3): Hotel Helvetia `lodging-shortlist.md:146-155`, Hotel Vis a Vis `:157-167`, Hotel Miramare and Spa `:168-177`.
- Lodging - Finale-arc (3): Hotel Medusa `lodging-shortlist.md:204-211`, Hotel Punta Est `:213-222`, Hotel Florenz `:223-233`.
- Wineries (1): Punta Crena `v4 :: utility-finale.blurbs[4]`.
- Restaurants (7): Il Polpo Ubriaco `v4 :: atlas.entries[16]`, Ai Cuattru Canti `[15]`, Ristorante del Borgo `[17]`, Ponte Antico `[18]`, Vescovado Noli `[19]`, Da U Cicci `[14]`, Giorgio il fornaio `[20]`. Plus the three Sestri-arc partial entries from the audit: Polpo Mario `v4 :: regions-coast[0].food[0]`, Manuelina, Recco `v4 :: regions-coast[0].food[2]`, Agriturismo Olivenere, Lavagna `v4 :: regions-coast[0].food[4]`.
- Cultural sites and trails (4): Grotte di Toirano `v4 :: regions-coast[1].anchors[0]`, Finalborgo medieval village `v4 :: regions-coast[1].anchors[3]`, Sentiero del Pellegrino `v4 :: regions-coast[1].anchors[2]`, Abbazia di San Fruttuoso `v4 :: regions-coast[0].anchors[2]`.

### 4.4 Plan page (`/plan`)

The Plan page is the primary curation surface and replaces what earlier drafts called Calendar and Itinerary. It merges the high-level day-grid view with the per-day detail view onto a single screen. This is the longest spec in the PRD because the page carries the most behavior.

Layout, top to bottom:

- A fixed 11-day horizontal strip pinned just below the header. The strip lists every day from Mon May 25 2026 through Thu Jun 4 2026 inclusive, in order: May 25, May 26, May 27, May 28, May 29, May 30, May 31, Jun 1, Jun 2, Jun 3, Jun 4. Each day is a tile showing the weekday letter, the day number, and a small dot count badge representing the number of items planned for that day (hotel + soft-added entities + custom entries). The strip scrolls horizontally on phones and snaps tile-by-tile. The currently selected day is visually emphasized with a filled background.
- Below the strip, a per-day detail panel renders the contents of the selected day. The panel does not navigate to a separate page; tapping a different day in the strip swaps the panel contents in place.

The per-day detail panel contains three stacked sections in this order:

1. Hotel for the night. A single card showing the lodging entity assigned as the "hotel for this date" if one exists, with a tap target to its Detail page. If no hotel is assigned, the section renders a placeholder row labelled "[ placeholder ] no hotel set" with a tap target that opens a lodging picker drawing from catalog lodging entries. Assigning a hotel writes a `calendar_items` row with `entity_type = 'lodging'`, the lodging slug, the date, and `time_anchor = 'overnight'`.
2. Soft-added entities for the date. A list of every `calendar_items` row for the active user where `on_date` matches the selected day and `entity_slug` is non-null. Each row shows the entity name, its type, and the optional `time_anchor` value (a free-text field the user types, for example "lunch", "16:00", "morning"). Tapping a row routes to the entity's Detail page. A trash icon removes the entry. A small pencil icon opens an inline editor for the time anchor.
3. Custom entries for the date. A list of every `calendar_items` row for the active user where `on_date` matches the selected day and `entity_slug` is null. Each row shows the `custom_title`, the `custom_body` (truncated with a tap-to-expand), and the optional `time_anchor`. A trash icon removes the entry. A pencil icon opens an inline editor.

Below the three sections sits an "add" affordance: a small floating button that opens an action sheet with two options:

- "Add from catalog" - opens a bottom-sheet entity picker that reuses the search overlay's index and writes a new `calendar_items` row with the picked entity, the selected date, and an optional time anchor.
- "Add custom entry" - opens a form with three fields: a required title, an optional body, and an optional time anchor (free-text). On submit, writes a `calendar_items` row with `entity_type = null`, `entity_slug = null`, and the three text fields populated.

Pinning behavior: any soft-added entity can carry a time anchor, which is the user's free-text label for when in the day the item happens. The PRD does not impose a time format on `time_anchor`; the field is text and Brooks can write "10am", "after lunch", or "evening" as he prefers. Sort order inside section 2 is: rows with a `time_anchor` first sorted alphabetically by the anchor string, then rows without a `time_anchor` in `created_at` order.

The Plan page reads `calendar_items` for the active user once on mount and refreshes after every mutation. There is no real-time sync between Brooks's view and Angela's view. They see each other's edits on next page load.

### 4.5 Detail page (`/entity/:type/:slug`)

Every catalog entity has a deterministic detail route of the form `/entity/<type>/<slug>`, where `<type>` is one of `town | lodging | restaurant | winery | beach | map | drive | cultural-site | region-narrative` and `<slug>` is the catalog seed's slug. The page shows:

- Entity name, type, region tag.
- Full blurb or narrative body.
- Source links pulled from the seed's `sourceLocator`.
- For lodging: address, place_id, rate band, why-it-was-shortlisted note.
- For restaurants and wineries: town, register, place_id when present, source link.
- A heart toggle that adds or removes a `favorites` row for the active user.
- An "add to plan" button that opens the same action-sheet flow the Plan page uses, defaulting to the currently selected Plan day if one is set in `localStorage`, falling back to May 25, 2026.
- A small map preview when the entity has a place_id or coordinates.

Detail pages are pure reads against the catalog seed JSON plus per-user state, so they render on direct deep-link without any catalog-page state.

## 5. Data model

The site has two stores. The catalog is read-only and bundled at build time. Per-user state is writable and lives in Neon Postgres.

### 5.1 Catalog (read-only, build-time JSON)

Catalog entities live as one JSON file per entity at `site/src/data/seeds/<type>/<slug>.json`. The valid types are `town`, `lodging`, `restaurant`, `winery`, `beach`, `map`, `drive`, `cultural-site`, `region-narrative`. A build-time loader script reads every file under `seeds/`, validates each against its Zod schema, and emits a typed module the client imports.

Every seed file carries at minimum:

- `slug` - stable string, kebab-case, unique within its type.
- `name` - display name.
- `region` - one of `langhe | finale-arc | sestri-arc | city | other`.
- `sourceLocator` - a single string of the form `folios/options/v4/folio.data.json :: utility-langhe.blurbs[3]` or `itineraries/data/lodging-shortlist.md:77-87`. The string traces the seed back to the source the planning agents wrote.

Type-specific shapes:

- `town`: adds `blurb` (string), optional `driveTimeMin` (number), optional `mapPin` (`{ lat: number, lon: number }`), optional `placeId`.
- `lodging`: adds `base` (one of `milan | alba-langhe | sestri | finale | mxp | turin`), `platform` (`direct | booking | airbnb`), optional `url`, `address`, optional `placeId`, `rateBand` (string, for example "E180-220/nt"), `why` (one-paragraph rationale).
- `restaurant`: adds `town`, `register` (string, for example "trattoria", "michelin", "focaccia"), optional `placeId`, optional `url`, `blurb`.
- `winery`: adds `town`, `visitPolicy` (string, for example "by appt"), optional `placeId`, optional `url`, `blurb`.
- `beach`: adds `town`, `character` (string, for example "dark sand cove"), optional `driveTimeMin`, optional `placeId`, `blurb`.
- `map`: adds `svgPath` (string, repo-relative), `kind` (`route | utility-langhe | utility-finale`), `blurbs` (array of `{ index: number, title: string, body: string }`).
- `drive`: adds `from` (slug), `to` (slug), `durationMin` (number).
- `cultural-site`: adds `town`, `category` (string, for example "castle", "museum", "trail"), optional `placeId`, optional `url`, `blurb`.
- `region-narrative`: adds `region`, `body` (multi-paragraph markdown), `anchors` (array of `{ name: string, blurb: string, placeId?: string }`).

The build-time loader also flattens every seed into the search index file at `site/src/data/search-index.json` with one record per entity of shape `{ slug, type, name, town?, region?, tags: string[] }`.

### 5.2 Per-user state (writable, Neon Postgres)

Three tables. The `user_name` column is constrained to the literal set `('brooks','angela')`. There are no foreign keys to the catalog; the catalog ships as static JSON and rename hazards are accepted.

```sql
create table favorites (
  id           bigserial primary key,
  user_name    text not null check (user_name in ('brooks','angela')),
  entity_type  text not null,
  entity_slug  text not null,
  created_at   timestamptz not null default now(),
  unique (user_name, entity_type, entity_slug)
);

create table itinerary_items (
  id            bigserial primary key,
  user_name     text not null check (user_name in ('brooks','angela')),
  entity_type   text,
  entity_slug   text,
  position      integer not null,
  note          text,
  custom_title  text,
  custom_body   text,
  time_anchor   text,
  created_at    timestamptz not null default now(),
  check (
    (entity_type is not null and entity_slug is not null)
    or (custom_title is not null)
  )
);

create table calendar_items (
  id            bigserial primary key,
  user_name     text not null check (user_name in ('brooks','angela')),
  entity_type   text,
  entity_slug   text,
  on_date       date not null,
  time_anchor   text,
  note          text,
  custom_title  text,
  custom_body   text,
  created_at    timestamptz not null default now(),
  check (
    (entity_type is not null and entity_slug is not null)
    or (custom_title is not null)
  )
);
```

The `entity_type` and `entity_slug` columns on `itinerary_items` and `calendar_items` are nullable so a row can stand alone as a custom entry with only `custom_title`, `custom_body`, and `time_anchor`. The check constraint requires either an entity reference or a custom title, so an entirely empty row cannot be inserted.

### 5.3 API routes

Express routes live under `/api`. Every route reads the active user from the `x-user-name` header and rejects requests where the header is missing or not in the constrained set.

- `GET /api/favorites` - returns the active user's favorites.
- `POST /api/favorites` - body `{ entity_type, entity_slug }`. Idempotent on the unique constraint.
- `DELETE /api/favorites/:id`.
- `GET /api/itinerary` - returns the active user's itinerary items, ordered by `position`.
- `POST /api/itinerary` - body accepts either an entity reference (`entity_type`, `entity_slug`) plus optional `note`, or a custom entry (`custom_title`, optional `custom_body`, optional `time_anchor`). Server assigns `position`.
- `PATCH /api/itinerary/:id` - body accepts any of `position`, `note`, `custom_title`, `custom_body`, `time_anchor`.
- `DELETE /api/itinerary/:id`.
- `GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` - returns the active user's calendar items in the date range, defaulting to the full May 25 - Jun 4 window when the params are absent.
- `POST /api/calendar` - body accepts `on_date` plus either an entity reference or a custom entry, plus optional `time_anchor` and `note`.
- `PATCH /api/calendar/:id` - body accepts any of `on_date`, `time_anchor`, `note`, `custom_title`, `custom_body`.
- `DELETE /api/calendar/:id`.

## 6. Catalog seeding workflow

The catalog grows by one PR per addition. Brooks's expected post-launch loop:

1. Brooks tells Claude in chat that he wants a new entity in the catalog, for example "add Cervo as a coastal town" or "add Locanda da X as a Langhe restaurant".
2. Claude (or a Sonnet research subagent Claude spawns) verifies the candidate against public sources, gathers the fields the seed shape requires for that entity type, and writes a new file at `site/src/data/seeds/<type>/<slug>.json`. The file carries a fresh `slug`, the canonical `name`, the `region` tag, the `sourceLocator` pointing at whatever new source got cited, and the type-specific fields from section 5.1.
3. Claude opens a PR. piemonte-devops's `deploy_on_push: true` setting ships the new entity to the live site on merge, because the build-time loader picks the new seed up automatically and regenerates the search index.

Two operational notes for piemonte-dev:

- The build must fail loudly if a seed file does not validate against its type's Zod schema. I would rather a bad seed block deploy than ship a broken Detail page.
- The slug uniqueness check is per-type, so a `town` and a `winery` can both have slug `barolo`.

## 7. Mobile constraints

The site is mobile-first and the primary device is an iPhone-class phone in portrait. The constraints below are binding, not aspirational.

- Touch targets are at least 44pt on the smaller dimension. Cards, list rows, header buttons, and Plan-strip day tiles all comply.
- The layout is single-column on phones. No multi-column grids on screens narrower than 768px.
- The header is fixed at 56pt tall. The user-toggle avatar sits in the upper-left at 40pt. The search input fills the remaining horizontal space with 8pt margins on either side. There is no nav menu in the header; navigation lives in a bottom tab bar with five tabs (Maps, Countryside, Coastal, Plan, and a search shortcut that focuses the header input).
- Tapping the header search input expands a full-screen overlay that covers everything below the header. The overlay shows a single text field at the top and a categorized result list below (Towns, Lodging, Restaurants, Wineries, Beaches, Cultural sites, Maps). Tapping a result routes to its Detail page and dismisses the overlay. A close button in the upper-right of the overlay dismisses without navigating.
- No horizontal scroll anywhere on the site, with one exception: the Plan page's 11-day strip scrolls horizontally and snaps tile-by-tile. Every other surface stays within the viewport width.

## 8. Out of scope for v1

The list below is explicitly out of scope. piemonte-dev should not build, stub, or wire any of these unless a follow-up scope expands the PRD.

- Login, password, email auth, OAuth, session tokens. The user model is the soft-auth toggle described in section 2 and nothing more.
- Push notifications.
- Native iOS or Android app. The site is a responsive web app and only that.
- Agent integration of any kind. The site does not call Claude, does not push state to the planning agents, and does not consume webhooks.
- Multi-trip support. The 11-day window May 25 - Jun 4, 2026 is hardcoded for v1.
- Share URLs, deep links from outside, social previews beyond a single OG image.
- Social features. There are no comments, no likes between users, no activity feeds.
- Paid services. No payment integration, no Mapbox account, no premium tiers.
- Calendar export. There is no .ics endpoint, no Google Calendar push, no email digest.
