# Kaira Africa — Engineering Source of Truth

**Purpose:** This file is the project’s single source of truth (SSOT) for agreed product scope, implementation status, acceptance criteria, and release evidence. Read it before starting a feature, update it in the same pull request as the work, and never mark work complete from a menu item, mockup, or merged PR alone.

**Product:** Kaira Africa  
**Maintainer:** Royal FinTech Company  
**Repository:** https://github.com/RoyalFinTech/Kaira-Africa  
**Production frontend:** https://kaira-africa-frontend.onrender.com/  
**Production API readiness URL:** https://kaira-africa-api.onrender.com/ready  
**Supabase project ref:** `gofoibbvxnhqzqwrpcbx`

## Non-negotiable engineering rules

1. **Inspect reality first.** Verify current `main`, live Render deploys, database migrations/schema, existing routes and API behavior before editing. Prior notes are leads, not proof of current state.
2. **No silent scope drops.** Keep all agreed capabilities in the phase register below. If scope must change, record why and obtain product-owner agreement rather than quietly omitting a feature.
3. **A route is not a feature.** A menu link, page shell, disabled button, mock data, “Coming Soon” label, or frontend-only state does not count as implemented.
4. **End-to-end completion bar.** A feature is complete only when its responsive UI, authenticated API, validation/authorization, persistent storage where appropriate, error/empty/loading states, automated checks, and release evidence are verified. Record any exceptions explicitly.
5. **Protect production data.** Never use destructive Git commands, force-push, delete production data, run unreviewed schema pushes, or mutate real customer records for testing. Use migrations and isolated test data. Preserve business/tenant isolation and existing auth boundaries.
6. **Release safely.** Work on focused branches, review diffs, run typecheck/build/tests/migration validation, open PRs, merge only after checks pass, then verify deployed commit and production behavior. Never claim a smoke test passed if it was not run.
7. **Keep this ledger current.** Each PR must update the relevant status, implementation references, test evidence, deployment SHA, and known gaps. New chats/engineers must start here.
8. **Honest AI status.** Distinguish deterministic/rule-based analysis from model-generated output. Do not imply that an AI feature runs unless its backend path and required configuration are verified. Do not send personal/customer data to models without an approved data policy.
9. **Responsive and accessible by default.** Desktop and mobile navigation/pages, readable text, keyboard-accessible controls, clear labels, useful empty/error/loading states, and consistent Kaira Africa styling.
10. **No pretending.** If an item is not built or not verified, label it NOT IMPLEMENTED or NOT VERIFIED and state the next action.

## Verified baseline at record creation

As of 2026-10-28, the previous engineering handover recorded that PR #87 (“Build Kaira Africa Work Management and Learning Centre”) was squash-merged to `main` as commit `a0e8baf755ca40afa1515b6e53970d3a2a0563cc`. Render reported both frontend and API deployments live on that commit. A read-only Supabase check found the new tables `work_meetings`, `work_projects`, `work_task_events`, and `work_tasks`, with RLS enabled and no direct SELECT grant for `anon` or `authenticated`. This is deployment/schema evidence, **not proof of authenticated end-to-end workflows**. Re-check the actual current branch/deploys before relying on this baseline.

### Existing work management / learning deliverable

The merged work-management deliverable added:
- `artifacts/kaira-africa/src/pages/app/WorkManagementPage.tsx`
- `artifacts/kaira-africa/src/pages/app/TutorialsPage.tsx`
- `artifacts/api-server/src/routes/work-management.ts`
- `lib/db/src/schema/work-management.ts`
- `lib/db/migrations/0013_work_management.sql`
- route/sidebar integration in `App.tsx` and `Sidebar.tsx`

The page includes task/project/meeting workflows; Tutorials & Courses contains searchable guidance. The following still requires signed-in production workflow testing: create/edit/status-change task, create/group project, create/edit/save meeting details, refresh persistence, tenant/user authorization, desktop/mobile navigation and error handling. Do not call those production workflows verified until tested.

### Existing capabilities found in current route inspection (not a guarantee of complete behavior)

