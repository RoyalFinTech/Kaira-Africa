# KAIRA AFRICA — FULL ENGINEERING CONTINUATION HANDOVER

Date: 4 November 2026
Project: Kaira Africa
Maintainer: Royal FinTech Company
Repository: RoyalFinTech/Kaira-Africa

This is the current continuation record for the next engineering chat. Read this together with ENGINEERING_SOURCE_OF_TRUTH.md and FEATURE_AUDIT.md. Those documents preserve the phased roadmap and feature-by-feature QA detail. Historical notes are dated snapshots; use the newer baseline below.

## A. Current baseline and connected resources

- Latest GitHub main at this handover: 61eb8e53a02035a809cd9b2e4e1b16f6ac2e627b (docs-only reconciliation commit). Last application-code release: 3c0a73fea6ce4372773b45e73f8746e31859e478.
- PR #172 merged as c71a2fdbe6129ee895212bf98539098b7c7dfc1f: Kaira logo on public team invitation page, invitee phone/PIN continuation correction, expiry/resend roster consistency and migration 0024 removing the joined_at default.
- PR #173 merged as 07c7f63a3b9e1df1c01d38da2487d6a07b784aaa: responsive mobile header, dashboard welcome/quick actions and calculator metric/discount/tax layouts.
- Both PRs passed workspace and Backend CI, including frontend build, API tests, fresh migration checks, health smoke and production Docker build.
- Render frontend service srv-db257gjbc2fs73f9nsj0: https://kaira-africa-frontend.onrender.com/
- Render API service srv-da6fnem7bikc738ekde0: https://kaira-africa-api.onrender.com/
- Render admin static service srv-dbg86rmk1f9s73bkkev0.
- Render workspace tea-d9usq87lk1mc73eia2f0.
- Supabase project ref gofoibbvxnhqzqwrpcbx, region eu-west-1.
- Referral release services were live on 73f5ba1: API dep-dbl4el942hec73c7hqdg, frontend dep-dbl4elh42hec73c7hqqg, admin dep-dbl4elh42hec73c7hqmg. Following PR #176, all three services are now verified Live on main 3c0a73f: API dep-dbl4iqivcj2c7383dhu0, frontend dep-dbl4iqivcj2c7383dib0, admin dep-dbl4iqivcj2c7383di70.
- Production Supabase checkpoint after migration 0025: Drizzle ledger count 26/max ID 26; public.businesses count 2; referral codes present 2, distinct 2, missing 0; RLS enabled; anon/authenticated direct SELECT/INSERT grants false; unique code index, referred-by index and self-FK verified; attributed-business count 0. No production business records were manually changed.

## B. Delivered — PR #174 business-to-business referral links

PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/174
Branch: feat/business-referral-links
Merged as 73f5ba1d3af5e4fcb31b53574465dc2bec9a4586; PR head before squash was 1ef0cdab662517d39fd6e8a3a8806a7a45c4cfe2.
State: MERGED and DEPLOYED.
Final PR checks passed: Work Management Build Checks 41714635692 and Backend CI 41714635727 (including Docker build). All three Render services are live on the squash merge. Migration 0025 and static /referrals entry verified.

### Required referral behavior

This is a separate business-to-business referral system, not team invitation:
- A business owner shares the unique referral link belonging to that business.
- A recipient creates their own independent Kaira Africa business workspace.
- The recipient does not become a team member, gain access to the referring business, or share customer, team, sales, ledger, inventory, savings or investment records.
- The link is permanent and unique per business.
- Add the referral count to the page.
- Future referral bonuses or paid feature unlocks are a future roadmap policy. Do not invent percentages, points, reward thresholds, payout terms or active entitlements. Page must be honest that rewards are not active yet.

### Delivered implementation in PR #174

- Drizzle businesses schema adds referralCode and nullable referredByBusinessId self-reference.
- Migration 0025_business_referrals.sql adds/backfills KAI- plus 16 uppercase hexadecimal characters, enforces NOT NULL, adds unique referral-code index and referred-by index/FK.
- No new public referral table. No anon/authenticated grants or weaker RLS.
- API generates code server-side with crypto random bytes; normal business profile schema omits code/referral attribution so users cannot edit them through business profile update.
- Owner-only GET /api/businesses/me/referral returns business name, stable code and count of attributed businesses.
- New-business creation accepts an optional x-kaira-referral-code header, validates the code and resolves the referring business inside the same transaction as business creation. Self-referral is blocked.
- App captures first valid ?ref=... code in sessionStorage and passes it only when an authenticated user creates a new business workspace.
- Onboarding has an explicit “Continue without the referral link” path if an incoming code is invalid/unrecognized.
- Sidebar/hamburger adds an owner-only “Refer a Business” item under GROWTH. Route is /referrals. The explicit Render static SPA entry generator also includes /referrals for direct loads and browser refresh.
- Page uses actual KairaLogo, green/gold brand system, permanent link, copy action, prefilled WhatsApp share, business count and a clear statement that it is for independent businesses and not team access.
- No reward engine, payouts, commissions, paid feature entitlements or automatic bonuses.

### Post-release referral acceptance still required

1. Open /referrals as a controlled authenticated business owner; verify the owner page loads, copy works, WhatsApp share pre-fills, unique link is stable and direct URL refresh works.
2. Verify manager/staff receive 403 from GET /businesses/me/referral and anonymous gets 401; the navigation item remains owner-only.
3. In isolated staging with two controlled business owners, follow a referral link, continue through phone login and business onboarding, create a new workspace, confirm referred_by_business_id, the new business's own distinct referral code, and count increment for the referrer.
4. Test malformed/unknown code, self-referral, an already-associated user, sessionStorage cleanup and “Continue without the referral link”.
5. Confirm the new business remains independent; no team membership, role grants or shared customer/financial data.
6. Never use production business records for test attribution and never output actual production codes. Referral rewards, payouts and paid-feature access remain future-only.

## C. Completed recent work already in main

### Team invitations
- PR #171 implemented secure invitations and was merged before #172.
- Team invitations use a separate invitation record and opaque high-entropy token hash; the link alone is not sufficient—invitee must authenticate with the target Gambian phone.
- Invite permission is manager or staff; owner/admin cannot be granted from an invite. Job title remains separate from Kaira access role.
- Create/resend/revoke/expire and one-time acceptance exist in code. Resend rotates the token; email uses configured Nodemailer when available; WhatsApp is manual share because no authorized WhatsApp Business sender is configured.
- PR #172 added KairaLogo, fixed PIN continuation so invitee’s invited phone takes priority over older remembered phone, synchronizes expired invite/roster state, restores on resend, and adds migration 0024 to permanently remove joined_at default.
- Migrations 0023/0024 are verified in production; team_invitation RLS and lack of direct generic privileges checked.
- Remaining: controlled acceptance tests (new OTP, existing PIN, correct/wrong phone, expiry, revoke, resend rotation, one-time acceptance, conflicting/existing business, cross-business denial), SMS/SMTP delivery test with controlled recipients and physical device visual testing.

### Mobile layout
- PR #173 removed duplicate header menu, made header compact, welcome section and dashboard quick actions wrap, calculator metrics stack on narrow view, large values and discount/tax controls wrap.
- PR #173 is live across API, frontend and admin Render services.
- Actual physical viewport screenshots / interactions at 320, 360, 390, 430, tablet and desktop remain NOT VERIFIED.
- Old mobile PR #169 and #170 were closed as superseded.

### Currency, inventory and PWA
- CurrencyPicker uses built-in SVG flags for GMD, NGN, USD, EUR and GBP.
- Inventory private bucket inventory-images is JPEG-only, max 204800 bytes. Current production inventory product count and image object count were both zero at last check; don't claim real authenticated photo flow tested.
- PWA has service worker, manifest and install prompt. Mobile prompt appears near bottom above nav; desktop prompt is at right edge only when browser supports beforeinstallprompt. Test Android Chrome, iOS Safari Add to Home Screen, desktop supported browsers, dismissal/standalone detection and service worker on real devices.
- Returning-user PIN is memory-only, not stored. Carrier consistency was rechecked in current main: both PinLoginPage and PhoneAuthPage list Africell, QCell, Comium and Gamtel; Gamtel uses its seven-digit format without a network prefix. The earlier Gamcel label mismatch is already resolved. Preserve this list and do not change live PIN data.

## D. Full outstanding product scope — preserve and work through it

### Core business features
- Dashboard: verify KPIs, currencies, periods, empty/error states and all links.
- Team/permissions: verify owner/admin/manager/staff roles, team CRUD, business isolation and secure invitation acceptance.
- Customers/CRM: complete real authenticated CRUD/search, optional DOB/marital status where appropriate, notes/followups/responses, camera/upload/remove customer photo, editing, export/print and tenant isolation.
- Transactions: test real creation/status/payment/currency/reference and report correctness.
- Daily Ledger/Sales/Expenses/Debts: GMD/NGN/USD separated per currency; linked sale atomically records ledger entry, decreases inventory and writes movement; same-currency debt payment only; test overpayment/exact payoff/insufficient stock/currency mismatch/date boundaries/print/CSV.
- Inventory: product/photo upload/camera, compression max 200 KB JPEG, private signed URL, replace/reload/remove, currency flags, product photo printing.
- Investments: business type selection (online/offline/Other custom), amounts/expected amount, costs/profit plan, daily sales/analysis, CRUD/date/currency, print/CSV.
- Savings: goal vs unassigned pools, per currency separation, source/location, withdrawal rules, progress, print/PDF, concurrency and persistence.
- Receipt branding: real private logo upload/reload/print; verify actual PDF/print with authenticated user.
- Billing: currently not a verified subscription/payment system; no fake paywall/countdowns. Need real plan catalogue/payment state before entitlements.

