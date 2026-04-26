# PRD v1.2 - Bug-driven user stories

This document is additive to `site/PRD.md`. It captures the six user stories that fall out of the five live bugs Brooks reported after the v1.1 review, plus one additional story that splits the cross-linking work cleanly enough for piemonte-qa to write separate Playwright specs against the algorithm and against the interaction surface.

Every story below carries testable acceptance criteria written as Given / When / Then assertions or numbered assertion lists. piemonte-qa is the gating reviewer: no task closes until qa runs the matching spec against both `http://localhost:5173` (or the local server port piemonte-dev settles on) and the deployed DO App Platform URL.

The stories do not prescribe fixes. Each one specifies the user-observable success state and the acceptance bar.

## Story 1 - Maps load on the deployed site

As Brooks, when I open `/maps` on the deployed URL on my phone, I see the interactive map render with tiles, controls, and pins, exactly as it renders during local preview.

Background: the map worked during piemonte-dev's local verification on `pnpm preview` but does not load against the deployed Express container. The most likely causes are tile-endpoint reachability from inside the container's CSP, MapLibre asset paths shifting under the production base URL, or OpenFreeMap tile requests blocked by a Content-Security-Policy header the production server adds. The story does not pick a fix; piemonte-dev decides between widening the CSP, switching tile endpoints, or fixing the asset path.

Acceptance criteria:

1. Given I open `https://<deployed-url>/maps` on a clean browser session, when the page finishes its initial load, then a MapLibre canvas renders with visible map tiles inside it.
2. Given the map has rendered, when I count the pin DOM nodes, then the pin count matches the count returned by the same selector on `http://localhost:<port>/maps`.
3. Given I tap a pin, when the bottom sheet opens, then the sheet shows the entity's name, region tag, blurb, and a tap target that routes to `/entity/<type>/<slug>`.
4. Given I open the browser devtools network tab, when the map renders, then no tile or style request returns a status code outside the 200-299 range.
5. Given I open the browser devtools console, when the map renders, then no message containing "Refused to" or "Content Security Policy" appears.
6. Given I refresh the page, when the map re-initializes, then criteria 1 through 5 still hold.

Out of scope for this story: tile-vendor changes, swapping MapLibre for another renderer, adding offline support.

## Story 2 - User switcher works end to end

As Brooks or Angela, I tap the upper-left avatar, pick a user from the sheet, and the rest of the site reflects that choice on the current page, on subsequent navigations, and after a hard reload.

Background: the v1 PRD specified the soft-auth model in section 2. v1.1 shipped the avatar but the tap is either inert or the choice does not persist. The story restates the criteria as testable assertions.

Acceptance criteria:

1. Given the page is loaded with no prior `localStorage.piemonte.activeUser` value, when the page renders, then the avatar shows the letter "B" and `localStorage.piemonte.activeUser` reads `brooks`.
2. Given the avatar is visible, when I tap the avatar, then a sheet opens with two rows labelled "Brooks" and "Angela" and a close affordance.
3. Given the sheet is open, when I tap the row labelled "Angela", then the sheet dismisses, the avatar updates to show the letter "A", and `localStorage.piemonte.activeUser` reads `angela`.
4. Given the active user is `angela`, when I trigger any API call (favorite a card, add a Plan entry, fetch the Plan day), then the request carries the header `x-user-name: angela`.
5. Given the active user is `angela`, when I do a hard reload of the page, then the avatar still shows "A" and `localStorage.piemonte.activeUser` still reads `angela`.
6. Given the active user is `angela`, when I navigate to `/countryside`, `/coastal`, `/plan`, and `/entity/town/barolo`, then every page renders with the avatar showing "A" and every API request from those pages carries `x-user-name: angela`.
7. Given I tap the avatar a second time and tap the "Brooks" row, then the avatar updates to "B" and `localStorage.piemonte.activeUser` reads `brooks`.
8. Given the server receives a request with `x-user-name: angela` and the active user changes to `brooks`, when the next request fires, then the server receives `x-user-name: brooks`. Stale headers do not survive a switch.