Routes/pages observed in the repository include Dashboard, Team, Customers/CRM, Transactions, Analytics, Reports, Activity, Notifications, Profile, Settings, Inventory, AI Reports & Insights, Daily Ledger, Investments, Savings, Work Management, Tutorials, Receipt Branding, Billing and legal pages. Each must be audited for real behavior, access, persistence and responsiveness; presence alone is not completion.

An existing `AiReportsPage.tsx` has revenue/customer/transaction charts, daily ledger trends, expense category visuals, and a “Generate insights” action. Its UI indicates rule-based insights may be active and model-generated narratives require `OPENAI_API_KEY` and `OPENAI_MODEL`. Verify the actual API behavior/configuration before describing model AI as enabled.

## Product information architecture — required grouping

Use a consistent, clearly named desktop sidebar and mobile navigation/drawer. Keep existing modules reachable; avoid duplicating the same destination under confusing names.

### 1. Overview
- Dashboard / business overview
- Notifications and activity feed
- Quick actions and recently used work (only when genuinely connected)

### 2. Business
- Customers / CRM and customer details
- Transactions / payments
- Daily Ledger / bookkeeping, sales and expenses
- Inventory / stock and product images
- Investments / Investment Plan
- Savings / Savings Plan & Tracker
- Team and permissions
- Receipts, print branding and exports
- Analytics and standard reports

### 3. Work Management
- Tasks: create, edit, assign, prioritize, due dates, status, filters/search and history
- Projects: create/edit, goals, dates, project status and linked tasks
- Calendar & Schedule: calendar/list views, events, due dates, meetings and reminders
- Meetings & Minutes: agenda, attendees, notes, decisions, action items, follow-up tasks and export/print
- Notes & Documents: create/edit/search/organize notes and documents; safe upload/storage if file support is included
- Reminders & Notifications: schedule and manage reminders; persist state and deliver notifications through an actual supported mechanism
- Time Tracking: start/stop/manual entries, task/project association, duration and reports
- Proposals & Quotations: draft, line items, currency/tax/discount rules where applicable, statuses, PDF/print and conversion to relevant business records
- Client & Team Workspace: business-scoped collaboration, assignment and permissions
- Automation: explicitly defined trigger/action rules with auditability; do not show fake automation toggles

### 4. Visual Assistant & AI
- **Visual Assistant / VA Workspace**: a dedicated, visible destination—not merely a renamed AI reports page. Build an assistant workspace with a clear scope, prompt/input area, conversation/task context, outputs, and links to take safe actions. Any screenshot/image understanding, visual generation, OCR, document reading, or screen-guidance capability must be described accurately and only exposed when its implementation actually exists.
- AI help for understanding Kaira tools and business workflows
- AI-assisted summaries/drafts for meetings, notes and business reports when available
- Safe AI action suggestions with user review/confirmation before writes
- Explicit privacy/data boundaries, loading/error/empty states and configuration status
- Meeting transcription is **not implemented/verified** by the prior work-management PR. Do not treat a “Coming Soon” label as completion. Implement transcription only with a real supported audio capture/upload/transcription pipeline, consent/privacy UX, access controls, storage/retention decisions and tests. If the full pipeline is not yet feasible, keep it clearly marked NOT IMPLEMENTED in this ledger, not as a shipped feature.

### 5. Insights & Reports
- Analytics dashboards
- Standard business reports and export/print
- AI Reports & Insights, distinguishing rule-based from model-generated results
- Revenue, customer, transaction, expense, inventory and daily ledger insights where supported
- Date range, currency correctness, empty states and source attribution

### 6. Learning & Support
- Tutorials & Courses: searchable step-by-step guides linked to real pages
- Beginner onboarding/help
- FAQ and support/contact paths
- Video lessons only when real, reviewed video links/content are supplied; never fabricate links

### 7. Account & Administration
- Profile and profile image
- Business settings and branding
- Security/authentication
- Billing & plan (truthful availability; no fake paywall/countdown)
- Legal/privacy and admin-only routes protected by actual authorization

## Phased implementation register

Statuses are intentionally conservative. “Existing page found” means it needs audit; it does not mean it meets the acceptance criteria. Update status and evidence as each phase is completed.

