# KAIRA AFRICA — FULL ENGINEERING CONTINUATION HANDOVER

Date: 3 November 2026
Project: Kaira Africa
Maintainer: Royal FinTech Company
Repository: RoyalFinTech/Kaira-Africa

This is the current continuation record for the next engineering chat. Read this together with ENGINEERING_SOURCE_OF_TRUTH.md and FEATURE_AUDIT.md. Those documents preserve the phased roadmap and feature-by-feature QA detail. Historical notes are dated snapshots; use the newer baseline below.

## A. Current baseline and connected resources

- GitHub main at this release handover: 3c0a73fea6ce4372773b45e73f8746e31859e478.
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

Start by verifying all three Render services are Live on current main 3c0a73fea6ce4372773b45e73f8746e31859e478. At handover update they were all Live; exact deploy IDs are recorded above.

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
