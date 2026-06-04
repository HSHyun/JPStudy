# Commands

## Verified Checks
- `node --check web/app.js`
- `node --check web/config.js`

## Local Preview
- Inferred static preview command: `python3 -m http.server 8000 --directory web`
- Supabase-backed flows require network access and a valid Supabase project/config.

## Deployment
- GitHub Pages deploys `web/` on pushes to `main` and on manual workflow dispatch.

## Notes
- No `package.json` or npm scripts are present.
- `requirements.txt` is empty.
- No verified Supabase CLI workflow is recorded; no `supabase/config.toml` was found.
