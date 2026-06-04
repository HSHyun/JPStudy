# Agent Notes

## Scope
- Applies to coding-workspace work in `/Users/hsh/JPStudy`.

## Project Shape
- Static browser app for a personal Japanese vocabulary study tool.
- Frontend lives in `web/` and uses plain HTML, CSS, and JavaScript.
- Supabase provides Auth, persisted study sessions, and word data through RPCs.
- GitHub Pages deploys the `web/` folder from `.github/workflows/deploy-pages.yml`.

## Rules
- Prefer the minimum correct change.
- Touch only files required by the current request.
- Keep durable workspace notes in this `docs/` directory.
- Do not record `.env` values or `supabase/.temp` values in docs.
- Keep frontend and Supabase RPC contracts in sync when changing study behavior.
- Keep user-facing error messages generic; do not expose provider names, RPC names, table names, file names, or internal implementation details in the UI.

## Paths
- Workspace root: `/Users/hsh/JPStudy`
- Memory docs: `/Users/hsh/JPStudy/docs`
- Frontend entry: `/Users/hsh/JPStudy/web/index.html`
- Frontend logic: `/Users/hsh/JPStudy/web/app.js`
- Frontend config: `/Users/hsh/JPStudy/web/config.js`
- Frontend styles: `/Users/hsh/JPStudy/web/styles.css`
- Supabase migrations: `/Users/hsh/JPStudy/supabase/migrations`

## Persistent Configuration
- `web/config.js` stores public Supabase browser config and `DEFAULT_LIMIT`.
- `.env` exists locally with a `DATABASE_PASSWORD` key; its value is ignored and must not be documented.