### Work Management / remote work
- Tasks: personal and team-assigned, status, priority, deadlines, history, in-app notification and push.
- Projects: real task linking, goals/dates/status.
- Meetings/Minutes: agenda, attendees, minutes, decisions/action items and export/print; manual transcription first; AI transcription remains unimplemented until actual consent/privacy/audio/provider/retention pipeline exists.
- Calendar: tasks and meetings, IANA business timezone selection, Banjul/Lagos/London/New York/DST tests; standalone and recurring events/external calendar sync remain planned.
- Notes & Documents: written note search/category/pin/edit/delete/print exists in code; file attachments are not implemented.
- Reminders: in-app reminders and email outbox exist in code; real SMTP not verified and PWA web push/VAPID subscriptions remain not implemented.
- Time tracking: start/stop task-linked sessions exists in code; authenticated tests pending; online/away/offline presence, heartbeat/idle, manager reports, timesheet approvals/edit/export remain planned. No covert keystroke/screen monitoring.
- Team Chat & Announcements: business-scoped chat/pagination exists in code; replies/moderation/tenant isolation tests remain.
- Proposals & Quotations: not implemented; line items, tax/currency/discount, statuses, PDF/print, safe conversion.
- Freelancer & Remote Work Copilot (formerly Visual Assistant): text-only draft helper, no database persistence/no automatic write; desired client briefs → proposal/milestones/tasks/estimates/progress updates and safe confirm-before-write flow.
- Automation: no real trigger/action model; plan auditable triggers, permissions, retries and user approval, no fake switches.

### AI / account / branding / support
- AI Reports/Insights: audit rule-based/model-generated, OPENAI configuration and privacy, source provenance.
- AI meeting transcription: unimplemented.
- Tutorials: verify searchable written lessons against actual UI and route links; never fabricate video links.
- Appearance: verify light/dark/system persistence, OS mode, contrast.
- Profile: avatar/photo/remove/default, privacy and print.
- Paid plan/white-label: define Starter/Pro/Max subscription state, verified payment, grace/expiry/usage limits, custom-brand entitlements and automatic fallback to Kaira Africa branding after entitlement expiry. Keep branding consistent in print/email/push/in-app.
- PWA install and responsive nav/device testing.
- Legal/privacy pages and clear capability disclosures.

## E. Engineering rules

- Senior software/database/security/QA/release discipline; repository is source of truth.
- Branch-first; PR and both required CI workflows green before merge; confirm PR expected head SHA and deployment SHA.
- No reset --hard, clean -fd, force-push, branch/repository delete or destructive blind operations.
- Never claim deploy success from merge alone; verify Render service deploy status and exact SHA plus migration logs/DB checks.
- No fake production business/user/team/customer/financial/inventory/invitation test records. Use isolated staging and consenting test identities.
- No production PIN mutation; no secrets, tokens, PII or real referral codes in logs or handovers.
- Keep Supabase RLS/least privilege; never grant anon/authenticated business table privileges to make feature work.
- CI, deployment, authenticated E2E and physical device visual QA are separate statuses.
- Update ENGINEERING_SOURCE_OF_TRUTH.md, FEATURE_AUDIT.md and this continuation file on major changes.

## F. Next chat prompt

You are continuing the development, production verification, security and QA of Kaira Africa, maintained by Royal FinTech Company. Act as senior full-stack engineer, database engineer, security engineer, QA engineer and release engineer. Do not start over and do not ask the user to repeat known project details.

First read:
1. docs/engineering/2026-11-03-KAIRA-AFRICA-CONTINUATION-HANDOVER.md
2. docs/engineering/ENGINEERING_SOURCE_OF_TRUTH.md
3. docs/engineering/FEATURE_AUDIT.md

Then verify current GitHub main, open PRs, exact Render deployments and Supabase migration/security state through the connected tools.

Repo: RoyalFinTech/Kaira-Africa.
Production frontend: https://kaira-africa-frontend.onrender.com/
Production API: https://kaira-africa-api.onrender.com/
Render workspace: tea-d9usq87lk1mc73eia2f0.
Supabase project ref: gofoibbvxnhqzqwrpcbx.
Main baseline at the time of handover: 73f5ba1d3af5e4fcb31b53574465dc2bec9a4586. PR #174 business-to-business referrals is merged and deployed; migration 0025 is applied and the owner-only referral page is live. Authenticated staging E2E is still required.

All three Render services are already verified Live on latest main 61eb8e53a02035a809cd9b2e4e1b16f6ac2e627b (docs-only commit); last application-code release is 3c0a73fea6ce4372773b45e73f8746e31859e478. Recheck exact Render SHAs before new deploy work.

Then complete physical PWA browser/device acceptance:
- Chromium/Edge with beforeinstallprompt: verify actual native install action.
- Desktop browser without beforeinstallprompt: verify right-edge install card and manual browser-menu Help instructions.
- Verify standalone/dismissed behavior, iOS Safari Add to Home Screen, Android Chrome install, service worker registration and mobile bottom prompt above navigation.
- Check responsive widths 320/360/390/430px, tablet and desktop.

Then complete referral acceptance in isolated staging:
- owner-only /referrals page, manager/staff 403, anonymous 401;
- copy/WhatsApp share and direct URL refresh;
- new-business attribution through splash/login/onboarding, attributed count increment, self-referral rejection, invalid/unknown-code removal;
- no team membership and no cross-business data access.
- Use staging identities only. Do not create production businesses/referrals or expose real codes. Referral rewards, payouts and paid-feature unlocks remain future-only.

Then proceed through the entire roadmap in this handover and FEATURE_AUDIT.md, focusing on authenticated tenant isolation, financial correctness, CRM/Inventory/Savings/Investment E2E, Work Management, notifications/push, billing entitlements and remaining PWA/mobile QA. Update the engineering handover after each material release.

### Direct static route correction (2026-11-03)

The static-site build uses an explicit SPA entry list; adding a Wouter route alone is not sufficient. PR #174 adds /referrals to artifacts/kaira-africa/scripts/generate-spa-routes.mjs. Both frontend and admin production build logs verified 35 SPA route entry files. Direct URL/browser refresh remains part of authenticated visual QA.


## Release reconciliation — business referrals deployed and current next action (2026-11-03)

PR #174 merged as 73f5ba1d3af5e4fcb31b53574465dc2bec9a4586. Final PR head 1ef0cdab662517d39fd6e8a3a8806a7a45c4cfe2; Work Management Build Checks 41714635692 and Backend CI 41714635727 passed, including Docker. All three Render services are live on 73f5ba1. API logged “Migrations applied successfully.” Supabase Drizzle ledger count 26/max 26; businesses count 2, referral codes present 2, distinct 2, missing 0; indexes/FK verified; RLS true and anon/authenticated direct SELECT/INSERT privileges false; referred-business count 0. No actual code values were selected or printed. Frontend and admin log 35 static SPA entries including /referrals.

Current active PR #176: https://github.com/RoyalFinTech/Kaira-Africa/pull/176 — desktop PWA install guidance when beforeinstallprompt is unavailable. Branch fix/desktop-pwa-install-guidance-current, head 794e3cf90ec1a2eeaecc7e44d205ec245b3dd036. Workspace run 41715633932 passed; Backend CI run 41715633934 was in progress at handover update. Recheck live exact-head status before merge and physical desktop/browser behavior after deploy.


## C2. PR #176 desktop PWA guidance — MERGED/DEPLOYED

- PR #176 merged as 3c0a73fea6ce4372773b45e73f8746e31859e478.
- The prior prompt was hidden on desktop when beforeinstallprompt was unavailable. The merged fix keeps the Kaira right-edge install card visible unless app is standalone or prompt is dismissed.
- When a native beforeinstallprompt event exists, the native action is used. Without that event, the Help action opens manual browser-menu guidance and does not claim to install.
- Exact-head CI passed: Workspace 41715633932; Backend CI 41715633934 including production Docker build.
- All three Render services are verified Live on 3c0a73f:
  - API dep-dbl4iqivcj2c7383dhu0
  - Frontend dep-dbl4iqivcj2c7383dib0
  - Admin dep-dbl4iqivcj2c7383di70
- Physical browser/phone testing is still required for native/no-native desktop, right-edge placement, help panel, dismissal/standalone, iOS Safari, Android Chrome, service worker and mobile viewport regression.


## Final release checkpoint — 2026-11-03

- Main: 3c0a73fea6ce4372773b45e73f8746e31859e478.
- Referral PR #174 deployed on 73f5ba1; migration 0025 applied; ledger count 26/max 26; two distinct non-null codes, zero missing, indexes/FK/RLS/privileges verified; no referral attributions exist; no synthetic production data.
- Desktop PWA PR #176 merged on 3c0a73f; Workspace 41715633932 and Backend CI 41715633934 passed including Docker. All three Render services verified Live on 3c0a73f with deploy IDs: API dep-dbl4iqivcj2c7383dhu0, frontend dep-dbl4iqivcj2c7383dib0, admin dep-dbl4iqivcj2c7383di70.
- PR #177 was an older docs-only PR based on 73f5ba1 and is now stale/unmergeable. This fresh docs branch and PR replaces it; do not merge PR #177.
- Next: merge the fresh docs PR after workspace CI passes; physically test desktop/native PWA behavior and controlled staging referral E2E. Authenticated module E2E across CRM, finances, savings/inventory, Work Management and full roadmap remain.


## Latest repository checkpoint — 2026-11-03 20:58 UTC

