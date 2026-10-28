# Phase 0 — Baseline Reconciliation Findings

Date: 2026-10-28
Working branch: `feat/work-management-productivity`
Baseline main commit: `80d447b6837fe5453cbec84c1e0c3de02c750919`

## Verified repository conventions
- Frontend: React + TypeScript + Wouter + TanStack Query; pages are lazy-loaded in `artifacts/kaira-africa/src/App.tsx`.
- Navigation: `artifacts/kaira-africa/src/components/layout/Sidebar.tsx`; evergreen `#0D3B2A` sidebar and gold `#E7B32B` active state.
- API: Express router registered centrally in `artifacts/api-server/src/routes/index.ts`; API is mounted under `/api`.
- Auth: `requireUser` resolves a server-validated session; `requireBusiness` requires a current business; `requireRole` handles role gates.
- Notifications: `createNotification` accepts a real recipient user ID; listing and read operations are scoped to the authenticated recipient.
- Database: Drizzle schema is re-exported through `lib/db/src/schema/index.ts`; schema currently contains users, businesses, team_members and notifications.
- Existing team invitation records are not necessarily authenticated users: `team_members.user_id` is nullable and pending members exist. Task assignment must verify a non-null linked user ID and active business membership.
- Frontend has a shared `apiRequestJson` helper in `artifacts/kaira-africa/src/lib/api-client.ts` which uses the configured API origin and bearer token.

## Database migration reconciliation — not resolved yet
- Repository Drizzle journal includes tags `0000` through `0012_savings_tracker`.
- Supabase's migration listing returned six entries with names that do not align one-to-one with the repository journal.
- Live Supabase tables include investment and savings tables, so the short migration listing does not mean those features are absent.
- Read-only inspection confirms `drizzle.__drizzle_migrations` contains 13 rows, with `created_at` timestamps matching the 13 repository journal entries. This suggests the shorter Supabase migration-list output is a separate tracking/listing discrepancy rather than evidence that the Drizzle migration table only contains six entries. SQL hashes have not yet been recomputed against each repository migration file, so migration integrity is not fully reconciled.
- Do not run/replay migrations, use `drizzle-kit push`, or apply feature DDL to production until this comparison is complete and reviewed.

## Security review observations
- Current security advisor reports RLS enabled without policies on 23 public tables.
- Advisor flags `public.rls_auto_enable()` as a `SECURITY DEFINER` function executable by both `anon` and `authenticated`.
- A read-only policy query returned no policies for `users`, `businesses`, `team_members`, and `notifications`.
- These are project-level security findings requiring a separate scoped review. They do not prove every API route is exploitable. The existing API authenticates through server-side session records, so new routes must retain server-side business/user scoping and must not rely on frontend filtering.
- Do not alter the existing function or policies in this feature branch without a dedicated, reviewed remediation plan.

## Release and design requirements
- Early access label: “Early access — free while we build with you.”
- Core task and manual meeting/minutes workflows free during early access.
- Paid/advanced features remain visible and usable on mobile; adapt layout rather than hide features by viewport.
- Maintain evergreen/gold/white card language and existing responsive patterns.
- AI transcription and AI-generated meeting summaries remain labelled “Coming soon” until genuinely implemented.

## Next safe step
Read the rows in `drizzle.__drizzle_migrations` and compare their hashes/timestamps/tags to the repo journal and SQL migration contents. Then create a reproducible migration locally/on an isolated test database, verify type/build/tests, and only then proceed with Tasks & Projects API/schema work. Production Supabase remains unchanged by this feature work.
