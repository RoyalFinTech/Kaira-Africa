# Kaira Africa Work Management — Engineering Plan

## Safety boundary
- Work only on `feat/work-management-productivity`.
- Base commit: `80d447b6837fe5453cbec84c1e0c3de02c750919` (the verified `main` head when this branch was created).
- Do not merge to `main`, alter production deployment settings, or apply production schema changes as part of feature development.
- Use a separate reviewable pull request after feature and test gates pass.
- Do not replay migrations blindly: the repository migration journal and Supabase's recorded migration list currently differ.

## Product and design decisions
- Work Management is a grouped navigation area: Tasks, Projects, Meetings & Minutes, and Calendar as each phase becomes functional.
- Tasks support personal work and assignments to actual, eligible business team users. An invitation/team contact without a verified linked user account is not an assignable authenticated identity.
- Meetings launch with manual minutes. AI transcription and AI-generated minutes are explicitly marked “Coming soon” and must not imply that they work.
- Core task management and manual minutes are free during the early-access period. Messaging: “Early access — free while we build with you.” Do not display a fake countdown, imply a paid plan is currently required, or block current free workflows.
- Paid/advanced options must remain responsive and visible on mobile too; use progressive disclosure, compact controls, and responsive cards instead of hiding paid features on small screens.
- Use the established Kaira visual language: deep evergreen surfaces, clean white/soft-neutral content cards, restrained gold accents, rounded cards, legible labels, clear states, and responsive layouts. No placeholder imagery is needed for the first pass; establish layout/card patterns first.

## Phased delivery
### Phase 0 — baseline and safety
1. Verify repository main head, branch creation point, deployment commit references, schema, migration journal, route conventions, generated API contract, and test commands.
2. Document drift and security-advisor findings. Never treat an RLS warning alone as proof of a specific exploitable path; verify actual access patterns.
3. Keep production database unchanged while the feature schema is designed and tested.

### Phase 1 — Tasks and Projects
1. Add business-scoped task/project schema and a new migration only after the migration-history discrepancy is reconciled.
2. Add validated API routes and repository operations. Enforce business membership/role rules server-side on every read and write.
3. Create task and project pages with consistent Kaira cards, status/priority labels, due dates, filters, empty/loading/error states, and compact mobile layouts.
4. Allow personal tasks and assignments only to eligible authenticated team members; notify only the real recipient user ID.
5. Add activity history and test create/edit/assign/complete/reopen, cross-business access rejection, and notification privacy.

### Phase 2 — Meetings and manual minutes
1. Create business-scoped meeting records with date/time, attendees, agenda, discussion notes, decisions, and action points.
2. Support save/edit/reopen/search/print/PDF and responsive layouts.
3. Convert action points into existing task records with traceable references and no duplicate task creation.
4. Label transcription and AI summaries “Coming soon”; do not wire pretend AI actions.

### Phase 3 — Calendar and reminders
1. Show task due dates and meetings in a responsive calendar/list.
2. Implement server-side reminders with deduplication and safe retry behavior.
3. Add a daily briefing only after notification scheduling is tested.

### Phase 4 — Virtual Assistant workspace
1. Build a concise daily workspace from tasks, meetings, client follow-ups, and work-log entries.
2. Add AI-assisted workflows only when actual backend behavior, provider configuration, privacy, and cost limits are implemented and tested.

### Phase 5 — future monetisation
- Keep core tools available to early users without a forced upgrade.
- Later subscription options may add higher capacity, automation, advanced reporting, and AI usage.
- If plans change, preserve read/export access to existing user data and avoid surprise data loss.

## Required release gates
- Migration state reconciled; no unreviewed production DDL.
- Type checks, build, and relevant API tests pass.
- Business-scoped authorization and recipient-only notifications are verified.
- Mobile and desktop navigation/layout are checked; no feature is hidden solely because the viewport is small.
- Empty, loading, validation, and API-error states are handled.
- PR is reviewed and remains unmerged until the owner approves.
- After a later approved merge, verify the intended commit is deployed and run production smoke tests without changing real user data.