## Story 3 - Card styling is canonical across types and pages

As Brooks scanning the Countryside or Coastal pages, I see every entity card render in the same vertical-hero layout regardless of type, so the page reads as one catalog rather than a stack of mismatched components.

Background: piemonte-dev introduced a vertical-hero layout for beaches in v1.1 (image at the top spanning card width, text block below) while every other type uses the older horizontal layout (text-only with a heart spacer on the right). The two patterns disagree on padding, image presence, line-clamp, and heart placement, which makes the page read as inconsistent.

Canonical card layout (every type, every page where EntityCard renders):

- Outer container: `bg-surface border border-border rounded-xl overflow-hidden block`, full-width inside its parent column.
- Optional hero image at the top spanning the full card width at a 16:9 aspect ratio (height fixed at `128px` on phones). When the seed has no `imageUrl`, the hero slot renders a typographic placeholder using the seed's name on a region-tinted background. The placeholder slot must be the same height as the image slot so cards line up vertically when mixed in a list.
- Body block sits under the hero with `padding: 16px`. Body contains, in order: the entity name as the primary line at `text-sm font-semibold`; a subline at `text-xs text-muted` carrying the type-specific subline already returned by `getSubline`; a blurb at `text-sm` clipped to two lines via `line-clamp-2`.
- Heart button anchored to the upper-right corner of the card, 32pt square, 8pt margin from the corner. The heart sits over the hero image rather than next to the text. Heart touch target is at least 44pt including the inset padding.
- The whole card outside the heart button is the navigation tap target to the Detail page.

Acceptance criteria:

1. Given I render any entity type (`town`, `lodging`, `restaurant`, `winery`, `beach`, `cultural-site`), when the card paints, then the DOM has a hero slot above the body slot. There is no horizontal layout variant in the rendered output.
2. Given two cards of different types sit next to each other in the same column, when I measure their bounding boxes, then their widths match and their hero-slot heights match.
3. Given a card has no `imageUrl`, when it renders, then the hero slot shows the entity name on a region-tinted background and the slot height matches a card that has an `imageUrl`.
4. Given a card has an `imageUrl`, when it renders, then the image fills the hero slot with `object-fit: cover`. When `imageCredit` is set, the credit renders at `text-xs text-muted` immediately under the hero, before the body padding.
5. Given the active user has favorited the card's entity, when the card renders, then the heart button shows the filled-heart icon. When the active user has not favorited it, the heart shows the outline icon.
6. Given I tap the heart button, when the click fires, then the favorite toggles, the card does not navigate to the Detail page, and the heart icon updates without a full page reload.
7. Given I tap any part of the card outside the 44pt heart hit area, when the click fires, then the browser navigates to `/entity/<type>/<slug>`.
8. Given the page is the Countryside page, the Coastal page, or the Detail page's Related strip (Story 5), when EntityCards render, then every card on screen passes assertions 1 through 7.

## Story 4 - Printable maps section is removed from the Maps page

As Brooks scanning the Maps page, I do not see a "printable maps" section because the four legacy SVGs were never wired to working downloads and the embedded MapLibre region maps have replaced them.

Background: the v1 PRD section 4.1 carried a small "printable maps" footer linking to `route-v3.svg`, `route-final.svg`, `utility-langhe-towns.svg`, and `utility-finale-beaches.svg`. piemonte-dev never wired the actual download endpoints, and the four assets do not need to ship in v1 because the live map already covers the use case. This story removes the section from the page rather than fixing the broken download targets.

Acceptance criteria:

