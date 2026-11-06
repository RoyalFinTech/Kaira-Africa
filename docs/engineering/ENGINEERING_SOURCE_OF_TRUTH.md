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

## Historical baseline at record creation

As of 2026-10-28, the previous engineering handover recorded that PR #87 (“Build Kaira Africa Work Management and Learning Centre”) was squash-merged to `main` as commit `a0e8baf755ca40afa1515b6e53970d3a2a0563cc`. Render reported both frontend and API deployments live on that commit. A read-only Supabase check found the new tables `work_meetings`, `work_projects`, `work_task_events`, and `work_tasks`, with RLS enabled and no direct SELECT grant for `anon` or `authenticated`. This is historical deployment/schema evidence, **not proof of authenticated end-to-end workflows**. The current verified baseline is recorded in the continuation entry below.

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
| 0 — Truth baseline & navigation audit | Reconfirm main/deploys/schema; inventory routes, sidebar labels, APIs, migrations and actual behaviors; keep this ledger authoritative | CURRENT DEPLOY/SCHEMA BASELINE RECONFIRMED; FULL FEATURE MATRIX STILL OPEN | Feature audit updated with current main SHA, Render state, CI/browser smoke evidence, Supabase grants/storage state and explicit authenticated-E2E gaps |
| 1 — Information architecture | Group all existing and planned destinations in the sidebar/mobile menu without orphaning existing pages; make Visual Assistant visible as its own destination | NOT IMPLEMENTED / NOT VERIFIED | Desktop/mobile navigation test; every item routes to a real page; no dead links |
| 2 — Core Work Management verification | Tasks, projects, meetings/minutes: authenticated end-to-end behavior and tenant isolation | IMPLEMENTED IN CODE; PRODUCTION E2E NOT VERIFIED | API/UI tests; CRUD/status/refresh persistence; authorization tests; production smoke evidence |
| 3 — Visual Assistant foundation | Dedicated VA workspace and real, bounded assistant interaction; safe actions require user confirmation | IMPLEMENTED IN CODE; NOT VERIFIED | PR #89 adds a protected text-only workspace and authenticated Responses API endpoint; CI, deployment/configuration and production smoke evidence remain required. Image/screen/OCR/voice capabilities remain unimplemented. |
| 4 — Calendar, reminders, notes/documents | Persistent scheduling, reminders, notes and document organization integrated with tasks/meetings | NOT IMPLEMENTED / NOT VERIFIED | Schema/API/UI, scheduling semantics, permissions, persistence, responsive and delivery tests |
| 5 — Time tracking, proposals, client/team workspace, automation | Build in small independently testable slices; don't implement fake switches or broad placeholder pages | NOT IMPLEMENTED / NOT VERIFIED | Acceptance criteria and API/data tests for each slice |
| 6 — AI insights hardening | Audit existing analytics/AI routes, verify rule-based and model modes, explain configuration and validate outputs | EXISTING PAGE; CAPABILITY AUDIT REQUIRED | Tests with model configured/unconfigured; no sensitive customer data leakage; clear provenance |
| 7 — Business module reconciliation | Audit CRM, transactions, ledger, inventory/photo upload, investments, savings, team, branding, exports and billing | EXISTING ROUTES; AUDIT REQUIRED | Feature-by-feature UI/API/database/permission/export verification |
| 8 — Learning & support | Verify tutorials match current UI and every link works; add lessons for completed features | PAGE EXISTS; CONTENT AUDIT REQUIRED | Link/content checks and mobile readability |
| 9 — Release QA | Full build/test suite, migrations, auth/tenant isolation, responsive checks, deployment SHA and production smoke tests | CI + DEPLOYED UI FIXTURE SMOKE PASSED; AUTHENTICATED PRODUCTION E2E NOT COMPLETE | Main commit 760c6b0a4933576f6972454747a42f22851f0a11 live on both Render services; CI 40947742617 and browser smoke 40947742624 passed; read-only Supabase grants/storage verified; authorized staging/session still needed for real persistence and tenant isolation |

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
- CI passed for the PR head, including typechecks, builds, API tests, and fresh-database migration validation. PR #92 merged as `92cb9c65b3bebbc640406f602aed6afc77f39bf0`; both Render frontend and API report that commit live. Supabase migration `0014_work_notes` was applied and recorded, and a read-only check confirmed `public.work_notes` exists with 9 columns. Authenticated CRUD/search and cross-business isolation have not yet been smoke-tested; feature status is deployed, not yet production-verified.


## Continuation record — Task notification audit and first backend slice (2026-10-28)

- Branch `feat/task-notification-delivery-audit` starts from production-reported commit `1f5ca2bcfa1d8473b7143c6a8765b8a22f048875`.
- Current work-management API validates task assignees against active team memberships with a linked Kaira user account. The first branch slice adds persistent in-app task notifications when a task is assigned/reassigned, and notifies the task creator when another user changes task status. Notifications link back to Work Management. A `task` notification enum value and migration `0015_task_notification_type.sql` are included.
- Audit did not find a configured web-push subscription/VAPID pipeline or service worker setup in the inspected files. Nodemailer is a dependency, but no confirmed SMTP provider configuration or delivery path was found. Therefore push, email fallback, background delivery/retries, and organization-configurable due/overdue reminders are **NOT IMPLEMENTED / NOT VERIFIED** at this stage.
- The current slice must pass CI and code review before merge. It does not send push or email and does not establish that an alert reaches a phone. No production data was modified and no real notifications were sent during this audit.
- Next implementation slice: add provider-backed web push with explicit browser opt-in and safe subscription storage; implement SMTP fallback only when provider configuration is present; add idempotent delivery/outbox and organization reminder policy/scheduler; test with an opted-in non-production account/device and a controlled email inbox before asserting delivery.


## Continuation record — timezone release and savings-ledger hardening (2026-10-29)

- PR #110 merged to `main` as `67544481977f11767a1fb9d4a1645cbbaac0aac6` after both Work Management Build Checks and Backend CI passed, including workspace/API/frontend typechecks, frontend build, API/smoke tests, fresh-database migration validation, server health check and production Docker image build. Render frontend deployment `dep-dbhikp7b9u1s739tlc00` and API deployment `dep-dbhikp7b9u1s739tlbng` both report this SHA as live. Authenticated timezone smoke tests remain unverified.
- Current follow-up branch `fix/savings-ledger-guidance-and-tests` extracts savings-pool balance arithmetic into a testable helper, adds unit tests for minor-unit balances and withdrawal bounds, and explains in the Savings Tracker form that goal balances and unassigned per-currency balances cannot be combined. The API retains per-pool transaction advisory locks for concurrent withdrawal safety.
- Investment Planner and Savings Tracker routes/pages are present in `main`, but authenticated production workflows, cross-business isolation, currency/date edge cases, CSV/print/PDF behavior and mobile/desktop end-to-end checks remain outstanding. Do not claim either feature is production-verified until those checks are recorded.
- No production savings entries, investment records, schema changes or manual deploy triggers were performed during this continuation.


