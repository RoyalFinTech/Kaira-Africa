# Kaira Africa — Print, Storage and Returning-User Login Handover

**Last updated:** 2026-10-16  
**Repository:** https://github.com/RoyalFinTech/Kaira-Africa  
**Work branch:** `fix/profile-storage-and-pin-signin`  
**Purpose:** Resume the open print/storage/login QA work without relying on prior chat context.

## Live services

- Frontend: https://kaira-africa-frontend.onrender.com/
- API: https://kaira-africa-api.onrender.com/
- Receipt & Print Branding page: https://kaira-africa-frontend.onrender.com/receipt-branding
- Supabase project ref: `gofoibbvxnhqzqwrpcbx` (Kaira Africa)
- Render workspace: `tea-d9usq87lk1mc73eia2f0`
- Render frontend service: `srv-db257gjbc2fs73f9nsj0`
- Render API service: `srv-da6fnem7bikc738ekde0`

**Do not put live passwords, OTPs, PINs, access tokens or Supabase/Render secrets in this document or source control.**

## Already merged and deployed before this handover

### Receipt/printing feature — PR #35

The app contains a dedicated Receipt & Print Branding page (`/receipt-branding`) for setting a printed company name, logo, business contact details, custom footer, and reference/customer-detail visibility. The same branding component is used by transaction receipts/records, CRM directory/customer cards and Daily Ledger printouts. Logo storage is private. This customization is currently free during early access; there is no paywall.

### Print QA and full-period ledger — PR #45

- PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/45
- Merge commit: `9cb01c0d7f485669810ae71422a8c41db2a4b474`
- Footer attribution: **Prepared by Kaira Africa**
- Shared print logic waits for branding and image decode before invoking the browser print dialog.
- The on-screen sample can pass its current unsaved form branding into the printable sample so the sample and paper/PDF output match.
- Daily Ledger printing fetches all pages in the selected date range instead of silently printing only the currently visible page.
- Smoke test coverage inspects print-media CSS and expected logo/reference/footer content for the sample, transaction, CRM and ledger documents, and checks a 101-row ledger fixture.
- At the last Render check, the frontend and API deploys for this merge were marked `live`. Prior pre-PR-45 release smoke/backend runs passed; check Actions for the post-PR-45 runs before citing the latest status.

## What was discovered in the current QA

### Supabase Storage audit (read-only)

At the time of the read-only SQL inspection:

- The private `profile-avatars` bucket existed with a 2 MiB limit and JPEG/PNG/WebP allow-list.
- The private `receipt-logos` bucket existed with a 2 MiB limit and JPEG/PNG/WebP allow-list.
- The private `customer-photos` and `transaction-attachments` buckets were also present.
- Storage object count was **0** across the inspected buckets, including `profile-avatars`, `receipt-logos` and `customer-photos`.
- There were **0** users with a saved avatar path, and **0** business receipt settings with a saved `logoPath`.

Therefore, **the latest profile image and receipt logo that the user reported trying had not been persisted in this Supabase project at the audit time**. The buckets exist, but do not claim the user’s current logo/photo is saved until a new upload is confirmed by the API and a subsequent read-only query shows the object/path.

### Profile photo storage bug

The profile avatar routes in `artifacts/api-server/src/routes/auth.ts` were checking only `SUPABASE_SERVICE_ROLE_KEY`, even though the rest of Kaira Africa already has shared support for either the modern server-only `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`. This causes a false “storage not configured” failure when only the modern secret key is set. The profile avatar routes also did not use `supabaseStorageHeaders()`, which knows that modern `sb_secret_` keys must be sent in the `apikey` header only (not as `Authorization: Bearer`).

### Returning-user PIN login bug

- The API sends nested errors in the shape `{ error: { code, message } }`.
- The shared API parser did not consistently surface nested messages; users could see a generic HTTP error.
- `PhoneAuthPage` tried to detect returning-user PIN login from the error text. It needs the stable `pin_login_required` response code/status and must redirect to `/login/pin`, not leave the user on the OTP flow.
- The PIN screen required clicking Continue after the sixth digit and asked for the phone again, even when the phone was saved from registration/OTP on the current device.

## Current branch work (not yet presumed live)

Branch: `fix/profile-storage-and-pin-signin`

The branch has been updated to:

1. Reuse the shared Supabase Storage config/header helpers in the profile avatar upload, signing and removal routes.
2. Validate base64 data and make profile-photo storage errors more actionable without exposing secrets.
3. Return a stable HTTP 409 `pin_login_required` response when the backend identifies an existing user with PIN sign-in enabled.
4. Safely parse nested API error payloads in `lib/api-client-react/src/custom-fetch.ts` and in `artifacts/kaira-africa/src/lib/api-client.ts`, avoiding `[object Object]` output.
5. Route returning users to the PIN page, keep their phone number on-device, avoid a redundant phone prompt, and automatically submit when the sixth PIN digit is entered.
6. Suppress the app-wide error card for the expected `pin_login_required` redirect.
7. Show branded Kaira success feedback after profile photo save/removal and branded validation feedback for rejected/oversize images.
8. Extend the browser smoke test to intercept a PIN-required response, verify automatic login after the sixth digit, and verify the profile image renders in the Header after upload.