1. Given I open `/maps`, when the page renders, then the DOM contains no element matching the text "printable maps" (case-insensitive).
2. Given I open `/maps`, when I scroll to the bottom of the page, then the last interactive element is the MapLibre map and its associated controls. There are no SVG download links.
3. Given I run a recursive grep on `site/src/pages/Maps.tsx`, when I search for `printable`, then the search returns zero matches.
4. Given the four legacy SVGs still exist as map-type catalog seeds for cross-reference (per v1 PRD section 4.1), when I navigate to `/entity/map/route-v3` or any of the other three slugs directly, then the Detail page still renders. The seeds remain as catalog records, even though no page surfaces them as a downloadable section.
5. Given I open the browser devtools network tab on `/maps`, when the page finishes loading, then no request fires for `route-v3.svg`, `route-final.svg`, `utility-langhe-towns.svg`, or `utility-finale-beaches.svg`.

## Story 5 - Detail pages surface a Related section with a deterministic algorithm

As Brooks reading the Detail page for a town, lodging, restaurant, winery, beach, or cultural site, I see a Related section under the main content that surfaces other catalog entities tied to the current one.

Background: v1 shipped Detail pages as terminal nodes. Brooks has no path from the Castello di Grinzane Cavour Detail page to nearby restaurants, no path from Hotel Helvetia to the beach next door, and no path from a town to its lodging options. The site reads as a catalog of dead-ends. This story specifies the matching algorithm and the "this exists" surface; Story 6 specifies the interaction and ordering behavior.

Matching algorithm (deterministic, run client-side against the bundled catalog):