## Continuation record — Supabase least-privilege review (2026-10-29)

- PR #112 merged as `e5372e6c23120929d7df20c1f6c66649e0675020`; Render frontend deployment `dep-dbhiqli9lscs739otr40` and API deployment `dep-dbhiqli9lscs739otqrg` both report this SHA as live. Drizzle migration ID 23 is recorded in production.
- Post-deploy read-only checks confirm `anon` and `authenticated` can no longer EXECUTE `public.rls_auto_enable()` (`postgres` can still execute it), and no matching TRUNCATE/REFERENCES/TRIGGER/MAINTAIN table grants remain for those generic roles in `public`.
- The Supabase security advisor now reports the informational RLS-enabled-without-policy finding on 32 tables only; the two SECURITY DEFINER execution warnings are gone. This is a least-privilege hardening change, not a redesign of RLS. Do not add broad policies solely to silence the informational finding; authenticated API routes enforce business scope.


## Continuation record — inventory photo upload reliability (2026-10-29)

- Read-only Supabase inspection confirms `inventory-images` exists, is private, allows JPEG only, and enforces a 204800-byte limit. Its current object count is zero; no production upload was attempted. The `profile-avatars` bucket remains private and contains one object.
- Source review found that the inventory upload endpoint could persist an object path and return HTTP 200 even when generating the private signed preview URL failed; the UI client accepted any 2xx response. This could make a saved photo appear to have uploaded successfully while no displayable URL was returned.
- PR #113 merged as `9a3cce6159cc35b81878c4ea2dccd7c782db7ef2` after all required CI checks passed, including production Docker image build. It changes uploads to a stable per-business/product object path, requires a signed preview URL before reporting success or saving a new path, attempts safe cleanup of unused/replaced objects, and adds tests for object path ownership and signed URL normalization. Both Render services were subsequently verified live on the application-code commit; authenticated production upload/replace/reload checks remain pending.
- Render log retrieval was attempted but the log service returned 503, so no historical inventory upload failure was attributed to a specific runtime error. Do not guess the production cause; verify with a signed-in retry after deployment and inspect logs when available.


## Continuation record — release and QA reconciliation (2026-10-29, current verification)

- Current GitHub `main` is `b592a7f83d5b7bfc4e1cf4b9cbcdf0551cbc1915`. PR #113 (inventory image reliability) and PR #58 (historical 2026-10-24 QA audit) are merged; PR #114 reconciled `docs/engineering/FEATURE_AUDIT.md`.
- Render frontend deployment `dep-dbhiv2s9v7es73bc8og0` and API deployment `dep-dbhiv34t50us738qm5jg` both report `b592a7f83d5b7bfc4e1cf4b9cbcdf0551cbc1915` live. The inventory application-code commit `9a3cce6159cc35b81878c4ea2dccd7c782db7ef2` was confirmed live on both services before the later documentation-only commits.
- PR #113 passed Work Management Build Checks and Backend CI, including typechecks, frontend build, API/smoke tests, backend build, fresh-database migration validation, health check, and production Docker image build. This establishes CI and release evidence, not an authenticated inventory photo workflow.
- Supabase checks from the previous continuation verified migration ID 23 and the least-privilege grant changes. No production customer/business records were created or changed for this reconciliation.
- PR #58's audit findings have been preserved as a historical snapshot. Current open validation work includes authenticated inventory image upload/replace/reload and boundary/negative tests; Investment Planner and Savings Tracker authenticated workflows; CRM CRUD/photo/tenant isolation; Work Management tasks/projects/meetings and Visual Assistant signed-in checks; timezone/reminder and email delivery verification; responsive/browser interaction coverage; safe production verification script execution; OpenAPI contract discipline; Redis degradation monitoring; and the manual regression matrix.
- Access limitation: no authenticated production browser/session was available to this engineering workflow. Do not create production test data or claim signed-in E2E checks passed. Use an authorized account/session for these workflows or run equivalent isolated staging tests first.
- Next execution order: (1) establish isolated automated browser/API tests for the high-risk upload and business-isolation paths, (2) run non-destructive authenticated smoke checks when a legitimate session is available, (3) audit/close the CRM and Investment/Savings gaps, (4) continue the grouped navigation/Visual Assistant/Work Management acceptance matrix, and (5) maintain this SSOT and the feature register with exact evidence.


## Continuation record — CRM photo reliability (2026-10-29)

- Source review of `artifacts/api-server/src/routes/crm.ts` found that CRM photo upload saved the new object path to the customer row before confirming the private signed preview could be generated. A subsequent signing failure could make the successful upload response contain a null avatar URL.
- Branch `fix/crm-photo-signed-preview-reliability` now verifies a signed URL before changing `customers.avatarUrl`, attempts to remove only the newly uploaded object if signing fails, preserves the existing photo on that failure, and returns the already-verified URL for the successful upload response. Helper tests cover signed URL normalization/missing URL and exact business/customer path ownership.
- This is a code-level reliability fix, not authenticated E2E proof. Keep customer photo upload/replace/reload/remove, invalid MIME/size, role authorization and cross-business denial unverified until exercised with isolated test data or an authorized session. No production customer data or Storage objects were modified.


## Continuation record — appearance and inventory/daily-sales consistency (2026-10-29)

- Source inspection found the Settings → Appearance cards only changed local React state and did not apply a theme; the UI itself stated that theme switching was not wired up. Branch fix/appearance-and-inventory-sales-consistency applies the root dark class, persists light/dark/system in device-local storage, and follows OS theme changes while system is selected. CI/deployment and browser persistence tests are pending.
- Daily Sales & Expense Book already loads inventory products and the backend transaction can atomically save a product-linked sale, decrement product quantity, insert an inventory movement and create the ledger entry. The audit found a currency mismatch risk: inventory permits GMD/NGN/USD but daily-ledger input and summary calculations are GMD-only, and the UI could offer non-GMD inventory products. The branch filters linked sales to GMD inventory and rejects any backend currency mismatch. Multi-currency ledger filters and separate per-currency summaries are still not implemented.
- Inventory minus controls create stock movements only; they do not capture a sale amount or revenue. UI copy now says stock removal/adjustment rather than implying a completed sale. Real sales should be entered through Daily Sales & Expense Book, where stock and ledger updates share a database transaction.
- CRM photo reliability PR #116 merged as fb204fba47053acc6b34ae8677e743dca6406fe5; PR-head CI passed. Merged-commit CI and Render deployment still need confirmation. No production records were modified during this continuation.

## Continuation record — calculator and navigation (2026-10-29)

