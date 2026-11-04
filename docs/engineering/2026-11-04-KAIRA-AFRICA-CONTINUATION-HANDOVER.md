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