All browser smoke writes in this workflow are intercepted fixture responses; they must not create production test users or production transactions.

**Before describing these branch changes as completed in production:** open the PR, wait for Backend CI and the production image build to pass, merge, verify both Render deployments reach `live` on the merge commit, and inspect the post-merge Live Kaira Branding Smoke Test. If a test fails, fix the cause on a branch and rerun CI.

## User-requested work still pending

1. The user will attach a screenshot showing the error-card appearance they dislike. Use that screenshot as the design reference and redesign the reusable `artifacts/kaira-africa/src/components/common/KairaFeedbackCard.tsx` and the `KairaFeedbackHost` in `artifacts/kaira-africa/src/App.tsx`. Keep a clear success checkmark, actionable failure icon, Kaira Africa logo/branding, readable hierarchy, mobile responsiveness, accessible announce/dismiss behavior and no raw object serialization. **Do not guess the desired new design before viewing their screenshot.**
2. Verify that a newly uploaded receipt logo really creates an object in the private `receipt-logos` bucket and persists `businesses.receipt_settings.logoPath`. Then verify a new authenticated response returns `hasLogo: true` and a usable signed `logoUrl`.
3. After a profile-photo upload in the user’s real account, verify a private `profile-avatars` object exists, the user row has a storage path, `GET /auth/me` returns a valid signed avatar URL, and the same image appears in the Profile card and top Header.
4. Test returning-user PIN routing, new-user OTP verification and incomplete-registration/recovery paths separately. Six-digit PIN entry should log in automatically after digit six. A returning account with a PIN should skip OTP; accounts without a PIN should retain a secure verification/recovery path.
5. Inspect actual live API/storage logs if uploads still fail after deployment. Never request or log user PINs/OTPs; never expose the server storage key in frontend code or docs.

## Suggested prompt for the next ChatGPT chat

> Continue the Kaira Africa work from https://github.com/RoyalFinTech/Kaira-Africa. Read `docs/handoffs/2026-10-16-kaira-auth-storage-print-handoff.md` first and check the latest branch, PRs, GitHub Actions, Render deployments, and Supabase state before changing anything.
>
> I will upload a screenshot of the error/success card design I dislike. Redesign `KairaFeedbackCard.tsx` and its global host to match the screenshot and Kaira Africa branding. Also finish and verify the current branch work for profile-picture Supabase storage, showing the profile image in the header, nested API error messages, and the returning-user flow: an existing PIN-enabled number should bypass OTP and go directly to PIN, the remembered phone should be prefilled and not require re-entry, and entering digit six should automatically authenticate without clicking Continue.
>
> Confirm backend storage writes and saved path with read-only Supabase queries after a user-triggered/authorized upload; do not create or modify production users just to test. Run typechecks, frontend build, automated tests, migrations/health checks, browser smoke with intercepted fixtures, merge only when checks pass, then confirm frontend/API Render deploys and post-merge smoke. Record work, test results, remaining gaps and deployed commit in this handover file before finishing. Do not redesign the error card until you have inspected my screenshot.

## Useful references

- Previous print/branding release: https://github.com/RoyalFinTech/Kaira-Africa/pull/45
- Receipt branding implementation: `artifacts/kaira-africa/src/pages/app/ReceiptBrandingPage.tsx`
- Shared print component: `artifacts/kaira-africa/src/components/common/PrintableBusinessDocument.tsx`
- Shared feedback component: `artifacts/kaira-africa/src/components/common/KairaFeedbackCard.tsx`
- Global feedback/error handling: `artifacts/kaira-africa/src/App.tsx`
- Profile UI and avatar refresh: `artifacts/kaira-africa/src/pages/app/ProfilePage.tsx`
- Profile Storage and authentication endpoints: `artifacts/api-server/src/routes/auth.ts`
- Shared Supabase key configuration: `artifacts/api-server/src/lib/supabase-storage.ts` and `artifacts/api-server/src/lib/supabase-storage-headers.ts`
- Phone/PIN routes: `artifacts/kaira-africa/src/pages/auth/PhoneAuthPage.tsx`, `artifacts/kaira-africa/src/pages/auth/PinLoginPage.tsx`, `artifacts/kaira-africa/src/pages/auth/OTPPage.tsx`
- Browser smoke: `artifacts/kaira-africa/scripts/smoke-live-branding.mjs`