- PR #117 was merged to main as `f0d1881090e279ce051ace7a5ecbb10b36a17b64`; typechecks, frontend build, API tests, fresh database migration validation, health check and Docker build passed. Both Render services are now live on the subsequent release commit `72f098646846c9985be8057aeef6bb0d86c24f3c`, which includes PR #117 and PR #118. PR-head CI passed; main post-merge Docker/browser checks are being checked separately. The fix applies light/dark/system, persists device preference and follows OS changes in system mode; authenticated/browser interaction remains unverified.
- PR #118 merged as `72f098646846c9985be8057aeef6bb0d86c24f3c` and both Render services report it live. The protected `/calculator` page named Smart Calculator is deployed. It has standard safe arithmetic (parser, no `eval`), live result preview, keyboard support, session-only history, and business calculations for gross profit, margin, markup, discounts and percentage tax/charges. It does not write into ledger or business data. Automated validation is pending.
- The same branch repairs navigation: route changes close the mobile drawer; hamburger and mobile logo toggle it; desktop hamburger toggles a collapsible sidebar; selecting a desktop destination returns it to compact mode; expanded state uses the full Kaira Africa logo and labels, collapsed state shows a compact logo and icon-only links. Check route changes, Escape/outside close, keyboard/focus and 320px mobile layouts before release.
- No production business records or Storage objects were modified.


## Release reconciliation — calculator and navigation (2026-10-29)

- Current `main` is `72f098646846c9985be8057aeef6bb0d86c24f3c`. Render frontend deployment `dep-dbhjg0p5efls738tkfm0` and API deployment `dep-dbhjg0p5efls738tkfd0` both report this commit live.
- PR #118 passed PR-head frontend typecheck/build, backend typechecks, API/smoke tests, fresh-database migration validation, server health and production Docker image build. The deployed-browser smoke check passed. Post-merge Docker verification for the latest currency release is still running.
- Smart Calculator route `/calculator` is now in the app and sidebar. Standard mode uses a safe expression parser without `eval`, live preview, keyboard input, copy result and session-only history. Business mode computes gross profit, margin, markup, discounts and tax/charge totals. It does not write to business records.
- Navigation now closes the mobile drawer after route changes and toggles it from the hamburger/logo. Desktop navigation collapses to a compact logo/icon sidebar after destination selection and can be expanded from the header hamburger or logo. Responsive visual interaction still needs a real signed-in device/browser check.


## Continuation record — currency-specific daily sales (2026-10-29)

- PR #121 merged as `3681d354f5685559900aeb96a1f21b3a6a53ece1` and both Render services report this commit live. It implements the next slice for the audited currency mismatch: daily ledger supports GMD/NGN/USD with GMD default, a currency selector scopes entries and summaries, trends/categories, print/CSV and linked inventory product options to one currency, and the API validates currency values and enforces same-currency debt payment allocation.
- Linked product sales preserve the existing transaction that decrements stock, writes an inventory movement and inserts the ledger entry. Product/ledger currency mismatch is rejected server-side. PR-head CI passed, including typechecks/build, API tests, fresh-database migration validation, health check and Docker image build. Post-merge Docker verification is still running; manual authenticated workflows remain required.
- No production business records or Storage objects were modified.


## Release reconciliation — multi-currency daily ledger (2026-10-29)

- Current `main` is `3681d354f5685559900aeb96a1f21b3a6a53ece1`. Render frontend `dep-dbhjm1favr4c739u833g` and API `dep-dbhjm1favr4c739u82r0` both report this SHA live.
- PR #121 passed PR-head typechecks, frontend build, API tests, fresh-database migration validation, health check and production Docker image build. Post-merge Docker verification remains in progress; deployed splash/onboarding browser smoke passed.
- Daily ledger supports GMD/NGN/USD with GMD default. The selected currency scopes entries, summaries, debt totals, trends/categories, print/CSV, and available inventory products. Debt payment allocations match currency; linked sales keep stock, movement and ledger writes transactional. Authenticated end-to-end tests and tenant-isolation checks remain outstanding.
- No production business records or Storage objects were modified.


## QA continuation — photo safety and financial invariants (2026-10-29)

Historical baseline: application-code commit 74c39e0a6db676a00511efe0460d395ffad3c1c3 was live after PRs #123–#129. It is superseded by the latest QA continuation below, which includes currency/photo/print and test-harness changes.

- **Photo safety:** PR #123 validates canonical Base64, file signatures, supported formats and exact CRM (2 MB) / inventory (200 KB) boundaries. PR #126 restricts private object paths and validates CRM/inventory paths before signing or cleanup. These are unit-level guarantees; signed-in upload/replace/reload/remove and private-object access still require E2E tests.
- **Anonymous access:** PRs #124–#125 added read-only anonymous probes. Live workflow [40878832914](https://github.com/RoyalFinTech/Kaira-Africa/actions/runs/40878832914) passed with HTTP 401 for auth/me, CRM customers, inventory products, investment plans, savings overview and daily ledger. This does not prove cross-business isolation for authenticated users.
- **Investment Planner:** PR #127 extracts and tests money validation (planned costs, expected revenue/profit bounds, zero/negative values and safe integer limits). Signed-in plan creation, daily recording, currency/business isolation and exports remain NOT VERIFIED.
- **Daily Ledger:** PR #128 validates debt allocation inputs/aggregate totals and adds tests for oldest-first allocation, exact payoff, overpayment and malformed amounts. Signed-in payment allocation, stock/ledger transaction behavior, cross-currency rejection and export behavior remain NOT VERIFIED.
- **Savings:** PR #129 guards cumulative savings balance overflow. The agreed business rule remains: goal withdrawals draw only from that goal; unassigned withdrawals draw only from the unassigned balance in the same currency; advisory transaction locks serialize withdrawals per pool. Concurrent withdrawal, currency/business isolation and signed-in persistence tests remain NOT VERIFIED.
- **Production safety:** No customer records, financial entries or Storage objects were created or mutated for QA. Read-only checks found the CRM, inventory, investment and savings tables empty; the profile-avatar bucket had one existing object.
- **Remaining release gate:** obtain an authorized signed-in test session or isolated staging identities and execute CRUD, photo lifecycle, tenant isolation, multi-currency/stock/debt, investment/savings concurrency, and print/CSV/PDF checks. Do not promote features from “implemented in code” to “E2E verified” before those checks.

## Continuation record — latest deployed UI QA and release (2026-10-29 20:20 UTC)