| Phase | Scope | Status at record creation | Acceptance gate |
|---|---|---|---|
| 0 — Truth baseline & navigation audit | Reconfirm main/deploys/schema; inventory routes, sidebar labels, APIs, migrations and actual behaviors; keep this ledger authoritative | IN PROGRESS | Checked-in audit table maps every feature to UI, API, tables, tests, status and gaps |
| 1 — Information architecture | Group all existing and planned destinations in the sidebar/mobile menu without orphaning existing pages; make Visual Assistant visible as its own destination | NOT IMPLEMENTED / NOT VERIFIED | Desktop/mobile navigation test; every item routes to a real page; no dead links |
| 2 — Core Work Management verification | Tasks, projects, meetings/minutes: authenticated end-to-end behavior and tenant isolation | IMPLEMENTED IN CODE; PRODUCTION E2E NOT VERIFIED | API/UI tests; CRUD/status/refresh persistence; authorization tests; production smoke evidence |
| 3 — Visual Assistant foundation | Dedicated VA workspace and real, bounded assistant interaction; safe actions require user confirmation | IMPLEMENTED IN CODE; NOT VERIFIED | PR #89 adds a protected text-only workspace and authenticated Responses API endpoint; CI, deployment/configuration and production smoke evidence remain required. Image/screen/OCR/voice capabilities remain unimplemented. |
| 4 — Calendar, reminders, notes/documents | Persistent scheduling, reminders, notes and document organization integrated with tasks/meetings | NOT IMPLEMENTED / NOT VERIFIED | Schema/API/UI, scheduling semantics, permissions, persistence, responsive and delivery tests |
| 5 — Time tracking, proposals, client/team workspace, automation | Build in small independently testable slices; don't implement fake switches or broad placeholder pages | NOT IMPLEMENTED / NOT VERIFIED | Acceptance criteria and API/data tests for each slice |
| 6 — AI insights hardening | Audit existing analytics/AI routes, verify rule-based and model modes, explain configuration and validate outputs | EXISTING PAGE; CAPABILITY AUDIT REQUIRED | Tests with model configured/unconfigured; no sensitive customer data leakage; clear provenance |
| 7 — Business module reconciliation | Audit CRM, transactions, ledger, inventory/photo upload, investments, savings, team, branding, exports and billing | EXISTING ROUTES; AUDIT REQUIRED | Feature-by-feature UI/API/database/permission/export verification |
| 8 — Learning & support | Verify tutorials match current UI and every link works; add lessons for completed features | PAGE EXISTS; CONTENT AUDIT REQUIRED | Link/content checks and mobile readability |
| 9 — Release QA | Full build/test suite, migrations, auth/tenant isolation, responsive checks, deployment SHA and production smoke tests | NOT COMPLETE | Evidence recorded below and no known critical regression |

**Priority rule:** work through phases in order unless a production security/data-loss issue requires immediate attention. Within each phase, deliver the smallest complete vertical slice; update this register after each PR. Do not skip later rows just because an earlier page looks polished.

## Feature status vocabulary

- **NOT IMPLEMENTED:** no real working implementation.
- **IN PROGRESS:** work is underway; acceptance criteria incomplete.
- **IMPLEMENTED IN CODE:** code exists but production verification may remain.
- **NOT VERIFIED:** evidence is missing or insufficient.
- **VERIFIED IN STAGING:** acceptance tests pass in a controlled environment.
- **VERIFIED IN PRODUCTION:** release SHA is confirmed and real non-destructive production smoke checks pass.
- **BLOCKED:** state the exact blocker and the next action.

## Required per-feature audit record

For every row in the detailed audit (to be maintained as `docs/engineering/FEATURE_AUDIT.md`), record:
- feature and agreed user outcome;
- desktop/mobile route and component;
- API route/handler and authorization checks;
- schema/migration/storage and tenant/business scoping;
- loading, empty, error, validation and accessibility behavior;
- unit/integration/e2e tests and exact results;
- deployment SHA and production evidence;
- status, known gaps, next concrete action and PR/commit link.

