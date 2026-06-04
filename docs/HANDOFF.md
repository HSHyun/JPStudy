# Handoff

## Current State
- Project audit completed for the relevant source, config, workflow, migration, and memory files.
- Current app is a static Supabase-backed vocabulary study UI with auth, study history, and card navigation.
- `web/app.js` now preserves the active study view when Supabase auth events fire for the same user.
- User-facing error messages in `web/app.js` are generic; technical details stay in `console.error`.
- Study actions now use a shared loading guard to avoid overlapping session RPCs.
- Study sessions resume at the last viewed card on the same browser via `localStorage`.
- Level total counts are loaded from `get_word_level_totals` instead of hardcoded frontend constants.
- `web/app.js` single-use helper functions were inlined; RPC table results now fail fast when the response contract is not an array.

## Next Actions
- For frontend behavior changes, inspect `web/app.js`, `web/index.html`, and `web/styles.css` together.
- For study/session data changes, update Supabase migrations and the matching RPC calls in `web/app.js` together.
- Before finishing JS changes, run `node --check web/app.js` and `node --check web/config.js`.
- Apply `supabase/migrations/202606050001_create_word_level_totals_rpc.sql` before relying on DB-backed level totals in deployed UI.

## Open Questions
- `public.words` is referenced but not defined in this repo; confirm its schema/data source before changing word queries.
- No local automated test suite or build pipeline is configured in the repo.
