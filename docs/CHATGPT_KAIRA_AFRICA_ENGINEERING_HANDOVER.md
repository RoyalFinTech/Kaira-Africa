# Kaira Africa — ChatGPT Engineering Handover Prompt
**Prepared:** 26 October 2026  
**Purpose:** Continue engineering work in a fresh ChatGPT conversation. Read this file first, then independently inspect the live repository state before making changes.

---

## 1. Your role and operating rules

Act as the senior software engineer and engineering partner for Royal FinTech Company on Kaira Africa. Continue from verified repository evidence, not assumptions or claims from earlier chats.

**Start by inspecting this repository and current state.** This document is a handover, not a substitute for verification. Branches and commits may have changed after this file was written.

Safety rules:
- Do not merge a PR, deploy to Render, run production migrations, or mutate production Supabase data/schema without explicit user approval.
- Never change or reset production user PINs or create fake production accounts.
- Do not run destructive Git commands such as `git reset --hard`, `git clean -fd`, force-push, repository deletion, or blind branch renames.
- Preserve existing user work. Before any write, fetch the current exact branch head and compare it with the expected SHA. Use a non-force fast-forward update with an expected-SHA lease where supported; if the ref moved, stop and re-inspect rather than retry blindly.
- Do not claim code was tested, CI passed, a migration ran, a deployment succeeded, or a live database was verified unless there is current evidence for that exact claim.
- Separate source inspection, local/mock testing, GitHub CI, deployed HTTP smoke checks, and live Supabase verification. State which layer has actually been checked.
- Prefer small, reviewable changes with focused tests. Verify every GitHub write by fetching the branch ref and affected file afterward.
- If blocked, explain the exact limitation and do the safest useful next step instead of pretending to have access.
- User's repeated “continue” authorizes continued safe engineering on feature branches, but is not approval for production mutation, deployment, or merge.

## 2. Repository and deployment references

- GitHub: https://github.com/RoyalFinTech/Kaira-Africa
- Render frontend: https://kaira-africa-frontend.onrender.com/
- Render API: https://kaira-africa-api.onrender.com/
- Supabase project ref: `gofoibbvxnhqzqwrpcbx`
- Render frontend service: `srv-db257gjbc2fs73f9nsj0`
- Render backend service: `srv-da6fnem7bikc738ekde0`
- Render workspace: `tea-d9usq87lk1mc73eia2f0`
- Render normally auto-deploys from `main`. Do not assume a feature branch is deployed.
- Main SHA previously recorded (15 October 2026): `8ab31f0c1478d7394954d185fa9b500503564c4a`. This is historical and MUST be rechecked; do not assume it is current.

Use connected GitHub/Render/Supabase tools when available. Discover tool schemas from the available tool list before invoking them. For Supabase tasks, read the installed Supabase skill instructions first. Never pass secrets into public files or chat logs.

## 3. Most recent Savings Tracker work

### PR #69 — Add savings tracker and savings goals
- PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/69
- Branch: `feature/savings-tracker`
- Last verified head: `46ae8c5de5e39a1145744e7f3e6f79b5a01a11ae`
- PR state at last inspection: open, not merged, draft, base branch `feature/investment-planner`.
- Important: this branch is **not safely ready to merge**. It has unusual ancestry/divergence and the intended integration target must be resolved before merge.
- The latest commit added a regression test to `artifacts/api-server/test/lib.test.ts` for the minor-unit boundary: `toMinorUnits(0.004, "GMD") === 0`, `toMinorUnits(0.005, "GMD") === 1`.
- This test commit is committed to the feature branch, not deployed.
- At the last check, GitHub reported zero check runs on the latest commit. Do not claim CI passed.

