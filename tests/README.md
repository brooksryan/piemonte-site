# piemonte-site end-to-end tests

This directory holds Playwright specs for the piemonte-site client. The suite is
oriented around two projects, `local` and `remote`, configured in
`playwright.config.ts` at the repo root.

## Running

The tests do not start a server themselves. The QA runner (`piemonte-qa`) is
expected to bring up the prod build out-of-band before invoking Playwright.

- Local (requires `pnpm build && pnpm start` first, server on port 8080):

  ```sh
  pnpm test:e2e:local
  ```

- Remote (Digital Ocean preview):

  ```sh
  pnpm test:e2e:remote
  ```

## Environment variables

- `LOCAL_BASE_URL` — overrides the default `http://localhost:8080` for the
  `local` project.
- `REMOTE_BASE_URL` — overrides the default
  `https://piemonte-site-5rjgg.ondigitalocean.app` for the `remote` project.

## Snapshot baselines

The card-styling spec uses `toHaveScreenshot`. The first run will fail without
baselines; generate them with:

```sh
pnpm exec playwright test --project local --update-snapshots
```

Baselines should be reviewed before they are committed; the snapshot folder
lives next to `card-styling.spec.ts` (Playwright's default convention).

## Soft-skips

Both `favorite-roundtrip.spec.ts` and `plan-day-strip.spec.ts` probe
`GET /api/favorites` first. If the API returns `503` (database not configured
locally), the spec calls `test.skip(...)` and exits cleanly. This keeps local
runs green when the team-lead has not provisioned a database.

## Fallback

If Playwright is unavailable in a given environment, the team-lead may ask for a
curl-based smoke script at `tests/curl-smoke.sh`. That file does not exist yet;
ask before authoring it.
