# Kaira Africa — Feature Audit Register

This is the implementation-level companion to [ENGINEERING_SOURCE_OF_TRUTH.md](./ENGINEERING_SOURCE_OF_TRUTH.md). Keep one row per feature area, and split rows further when the implementation has distinct API/data paths. Status must be evidence-based.

**Audit baseline:** repository inspection after work-management PR #87 was merged on 2026-10-28. This is an initial route-level inventory, not a complete code or production audit. Confirm current main and production SHAs before relying on it.

| Area | UI evidence found | API/data evidence | Current status | Next action |
|---|---|---|---|---|
| Dashboard / Overview | `/dashboard`, DashboardPage; adds practical Record → Review → Plan guidance, tutorials and Visual Assistant entry points with custom inline SVG artwork | Existing dashboard hooks and daily-ledger query; end-to-end data accuracy remains unaudited | UI GUIDANCE IMPLEMENTED IN CODE; DASHBOARD DATA NOT VERIFIED | Validate responsive layout, all links, KPI calculations, currency and empty/error states against production data |
| Team & permissions | `/team`, Settings tabs | Authorization requires audit | NOT VERIFIED | Test roles and tenant isolation |
| Customers / CRM | `/customers`, `/customers/:id`, `/crm` | Existing APIs/schema require audit | NOT VERIFIED | CRUD, optional fields, search, notes, photo upload, export/print |
| Transactions | `/transactions` | Existing API client/hooks | NOT VERIFIED | CRUD/status/payment safety, currency and reports |
| Analytics | `/analytics` | Analytics hooks/routes | NOT VERIFIED | Validate calculations, date filters and tenant isolation |
| Standard reports | `/reports` | Export paths require audit | NOT VERIFIED | Verify export/print, filters and source consistency |
| Activity | `/activity` | Existing API path requires audit | NOT VERIFIED | Verify event source, authorization and pagination |
| Notifications | `/notifications` | List/mark-read hooks present in page | IMPLEMENTED IN CODE; NOT VERIFIED | Verify persistence, unread counts and actual delivery triggers |
| Profile | `/profile` | Profile API/storage require audit | NOT VERIFIED | Verify photo persistence, remove/default avatar, print logo separately |
| Settings | `/settings` | Business update and logout hooks present | IMPLEMENTED IN CODE; NOT VERIFIED | Audit every tab; distinguish working controls from presentation-only tabs |
| Inventory | `/inventory` | Schema/API/storage require audit | NOT VERIFIED | Focus on private image upload, signed URLs, size/type validation, stock movement |
| AI Reports & Insights | `/ai-reports`, AiReportsPage | `getAiInsights`, `generateAiInsights`, analytics and ledger calls visible | EXISTING PAGE; AI MODE NOT VERIFIED | Trace backend generation; test rule-based/model-configured/unconfigured modes and privacy |
| Daily Ledger | `/daily-ledger` | `getDailyLedger` used by AI page | NOT VERIFIED | Sales/expenses, filters, currency, export and calculations |
| Investments | `/investments` | InvestmentPlannerPage route exists | NOT VERIFIED | Verify business type/custom Other, invested/expected amounts, cost/profit logic and daily analysis |
| Savings | `/savings` | SavingsPage route exists | NOT VERIFIED | Verify independent goals, saved amount/currency/location, confirmation, savings box, withdrawal rules, PDF/print |
| Receipt Branding | `/receipt-branding` | Upload/storage paths require audit | NOT VERIFIED | Test logo upload and print branding; investigate literal object/object UI report |
| Billing | `/billing` | Billing backend requires audit | NOT VERIFIED | Verify actual plans/payment state and no fake locks/countdowns |
| Work Management — Tasks | `/work-management/:section`, WorkManagementPage | `work-management.ts`; `work_tasks`, `work_task_events` | IMPLEMENTED IN CODE; PRODUCTION E2E NOT VERIFIED | Signed-in create/edit/status/refresh/authorization tests |
| Work Management — Projects | WorkManagementPage section | `work_projects` | IMPLEMENTED IN CODE; PRODUCTION E2E NOT VERIFIED | Create/edit/group tasks/refresh/authorization tests |
| Work Management — Meetings & Minutes | WorkManagementPage section | `work_meetings` | IMPLEMENTED IN CODE; PRODUCTION E2E NOT VERIFIED | Save agenda/attendees/notes/decisions and verify refresh persistence |
| Work Management — Calendar & Schedule | `/calendar`, CalendarSchedulePage | Reads business-scoped `/work/tasks` and `/work/meetings`; combines dated tasks and meetings | IMPLEMENTED IN CODE; INTEGRATION TEST NOT VERIFIED | Run CI and signed-in tests; standalone events, recurring events, reminders and external calendar sync remain NOT IMPLEMENTED |
| Work Management — Notes & Documents | Protected `/work-notes` page with searchable, categorized, pinnable written notes; create/edit/delete and print; custom inline SVG hero; tutorial added | `work_notes` schema and `0014_work_notes.sql`; authenticated `/api/work/notes` CRUD/search with `requireUser` and business-scoped filters; written notes only, no file uploads | DEPLOYED; AUTHENTICATED E2E NOT VERIFIED | Main commit `92cb9c65b3bebbc640406f602aed6afc77f39bf0` is live on frontend and API; migration `0014_work_notes` is recorded in Supabase and `public.work_notes` exists with 9 columns. CI typecheck/build/API tests/fresh-DB migration passed. Next: signed-in CRUD/search/pin, cross-business isolation, empty/error/mobile/print checks; file attachments remain NOT IMPLEMENTED |
| Work Management — Reminders | Notification page exists; task reminders not established | Delivery mechanism not verified | NOT IMPLEMENTED / NOT VERIFIED | Define schedule semantics and implement persistent reminders/delivery |
| Work Management — Time Tracking | No dedicated destination found in checked routes | Not yet audited | NOT IMPLEMENTED / NOT VERIFIED | Implement timer/manual entries, task links and reports |
| Work Management — Proposals & Quotations | No dedicated destination found in checked routes | Not yet audited | NOT IMPLEMENTED / NOT VERIFIED | Implement proposal line items, statuses, PDF/print and safe conversion |
| Work Management — Client/Team Workspace | Team page exists; collaboration requirements not established | Not yet audited | NOT IMPLEMENTED / NOT VERIFIED | Define business-scoped shared workspace and permission rules |
| Work Management — Automation | No dedicated destination found in checked routes | Not yet audited | NOT IMPLEMENTED / NOT VERIFIED | Define trigger/action model and audit log; no fake toggles |
| Visual Assistant / VA Workspace | Protected `/visual-assistant` page with text prompts, suggestions, session-only history, privacy/capability notice, custom inline SVG and a three-step usage guide; dashboard links to it and explains current limits | Authenticated `/api/ai/assistant` endpoint; configured Responses API; no Kaira DB persistence | IMPLEMENTED IN CODE; live authenticated AI response NOT VERIFIED | Test authenticated response and provider-unconfigured error without exposing secrets; image/screen/OCR/file/voice analysis remains unimplemented |
| AI meeting transcription | Prior Work Management page indicates Coming Soon | No real transcription pipeline verified | NOT IMPLEMENTED | Implement only with consent/privacy, audio pipeline, provider/configuration, retention, auth and tests |
| Tutorials & Courses | `/tutorials`, searchable course cards with custom inline SVG artwork, practical lesson steps/tips; added Visual Assistant and Calendar & Schedule guides | Content-only frontend; no placeholder video links | CONTENT UPDATED IN CODE; NOT YET UI/CONTENT VERIFIED | Validate lesson navigation/search, responsive cards, links and instructions against current deployed pages; add video only when verified assets exist |
| Calendar/meeting export and page PDF/print | Some export requirements discussed across modules | Per-module paths need audit | NOT VERIFIED | Test each agreed print/PDF workflow |
| Mobile navigation | Shared Sidebar/App routing | N/A | NOT VERIFIED | Check every group/item at narrow viewport and ensure no orphaned destinations |