- Step 1, town match. If the current entity has a `town` field or its slug matches a town's slug, the candidate set is every catalog entity (excluding the current one) whose `town` field equals the current town's slug, or whose `town` field equals the current town's `name`, or whose `name` contains the current town's `name` as a case-insensitive substring. For lodging entities, the `base` field also matches against town names where `base` is `alba-langhe`, `sestri`, or `finale` (mapped to the town set those bases anchor: `alba-langhe` matches Alba, La Morra, Monforte d'Alba, and the rest of the Langhe town list; `sestri` matches Sestri Levante and Camogli; `finale` matches the Finale-arc towns from the audit).
- Step 2, region fallback. If step 1 returns fewer than four candidates, expand the set with every other catalog entity (excluding the current one and excluding any already in the candidate set) whose `region` tag equals the current entity's `region`.
- Step 3, type filter. From the combined candidate set, drop any entity whose type is `map`, `drive`, or `region-narrative`. The Related strip surfaces concrete places, not maps or driving times or narrative blocks.
- Step 4, cap. Take at most twelve entities. If more than twelve qualify, the ordering rules in Story 6 decide which twelve.

Acceptance criteria:

1. Given I open `/entity/town/barolo`, when the page renders, then a section labelled "Related" appears below the main content.
2. Given I open the Detail page for a town with the slug `barolo`, when the Related section paints, then the section contains EntityCards for at least Vajra (winery), Cantina Mascarello Bartolo (winery), and WiMu / Castello Falletti (cultural-site), because those entities all carry `town` fields that match Barolo.
3. Given I open the Detail page for `lodging/hotel-helvetia`, when the Related section paints, then the section contains at least one Sestri Levante-anchored restaurant or beach entity.
4. Given the current entity has zero town-level matches, when the Related section paints, then it contains at least one entity sharing the same `region` tag.
5. Given the candidate set is empty after step 3 of the algorithm, when the page renders, then the Related section is omitted entirely. There is no empty header and no "no related items" placeholder.
6. Given I open the Detail page for a `map`, `drive`, or `region-narrative` entity, when the page renders, then the Related section may still appear, but it must not contain any entity of type `map`, `drive`, or `region-narrative`.
7. Given the Related section renders, when I count its EntityCards, then the count is at most twelve.
8. Given I open the same Detail page twice, when the Related section paints both times, then the candidate set is identical (the algorithm is deterministic for a given catalog snapshot).

## Story 6 - Related strip orders favorites first and scrolls horizontally on phones

As the active user reading a Detail page on my phone, I see the Related strip lay out as a single horizontal row of EntityCards that I can swipe through. Cards I have already favorited appear first.

Background: Story 5 establishes that the Related section appears with the right candidates. This story handles ordering, layout, and interaction so that piemonte-qa can write a separate Playwright spec against the touch and ordering behavior without re-asserting the algorithm.

Layout and behavior:

- The Related section header reads "Related" at `text-sm font-semibold` with 16pt of left padding.
- The strip below the header is a horizontally scrollable flex row. Each card is fixed at 240pt wide with 12pt of gap between cards. The first card has 16pt of left padding from the section edge; the last card has 16pt of right padding so the final card is fully tappable without bumping the viewport edge.
- The strip uses CSS scroll snap, snapping card-by-card.
- The strip does not wrap. It does not paginate. There are no left/right arrow controls.
- Cards inside the strip use the canonical EntityCard layout from Story 3. The hero slot height inside the strip drops to 96pt to keep the strip compact.

Ordering rules (applied after the candidate set comes back from Story 5's algorithm):

1. Cards the active user has favorited come first, in the order of `favorites.created_at` descending (most recently favorited first).
2. Remaining cards follow, sorted alphabetically by `name` (case-insensitive, locale-aware sort).
3. After the at-most-twelve cap, the ordering is fixed.

Acceptance criteria:

1. Given the Related section renders on a viewport ≤ 480px wide, when I measure the strip, then it has `overflow-x: auto` and its content does not wrap to a second row.
2. Given the active user is `brooks` and Brooks has favorited two of the candidate entities, when the Related section renders, then those two entities appear as the first two cards in the strip.
3. Given the active user switches from `brooks` to `angela` (per Story 2) and Angela has favorited a different two entities, when I navigate back to the same Detail page, then Angela's two favorited candidates appear as the first two cards. Brooks's favorites are no longer ordered first.
4. Given I swipe left on the strip with my finger, when the swipe completes, then the strip scrolls and snaps to the next card boundary.
5. Given a card in the strip is fully visible on screen, when I tap any part of it outside the heart button, then I navigate to that entity's Detail page. The Related strip on the new Detail page now reflects the new current entity.
6. Given I tap the heart button on a card inside the strip, when the favorite toggles, then the card's heart icon updates and the strip does not navigate to the entity's Detail page.
7. Given the strip is at horizontal scroll position 0 and has more than three cards, when the page renders, then a portion of the fourth card is partially visible, signalling that the strip is scrollable.
8. Given the candidate set returns exactly the cap of twelve cards, when I scroll the strip to the end, then the twelfth card is fully visible and there is no thirteenth card.

## Process change - QA gating

This change applies to every task in the v1.2 board (#23 through #28) and every task that follows.

- piemonte-dev and piemonte-devops do not mark a task `completed` themselves. They mark it as ready for QA by setting `metadata.qa_status = 'ready'` via TaskUpdate and notifying piemonte-qa with the task ID and the URLs to test (localhost and the deployed URL).
- piemonte-qa runs the Playwright spec for that story against both URLs. If both pass, qa flips the task to `completed` and notifies the team lead. If either fails, qa flips the task back to `in_progress`, sets `metadata.qa_status = 'failed'`, and posts the failing assertion list back to the implementing teammate.
- piemonte-qa writes the spec by translating the numbered acceptance criteria above into Playwright assertions. Spec filenames mirror the story numbers: `story-1-maps-load.spec.ts`, `story-2-user-switcher.spec.ts`, and so on, all under `site/tests/`.
- The spec runs against `http://localhost:<port>` first, then against the deployed URL. A run that passes locally but fails on deploy keeps the task in `in_progress`.

## Out of scope for v1.2

The list below is explicitly out of scope until a v1.3 PRD picks any of them up.

- Visual redesign of the canonical EntityCard. Story 3 codifies the existing vertical-hero pattern; it does not redesign it.
- Search overlay surfacing favorites first. The favorites-first rule from Story 6 applies to the Related strip only.
- Multi-day cross-linking on the Plan page. The Related section lives on Detail pages; the Plan page does not yet show suggestions when assigning a hotel or adding an entity to a day.
- Sharing the active user across devices. The user toggle remains local to `localStorage` per device.
- Offline mode for the map. Story 1 only requires the deployed map to load over the network.