- Latest GitHub main: 61eb8e53a02035a809cd9b2e4e1b16f6ac2e627b (documentation-only reconciliation).
- Last application-code release: 3c0a73fea6ce4372773b45e73f8746e31859e478 (PR #176 desktop PWA guidance).
- All three Render services verified Live on 61eb8e5:
  - API dep-dbl4l0p42hec73c7qveg
  - Frontend dep-dbl4l1142hec73c7qvr0
  - Admin dep-dbl4l0p42hec73c7qvn0
- Supabase migration ledger remains count 26/max 26; migration 0025 stays applied; two existing business referral codes are distinct/non-null, attributed-business count remains zero, RLS/privilege checks passed. No production referral test data was created.
- No open application-code PRs from this round. Remaining priority is physical PWA tests, controlled staging B2B referral E2E, then the outstanding feature roadmap. PR #178 updated the full continuation prompt and audit; this final SHA note reconciles the latest docs-only commit.


## Latest verified continuation — 2026-11-04

This addendum supersedes earlier SHA/deployment snapshots in the sections below.

### Live baseline
- GitHub `main`: `dd29ae76bbd035938626979daaaf397be86b204d`.
- Render workspace: `tea-d9usq87lk1mc73eia2f0`.
- API: `srv-da6fnem7bikc738ekde0` / `https://kaira-africa-api.onrender.com/` / live deploy `dep-dbl4n2c9v7es73aud6vg`.
- Frontend: `srv-db257gjbc2fs73f9nsj0` / `https://kaira-africa-frontend.onrender.com/` / live deploy `dep-dbl4n2c9v7es73aud78g`.
- Admin static: `srv-dbg86rmk1f9s73bkkev0` / live deploy `dep-dbl4n2c9v7es73aud7e0`.
- Supabase: `gofoibbvxnhqzqwrpcbx`, `eu-west-1`; Drizzle migrations 23–26 recorded, including 0025 referrals and the subsequent migration 0026.

### What is already implemented (do not rebuild)
- PR #171 secure team-invitation acceptance lifecycle; PR #172 official Kaira logo on invite page, invitee phone/PIN routing, invitation expiry/resend roster consistency and migration 0024. Controlled end-to-end invite acceptance and real SMS/SMTP recipient tests remain pending.
- PR #173 mobile header/dashboard/calculator responsive fixes, deployed. Physical viewport screenshots remain pending.
- PR #174 independent business referral system, deployed. Owner Sidebar GROWTH > “Refer a Business” and `/referrals`; permanent unique link `/?ref=KAI-…`; official Kaira logo, green/gold hero, copy, WhatsApp share, referral count and independent-workspace warning. Referral rewards/commissions/payouts/paid plan unlocks remain future-only and must not be implied.
- PR #176 desktop PWA install guidance if native browser install event is unavailable; physical device acceptance remains pending.
- Migration 0025 adds stable referral code and referred-by self-reference to businesses. Current read-only production check: 2 businesses, 2 non-null distinct codes, 0 attributed businesses; RLS enabled; anon/authenticated direct SELECT/INSERT denied; unique referral-code index, referrer index and self-FK verified. Never reveal real referral codes.
- Referral capture uses `?ref=`, sessionStorage and an onboarding request header. Business creation validates the referrer and records attribution in its own transaction; self-referral and already-business-associated accounts are rejected. A referred business gets its own independent code and workspace; no team membership or cross-business access is granted.

### Active work started in this continuation
- Branch: `fix/business-onboarding-serialization`.
- Change: `createBusinessForUser` now locks the current user row (`SELECT ... FOR UPDATE`) while checking `users.business_id` and inserting the workspace. This closes the race where two concurrent onboarding requests could create multiple business rows for one user.
- PR #180 has already merged as `0835684f2158cb0624ccd43c8063dd9ec42646fe`; Work Management Build Checks `41817865954` and Backend CI `41817865764` passed including Docker. All three Render services are live on that SHA. No schema migration was required.

### First acceptance priority: referrals (safe, controlled testing)
1. Open `/referrals` with a controlled business-owner session; verify page loads, direct refresh works, copy works and WhatsApp opens a prefilled message.
2. Verify the Sidebar GROWTH item is owner-only; direct API GET `/businesses/me/referral` returns 401 to anonymous callers and 403 to manager/staff.
3. Use two controlled staging businesses/identities: Business A shares link; a new independent user signs up through it, completes login and workspace onboarding; Business B is created with `referred_by_business_id = A.id`, has its own distinct referral code, and A's attributed count increments once.
4. Verify the new user is not made a team member of A and cannot access A's records. Verify B's own referral link returns B's independent code.
5. Negative tests: malformed/unknown code, self-referral, user already belongs to a business, repeated/concurrent onboarding, first-valid-session behavior, clear stale referral when choosing “Continue without the referral link”, invalid referral fallback. Never add production test businesses or reveal production code values.
6. Current production has 0 attributed businesses; do not interpret this as referral failure. This is expected until a real referred business signs up.

### Remaining agreed roadmap (continue by phase; preserve every item)
**Core business and finance:** dashboard KPI/period/currency accuracy; owner/admin/manager/staff team permissions and secure invites; CRM full CRUD/search, DOB/marital fields where agreed, notes/follow-ups/customer photo camera/upload/edit/remove/export/print; transactions/payment/status/reference/currency validation; Daily Ledger sales/expenses/debts, same-currency allocation, atomic stock + ledger updates and insufficient-stock/overpayment/exact-payoff tests; inventory photo upload/compression/private signed URLs/replace/reload/print; investment plan business types (online/offline/Other), expected amount/cost/profit/daily sales analysis/print/export; savings goals and unassigned pools, source/location/withdrawal rules, concurrency and print/PDF; receipt branding private logo persistence and real print; billing must remain truthful until plan catalogue/payment/entitlement state is real.
**Work Management and remote work:** tasks (personal/team assign, priority/status/deadline/history/notifications); projects linked to tasks; meetings/manual minutes/decisions/action items/print; manual transcription first (AI transcription remains unimplemented); business timezone calendar and DST checks; notes/document search/pin/edit/delete/print (attachments remain unimplemented); in-app reminder/email outbox verification and PWA web-push/VAPID; task-linked time entries and future transparent online/away/offline/presence/timesheets (no covert monitoring); business-scoped chat/announcements, pagination/replies/moderation; proposals/quotations not implemented; Freelancer & Remote Work Copilot should convert briefs into draft proposals/milestones/tasks/estimates/progress reports with explicit user confirmation; automation needs real auditable triggers/actions, not fake toggles.
**AI, account, legal and monetization:** verify AI Insights model/rule-based/provider configuration and privacy; meeting transcription not implemented; tutorial content/link accuracy; appearance light/dark/system; profile/avatar/privacy; Starter/Pro/Max plan policy/payment verification/expiry/grace/usage/white-label entitlement and automatic fallback to Kaira branding; legal/privacy pages; PWA install on desktop/Android/iOS and service-worker behavior.
**QA/release:** real authenticated tenant-isolation tests; currency and financial correctness; private Storage upload failure/retry/negative tests; print/PDF/CSV validation; responsive interactive browser and device checks at 320/360/390/430px, tablet and desktop; exact GitHub SHA/CI/Render deploy/migration confirmation for every release. Keep “CI passed,” “deployed,” “authenticated E2E passed,” and “physical device tested” as distinct claims.

### Engineering rules
- Work branch-first; PR review and required workflows green before merge; inspect exact PR head SHA and current mergeability.
- Never use `reset --hard`, `clean -fd`, force push, branch/repository deletion or blind destructive operations.
- No production test users/businesses/customers/transactions/invitations/referrals/inventory images; no test PIN changes; use isolated staging or authorized controlled sessions.
- Keep Supabase RLS and least privilege. Do not expose API secrets, auth tokens, personal data or production referral codes in prompts/logs.
- Verify all three Render services and the exact commit after merge. Do not infer deploy success from GitHub merge alone.
- Update `ENGINEERING_SOURCE_OF_TRUTH.md`, `FEATURE_AUDIT.md` and this dated handover after material changes.

### Copy-ready next-chat prompt
You are continuing engineering, security, QA and production maintenance of Kaira Africa for Royal FinTech Company. Start by reading `docs/engineering/2026-11-04-KAIRA-AFRICA-CONTINUATION-HANDOVER.md`, `docs/engineering/ENGINEERING_SOURCE_OF_TRUTH.md` and `docs/engineering/FEATURE_AUDIT.md`. Then verify GitHub main, PRs, Render and Supabase current state; never trust the baseline without rechecking.

Repository `RoyalFinTech/Kaira-Africa`. Frontend `https://kaira-africa-frontend.onrender.com/`. API `https://kaira-africa-api.onrender.com/`. Render workspace `tea-d9usq87lk1mc73eia2f0`. Supabase project `gofoibbvxnhqzqwrpcbx` / `eu-west-1`.

Important: business-to-business referrals ALREADY exist in PR #174. Do not recreate the page. The owner sees Sidebar GROWTH > “Refer a Business” and route `/referrals`. It uses a unique permanent business code, branded Kaira UI, copy/WhatsApp share, referral count and signup/workspace attribution. It is not the team invite system and grants no membership/data access. Rewards/payouts/paid-feature unlocking are future-only. Production has two distinct codes and zero attributed businesses at the last read-only check; do not display codes or create production test businesses. Complete the controlled referral E2E only with two consenting staging identities and verify access boundaries.

PR #180 already merged the `FOR UPDATE` user-row lock in `createBusinessForUser` as `0835684f2158cb0624ccd43c8063dd9ec42646fe`. Both required workflows including Docker passed and all three Render services are live on that SHA. Do not recreate the change unless later evidence shows a defect.

Next, complete referral acceptance tests, then follow the complete remaining roadmap above and in FEATURE_AUDIT.md. Keep exact evidence/statuses separate: code present, CI passed, Render Live, migration verified, authenticated E2E passed, physical device tested. No fabricated data, no production test identities and no destructive Git operations.


## Final checkpoint after PR #180 — 2026-11-04 11:04 UTC

- Current main: `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- PR #180 merged; row-level locking now serializes concurrent business workspace creation per user.
- CI passed: Work Management Build Checks `41817865954`; Backend CI `41817865764` (including production Docker image).
- Render services are all Live on the same commit:
  - API `dep-dblh1iflk1mc73euq6hg`
  - Frontend `dep-dblh1iflk1mc73euq6u0`
  - Admin `dep-dblh1iflk1mc73euq6q0`
- API runtime logged migration application success and `/ready` HTTP 200. No schema migrations or business records changed in this release.
- Referral feature is already deployed from PR #174; controlled authenticated staging conversion/count/tenant-isolation tests are still open.
- For the next chat, use the copy-ready prompt in this document, but start by confirming current main and deploy SHA again.


## Current verified checkpoint — 2026-11-04 (this continuation)

This section supersedes the earlier SHA/deployment snapshots above. Recheck all live services before the next release.

### Exact source and deployment state
- GitHub `main`: `07cc2aa5a8b80c29677e1534d2923261b48270ef` (latest docs/source-of-truth reconciliation commit at the time of this check).
- Last application-code release: PR #180 merge `0835684f2158cb0624ccd43c8063dd9ec42646fe` (serializes business workspace creation with a user-row lock).
- PRs #171, #172, #173, #174, #176 and #180 are merged. The older test-only PR #163 was closed as superseded because its mobile CSV smoke navigation behavior is already present in current `main`.
- Render API service `srv-da6fnem7bikc738ekde0`, deployment `dep-dblh3hdckfvc73fhqnm0`: Live on `07cc2aa5a8b80c29677e1534d2923261b48270ef`.
- Render frontend service `srv-db257gjbc2fs73f9nsj0`, deployment `dep-dblh3hdckfvc73fhqnug`: Live on the same SHA.
- Render admin static service `srv-dbg86rmk1f9s73bkkev0`, deployment `dep-dblh3hdckfvc73fhqo3g`: Live on the same SHA.
- Render workspace remains `tea-d9usq87lk1mc73eia2f0`. Supabase Kaira Africa project remains `gofoibbvxnhqzqwrpcbx` (`eu-west-1`).
- There were no open PRs after closing #163 at this checkpoint. Re-list open PRs before the next branch/merge.

### Business referral feature — already implemented; do not rebuild
- PR #174 (`feat/business-referral-links`) introduced the independent business-to-business referral system. It is distinct from staff/team invitations.
- Sidebar: GROWTH → `Refer a Business`; route `/referrals`; the route is included in the explicit Render static SPA entry generator.
- Page: `artifacts/kaira-africa/src/pages/app/ReferralsPage.tsx`. It uses the official `KairaLogo`, Kaira green/gold design, the current business name, a permanent business-specific link, copy control, prefilled WhatsApp share, referral code, attributed-business count and an explicit explanation that referred businesses get independent workspaces.
- Link format is `/?ref=KAI-<16 uppercase hex characters>`. Do not copy real production codes into chat, tests, logs or handover documents.
- Database: migration `0025_business_referrals.sql` adds/backfills `businesses.referral_code`, adds the `referred_by_business_id` self-reference and creates the unique referral-code and referred-by indexes.
- API: owner-only `GET /businesses/me/referral` returns business name, code and count. New-business creation accepts `x-kaira-referral-code`, validates the format and referrer inside the same transaction as business creation, blocks self-referral and stores the referred-by business ID. Normal business profile writes cannot edit referral codes/attribution.
- Frontend captures the first valid `?ref=` code in sessionStorage and carries it through login/onboarding. Invalid code handling lets the new business continue without attribution. A referred business creates its own separate workspace and gets its own referral code; it does not become a team member of the referrer.
- Rewards/bonuses/commissions/payouts/paid-feature unlocks are future-only. The current page truthfully says rewards are not active. Do not add credits or entitlements until a separately approved reward policy/payment/entitlement system exists.

### Fresh production database verification
- Drizzle migration ledger: 26 records; maximum migration ID 26. Migration `0025_business_referrals.sql` is recorded.
- Production has 2 business rows, 2 non-null referral codes, 2 distinct codes and 0 referred-business rows. This is expected until a recipient creates a business from a referral link.
- `public.businesses` RLS is enabled. Direct SELECT/INSERT privileges for `anon` and `authenticated` are false. The referral-code unique index, referred-by index and self-FK are present.
- Actual referral code values were deliberately not selected or displayed. No production business or referral records were created/changed for this verification.
- Supabase project listing showed only the Kaira Africa project; `list_branches` returned no development branches. Do not run referral conversion tests against production. A new Supabase branch can incur usage charges and needs cost approval/confirmation before creation.

### Referral acceptance status — still NOT VERIFIED end to end
1. With a controlled owner session, open `/referrals`, refresh the direct route, copy the link and verify WhatsApp prefill.
2. Verify access with controlled tokens: owner succeeds; anonymous returns 401; manager/staff return 403. Route code currently enforces `requireUser` and `requireRole('owner')`, but live authenticated role probes were not performed here.
3. In isolated staging with two consenting business owners, Business A shares the link; a new user signs up and creates Business B. Confirm `B.referred_by_business_id = A.id`, B gets a distinct referral code and A's count increments exactly once.
4. Verify no team-member row, role grant or cross-business customer/finance access is created. Verify B receives its own independent `/referrals` link.
5. Test malformed/unknown code, self-referral, already-associated user, concurrent onboarding, invalid-code fallback and clearing the stored code when the user chooses to continue without attribution.
6. No isolated staging project or Supabase branch is currently available. Do not substitute production businesses for test identities. Ask for approval to provision a cost-bearing Supabase branch or use an existing external staging project before running these tests.

### Current Supabase advisor snapshot
- Security advisor reported 33 informational `rls_enabled_no_policy` findings. These tables have RLS enabled but no direct policies; the current app data model relies on the trusted API server and generic `anon`/`authenticated` table grants are denied. Do not add broad policies just to silence this informational lint; inspect the exact API/service-role model and use least privilege.
- Performance advisor reported 26 unindexed foreign-key findings and 30 unused-index findings (INFO). Do not create/drop indexes in bulk. Review high-traffic queries and FK delete/update paths, then add only justified indexes in a separate migration with fresh-DB/production validation.

### Only open PR found at this checkpoint
- PR #163 (`Keep mobile CSV smoke navigation within PIN session`) was a stale test-only branch 14 commits behind/diverged from `main`. The current main smoke script already navigates to Transactions using the bottom-nav SPA link while preserving the in-memory visual-test token. PR #163 was closed as superseded on 2026-11-04. It did not contain application code.

### Copy-ready full prompt for the next chat

```text
You are continuing Kaira Africa engineering for Royal FinTech Company. Act as senior full-stack engineer, database/security engineer, QA engineer and release engineer. Continue the existing project; do not restart, invent another architecture or ask for project details already below.

First read these repository source-of-truth files:
1. docs/engineering/2026-11-04-KAIRA-AFRICA-CONTINUATION-HANDOVER.md
2. docs/engineering/ENGINEERING_SOURCE_OF_TRUTH.md
3. docs/engineering/FEATURE_AUDIT.md

Then independently verify current GitHub main/open PRs, Render deployment SHAs/status/logs and Supabase migrations/security using connected tools. Never trust this prompt's SHA without rechecking.

Project: RoyalFinTech/Kaira-Africa.
Frontend: https://kaira-africa-frontend.onrender.com/
API: https://kaira-africa-api.onrender.com/ (readiness: /ready).
Render workspace: tea-d9usq87lk1mc73eia2f0.
Services: API srv-da6fnem7bikc738ekde0; frontend srv-db257gjbc2fs73f9nsj0; admin static srv-dbg86rmk1f9s73bkkev0.
Supabase project: gofoibbvxnhqzqwrpcbx, eu-west-1.
Last verified main: 07cc2aa5a8b80c29677e1534d2923261b48270ef. Last app-code release PR #180: 0835684f2158cb0624ccd43c8063dd9ec42646fe. All three Render services were live on the main SHA at the latest check.

Important referral requirement: the business-to-business referral feature is ALREADY BUILT and DEPLOYED by PR #174/migration 0025. Do not rebuild it. It is owner-only Sidebar GROWTH > Refer a Business at /referrals. Each independent business has a permanent unique KAI-… referral link, copy/WhatsApp share, attributed-business count and onboarding attribution via ?ref= / sessionStorage / x-kaira-referral-code. Referred users create their own independent business; they do not join the referrer’s team or gain access to any of its data. Future referral bonuses, commissions, payouts or paid feature unlocks are NOT active and must not be promised or granted. Never expose actual production referral codes.

Referral code/schema production verification at the last checkpoint: Drizzle ledger count 26/max ID 26; two business records, two non-null distinct referral codes, zero attributed businesses; businesses RLS enabled; anon/authenticated direct SELECT/INSERT denied; unique code index, referred-by index and self-FK exist. No production business data was changed. There is only one listed Supabase project (Kaira Africa), no development branches and no staging environment. Do not create test referral businesses in production. If staging needs a Supabase branch, inspect costs and obtain cost approval before creating it.

PR #180 already fixed concurrent business creation using SELECT ... FOR UPDATE on the user row; it is merged, CI passed, and all three Render services were live. Do not redo unless a new defect is found.

Recently merged work to preserve: PR #171 secure team invitation lifecycle; PR #172 official Kaira logo on invitation page, correct invitee-phone PIN routing, expiry/resend roster state and migration 0024; PR #173 mobile header/dashboard/calculator overflow fixes; PR #174 business referrals; PR #176 desktop PWA installation guidance when beforeinstallprompt is unavailable; PR #180 onboarding serialization.

Highest priority now:
1. Create or use an isolated staging environment only after cost approval; finish two-business referral end-to-end attribution/count and tenant-isolation tests, owner/manager/staff/anonymous access matrix, invalid/self-referral, fallback and concurrent onboarding cases.
2. Finish controlled team invitation acceptance tests with consenting recipients: new-user OTP, returning-user PIN, correct/wrong phone, expiry, revoke, resend token rotation, one-time acceptance, cross-business rejection, SMS/SMTP delivery.
3. Complete physical PWA acceptance: Android Chrome install, iOS Safari Add to Home Screen, desktop native beforeinstallprompt, desktop no-event manual-help card, right-edge position, standalone/dismissal, service worker update/caching and auth redirects.
4. Verify mobile/tablet/desktop layouts at 320/360/390/430px and larger; include hamburger/drawer, keyboard/focus, calculator/dashboard, referral page and install prompt.
5. Continue the complete outstanding roadmap in FEATURE_AUDIT.md: CRM/customer CRUD/photo/notes/export/print; transactions and payment safety; multi-currency daily ledger/sales/expenses/debt/atomic inventory; private inventory photos and printing; investment planner; savings goals/pools/withdrawals/PDF; receipt branding; profile/appearance; billing with real plan/payment entitlements only; tasks/projects/meetings/notes/calendar/time tracking/chat; VAPID web push and SMTP verification; proposals/quotations; Freelancer & Remote Work Copilot; auditable automation; AI insights/privacy; tutorials; legal/privacy and branding fallbacks.

Engineering rules: branch-first; inspect code and current state before edits; update OpenAPI and generated artifacts by the repo's prescribed scripts; no reset --hard, clean -fd, force-push or destructive production operations; no production test identities/data/PIN changes; use migrations and preserve RLS/least privilege; pass both required CI workflows including fresh DB, health smoke and Docker before merge; verify all three Render SHAs and Supabase migration ledger after merge. Keep code present, CI passed, deployed, authenticated E2E passed and physical device tested as separate evidence.

Continue implementing concrete fixes rather than only planning. Update ENGINEERING_SOURCE_OF_TRUTH.md, FEATURE_AUDIT.md and the dated handover with each material change. Report exact PR/commit/check/deploy evidence and blockers honestly.
```

### Short continuation prompt

```text
Continue Kaira Africa from the current GitHub/Render/Supabase state. First read the 2026-11-04 continuation handover, ENGINEERING_SOURCE_OF_TRUTH.md and FEATURE_AUDIT.md, then recheck live SHAs and migrations. Referral Link / Refer a Business is already implemented and deployed; do not rebuild it. Finish controlled staging referral attribution/tenant-isolation and team-invitation E2E, then PWA/mobile physical acceptance and the remaining roadmap in FEATURE_AUDIT.md. No production test records, no real referral-code disclosure, no PIN changes, no destructive Git. Use branch/PR, full CI, migration/health/Docker validation, and verify all three Render deployments before claiming completion. Update the source-of-truth docs as you work.
```


---

## Current continuation checkpoint — 2026-11-04 after PR #183

This checkpoint supersedes the earlier main/deployment SHA values above. Historical entries are retained as release history.

### Current source, CI and deployment state
- GitHub main at the start of this documentation update: 6062488e696535cff1f30fa4a0f19b3fae111b62.
- PR #183 (https://github.com/RoyalFinTech/Kaira-Africa/pull/183) merged by squash as 6062488e696535cff1f30fa4a0f19b3fae111b62.
- PR #183 is test/CI-only. The last application-runtime code release remains PR #180, 0835684f2158cb0624ccd43c8063dd9ec42646fe. No application runtime source or database schema was changed by PR #183.
- Backend CI run 41828303516 completed successfully; Work Management Build Checks run 41828303519 completed successfully.
- Backend CI completed shared/API/frontend typechecks, frontend and API builds, fresh Drizzle migration application to disposable PostgreSQL, API/DB acceptance tests, /health smoke and production Docker image build.
- API test output: 71 passed, 0 failed, 0 skipped. The three new PostgreSQL cases executed (not skipped): concurrent workspace creation; independent referral attribution without a team-membership row; unknown referral rollback.
- All three Render services are verified Live on the exact PR #183 merge commit:
  - API srv-da6fnem7bikc738ekde0, deploy dep-dbli6vivcj2c738pbkbg.
  - Frontend srv-db257gjbc2fs73f9nsj0, deploy dep-dbli6vivcj2c738pbkp0.
  - Admin srv-dbg86rmk1f9s73bkkev0, deploy dep-dbli6vivcj2c738pbkl0.
- Production Supabase Drizzle migration ledger remains 26 records, maximum ID 26. PR #183 has no migration. Production business/referral data was not written or otherwise changed for this work.
- The open-PR search after merging PR #183 returned no open PRs. Recheck before starting further work.

### PR #183 — isolated PostgreSQL regression/acceptance coverage
- Added artifacts/api-server/test/business-onboarding-db.test.ts.
- Updated .github/workflows/backend.yml so the API suite runs after the disposable CI PostgreSQL database has received the current migrations. The DB-specific tests require the explicit KAIRA_DB_INTEGRATION_TESTS=true flag; the separate Work Management workflow does not set this flag.
- Eight concurrent calls to createBusinessForUser for one CI user yielded exactly one workspace and seven ConflictError rejections; the test confirmed only one owner business and the matching users.business_id.
- Referral acceptance at repository/database level verified a separate business ID, owner ID and newly generated referral code, the correct referred_by_business_id, a single attribution count, the referred user's own business association and no team_members row for that user.
- An unknown referral code was rejected and the transaction left the CI user without a business association and without an owned business.
- Tests used only the ephemeral GitHub Actions PostgreSQL service and cleaned up their own test rows. They did not use Render or production Supabase.
- These are database/repository integration results. They do not replace authenticated browser/API E2E or establish the full tenant-isolation matrix across CRM, transactions, ledger, staff, inventory, savings or investments.

### Staging, production and device acceptance boundaries
- Supabase branch listing returned no development branches; only the production Kaira Africa Supabase project is connected. No isolated staging database/project or controlled staging business identities were available in this continuation.
- Do not test referral conversion, team invitation acceptance, financial writes, inventory/customer photo lifecycle or authenticated tenant isolation by creating synthetic records in production.
- Business referrals remain implemented and deployed (PR #174). The new tests prove core repository attribution/rollback and independence invariants only. Still NOT VERIFIED in authenticated staging: owner page and copy/share in a real browser, manager/staff 403 and anonymous 401 against the referral route, direct /referrals refresh, referral retention across splash/login/onboarding, self-referral and already-associated-user behavior through the HTTP/UI flow, and end-to-end cross-business data-access denial.
- Team invitations remain implemented in code (PRs #171/#172). Still NOT VERIFIED with controlled recipients: new-user OTP, returning-user PIN, correct/wrong invite phone, expiry, revoke, resend token rotation, one-time acceptance, cross-business rejection and real SMS/SMTP delivery.
- PWA/mobile work remains implemented in code (PR #173 mobile responsive changes and PR #176 desktop guidance). Still NOT VERIFIED on physical Android Chrome, iOS Safari and desktop browsers; also pending dismissal/standalone/service-worker/auth redirect checks and responsive interactions/screenshots at 320, 360, 390 and 430 px, tablet and desktop.
- Do not merge CI evidence, Render Live evidence, authenticated E2E and physical device checks into one status. They remain independent release/acceptance gates.

### Immediate next execution order
1. Provision/authorize an isolated staging environment and two controlled business-owner identities before performing referral conversion, team invitation or tenant-isolation writes. Confirm cost approval before creating a Supabase branch/project.
2. Execute referral UI/API/flow acceptance and verify that referred businesses have no team-membership or data access in the referring business.
3. Execute invitation acceptance and delivery tests with consenting controlled phone/email recipients.
4. Complete PWA installation/service-worker and viewport acceptance on real devices/browsers.
5. Continue the full feature roadmap in FEATURE_AUDIT.md and this handover. Preserve all outstanding core finance, CRM, inventory, savings/investment, Work Management, notifications, billing, AI, legal/support and remote-work scope.
6. Keep PR-first engineering, fresh migration validation, exact-head CI, exact Render SHA and migration checks for every runtime release. Never mutate production test data or PINs.


---

## Current continuation checkpoint — 2026-11-04 after PR #185

### Repository and change record
- GitHub `main`: `276e9b371bdb9641b47932bc808f77e96c03b8b4`.
- PR #185: https://github.com/RoyalFinTech/Kaira-Africa/pull/185 — merged by squash as `276e9b371bdb9641b47932bc808f77e96c03b8b4`; final PR head `d95560eb0a1259398fd203e5ac4e7e7bc73e5709`.
- PR #185 is test/CI and workflow-only. It adds 39 lines to the existing disposable PostgreSQL onboarding acceptance test and one anonymous-read route to the live access-control smoke workflow. No application runtime source, OpenAPI contract, generated API client, schema or migration changed.
- The last application-code release remains PR #180, `0835684f2158cb0624ccd43c8063dd9ec42646fe`. PRs #183, #184 and #185 after that release are respectively test/CI-only, documentation-only, and test/smoke-only.
- No other open PR was present after the PR #185 merge at the time checked.

### Exact-head CI evidence
- Backend CI run `41835886367`: SUCCESS on PR #185 head `d95560eb0a1259398fd203e5ac4e7e7bc73e5709`.
  - Shared DB/API-Zod libraries, API and frontend typechecks passed.
  - Frontend SPA and API builds passed.
  - All migrations applied to the disposable PostgreSQL CI database.
  - API suite: 71 passed, 0 failed, 0 skipped. The referral attribution test containing the self-referral and existing-business second-workspace assertions executed successfully.
  - Built API `/health` check passed.
  - Production Docker image build (verification only; no image push) passed.
- Work Management Build Checks run `41835886321`: SUCCESS on the same PR head; workspace typecheck/build and API test steps passed.
- These checks are PR/CI evidence. They are not authenticated browser E2E, OTP/SMS/SMTP delivery or physical device evidence.

### PR #185 behavior and security test additions
- The disposable PostgreSQL referral acceptance test now also verifies that:
  1. A user already associated with a business cannot create a second workspace using another business's valid referral code.
  2. A business owner cannot use their own referral code; the test temporarily clears and restores the owner's association only inside the disposable CI database, using `finally` for restoration.
  3. Rejected attempts do not increment the referring business's attribution count.
- `.github/workflows/live-api-access-smoke.yml` now includes `GET /api/businesses/me/referral` in the anonymous business-data probes, expecting HTTP 401. The workflow is configured for main pushes affecting protected API routes/workflow, on a six-hour schedule, and manual dispatch.
- The push-triggered live workflow result and an observed HTTP 401 for this new route were NOT independently retrieved in this continuation. A post-deployment Render log query found no matching referral request, so do not record the live anonymous probe as passed yet. The route implementation is owner-only in code (`requireUser`, then `requireRole("owner")`); manager/staff 403 and owner 200 still require controlled authenticated acceptance.

### Production deployment and database state
- All three Render services are verified `live` on exact main SHA `276e9b371bdb9641b47932bc808f77e96c03b8b4`:
  - API `srv-da6fnem7bikc738ekde0`: deploy `dep-dblivk5ckfvc73fkd9h0`.
  - Frontend `srv-db257gjbc2fs73f9nsj0`: deploy `dep-dblivk5ckfvc73fkd9pg`.
  - Admin static `srv-dbg86rmk1f9s73bkkev0`: deploy `dep-dblivk5ckfvc73fkd9ug`.
- The API's new instance logged Redis connected and `/ready` HTTP 200 (approximately 119–122 ms in the sampled entries). The post-deploy HTTP request-log query returned no 500/502/503 entries. A separate older app-level log still contains a 503 on `POST /api/ai/assistant` dated 2026-10-28; this is historical and not evidence of a current post-deploy outage.
- Production Drizzle migration ledger remains 26 rows / max ID 26. PR #185 adds no migration. No production business, user, referral, invitation, financial, inventory, customer or Storage test records were created or modified.
- Last read-only production business summary remains 2 businesses, 2 distinct referral codes present and zero attributed businesses. Actual referral code values were not selected or printed.
- Supabase branch listing still returns no staging branches. Staging branch provisioning was attempted only far enough to discover Supabase's cost-confirmation gate; the attempt was rejected before creation. No staging resource exists. Do not call `confirm_cost` or retry branch creation until the user has received the estimate and explicitly approved the charge.
- RLS check: all 33 public tables have RLS enabled. The checked table-grant query found no direct SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants to `anon`, `authenticated` or `PUBLIC`. The 33 informational advisor findings for RLS-enabled tables without policies are not a reason to add broad grants or policies; the app uses the trusted API and direct PostgreSQL/Drizzle connection. Review table-specific behavior before security changes.

### Acceptance status and next engineering work
- Referral DB/repository acceptance now covers onboarding concurrency, independent referred workspace, no referral-created team membership, unknown-code rollback, self-referral rejection and already-associated-user second-workspace rejection.
- Still NOT VERIFIED in isolated authenticated staging: owner page/copy/WhatsApp/direct refresh, owner 200, anonymous 401 live workflow result, manager/staff 403, referral retention through signup/login/onboarding, real attribution count increment across two controlled businesses, fallback UX, and cross-tenant access denial across customers/transactions/staff/ledger/inventory/savings/investments.
- Team invitations remain implemented in PRs #171/#172, but the current DB acceptance suite does not yet exercise invitation repository lifecycle. Next code-level test target: wrong invited phone does not consume a token; the intended phone can accept exactly once; expired and revoked invitations cannot be accepted; resend rotates token hashes; accounts already attached to another business are rejected. Keep SMS/SMTP delivery as a separate staging test with consenting recipients.
- PWA/mobile: PRs #173/#176 remain implemented/deployed. Android Chrome install, iOS Safari Add to Home Screen, desktop native/no-native event, right-edge placement, standalone/dismissal, service worker update and auth redirects, plus 320/360/390/430 px/tablet/desktop interaction screenshots remain NOT VERIFIED on physical devices.
- Continue the complete roadmap preserved above and in `FEATURE_AUDIT.md`. This checkpoint closes no CRM, finance, inventory, investment, savings, Work Management, notifications, proposals, Freelancer Copilot, automation, AI, billing, legal or support feature.
- Keep CI, Render deployment, migration state, authenticated E2E and physical-device evidence as independent statuses. Preserve production data; no production synthetic test users or records.



---

## Current continuation checkpoint — 2026-11-04 after PR #187

### Repository, PR and runtime scope
- Latest GitHub main: `0e920c77450f56db657d8127cf539d09fcecb01b`.
- PR #187: https://github.com/RoyalFinTech/Kaira-Africa/pull/187; merged by squash as `0e920c77450f56db657d8127cf539d09fcecb01b`. PR head before squash: `45d3469a64bcb66ffcc045ea71800bfd9f487b64`.
- PR #187 adds only `artifacts/api-server/test/team-invitations-db.test.ts` (370 lines). No runtime source, API contract/OpenAPI, generated client, database schema, migration, environment variable, OTP/SMS/SMTP integration or production configuration changed.
- PRs #183, #185 and #187 add CI/DB tests; PRs #184 and #186 are documentation-only. The most recent application-runtime source release remains PR #180 `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- Open-PR search after PR #187 returned no open PRs.

### PR #187 exact-head CI evidence
- Backend CI run `41837224773`: SUCCESS on exact PR head `45d3469a64bcb66ffcc045ea71800bfd9f487b64`.
  - Workspace shared/API/frontend typechecks and frontend/API builds passed.
  - Fresh disposable PostgreSQL migration application passed.
  - API suite: 75 passed, 0 failed, 0 skipped.
  - Built API `/health` smoke passed.
  - Production Docker image build passed (validation only, no image pushed).
- Work Management Build Checks run `41837224553`: SUCCESS on the same PR head (workspace typecheck/build and API test step passed).
- All four new database-backed invitation acceptance tests explicitly executed and passed:
  1. Wrong phone is forbidden without consuming the pending invitation; correct invitee phone accepts; repeated acceptance is rejected.
  2. Expiry updates the invitation to expired and pending roster row to inactive; revoked invitation and roster state are consistent; expired/revoked acceptance is denied.
  3. Resend rotates the stored token hash; old token is no longer found; replacement token accepts once.
  4. An account already linked to a different business cannot accept an invitation into the inviting business; its existing owner association/role remain unchanged and no foreign membership is created.
- These are repository/database integration checks against disposable CI PostgreSQL. No SMS, email, OTP or PIN provider was called. They do not prove full real-browser/API session flow or carrier delivery.

### Current Render release and Supabase state
- All three Render services are verified live on exact main SHA `0e920c77450f56db657d8127cf539d09fcecb01b`:
  - API `srv-da6fnem7bikc738ekde0`, deploy `dep-dblj3ilbedkc73ad9hn0`.
  - Frontend `srv-db257gjbc2fs73f9nsj0`, deploy `dep-dblj3ilbedkc73ad9i40`.
  - Admin static `srv-dbg86rmk1f9s73bkkev0`, deploy `dep-dblj3ilbedkc73ad9i00`.
- Admin and frontend completed first, then the API deploy completed live. The Render log-query service intermittently returned Loki HTTP 503 during final verification and a later `/ready` query returned no matching log rows. Therefore, exact deployment state is confirmed live, but do not claim a separately observed post-PR #187 `/ready` 200 or no-error log check from that last log query. Earlier PR #185 new API instance logs did record Redis connected and `/ready` HTTP 200.
- Production Drizzle migration ledger remains 26 rows / max ID 26. PR #187 has no migration.
- Read-only production business aggregate remains 2 businesses, 2 referral codes present/distinct, zero attributed businesses. Do not select or reveal code values.
- No production user, business, invitation, referral, customer, financial, inventory or Storage record was created or modified by this work.
- Supabase still has no staging branch. The branch creation request was stopped by the Supabase cost-confirmation gate and created nothing. Cost-estimate flow requires the correct organization ID, then the exact price must be shown and explicitly approved before confirmation and branch creation. Do not use production for authenticated E2E.

### Updated acceptance coverage and remaining gates
- Team invitation repository/database lifecycle is now CI-tested for wrong-phone non-consumption, correct-phone single acceptance, duplicate acceptance, expiry, revoke, resend/token rotation, old-link invalidation and cross-business rejection.
- Still NOT VERIFIED in isolated controlled staging: new invitee real OTP; returning-user PIN login/continuation; full invitation HTTP/browser flow and auth session; matching target phone across actual OTP session; real SMS provider delivery; real SMTP delivery; provider retry/outbox status; and invitation page physical device/viewport visual interaction.
- Referral CI/database checks cover workspace concurrency, independent B2B referral attribution, no team membership, unknown-code rollback, self-referral and existing-account second-workspace rejection. Still NOT VERIFIED: owner UI/copy/WhatsApp/direct refresh, anonymous 401 live workflow result, manager/staff 403, owner 200, retention through login/onboarding, controlled two-business conversion/count and full tenant isolation across every business data domain.
- PWA/mobile PRs #173/#176 remain deployed. Android Chrome installation, iOS Safari Add to Home Screen, desktop native/no-native prompt, right-edge guidance, standalone/dismissal, service-worker update/auth redirect and 320/360/390/430 px/tablet/desktop physical/browser checks remain NOT VERIFIED.
- All other product areas and roadmap requirements remain open as recorded earlier in this handover and `FEATURE_AUDIT.md`; PR #187 does not close CRM, financial, inventory, savings/investment, Work Management, notification/push, proposal, freelancer, automation, AI, billing, legal or support scope.
- Maintain separate statuses for implementation, CI, deployment, production migrations, authenticated E2E, real delivery and physical-device acceptance.



---

## Current continuation checkpoint — 2026-11-04 after PRs #189 and #190

### Repository and release state
- Current GitHub `main` before this documentation reconciliation: `55399e3af49370305be9b0812643f25c19b55eb6`.
- PR #189 merged as `bc61a4022c3627db592f52c0b53921ce6c6aaf8a`; PR #190 merged as `55399e3af49370305be9b0812643f25c19b55eb6`.
- Both PRs are test-only. They add disposable-PostgreSQL acceptance tests, with no application runtime source, OpenAPI/generated-client, schema, migration or production configuration changes. Most recent runtime source release remains PR #180 `0835684f2158cb0624ccd43c8063dd9ec42646fe`.
- Open PR search after PR #190 returned none.

### PR #185 live anonymous referral smoke — VERIFIED (correction to earlier notes)
- The live API access-control workflow did run after PR #185 merged: GitHub Actions run `41836364878`, push event, main SHA `276e9b371bdb9641b47932bc808f77e96c03b8b4`; job `126596191694` SUCCESS.
- The workflow first observed the live API health endpoint returning HTTP 200, then tested seven business-data endpoints anonymously.
- It explicitly logged `PASS /api/businesses/me/referral -> HTTP 401` and `All anonymous access-control probes passed.`
- The other protected endpoints tested were auth/me, CRM customers, inventory products, investment plans, savings overview and daily ledger; all returned 401.
- This closes the **live anonymous HTTP 401** evidence gap. It does not provide manager/staff/owner authenticated live identities; those are now separately CI route-tested below and still require controlled staging/browser testing for full end-user flow.
- Earlier notes in this handover and SSOT/Audit that say this post-merge workflow result was “not independently retrieved” are historical observations and are superseded by this verified run. They are retained for history.

### PR #189 — referral API role/session route matrix
- PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/189
- Merge SHA: `bc61a4022c3627db592f52c0b53921ce6c6aaf8a`; PR head: `5568de095710f9c196a94e90be9a6648ca7f7875`.
- Added `artifacts/api-server/test/business-referral-route-db.test.ts`, which boots the actual Express businesses router on loopback and persists real server-side session hashes in the disposable CI PostgreSQL database.
- Actual HTTP outcomes asserted: anonymous 401; invalid session 401; manager 403; staff 403; owner without a business 401; owner with a business 200 and correct business name/referral summary. A second owner receives their own distinct referral code rather than the first owner's summary.
- Backend CI run `41840262142` SUCCESS; Work Management Build Checks `41840262711` SUCCESS. API suite: 76 passed, 0 failed, 0 skipped; fresh disposable migrations, typechecks/builds, /health and Docker verification passed.
- These tests are route-level CI with test identities and DB state. They do not test the browser's copy/WhatsApp interaction, sessionStorage retention through sign-up, or controlled two-business signup in staging.

### PR #190 — team invitation preview/accept HTTP flow
- PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/190
- Merge SHA: `55399e3af49370305be9b0812643f25c19b55eb6`; PR head: `154f05b61d9dc1ce03a583a010337caceb1a8b93`.
- Added `artifacts/api-server/test/team-invitation-route-db.test.ts`, using the actual Express team router, user session middleware, invitation repositories and disposable PostgreSQL/Redis. It is enabled only by the Backend CI integration-test flag.
- The HTTP test verifies public preview returns safe invitation details and a masked phone (not the full phone), invalid preview token is rejected, anonymous acceptance is 401, wrong-phone authenticated acceptance is 403 and leaves the invitation pending, intended-phone session accepts with 200, repeated acceptance is 409, and manager/staff cannot create invitations (403).
- The successful acceptance assertion verifies the team membership, invited user's business association and least-privilege staff role. Manager/staff create-denial assertions exercise the actual route's role middleware; no new invite is inserted by those denied requests.
- Backend CI run `41841318239` SUCCESS; Work Management Build Checks `41841318308` SUCCESS. API suite: 77 passed, 0 failed, 0 skipped. Shared/API/frontend typechecks, SPA/API builds, fresh migrations, API health smoke and production Docker image build all passed.
- No SMS or SMTP provider was called; the test creates an already-authenticated test session in the disposable DB. This is not a substitute for real new-user OTP, returning-user PIN or delivery-provider acceptance.

### Latest production deployment and database state
- All three Render services are verified `live` on exact main SHA `55399e3af49370305be9b0812643f25c19b55eb6`:
  - API `srv-da6fnem7bikc738ekde0`, deploy `dep-dbljg85ckfvc73fl7n4g`.
  - Frontend `srv-db257gjbc2fs73f9nsj0`, deploy `dep-dbljg85ckfvc73fl7nd0`.
  - Admin static `srv-dbg86rmk1f9s73bkkev0`, deploy `dep-dbljg85ckfvc73fl7ni0`.
- Production Drizzle migration ledger remains 26 rows / max ID 26. PRs #189/#190 added no migrations.
- Read-only business aggregate remains 2 businesses, 2 distinct referral codes present and 0 attributed businesses. Do not expose actual code values.
- No production user/business/referral/invitation/customer/financial/inventory/Storage records were created or changed for these tests.

### Remaining acceptance and cost boundary
- Referral implementation and API authorization now have: live anonymous 401 proof, disposable-DB route tests for owner 200 / manager-staff 403 / invalid session 401, and DB onboarding tests for independent referred businesses/no team membership, invalid referral rollback, self-referral and existing workspace rejection.
- Still NOT VERIFIED in controlled staging/browser: owner page copy/WhatsApp/direct refresh, sign-up/login referral retention, two-business live conversion/count increment and full tenant isolation across all data domains.
- Team invitations now have DB lifecycle and HTTP route acceptance tests for preview masking, wrong-phone, intended-phone one-time acceptance, expiry/revocation, resend rotation, cross-business rejection, duplicate acceptance and manager/staff create denial.
- Still NOT VERIFIED: real new-user OTP, returning-user PIN, real SMS and SMTP delivery/outbox behavior, physical invitation/PWA device interactions.
- Supabase staging branch remains uncreated. Verified cost estimate: **US$0.01344/hour** for one development branch in the Kaira Africa organization. No explicit approval has been given; do not call cost confirmation or create the branch until the user expressly approves this hourly charge. The branch would have a separate DB and does not copy production data.
- PWA install/service-worker/device checks and full responsive viewport checks remain outstanding; all CRM, accounting, inventory, investments/savings, Work Management, push, proposals, Freelancer Copilot, automation, AI, billing, legal and support roadmap items remain preserved and open.



---

## Current continuation checkpoint — 2026-11-04 after PR #192

### Current repository and CI
- Current GitHub `main` before this documentation reconciliation: `ddd3d0b404a378701c49410d978a89e6b26016ed`.
- PR #192: https://github.com/RoyalFinTech/Kaira-Africa/pull/192; merged by squash as `ddd3d0b404a378701c49410d978a89e6b26016ed`. Corrected PR head: `344311df1208e20c782fa6e6ed376fd580960887`.
- PR #192 adds only `artifacts/api-server/test/auth-otp-pin-route-db.test.ts` (270 lines). No runtime source, API/OpenAPI/generated artifact, schema, migration, environment variable or production configuration changed.
- Backend CI run `41842988171`: SUCCESS on corrected exact head. Work Management Build Checks run `41842988148`: SUCCESS.
- Backend CI passed shared/API/frontend typechecks, frontend/API builds, fresh disposable PostgreSQL migrations, API health smoke and production Docker image build. API suite: **78 passed, 0 failed, 0 skipped**. The new OTP/PIN HTTP subtest executed successfully (not skipped).
- The first PR #192 run failed only because the test expected `code` at the response root; the API's actual error contract is `error.code`. The test assertion was corrected and the rerun on the new exact head passed. No application behavior change or production defect was required.

### PR #192 — OTP verification and PIN login acceptance
- The new DB integration test is opt-in via `KAIRA_DB_INTEGRATION_TESTS=true` and runs after all migrations against Backend CI's disposable PostgreSQL and Redis services.
- It inserts one already-HMAC-hashed OTP with a short expiry for a generated CI-only Gambian phone number. It does not call `request-otp` and does not send or expose an SMS.
- It uses the actual Express auth router and verifies:
  1. `POST /auth/verify-otp` consumes the hashed OTP, creates a new owner user and returns a persistent user session.
  2. The returned session authorizes `GET /auth/me`.
  3. First-time `POST /auth/set-pin` succeeds; the stored PIN is a non-plaintext Argon2id hash.
  4. Changing an existing PIN without `currentPin` is rejected; using the correct current PIN allows the PIN to be changed.
  5. A user with PIN enabled cannot request OTP fallback (`409 pin_login_required`); no additional OTP row is created and no SMS provider is invoked.
  6. Incorrect PIN login is rejected; the new valid PIN returns a new session, and the new session can access `GET /auth/me`.
- The test closes its loopback HTTP server and Redis client and deletes only its own OTP records, auth audit entries and test user(s) in the disposable CI database.
- This proves route-level OTP verification and PIN behavior, but not actual OTP request/delivery, external carrier delivery, SMTP or real-user browser onboarding.

### Production deployment and Supabase state
- All three Render services are verified `live` on exact main SHA `ddd3d0b404a378701c49410d978a89e6b26016ed`:
  - API `srv-da6fnem7bikc738ekde0`, deploy `dep-dbljl8avcj2c738rjh1g`.
  - Frontend `srv-db257gjbc2fs73f9nsj0`, deploy `dep-dbljl8avcj2c738rjha0`.
  - Admin static `srv-dbg86rmk1f9s73bkkev0`, deploy `dep-dbljl8avcj2c738rjhgg`.
- The new API instance logged “Migrations applied successfully”, “Redis connected”, server listening on port 10000 and `/ready` HTTP 200. Render logged “Your service is live”.
- Production Drizzle migration ledger remains 26 rows / max ID 26. PR #192 contains no migration.
- Read-only production aggregate remains 2 businesses, 2 distinct referral codes present and 0 attributed businesses. Actual codes have not been selected or printed.
- No production users, businesses, OTPs, PINs, sessions, referrals, invitations, financial, inventory, customer or Storage records were created or modified for the CI work.

### Current acceptance status and next gates
- Referral CI acceptance: live anonymous 401 verified (run 41836364878); route/session CI verifies invalid session and unassigned owner 401, manager/staff 403 and owner 200 with the correct per-business summary (PR #189).
- Team invitation CI acceptance: database lifecycle (PR #187), HTTP preview masking/phone match/acceptance/duplicate rejection/manager-staff creation denial (PR #190).
- OTP/PIN CI acceptance: hashed OTP verification, new user/session, Argon2id PIN setup/change and PIN login (PR #192).
- Still NOT VERIFIED: actual SMS carrier delivery, real new-user OTP request/provider delivery, returning user browser/PIN UX, invitation email/SMTP delivery, provider retry/outbox, full browser signup/invitation journeys and physical device acceptance.
- Referral browser copy/WhatsApp/direct refresh/retention through signup and controlled two-business conversion/count/complete tenant isolation remain staging acceptance tasks.
- PWA install/service-worker/auth redirect and 320/360/390/430 px/tablet/desktop physical testing remain open.
- The Supabase staging branch is still uncreated. Cost estimate remains US$0.01344/hour. No cost confirmation or branch creation until the user explicitly approves that hourly charge.
- Keep all CRM, accounting/ledger/debts, inventory, investment/savings, receipt/profile, Work Management, notifications/push, proposals/quotations, Freelancer Copilot, automation, AI/privacy, billing/entitlements, legal and support roadmap requirements open unless independently tested and delivered.



---

## Current continuation checkpoint — 2026-11-04 after PR #194 (OTP security)

- Current main: `8711ee8008040479f5ceef2dd418967e3c79011e`. PR #194 merged as that squash SHA; PR head `8ac501c816d25e24abbc93edf42d821a2ddcc6b9`.
- PR #194 changes only `artifacts/api-server/test/auth-otp-pin-route-db.test.ts`; no runtime, OpenAPI/generated client, schema or migration change.
- Backend CI `41844754318` and Work Management Build Checks `41844754245` both succeeded. Backend CI passed typechecks/builds, fresh disposable PostgreSQL migrations, health smoke, Docker image build and **78 API tests (78 pass, 0 fail, 0 skipped)**.
- The OTP/PIN HTTP integration test now also proves:
  1. An expired HMAC-hashed OTP returns HTTP 400, remains unconsumed and cannot create a user.
  2. Two incorrect codes increment the stored attempts counter from 0 to 2.
  3. After `maxAttempts` is reached, even the correct OTP is rejected; no user/session is created and the OTP remains unconsumed.
- Existing assertions still cover OTP verification/session issuance, Argon2id PIN storage, current-PIN requirement when changing a PIN, OTP fallback rejection for a PIN-enabled account, incorrect PIN rejection and successful PIN login.
- All OTPs/phones are synthetic CI fixtures in disposable PostgreSQL, stored as hashes. No SMS provider is called. Teardown removes only the suite's OTP/audit rows and fixture user(s).
- All three Render services are verified live on exact SHA `8711ee8008040479f5ceef2dd418967e3c79011e`: API `dep-dbljqilbedkc73aed64g`, frontend `dep-dbljqilbedkc73aed6d0`, admin `dep-dbljqilbedkc73aed6i0`. API startup logged successful migrations, Redis connected and `/ready` HTTP 200.
- Supabase Drizzle ledger remains 26/max ID 26. Production aggregate remains 2 businesses, 2 distinct referral codes, 0 attributed businesses. No production data changed.
- Still NOT VERIFIED: real SMS/carrier delivery, OTP request/provider receipt, PIN-enabled returning-user browser recovery, device OTP/PIN UX, SMTP invitation delivery and physical PWA acceptance. The staging branch remains uncreated pending explicit approval of the US$0.01344/hour estimate. Keep the full product roadmap open.



## Continuation update — 6 November 2026 (PWA, sharing, visual and mobile UX)


Baseline rechecked before this work: main `277d57d6819adc6f6d07259681b867e3ecab68e8`; no open PRs; API, frontend and admin Render services are Live on that exact SHA. New working branch: `feat/pwa-share-mobile-country-ux`, created from that SHA. No production data or configuration changed.

### Newly requested work — keep in active scope
- Diagnose recipient-facing Kaira Africa links. Add correct canonical/Open Graph/Twitter metadata and an absolute share-preview image URL; inspect SPA direct-route handling and test root/deep links. A social preview image is distinct from the destination URL actually loading; both need verification.
- Verify PWA icon assets and manifest for installed Android/iOS/desktop experiences. Ensure the Kaira mark is used consistently for standard, Apple-touch and maskable icon purposes; review asset weight and cache/version behaviour.
- Add an accessible manual refresh control and mobile pull-to-refresh gesture. Refresh must refetch current screen data, avoid accidental browser navigation, expose loading/error feedback, and not discard unsaved form input.
- Audit responsive layouts at 320/360/390/430 px, tablet and desktop, including dashboard, onboarding, navigation, cards, forms and install prompt placement.
- Fix onboarding country selector so each listed country visibly displays its own flag, using consistent compact SVG flag artwork. Preserve The Gambia as the default and cover Senegal, Sierra Leone, Ghana, Nigeria, Kenya, South Africa and Egypt.
- Continue dashboard visual improvements and add image assets only where they support comprehension and brand quality. The existing dashboard hero image is already present; do not describe the image feature as entirely absent. Keep artwork optimized and locally served where possible.

### Initial code inspection findings (not yet fixes)
- `PhoneAuthPage.tsx` is explicitly Gambian +220 authentication with carrier prefixes; do not broaden it accidentally when fixing the separate business-country selector.
- `BusinessOnboardingFlow.tsx` lists eight countries but only conditionally shows the Gambia flag in the field label; individual options do not show flags.
- `index.html` has title/description/Open Graph title+description and Twitter title+description, but no canonical URL, `og:url`, `og:image` or `twitter:image`.
- `manifest.webmanifest` currently lists the PNG and favicon SVG without explicit 192/512 sizes or a maskable icon purpose. The PNG is 1,824,369 bytes; review optimization and icon variants before changing install assets.
- `sw.js` currently caches the app root, manifest and favicon; app icons and refresh/update behaviour need a deliberate cache strategy.
- `DashboardPage.tsx` already renders `/kaira-dashboard-hero.webp`; next image work should improve other useful dashboard sections rather than duplicate decorative hero art.
- `AppShell.tsx` currently has a scrollable main region but no pull-to-refresh interaction or shared refresh control.
- Link delivery failure is not yet reproduced. Request the exact URL/channel if it remains unclear whether the failure is a destination load, a deep link, or only a missing preview card.

### Safety and release gates
All work stays on the feature branch and goes through PR + free CI. No paid staging, production test accounts, fake financial records, secrets, or production schema/data writes. Mark physical-device acceptance and external WhatsApp/Facebook crawler preview as NOT VERIFIED until tested. Do not merge/deploy until checks pass and the target route/assets are verified.


### Implementation update — 6 November 2026 (feature branch; validation pending)

Working branch `feat/pwa-share-mobile-country-ux` now contains the first implementation pass:
- Business onboarding country selector now renders the locally drawn flag for each of the eight existing country choices, including the selected value; The Gambia remains the default. The Gambian-only +220 phone authentication flow was not changed.
- Root HTML now declares the canonical frontend URL and Open Graph/Twitter share metadata. The share image currently points to the existing locally hosted dashboard hero WebP asset; this avoids inventing a new asset path. Social-crawler rendering and recipient-device navigation remain NOT VERIFIED.
- PWA manifest now explicitly declares the existing PNG as the general icon and the inset Kaira SVG mark as both ordinary and maskable SVG icon. Service-worker shell cache version was bumped and the Kaira PNG icon is precached. Physical installation, OS icon crop and update behaviour remain NOT VERIFIED.
- App header now includes a manual data refresh control using React Query invalidation (no full-page reload, so active form input is not deliberately discarded). The scrollable app shell now supports a top-edge pull-down gesture to invalidate active queries, with a visible status indicator and overscroll containment. Touch-device gesture, accessibility and per-page refresh behaviour remain pending QA.
- These are implementation changes only; no PR merge, production deploy, production database write or migration has occurred. Build/typecheck/CI must pass before considering merge.
- Remaining: verify the new flag artwork visually and through selector interaction; inspect/validate the deployed root and all deep links; test crawler access to the share image and preview; test PWA installation and icon crop on Android/iOS/desktop; test refresh and pull-to-refresh on real devices; audit responsive 320/360/390/430 px/tablet/desktop layouts; continue dashboard visual work and remaining roadmap.