### CI workflow finding
- `.github/workflows/backend.yml` is titled “Backend CI”.
- Its `pull_request` trigger targets `main` and filters for relevant source paths; push trigger targets `main`.
- PR #69 currently targets `feature/investment-planner`, which explains why the current branch did not get the expected check run under this workflow.
- Do not casually change the PR base to main: the savings branch's comparison with main showed Investment Planner files/migration bundled in the changes.
- Safely inspect PR #69, `feature/investment-planner`, `main`, their merge bases, and changed-file lists. Decide the cleanest integration approach based on actual current ancestry. Possible approach: create a dedicated integration/test branch or carefully rebase/cherry-pick isolated commits onto the intended base, but do not rewrite shared history or force-push. Do not change PR base until its resulting diff is understood.
- Check whether CI can be triggered by a safe branch-only workflow change or test PR without broadening unrelated production triggers. If editing workflow, make the narrowest change and explain the security/maintenance implications. Never claim tests passed until actual workflow run reports success.

### Feature description
PR #69 introduces:
- Responsive Savings Tracker dashboard and goals.
- User-recorded deposits and withdrawals.
- Destinations including mobile money, bank, microfinance, cash, savings box, savings group, and other.
- CSV/print reporting.
- Authenticated business-scoped savings API.
- Drizzle schema and migration `lib/db/migrations/0012_savings_tracker.sql`.
- It does not apply the migration to production Supabase and does not deploy to Render.

Related Investment Planner work on `feature/investment-planner` includes:
- `artifacts/api-server/src/routes/investments.ts`
- `artifacts/kaira-africa/src/pages/app/InvestmentPlannerPage.tsx`
- `lib/db/migrations/0011_investment_plans.sql`
The savings branch comparison against main previously showed these Investment Planner files included too, so avoid accidental bundling.

## 4. Savings Tracker code and business rules

Relevant files:
- `artifacts/api-server/src/routes/savings.ts`
- `artifacts/api-server/src/routes/transactions.ts`
- `artifacts/api-server/src/routes/investments.ts`
- `artifacts/api-server/src/lib/money.ts`
- `artifacts/api-server/src/middlewares/auth.ts`
- `artifacts/api-server/test/lib.test.ts`
- `lib/db/src/schema/savings.ts`
- `lib/db/migrations/0012_savings_tracker.sql`
- `lib/db/migrations/0011_investment_plans.sql`

Previously inspected money helper:
- `toMinorUnits(amount, currency)` converts decimal values into integer minor units using `Math.round(amount * 100)` for supported currencies.
- Supported currencies in savings are GMD, NGN, USD, all two decimal places.
- API guards now reject amounts that round to zero minor units with a clear HTTP 400 message such as “Amount must be at least 0.01 in the selected currency.”
- Savings goal target guard similarly rejects target amounts below one minor unit.
- Transaction and investment routes have corresponding converted-minor-unit guards in the feature branch.
- Verify current source; these are recorded as prior work, not a substitute for reviewing latest files.

Savings overview:
- Activity list is capped at latest 500 entries, but totals were changed to aggregate the full ledger separately, to avoid incorrect totals for users with more than 500 records.
- Totals are kept separate per currency.
- Goal balances are computed separately by goal.
- Business scope comes from authenticated session middleware and is applied to queries. Re-verify current middleware and all route queries.

Withdrawal business rule already chosen:
- Unassigned savings have a separate balance per currency, independent of goal balances.
- A withdrawal tied to a goal may only draw against the balance recorded for that goal.
- An unassigned withdrawal may only draw against unassigned balance in the same currency; do not silently allow it to consume a goal's funds.
- Withdrawal checks use a database transaction and advisory lock per goal/currency scope to help prevent concurrent overdraws. Verify this still holds in current code and ensure balance validation and insertion are atomic.
- User-entered savings are ledger records; do not imply bank/mobile-money/cash balances are automatically verified.

Recommended UI copy:
- **Unassigned savings:** “Record money you have saved without linking it to a specific goal. You can withdraw from this balance as long as you have enough recorded savings in the same currency.”
- **Savings goal:** “Use this option when you are saving towards something specific, such as school fees, rent, a business purchase, or an emergency fund. Deposits and withdrawals are tracked separately for each goal.”
- **Before recording a withdrawal:** “This tracker records the savings you enter into Kaira Africa. It does not automatically verify your bank account, mobile money wallet, or cash balance. Make sure your recorded balance reflects your actual savings.”