- Current GitHub main is 760c6b0a4933576f6972454747a42f22851f0a11. Render frontend and API are both live on that exact commit.
- Merged changes after the earlier 74c39e0 baseline: PR #132 private-photo reliability/security; PR #139/#140 money input formatting, currency flags, inventory print photos and daily-sales photo preview; PR #141 custom inventory category cleanup; PR #142 exact signed-photo bucket validation; PR #143–#145 corrected visible-flag and Savings-mode smoke assertions; PR #146 bounded print image decoding; PR #147 persistent browser print instrumentation.
- Backend CI 40947742617 passed typechecks/build/API tests, fresh-DB migration validation, health check and Docker image build. Deployed-browser smoke 40947742624 passed against the live frontend, including branding/onboarding timing, desktop/mobile responsive checks, PIN/profile UI, CRM and inventory fixture flows, currency flags, Savings goal/record modes, receipt sample print, navigation, profile recovery, dashboard period selection, mobile ledger navigation and transaction CSV export.
- **Interpretation limit:** the browser suite intercepts app API calls with test fixtures. It verifies deployed UI behavior and print/export client flows, but does not prove authenticated production CRUD, persistent uploads, real Storage access or cross-business isolation. No production business records or Storage objects were created/modified.
- Read-only Supabase verification: drizzle.__drizzle_migrations has 23 records (max ID 23); public.rls_auto_enable() is not executable by anon/authenticated and remains executable by postgres; unsafe generic table grants for anon/authenticated count 0. Private buckets remain: inventory-images JPEG-only/200 KB/0 objects; customer-photos JPEG/PNG/WebP/2 MB/0 objects; profile-avatars JPEG/PNG/WebP/2 MB/1 pre-existing object.
- The live API anonymous-access smoke still passes HTTP 401 for auth/CRM/inventory/investment/savings/ledger endpoints. This is not tenant-isolation evidence.
- Remaining release gates: authenticated or isolated-staging CRM/customer/photo persistence and tenant isolation; real inventory photo lifecycle; multi-currency ledger/debt/stock atomicity; investment/savings CRUD and concurrent withdrawals; authenticated print/PDF/CSV output. Also still open: OpenAPI contract discipline, Redis degradation monitoring, manual regression matrix, web push, paid entitlements, proposals/quotations and automation. Keep all of these explicitly NOT VERIFIED/NOT IMPLEMENTED until evidence exists.



## Current continuation record — latest production release and business referrals (2026-11-03)

- Verified main baseline: 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa. This is newer than all earlier historical baselines above.
- PR #172 merged as c71a2fdbe6129ee895212bf98539098b7c7dfc1f: official Kaira logo on the public team invitation page, correction to invitee phone/PIN continuation, expiry/resend roster consistency and migration 0024 removing the joined_at default. Workspace/Backend CI passed; frontend/API/admin Render services were verified Live on this commit. Supabase confirmed migration 0024 and team_members.joined_at nullable/no default.
- PR #173 merged as 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa: responsive mobile header, dashboard welcome and quick actions, calculator metric cards and discount/tax layout. Workspace and Backend CI including production Docker build passed. All three Render services were verified Live on this SHA. Physical device screenshots at 320/360/390/430px, tablet and desktop remain NOT VERIFIED.
- Read-only Supabase checkpoint before referral work: Drizzle migration ledger count 25, max ID 25 (through 0024); public.businesses count 2; RLS enabled; anon and authenticated have no direct SELECT or INSERT privileges on public.businesses.
- PR #174 merged/deployed as 73f5ba1d3af5e4fcb31b53574465dc2bec9a4586. Final PR head 1ef0cdab662517d39fd6e8a3a8806a7a45c4cfe2; Work Management Build Checks 41714635692 and Backend CI 41714635727 passed. The release adds stable business referral codes, owner-only /referrals page, onboarding attribution, static route entry and migration 0025. This is B2B referral only, not a team invite.
- Referral scope is business-to-business only. It gives a business owner a permanent KAI- code and a branded Refer a Business page, captures ?ref= through onboarding, and records the referring business on a newly created business. It never creates a team member, grants access to another business, or exposes customer/financial records.
- Historical pre-deployment note: migration 0025 was pending when this earlier section was written. It is now applied and production-verified; see the latest release checkpoint below. Never print actual production codes or create production test businesses.
- No referral reward balances, payouts, commissions or paid-feature unlocks are active. Treat all rewards as future product policy.
- Full current handover and next-chat prompt: docs/engineering/2026-11-03-KAIRA-AFRICA-CONTINUATION-HANDOVER.md. Keep all status wording evidence-based; CI, deployment, authenticated E2E and physical device visual testing are separate acceptance gates.


- PR #174 static deep-link audit: added /referrals to artifacts/kaira-africa/scripts/generate-spa-routes.mjs because Render uses an explicit static SPA entry list. Direct load and browser refresh require the generated /referrals/index.html. Commit 4a9172820054f63342907cce2dd394d6d29cb082; previous referral CI runs are superseded.


## Production verification — referral release and next active PR (2026-11-03)

- Current main after PR #176: 3c0a73fea6ce4372773b45e73f8746e31859e478.
- PR #174 merged and deployed. API/frontend/admin services are live on the exact SHA. API startup logged successful migrations. Supabase ledger count 26/max 26.
- Migration 0025 is verified: two businesses, two non-null distinct codes, zero missing; unique referral-code index, referred-by index and self-FK exist. Businesses RLS is enabled; anon/authenticated direct SELECT/INSERT privileges remain false. Attributed-business count is zero. No real referral code was output.
- Frontend and admin static sites each generated 35 SPA entry routes, including /referrals.
- PR #176 is now merged as 3c0a73fea6ce4372773b45e73f8746e31859e478. Workspace Build Checks 41715633932 and Backend CI 41715633934 passed, including Docker. All three Render services are Live on 3c0a73f. Desktop install card now remains visible at the right edge without beforeinstallprompt and shows manual browser instructions; physical device testing remains outstanding.
- Remaining: finish/merge PR #176 only after exact-head CI passes, verify Render deploy, and physically test desktop/mobile install behavior. Controlled staging referral E2E still required.
- Main branch protection was previously observed as false through the branch API; app permissions could not read admin branch-protection settings. Recheck. Recommend requiring PR review, both CI workflows and blocking force pushes; do not claim protection is enabled until verified.


## Latest production checkpoint — referral and PWA releases (2026-11-03)

- Current GitHub main: 3c0a73fea6ce4372773b45e73f8746e31859e478.
- PR #174 business referrals merged/deployed as 73f5ba1; migration 0025 is applied. Two existing business rows have two distinct non-null referral codes, no missing codes; unique/referrer indexes and FK are present; businesses RLS remains enabled and anon/authenticated direct SELECT/INSERT privileges remain false. Attributed business count remains zero; no production referral test records were added.
- PR #176 desktop PWA guidance merged as 3c0a73f. Exact-head Workspace run 41715633932 and Backend CI run 41715633934 passed, including Docker. All three Render services are verified Live on 3c0a73f:
  - API dep-dbl4iqivcj2c7383dhu0
  - Frontend dep-dbl4iqivcj2c7383dib0
  - Admin dep-dbl4iqivcj2c7383di70