## Production verification evidence

| Check | Evidence | Result |
|---|---|---|
| Work-management PR merged | PR #87; merge commit `a0e8baf755ca40afa1515b6e53970d3a2a0563cc` (historical baseline) | VERIFIED AT THAT TIME |
| Render frontend/API deployment | Previous handover reported both live on merge commit | RECHECK CURRENT DEPLOY |
| Work-management tables exist | Previous read-only Supabase query found `work_meetings`, `work_projects`, `work_task_events`, `work_tasks` | VERIFIED AT THAT TIME; RECHECK AFTER CHANGES |
| RLS enabled / no direct SELECT grants for anon/authenticated on those tables | Previous read-only Supabase check | VERIFIED AT THAT TIME; re-audit all operation grants/policies and API scoping |
| Authenticated production CRUD smoke test | No evidence available in this audit | NOT RUN / NOT VERIFIED |
| Notes & Documents production release | Main commit `92cb9c65b3bebbc640406f602aed6afc77f39bf0`; both Render services live on that commit; Supabase migration `0014_work_notes` recorded and table existence/9 columns verified on 2026-10-28 | DEPLOYMENT AND SCHEMA VERIFIED; authenticated CRUD E2E NOT RUN | No production user records were created or changed during this verification. Finish signed-in non-destructive smoke tests and verify business isolation before calling the feature production-verified |
| Visual Assistant real workflow | PR #89 merged as `ac4b6f5527343456bdb3d962d8847e2281321fff`; CI passed for PR head | IMPLEMENTED IN CODE; production workflow NOT VERIFIED |

## Update policy

When a feature changes, update its row in the same PR and include test/deploy evidence. Never change status to VERIFIED IN PRODUCTION without recording the checked commit SHA, test path, expected result, actual result, and date. If a test cannot be run, record the blocker instead of implying success.