Potential issue requiring review:
- Migration `0012_savings_tracker.sql` enables RLS on `savings_goals` and `savings_entries`, but prior source inspection did not find policies in that migration. This may be intentional if access is exclusively through the API's server-side database role, but that must be verified from actual runtime configuration and app access patterns. Do not add policies or alter RLS blindly. Determine whether browser clients can access these tables directly and what database role the backend uses; report the evidence. Never expose service-role credentials.
- Migration `0011_investment_plans.sql` constrains `expected_profit_minor >= 0`. The investment route previously required revenue to be at least total costs and rejected losses. This is a product/business-rule concern: do not change semantics or schema without a deliberate decision. Check latest state and propose a coherent representation of loss vs profit if needed.
- Ensure savings withdrawal safeguards are correct under concurrent requests, and ensure currency and goal matching are enforced server-side.

## 5. CI and test environment

`artifacts/api-server/package.json` scripts:
- `pnpm run typecheck`
- `pnpm test` runs `tsx --test test/*.test.ts`
- `pnpm run build`
- `pnpm run migrate:deploy`

Backend CI workflow previously ran:
- pnpm install frozen lockfile
- shared library typecheck
- API typecheck
- frontend typecheck/build
- API smoke tests
- API build
- migration application against a fresh CI Postgres database
- built server `/health` check
- Docker build without pushing

Check current workflow content and run state before relying on this list. If CI isn't running because of base branch/trigger mismatch, fix the verification route safely. Do not run migrations against production as a testing shortcut.

## 6. Broader Kaira Africa work / outstanding QA

### PIN login and settings
Files previously identified:
- Frontend: `PinSettingsCard.tsx`, `PinLoginPage.tsx`, `PhoneAuthPage.tsx`
- Backend: `routes/auth.ts`, `repositories/users.ts`, `lib/pin.ts`, `app.ts`
- Endpoints: `GET /api/auth/pin-status`, `POST /api/auth/set-pin`, `POST /api/auth/login-pin`
Requirements:
- Argon2id server-side hashing only.
- Verify updateUserPinHash detects a zero-row update.
- Setting/changing PIN requires current PIN when changing an existing PIN.
- Returning users with PIN enabled route to `/login/pin`, retaining normalized +220 number.
- Registered users without PIN must keep SMS recovery.
- No production PIN/user mutation.
- Network selector should include Africell/QCell/Comium/Gamtel; prior code reportedly had a Gamcel option, so inspect current implementation.
- WebAuthn/passkeys should be real optional functionality only, never mock UI pretending to work.
- Historical production read-only audit on 15 Oct 2026 showed 1 registered user, 0 non-empty pin_hash; auth audit had 12 successful otp_requested events and 1 failed user_pin_login_failed event, with no pin-set audit events returned. This is historical only; re-run read-only checks if relevant and available.
- User previously reported Profile PIN save returned HTTP 408. Investigate root cause without production mutation.

### Daily ledger
- Spreadsheet-like bookkeeping fields: date/time/type/description/category/customer/payment/remarks/status/amount/outstanding; CSV export; mobile nav and horizontal table.
- Previous smoke showed 390px layout/nav and CSV export, but writes were not proven. Treat write behavior as unverified until tested.

### Inventory
Files previously identified:
- `InventoryPage.tsx`, `routes/inventory.ts`, `platform-api.ts`, `lib/db/src/schema/inventory.ts`, migration `0007_inventory_product_images.sql`.
Prior known state:
- Historical live audit: zero products, `image_url` nullable, currency non-null default GMD, private `inventory-images` bucket, 204800-byte limit, JPEG MIME.
- Needs signed URLs/object paths; bucket should remain private.
- Photo optional, JPEG <=200 KB.
- Currency options GMD/NGN/USD kept separate.
- Test stock movement and low-stock behavior.
- Previous smoke used mocked/intercepted inventory requests; not proof of live writes.

