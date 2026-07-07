# Release Notes v1.0.0

Release date: 2026-07-07
Tag: v1.0.0
Commit: 111f5cc
Production URL: https://cmn-money-couple.vercel.app

## Highlights

- Stabilized Supabase-backed CRUD flows across dashboard modules.
- Added reusable CRUD foundation for rapid module delivery.
- Completed E2E checks for transfer and split update/delete behavior.
- Enabled CSV export flow from search and reports APIs.
- Added deployment runbook and current status documentation.
- Shipped Vercel production deployment with required env setup.

## Added

- Generic CRUD component and form styles for dashboard modules.
- Split transactions page and tags management page.
- Reports export API endpoints for monthly and range CSV output.
- SQL/Node operational scripts for schema, grants, RLS, backfill, and test seed data.
- New documentation pages for current status and production deploy process.

## Changed

- Updated dashboard modules to follow shared CRUD patterns.
- Improved dashboard navigation/shell integration and module consistency.
- Updated Supabase middleware/server behavior for auth/session flow reliability.
- Refined README and roadmap/status docs to reflect current operational state.

## Fixed

- Fixed nullable select handling in shared CRUD payloads by converting empty select values to null.
- Resolved budget creation failure caused by empty UUID payload values.
- Addressed production build blocker by setting required Supabase public env variables on Vercel.

## Verification

- Local checks passed: lint and Next.js build.
- Manual browser validation passed for key flows:
  - Login/dashboard access
  - Income/expense create and dashboard recalculation
  - Transfer create/update/delete
  - Split create/update/delete
  - Search export CSV and reports export endpoints
  - Budget create/update/delete and dashboard budget panel refresh

## Notes

- A previous intermittent build/type issue was reproduced and resolved before tagging.
- Temporary local artifacts are intentionally not included in release commit history.
