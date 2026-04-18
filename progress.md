Original prompt: [$develop-web-game](C:\Users\401ms\.codex\skills\develop-web-game\SKILL.md) [$frontend-skill](C:\Users\401ms\.codex\skills\frontend-skill\SKILL.md) Improve TeachTable UI/UX, performance, data integrity, schedule readability, and remove mock/demo data so the system is production-ready.

- Findings:
  - The old heartbeat flow pulled the full bootstrap payload every 30 seconds, causing unnecessary render and validation work.
  - The settings form could be rerendered by background refreshes, which risked wiping unsaved input.
  - Runtime storage previously seeded sample/demo data by default.
  - Bootstrap selectors recalculated validation and lookup-heavy data multiple times per request.

- Completed:
  - Added `apps/api/runtime/empty-data.js` and switched storage/prisma fallback seeding from sample data to empty production-safe data.
  - Removed demo-first bootstrapping so new databases start empty, while existing live data files remain untouched.
  - Optimized selector/bootstrap work in `apps/api/runtime/selectors.js` to reuse dataset, maps, timetable, and validation work.
  - Added `/api/timetables/current/activity` client polling via `apps/web/api.js`.
  - Replaced full heartbeat refreshes with lightweight activity polling and only trigger full data reloads when timetable version changes.
  - Protected the settings form from background-refresh draft loss by tracking dirty state in `apps/web/app.js`.
  - Added client-side lookup caching to avoid rebuilding teacher/room/subject/section maps on every render path.
  - Standardized fonts to Prompt + Sarabun across the web app.
  - Improved contrast, button readability, nav clarity, timetable spacing, and schedule card density in `apps/web/styles.css`.
  - Added a consistent icon set across navigation, primary actions, catalog row actions, modal controls, and timetable deletion actions.
  - Improved empty-state wording and scope-select fallback handling for timetable views.

- Verification:
  - `npm run build` passed.
  - `npm test` passed.
  - `http://127.0.0.1:4180/api/health` returned `{"ok":true,"status":"ready"}`.
  - Frontend module syntax passed `node --input-type=module --check -` for `apps/web/render.js`, `apps/web/api.js`, and `apps/web/app.js`.

- Known limitation:
  - Playwright/browser screenshot verification is still blocked in this environment because Chromium launch previously failed with `spawn EPERM`.
