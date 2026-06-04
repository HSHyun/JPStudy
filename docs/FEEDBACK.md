# Feedback

## Corrections
- None recorded yet.

## Lessons Learned
- Treat `public.words` as an existing external database contract unless a migration defining it is added.
- Keep secrets out of durable docs; record key names or file roles only when needed.
- Supabase auth events can fire again for the same signed-in user on tab refocus; do not call `showDashboard()` for same-user auth refresh events.
- User-facing errors should not mention providers, RPCs, internal files, tables, or implementation details; keep details in logs.
- Same-browser card progress is client-side state stored in `localStorage`; use DB-backed progress only if cross-device resume is required.
- For Supabase table-returning RPCs, do not silently coerce non-array success responses to empty arrays; treat them as contract failures.

## Avoid
- Avoid changing unrelated UI, CSS, or SQL while documenting or touching a narrow behavior.
- Avoid relying on `supabase/.temp` values as stable project documentation.
- Avoid hardcoding JLPT level total counts in frontend code; use database counts.
