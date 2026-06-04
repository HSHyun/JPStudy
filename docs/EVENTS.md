# Events

## Durable Project Facts
- Workspace memory docs were initialized under `/Users/hsh/JPStudy/docs`.
- The app is a static Korean UI for Japanese vocabulary study.
- `web/index.html` loads Supabase JS v2 from jsDelivr, then `config.js`, then `app.js`.
- `web/app.js` uses Supabase email/password auth and calls RPCs: `list_study_sessions`, `get_recent_study_session_words`, `get_study_session_words`, and `create_new_study_session`.
- `web/config.js` contains public Supabase browser config and `DEFAULT_LIMIT: 20`.
- `supabase/migrations/202602220001_create_random_words_rpc.sql` defines `get_random_words`.
- `supabase/migrations/202605300001_create_study_sessions.sql` creates `study_sessions`, `study_session_words`, RLS policies, and study-session RPCs.
- `supabase/migrations/202605300002_fix_create_new_study_session_word_id.sql` replaces `create_new_study_session` to disambiguate returned IDs.
- `supabase/migrations/202606050001_create_word_level_totals_rpc.sql` defines `get_word_level_totals` for JLPT level total counts.
- The repo references `public.words`, but no migration defining that table was found.
- `.github/workflows/deploy-pages.yml` deploys `./web` to GitHub Pages from `main` or manual dispatch.
- `requirements.txt` is empty and no `package.json` exists.

## Important Context Changes
- Full project audit performed on 2026-06-05 local workspace date; `.env` and `supabase/.temp` values were not copied into docs.