- Physical browser/device testing remains outstanding: desktop native and no-native install-event cases, right-edge placement, manual help, standalone/dismissed; iOS/Android install; mobile widths and nav.
- PR #177 was based on the pre-PWA main and became unmergeable; replace it with the fresh docs reconciliation PR based on main 3c0a73f.


## Latest repository/deployment SHA — 2026-11-03 20:58 UTC

- Latest GitHub main: 61eb8e53a02035a809cd9b2e4e1b16f6ac2e627b. This is the docs-only reconciliation commit after the last application-code release.
- Last application-code release: 3c0a73fea6ce4372773b45e73f8746e31859e478 (PR #176 desktop PWA guidance). The referral feature release was 73f5ba1 (PR #174).
- All three Render services were subsequently verified Live on the latest main/docs commit 61eb8e5:
  - API dep-dbl4l0p42hec73c7qveg
  - Frontend dep-dbl4l1142hec73c7qvr0
  - Admin dep-dbl4l0p42hec73c7qvn0
- Supabase latest verified schema remains migration ledger 26/max ID 26, with migration 0025 applied. No database migration was part of PR #176 or the documentation-only PRs.
- Outstanding: physical browser/device acceptance for PWA, authenticated staged referral onboarding/count attribution, plus the complete roadmap in the continuation handover/FEATURE_AUDIT.md.


## Current continuation checkpoint — 2026-11-04 (supersedes older baseline values above)

- Current GitHub `main` at the start of this continuation: `dd29ae76bbd035938626979daaaf397be86b204d` (docs-only release reconciliation commit).
- All three Render services are verified `live` on that exact SHA:
  - API `srv-da6fnem7bikc738ekde0`, deployment `dep-dbl4n2c9v7es73aud6vg`
  - Frontend `srv-db257gjbc2fs73f9nsj0`, deployment `dep-dbl4n2c9v7es73aud78g`
  - Admin static `srv-dbg86rmk1f9s73bkkev0`, deployment `dep-dbl4n2c9v7es73aud7e0`
- The last application-code release before this docs-only SHA remains `3c0a73fea6ce4372773b45e73f8746e31859e478` (PR #176 desktop PWA install guidance). PR #174 referral links, PR #172 invite branding/PIN continuation and PR #173 mobile responsive fixes are included in production main history.
- Supabase project `gofoibbvxnhqzqwrpcbx` / `eu-west-1`: read-only Drizzle ledger query confirms migration IDs 23, 24, 25 and 26 exist. Businesses: 2 records, 2 non-null referral codes, 2 distinct codes, 0 attributed business rows. Never reveal the actual codes. Migration 0025 FK and unique/referrer indexes are present. `businesses` RLS is enabled; anon/authenticated direct SELECT and INSERT privileges are false.
- Referral implementation is ALREADY BUILT and DEPLOYED from PR #174 (`73f5ba1d3af5e4fcb31b53574465dc2bec9a4586`): owner-only `/referrals`, Sidebar GROWTH / “Refer a Business”, branded Kaira green/gold page with existing KairaLogo, permanent unique business code, copy and prefilled WhatsApp share, count, `/?ref=CODE` capture, sessionStorage handoff through signup/login and new-business onboarding, and `referred_by_business_id` attribution at business creation. Mobile More opens the same Sidebar drawer. This is business-to-business only, not team invitations; referral creates no team member and grants no access to another business.
- The referral page explicitly states that rewards are not active. No commission, points, payout, paid feature entitlement or automatic bonus is implemented or promised.
- Code audit confirms owner-only `GET /businesses/me/referral`; new workspace creation accepts an optional `x-kaira-referral-code` and validates/records attribution in the same transaction. Invalid/unknown code can be removed from onboarding to continue without attribution; self-referral is rejected.
- Current remaining referral acceptance gap: no controlled two-business authenticated E2E has been performed. Test only in isolated staging/with two consenting controlled test identities: owner link copy/share, direct route refresh, anonymous 401, manager/staff 403, signup/login referral retention, referred business attribution and count increment, new code generation for the referred business, invalid/unknown code, self-referral, stale/sessionStorage behavior, existing business membership rejection, and no team/data leakage. Do NOT create production referral businesses or output production referral codes.
- Additional integrity finding in this continuation: `createBusinessForUser` checked `users.business_id` inside a transaction but did not lock that user row. Two concurrent onboarding submissions could both see NULL and insert separate business rows for one user. Branch `fix/business-onboarding-serialization` adds `SELECT ... FOR UPDATE` to serialize workspace creation per user. At the time this handover is authored, the change is pending PR/CI and is NOT yet merged/deployed; verify latest branch/PR status before proceeding.
- PR #176 also makes the desktop PWA install guidance card available when `beforeinstallprompt` is absent, aligned at the right edge with browser-menu help. Do not mark device acceptance complete: physical desktop, Android Chrome, iOS Safari, standalone/dismissal, service worker and responsive viewport tests remain NOT VERIFIED.
- Latest visual mobile patch PR #173 is deployed: one mobile header control, wrapping dashboard welcome and quick actions, responsive calculator metrics and long-value handling. No physical screenshot evidence exists for 320/360/390/430px, tablet or desktop.
- The owner referral page should be described as implemented/deployed, not “to be created.” The next work is to validate its complete signup attribution safely, not duplicate its UI.



## Post-merge release verification — PR #180 (2026-11-04 11:04 UTC)

- PR #180 merged as `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- Exact-head Work Management Build Checks run `41817865954` passed; exact-head Backend CI run `41817865764` passed, including API/frontend typechecks, API tests, fresh migration validation, health smoke and production Docker image build.
- The code change adds a `FOR UPDATE` row lock to the current user's `users` record inside `createBusinessForUser`, serializing business workspace creation so concurrent onboarding requests cannot both observe a NULL business association.
- No database schema migration was added. Render API, frontend and admin static services all verified Live on `0835684`:
  - API `dep-dblh1iflk1mc73euq6hg`
  - Frontend `dep-dblh1iflk1mc73euq6u0`
  - Admin `dep-dblh1iflk1mc73euq6q0`
- API deployment log: “Migrations applied successfully.” New instance started and `/ready` returned HTTP 200. Supabase data was not modified by this code-only release.
- Current main at this checkpoint: `0835684f2158cb0624ccd43c8063dd9ec42646fe`. The referral feature remains implemented/deployed via PR #174. Its authenticated two-business E2E remains outstanding and requires isolated staging.


## Current engineering checkpoint — 2026-11-04 (supersedes older SHA snapshots)

- Latest verified `main`: `07cc2aa5a8b80c29677e1534d2923261b48270ef` (docs reconciliation). Last application-code release is PR #180 merge `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- All Render services were read from their latest deploy records and are Live on the current main SHA: API `dep-dblh3hdckfvc73fhqnm0`, frontend `dep-dblh3hdckfvc73fhqnug`, admin static `dep-dblh3hdckfvc73fhqo3g`.
- PR #174 business-to-business referrals is already implemented/deployed: owner-only `/referrals`, Sidebar GROWTH > Refer a Business, permanent business-specific link, copy/WhatsApp, onboarding attribution and count. This is separate from team invitations; rewards/payouts/paid-feature access are future-only.
- Read-only Supabase verification: migration ledger 26/max ID 26; two businesses; two non-null distinct referral codes; zero attributed business rows; `businesses` RLS enabled; direct anon/authenticated SELECT/INSERT denied; referral indexes and self-FK present. Do not reveal actual codes.
- No separate staging project or Supabase development branch was available; only the Kaira Africa project was listed and `list_branches` returned none. Referral and invitation E2E must wait for approved isolated staging or authorized controlled test identities. Never synthesize production businesses/referrals.
- Security advisor snapshot: 33 INFO `rls_enabled_no_policy` findings. This is not a reason to grant broad Data API access: generic anon/authenticated business table SELECT/INSERT are denied and app access is through the trusted API. Review each table's actual API access model before changing RLS.
- Performance advisor snapshot: 26 INFO unindexed-FK findings and 30 unused-index findings. Review query workload and FK operations before adding/removing indexes; no bulk index changes.
- PR #163 was closed as superseded. Current main's live smoke script already navigates to Transactions in the SPA session instead of full-page navigation that would relock the visual PIN session.
- Full remaining roadmap and acceptance requirements remain in the phase register and FEATURE_AUDIT.md. Keep CI/deployment/authenticated E2E/physical device acceptance distinct.

---

## Release and QA addendum — 2026-11-04 (PR #183)

### Superseding release checkpoint
- Main before this documentation-only reconciliation: 6062488e696535cff1f30fa4a0f19b3fae111b62.
- PR #183 merged as 6062488e696535cff1f30fa4a0f19b3fae111b62; test/CI-only. The last application-runtime release is PR #180, 0835684f2158cb0624ccd43c8063dd9ec42646fe.
- Required CI: Backend CI 41828303516 SUCCESS; Work Management Build Checks 41828303519 SUCCESS.
- Backend CI ran 71 API tests: 71 passed, 0 failed, 0 skipped. The database-backed cases ran against the fresh disposable PostgreSQL database after migrations; they were not skipped.
- The same Backend CI run passed shared/API/frontend typechecks, builds, fresh migration validation, /health smoke and production Docker image build.
- Render API dep-dbli6vivcj2c738pbkbg, frontend dep-dbli6vivcj2c738pbkp0 and admin dep-dbli6vivcj2c738pbkl0 are each verified Live on 6062488e696535cff1f30fa4a0f19b3fae111b62.
- Supabase production Drizzle ledger remains 26/max ID 26. No production migration or production record was changed for PR #183.

### New database acceptance tests
PR #183 added opt-in PostgreSQL tests for:
1. Eight concurrent createBusinessForUser calls for one user produce one business and seven existing-business conflicts, with the user's business association matching that sole business.
2. Referral creation creates an independently owned business with its own unique referral code, links the referring business through referred_by_business_id, increments the attribution count, and does not create team membership for the referred user.
3. An unknown referral code is rejected and leaves no new business or user/business association after transaction rollback.

These tests provide database/repository-level regression evidence for onboarding serialization and referral independence. They do not prove authenticated UI flow, full tenant isolation across business data APIs or device behavior.

### Current acceptance status and guardrails
- Referral feature: IMPLEMENTED IN CODE + CI DATABASE ACCEPTANCE PASSED + DEPLOYED; AUTHENTICATED UI/ROLE/LOGIN-RETENTION/HTTP TENANT-ISOLATION E2E NOT VERIFIED.
- Team invitations: IMPLEMENTED IN CODE; controlled authenticated OTP/PIN, invited-phone, expiry/revoke/resend/one-time/cross-business and real SMS/SMTP delivery acceptance NOT VERIFIED.
- PWA/mobile: implemented changes deployed; physical Android/iOS/desktop install, service-worker and 320/360/390/430 px/tablet/desktop acceptance NOT VERIFIED.
- The connected Supabase project has no development branches. No isolated staging project or staging identities were available for this pass. All user, business, referral, invitation, financial and Storage write tests must remain off production.
- Production referral checkpoint remains 2 businesses, 2 distinct referral codes, 0 attributed businesses. Do not reveal code values and do not create production test referrals.
- Keep CI passed, Render Live, migrations verified, authenticated E2E passed and physical device tested as separate statuses. All other roadmap features and acceptance gaps remain in the feature audit; this addendum does not close or remove them.


---

## Release and QA addendum — 2026-11-04 (PR #185)

- Current main: `276e9b371bdb9641b47932bc808f77e96c03b8b4`. PR #185 merged as that squash SHA; final PR head was `d95560eb0a1259398fd203e5ac4e7e7bc73e5709`.
- PR #185 changed only `artifacts/api-server/test/business-onboarding-db.test.ts` and `.github/workflows/live-api-access-smoke.yml`; no runtime source, OpenAPI, generated artifacts or database migration changed. Last application-code release remains PR #180 `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- Backend CI `41835886367` SUCCESS and Work Management Build Checks `41835886321` SUCCESS on the exact PR head. Backend CI passed shared/API/frontend typechecks; frontend/API builds; fresh disposable PostgreSQL migrations; 71 API tests (71 passed, 0 failed, 0 skipped); API health smoke; and production Docker image build. The DB referral test now includes self-referral and already-associated-account rejection assertions.
- New anonymous live API smoke probe for `GET /api/businesses/me/referral` expects HTTP 401 and is configured in the main-push/scheduled/manual workflow. The push-triggered workflow result was not independently exposed/retrieved here; no matching post-deploy request log was observed. Treat live anonymous 401 as NOT VERIFIED until a run or request evidence is inspected.
- All Render services are verified `live` on exact SHA `276e9b371bdb9641b47932bc808f77e96c03b8b4`: API deploy `dep-dblivk5ckfvc73fkd9h0`, frontend deploy `dep-dblivk5ckfvc73fkd9pg`, admin deploy `dep-dblivk5ckfvc73fkd9ug`. API logs show Redis connected and `/ready` HTTP 200. No post-deployment HTTP 500/502/503 request entries were returned by the checked window.
- Supabase Drizzle ledger remains 26/max ID 26; there was no migration. No production test records were created/changed. The read-only business count remains 2, 2 distinct codes present, zero referred businesses; do not reveal referral codes.
- No Supabase staging branch exists. A branch-creation request hit Supabase's cost-confirmation gate and created nothing. Obtain the user's explicit approval to the quoted cost before creating any branch/project; no production data may be used for E2E.
- All 33 public tables have RLS enabled; the checked table-grant query returned no generic table privileges to `anon`, `authenticated` or `PUBLIC`. Do not broaden Data API privileges to clear the informational no-policy advisor warnings.
- Still NOT VERIFIED: authenticated referral page/owner 200/manager-staff 403/live anonymous 401/signup retention/two-business attribution and count/tenant isolation; team invitation database lifecycle/real OTP-PIN and SMS-SMTP delivery; physical PWA install/service worker and responsive viewport QA. Continue the complete feature audit without dropping requirements.



---

## Release and QA addendum — 2026-11-04 (PR #187 team invitations)

- Current GitHub main: `0e920c77450f56db657d8127cf539d09fcecb01b`; PR #187 merged as this squash SHA (PR head `45d3469a64bcb66ffcc045ea71800bfd9f487b64`).
- PR #187 adds only `artifacts/api-server/test/team-invitations-db.test.ts`. No runtime source, OpenAPI/generated artifact, schema or migration changed; last runtime code release remains PR #180 `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- Backend CI `41837224773` SUCCESS; Work Management Build Checks `41837224553` SUCCESS. Backend CI passed typechecks/builds, fresh disposable PostgreSQL migrations, 75 API tests (75 pass, 0 fail, 0 skipped), API health smoke and production Docker image build. Work Management workspace typecheck/build/API tests passed.
- Four new DB invitation tests passed: wrong invited phone does not consume invite, valid phone accepts once, expired/revoked invites cannot be accepted, resend rotates token hash and invalidates old link, and a user already attached to another business cannot join the inviting business. The cross-business case is the fourth test; resend is third.
- This is database/repository acceptance only, not real OTP/PIN session E2E or SMS/SMTP provider delivery.
- All three Render services are live on the exact SHA: API `dep-dblj3ilbedkc73ad9hn0`, frontend `dep-dblj3ilbedkc73ad9i40`, admin `dep-dblj3ilbedkc73ad9i00`. Log retrieval was intermittently unavailable in the final check; do not claim an independently observed post-PR #187 `/ready` 200 from those logs.
- Supabase Drizzle ledger remains 26/max ID 26; PR #187 has no migration. Production businesses remain 2, with 2 referral codes present/distinct and 0 attributed records. No production test records were used.
- No staging Supabase branch exists. Branch creation is gated by Supabase cost confirmation; confirm the correct organization, obtain a current estimate, tell the user the exact price and get explicit approval before creating it.
- Invitation lifecycle DB coverage is improved; real OTP, returning-user PIN continuation, matching invitee identity over actual auth, SMS/SMTP delivery, retry/outbox and browser/device QA remain NOT VERIFIED. All referral UI/role/login-retention/two-business E2E and physical PWA acceptance remain NOT VERIFIED. Preserve all remaining roadmap requirements in the feature audit.



---

## Release and acceptance addendum — 2026-11-04 (PRs #189 and #190)

- Current main before this documentation update: `55399e3af49370305be9b0812643f25c19b55eb6`.
- PR #189 `bc61a4022c3627db592f52c0b53921ce6c6aaf8a` adds actual referral endpoint route/session/RBAC DB acceptance. Backend CI `41840262142` and Work Management `41840262711` passed; API suite 76/76, 0 failed/skipped.
- PR #190 `55399e3af49370305be9b0812643f25c19b55eb6` adds actual team invitation preview/accept HTTP route acceptance against disposable PostgreSQL/Redis. Backend CI `41841318239` and Work Management `41841318308` passed; API suite 77/77, 0 failed/skipped, including fresh migration validation, health smoke and Docker image build.
- PR #189 route test: anonymous/invalid session/unassigned owner 401; manager/staff 403; owner 200 with their own business referral code/summary.
- PR #190 route test: masked invitation preview; invalid token/anonymous rejection; wrong invited-phone 403 without consuming invitation; correct invited-phone session accepts 200; duplicate acceptance 409; manager/staff invitation creation 403. No SMS/SMTP provider was called.
- Correction: the live access-control smoke workflow added by PR #185 **passed** after merge. Run `41836364878`, job `126596191694`, on main SHA `276e9b371bdb9641b47932bc808f77e96c03b8b4`; live health HTTP 200 and all seven anonymous protected endpoint probes returned 401, including `GET /api/businesses/me/referral`. This supersedes earlier notes that said its result was unavailable.
- Render API `dep-dbljg85ckfvc73fl7n4g`, frontend `dep-dbljg85ckfvc73fl7nd0`, admin `dep-dbljg85ckfvc73fl7ni0` are verified live on `55399e3af49370305be9b0812643f25c19b55eb6`.
- Production Drizzle ledger is 26/max ID 26; no migration in either PR. The read-only production aggregate remains 2 businesses, 2 distinct referral codes, 0 attributed referrals. No production test records were created or changed.
- Supabase isolated staging branch cost estimate is US$0.01344/hour; no creation or cost confirmation until explicit user approval. Real OTP/PIN, SMS/SMTP delivery, full browser referral/signup acceptance and physical PWA/device acceptance remain NOT VERIFIED. Preserve all other roadmap items and keep test CI evidence separate from staging acceptance.



---

## Release and QA addendum — 2026-11-04 (PR #192 OTP/PIN route acceptance)

- Current main before this documentation update: `ddd3d0b404a378701c49410d978a89e6b26016ed`. PR #192 merged as that squash SHA (corrected PR head `344311df1208e20c782fa6e6ed376fd580960887`).
- PR #192 adds only `artifacts/api-server/test/auth-otp-pin-route-db.test.ts`; no runtime source, OpenAPI/generated contract, database schema or migration changed.
- Backend CI `41842988171` SUCCESS and Work Management Build Checks `41842988148` SUCCESS on corrected PR head. Backend passed all workspace/API/frontend typechecks/builds, fresh disposable migrations, 78 API tests (78 pass, 0 fail, 0 skip), API health smoke and production Docker image build.
- New test verified HTTP OTP verification using a pre-seeded HMAC-hashed OTP in disposable PostgreSQL; successful verification creates a user/session; first-time PIN creation stores an Argon2id hash; existing PIN change requires current PIN; a PIN-enabled user receives HTTP 409 `pin_login_required` from OTP request without inserting another OTP; bad PIN login fails and correct PIN login creates a session accepted by `/auth/me`.
- The test does not call the SMS provider. It validates verification and PIN routes, not actual OTP sending/carrier delivery.
- All three Render services are Live on exact SHA `ddd3d0b404a378701c49410d978a89e6b26016ed`: API `dep-dbljl8avcj2c738rjh1g`, frontend `dep-dbljl8avcj2c738rjha0`, admin `dep-dbljl8avcj2c738rjhgg`. API startup logged successful migrations, Redis connected and readiness HTTP 200.
- Supabase Drizzle production ledger remains 26/max ID 26; no migration. Business aggregate remains 2 businesses, 2 distinct referral codes, 0 attributed businesses. No production test user, OTP, session or PIN change was performed.
- Real new-user OTP sending and SMS delivery, returning-user PIN browser flow, SMTP invitation delivery, referral browser/signup flow, physical PWA/device acceptance and full remaining roadmap still require their own acceptance evidence. Staging branch estimate is US$0.01344/hour; not provisioned pending explicit user cost approval.



---

## Release and QA addendum — 2026-11-04 (PR #194 OTP security)

- Main: `8711ee8008040479f5ceef2dd418967e3c79011e`; PR #194 changed only `artifacts/api-server/test/auth-otp-pin-route-db.test.ts`, with no runtime/schema/migration change.
- Backend CI `41844754318` and Work Management Build Checks `41844754245` SUCCESS. API suite 78/78; fresh migrations, typechecks/builds, health smoke and production Docker image build passed.
- OTP/PIN CI acceptance now includes expired-code rejection without user creation/consumption, failed-attempt increments and lockout even when a later code is correct; existing OTP verification/session and Argon2id PIN setup/change/login checks remain passing.
- These tests use hashed synthetic OTPs in disposable CI PostgreSQL and make no SMS provider calls.
- All Render services live on the exact SHA: API `dep-dbljqilbedkc73aed64g`, frontend `dep-dbljqilbedkc73aed6d0`, admin `dep-dbljqilbedkc73aed6i0`. API logs show migrations successful, Redis connected and readiness HTTP 200.
- Production Drizzle ledger remains 26/max ID 26; 2 businesses, 2 distinct referral codes, 0 attributed referrals. No production data changed.
- Real SMS/carrier, OTP request delivery, browser PIN recovery, SMTP and physical-device acceptance remain NOT VERIFIED. Staging branch cost estimate US$0.01344/hour remains unapproved. Preserve all remaining roadmap items.



## Current continuation scope — 6 November 2026


A new feature branch `feat/pwa-share-mobile-country-ux` was created from verified main `277d57d6819adc6f6d07259681b867e3ecab68e8`. Current main had no open PRs at inspection; all three Render services were Live on that SHA. This entry records newly requested scope; it is not a claim of implementation or deployment.

Add to the active acceptance register:
- Shareable app URLs: verify root and deep-link destination loading on a second device/browser; correct canonical, Open Graph and Twitter metadata; provide an absolute Kaira preview image; verify crawler-visible metadata separately from browser navigation.
- PWA identity: standard/Apple/maskable icon variants with correct dimensions and MIME types; installed app icon/name on Android, iOS and desktop; safe service-worker cache versioning and update activation.
- Refresh UX: accessible manual refresh and mobile pull-down refresh, query invalidation/refetch, clear progress/error state, no accidental route navigation, no loss of unsaved edits.
- Responsive QA: dashboard, onboarding, forms, navigation, install prompt and cards at 320/360/390/430 px, tablet and desktop.
- Country flags in business onboarding: The Gambia remains default; every option (The Gambia, Senegal, Sierra Leone, Ghana, Nigeria, Kenya, South Africa, Egypt) has its own visible compact SVG flag. This is separate from the Gambian-only +220 phone authentication flow.
- Dashboard imagery: review the existing hero asset and add optimized branded visual assets to meaningful dashboard modules only where they improve understanding; no image should obscure live data or slow first render.

Do not mark these complete until implementation, CI, direct-link/browser checks and supported device checks are evidenced. No-cost branch/PR/CI/local strategy remains in force; no paid staging environment is to be provisioned.


## UX implementation checkpoint — 6 November 2026 (branch only; QA pending)
Branch: `feat/pwa-share-mobile-country-ux`.

Implemented but not yet validated: reusable local SVG country flags in the eight-option business-country selector (Gambia remains default); canonical + Open Graph/Twitter metadata pointing at the verified frontend origin and existing dashboard hero WebP; explicit general/maskable SVG PWA icon declaration using the existing lightweight Kaira mark and a versioned shell cache that precaches the same SVG favicon; header manual refresh and top-edge mobile pull-to-refresh implemented with React Query invalidation, not page reload. PhoneAuthPage's Gambian +220 authentication remains unchanged. No production DB or service changes.

Do not mark these complete until typecheck/build/CI and focused source/browser tests pass. External social preview, recipient navigation, actual PWA install/icon crop, physical pull gesture and responsive device acceptance remain NOT VERIFIED. See continuation handover and FEATURE_AUDIT for acceptance gates.


## Validation checkpoint — 6 November 2026, 20:05 UTC

PR #196 branch `feat/pwa-share-mobile-country-ux`, head `c99f4d6b0c883bde01b5cc1bb8ba20150de97d2d`, has passing GitHub checks on that exact SHA: workspace typecheck/build, backend typecheck + API tests + fresh disposable DB migration check, Docker image build (no push), and Work Management Build Checks. Source review corrected pull-refresh event wiring, added refresh-failure toast, removed duplicate flag rendering, and switched manifest to the lightweight Kaira SVG `any maskable` icon. `robots.txt` permits crawlers and build script creates static HTML entries for app routes. These checks do not verify actual recipient-device navigation, image fetch/format/dimensions, social crawler preview, installed OS icon crop, or physical-device gesture. Render frontend still auto-deploys from `main` and remains on `277d57d6819adc6f6d07259681b867e3ecab68e8`; PR remains draft and no production change was made. Keep all external/device checks NOT VERIFIED.

## Share metadata follow-up — 6 November 2026

PR #196 now points Open Graph/Twitter image metadata to the existing Kaira logo PNG (`/kaira-logo.png`) and declares `image/png`, replacing the WebP dashboard hero to improve compatibility with social preview crawlers. Existing PNG is approximately 1.82 MB and square; a dedicated optimized 1200×630 share card is still desirable. Dimensions, HTTP delivery, crawler fetch, recipient navigation and WhatsApp/Facebook/LinkedIn preview remain NOT VERIFIED. This metadata change does not prove the user's reported destination-link failure is fixed.

## Dedicated social preview asset — 6 November 2026

Added `artifacts/kaira-africa/public/kaira-social-preview.png`, a 1200×630 approximately 757 KB Kaira-branded PNG card. Canonical/OG/Twitter image references now target `/kaira-social-preview.png` and declare `image/png`; this supersedes the interim use of the existing square logo PNG. Generated SPA route shells inherit the root HTML metadata. External HTTP delivery, content-type/cache headers, WhatsApp/Facebook/LinkedIn crawler preview, and real recipient navigation remain NOT VERIFIED; external fetch of the Render asset/root was unavailable in this QA session.
