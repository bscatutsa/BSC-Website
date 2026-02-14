# BSC Website

Business Student Council (UTSA) multi-page website.

## What This Repo Contains

- Public pages: `index.html` and `pages/*.html`
- Shared styles: `css/style.css`
- Shared layout partials: `partials/nav.html`, `partials/footer.html`
- Shared behavior scripts: `scripts/layout.js`, `scripts/script.js`
- Member dashboard logic: `scripts/dataParser.js`, `scripts/demo.js`
- Local helper scripts: `importing.py`, `data.py`

## Important Runtime Note

Shared nav/footer are loaded with `fetch()` from partial files.

Because of that, run the site through a local/static web server.
Do not open pages directly via `file://`.

## Official Membership Tiers

| Tier | Min | Max |
|---|---:|---:|
| Member | 0 | 14 |
| Intern | 15 | 24 |
| Professional | 25 | 39 |
| Exec | 40 | 999 |

Implemented in:
- `scripts/demo.js` (`getMembershipTier`)
- `scripts/dataParser.js` (parsed member tier assignment)
- `data.py` (`get_rank`)

## Local Development

1. Start a static server from repo root.
2. Open `index.html` through that server.

Example:
- `python -m http.server 8000`

Then browse:
- `http://localhost:8000/index.html`

## Documentation

- Visitor guide: `README.md` (this file)
- Deep technical guide: `docs/DEEP_DIVE.md`