## Current known gaps / next actions

1. Reconfirm the current default branch and latest production deploy commit; this document's baseline SHA is historical until re-verified.
2. Inventory current sidebar and mobile navigation and map every route to the required groups.
3. Add the dedicated Visual Assistant entry and implement its first real, safe vertical slice; do not mislabel AI Reports as the Visual Assistant.
4. Run signed-in production smoke tests for the already-deployed tasks/projects/meetings feature without changing unrelated real business records.
5. Audit each remaining phase against actual code and backend behavior, updating `FEATURE_AUDIT.md`.
6. Keep AI transcription explicitly unimplemented until the full pipeline and privacy/security requirements pass.
7. Update this document in every implementation PR; keep statuses evidence-based.

## Change log

- **2026-10-28:** Initial engineering source-of-truth record created after product-owner identified drift between discussed workspace capabilities and the limited visible Work Management menu. Documents the prior work-management deployment, the broader agreed scope, phased delivery and completion rules.\n- **2026-10-28:** PR #89 adds the first Visual Assistant vertical slice (text-only; authenticated API; no persistence). Status remains unverified until CI and production checks pass.
\n\n## Current continuation record — 2026-10-28\n\n- PR #89 merged as `ac4b6f5527343456bdb3d962d8847e2281321fff`. GitHub reported Work Management Build Checks and Backend CI successful on PR head `5747a4050f8bf2d34c6b772bb41fd9c9573bd07c`; CI covers typechecks, frontend build, smoke tests, migration validation on a fresh DB, server health and Docker image build. This is not proof of production authenticated AI use.\n- Render frontend and API were confirmed live on docs commit `d69c307787b830cdb394d7c488dc93965c3c768a` before the Visual Assistant merge; the new runtime commit still requires deploy verification.\n- Calendar/Schedule first slice is a read view over existing task due dates and meeting timestamps. It does not claim standalone events, recurring events, reminders, or external calendar sync. Track this slice honestly until CI and authenticated integration checks pass.\n

## Continuation record — learning and dashboard guidance (2026-10-28)

- PR #90 merged as `9b5123fb83dd23f2c77031421ce307046c9b5419` after Work Management Build Checks and Backend CI both completed successfully on the PR head. Calendar & Schedule is a first read-only combined view of existing task due dates and meeting times; authenticated production behaviour remains unverified.
- Branch `feat/tutorials-dashboard-guidance` adds searchable written lessons for Visual Assistant safe use and Calendar & Schedule, improves course cards with custom inline SVG illustrations, and adds a dashboard Record → Review → Plan guide plus Visual Assistant and Tutorials links.
- The Visual Assistant tutorial explicitly states current text-only limits, session-only history, no database persistence, and cautions against entering credentials or confidential customer information. Do not describe image, screen, OCR, file or voice analysis as available until implemented and verified.
- UI guidance changes require CI and responsive/link checks. Dashboard financial KPIs and data calculations remain separately NOT VERIFIED; improved instructions do not imply data correctness.

- Follow-up within the same PR: the Visual Assistant page itself now includes a three-step usage guide (state goal → request clear steps → verify the saved result) and custom inline SVG artwork. This remains a text-only assistant; no image/screen/document/voice capabilities were added.


## Continuation record — Notes & Documents (2026-10-28)

- Branch `feat/work-notes-documents` adds a business-scoped written-notes feature: schema/table `work_notes`, migration `0014_work_notes.sql`, authenticated API routes for list/search/create/update/delete, protected `/work-notes` page, and Work Management navigation entry.
- Notes support categories, pinning, title/content/category search, edit/delete confirmation, and browser print. No uploaded files or attachments are supported in this first version; the UI states that limitation explicitly.
- The Tutorials & Courses page gains a Notes & Documents course and removes a duplicate `assistant` course ID discovered during review. The course already covers CRM, inventory, ledger, investments/savings, Visual Assistant and Calendar & Schedule.
- Before merge, CI must validate schema/types/build/API tests and migration application. After merge, verify Render deployment, migration application, authenticated CRUD/search and cross-business isolation. Do not call the feature production-verified before these checks.