### Receipt branding / logo upload
- User observed literal object-like text (e.g. “[object Object]”) around receipt/logo upload and an extra write-up after saving.
- Prior feature branch source review found a `readableApiMessage()` helper in `platform-api.ts` intended to parse backend errors and suppress `[object Object]`, and a logo-upload response check for `hasLogo` and `logoUrl`.
- Still inspect actual backend/storage and response shape if continuing this issue; do not assume it is fixed from frontend-only inspection.

### CRM and profile photo
User requirements for a later premium upgrade:
- CRM should be a genuine customer relationship system, not just a business contacts list.
- Optional customer details (e.g. DOB, marital status with sensible options); do not make every field required.
- Persist to backend/database.
- Clear helper text explaining fields/CRM concepts.
- Search customer details including DOB.
- Customer notes, short notes, responses/feedback.
- Customer photo via live camera or file upload.
- Edit customer; export/print to PDF.
- Check upload/download routes.
- Potential future payment-locking, so UI should look polished/premium.
- Profile photo upload currently fails; pencil/edit button doesn't open.
- Need upload size guidance, working remove button, default 3D avatar after removal; avatar choice can reflect gender if known, otherwise a tasteful fallback/random avatar.
- Inspect existing architecture and routes before implementing. Keep optional fields optional and enforce authentication/business scoping.

### Other QA context
- Previous smoke reported several HTTP 503 profile-resource failures despite an overall smoke “success”. Recheck actual endpoints/logs when investigating profile issues.
- User prefers truthful distinction between mocked smoke checks and live Supabase verification.
- Bright, polished, professional UI with readable text and no overlapping components is valued, but engineering correctness comes first.

## 7. Immediate next work plan

Start with these steps in order:

1. **Re-inspect current repository state**: fetch current `main`, `feature/savings-tracker`, `feature/investment-planner`, PR #69 and PR #70 metadata. Confirm the latest branch head and whether this handover file is the latest commit. Do not assume historical SHAs are current.
2. **Resolve integration strategy for PR #69**: inspect merge bases and changed files for main vs savings branch and savings branch vs investment-planner. Identify exactly which commits/files are savings-only and which are investment-planner dependencies. Avoid bundling unrelated features.
3. **Get valid CI evidence**: explain why the current PR has no checks; choose a safe route to run the existing backend workflow on an appropriate PR/base or create a dedicated integration branch. Do not force-push or rewrite a shared branch. Confirm check runs by exact commit SHA.
4. **Review savings API deeply**: validate all routes and schemas, business scoping, currency handling, minor-unit conversion, calendar-date validation, withdrawal transaction/locking, overdraw protection, totals across all ledger entries, pagination/limits, and error handling.
5. **Review database access model**: inspect migration 0012, schema, server DB client configuration and all browser/direct Supabase references to savings tables. Establish whether RLS without policies is appropriate for this server-only API pattern. Do not make production changes.
6. **Add focused regression tests** where useful, including minor-unit rounding, negative/overdraw scenarios, currency isolation, goal vs unassigned balance separation, and any pure helpers. Do not claim route-level behavior is tested if only helper tests exist.
7. **Run CI and report evidence**: only report tests passed when actual check runs complete successfully on the exact latest SHA. If CI remains unavailable, report what could and could not be tested.
8. After the Savings Tracker is safe and reviewed, return to the user's other priorities (CRM/profile photo, PIN, inventory, receipt/logo) in a controlled order. Ask the user only when a product decision or approval is genuinely necessary.

## 8. Required final report format

After each substantial work session, report:
- What was inspected (with branch/commit SHA).
- What was changed (file paths and commit SHA).
- What verification actually ran and its exact result.
- What remains unverified or blocked.
- Whether changes are feature-branch only, merged, deployed, or production-applied (these are distinct states).
- The next recommended action.

Be precise, transparent, and continue safely without asking the user to repeat the handover details.