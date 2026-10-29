# Kaira Africa — Engineering QA Audit
**Audit date:** 2026-10-24  
**Repository:** https://github.com/RoyalFinTech/Kaira-Africa  
**Scope:** source-level review of frontend, backend, API contracts, database/deployment configuration, and available production evidence.

## Executive summary
This is a source-level audit, not a claim that every workflow was browser-tested. The repository has a React/Vite frontend, Express API, Drizzle/PostgreSQL data layer, generated API schemas/client, and GitHub Actions CI. The user's latest manual confirmation says profile-photo upload works after the Render environment configuration was updated. Supabase and Render checks in this session also showed the profile avatar bucket exists and is private, a stored object exists, and the API readiness endpoint returned HTTP 200.

## Verified evidence
- Latest observed GitHub main commit at audit start: `b2f478e78ee9947cdf9e5da31c6cccd27c53d1ce` (mobile banner logo image-load smoke-test stabilization).
- Profile photo upload was manually confirmed working by the product owner in chat on 2026-10-24.
- Supabase `profile-avatars` bucket was observed as private, with JPEG/PNG/WebP accepted and a 2 MiB limit.
- One object was observed in `storage.objects` for `profile-avatars`; object content was not downloaded or inspected.
- Render API `/ready` had returned HTTP 200 in the observed log window.
- Source includes business-user and admin sessions as separate server-side session flows, bearer token hashing, business-scoped customer routes, and role-check middleware.
- CI workflow `.github/workflows/backend.yml` typechecks shared libraries, backend and frontend; builds the frontend and backend; runs backend smoke tests; checks migrations on a fresh PostgreSQL instance; boots the API and checks health; and builds the Docker image.

## Findings and follow-up actions

### QA-01 — Frontend automated interaction coverage is limited
**Severity:** Medium  
**Evidence:** CI workflow runs frontend TypeScript checking and production build, but does not run a dedicated frontend component/browser interaction test suite. A successful build cannot prove mobile navigation, dialogs, upload controls, or form persistence work.  
**Recommendation:** Add a repeatable browser smoke suite (Playwright or equivalent) for public entry, login/OTP/PIN routing, dashboard navigation, profile photo upload/remove, CRM CRUD, receipt branding, inventory, and daily ledger. Use mocked fixtures for CI and a separate explicitly authorized live smoke process for production. Never use production customer data as fixtures.

### QA-02 — Production verification is documented but must be executed and recorded
**Severity:** Medium  
**Evidence:** README documents `dist/scripts/verify-production.mjs` as a safe post-deploy verification command. This audit did not execute that script in the production environment.  
**Recommendation:** Run it from an authorized environment with Render's actual secrets available; record redacted results only. Do not print credentials or OTPs.

### QA-03 — CRM API contract needs end-to-end regression tests
**Severity:** Medium  
**Evidence:** `artifacts/api-server/src/routes/customers.ts` validates list/create/get/update routes, requires an authenticated user, scopes operations to the current business, and serializes the base customer model. The frontend API client also declares managed CRM endpoints under `/api/crm/customers` with optional profile data and photo operations. This audit did not fully verify all route implementations or execute authenticated CRUD against production.  
**Recommendation:** Test create/update/search/detail/photo upload/photo removal and notes/follow-ups with an isolated test business. Confirm customer A cannot read or mutate customer B across business boundaries. Do not create test customers in production without explicit approval.

### QA-04 — Keep API contracts generated from OpenAPI
**Severity:** Low  
**Evidence:** README identifies `lib/api-spec/openapi.yaml` as the source of truth and generated Zod schemas/client as derived artifacts.  
**Recommendation:** Any API change must update the OpenAPI source and regenerate the related packages; do not hand-edit generated files.

### QA-05 — Storage and upload safety regression coverage
**Severity:** Medium  
**Evidence:** The owner manually confirmed profile photo upload now works. The observed avatar bucket is private and size-limited. This audit did not test malformed data URLs, oversized uploads, MIME spoofing, signed-link expiry, object cleanup on failed database writes, or cross-account object access.  
**Recommendation:** Add negative tests for unsupported/oversized files, malformed payloads, signed URL generation failures, deletion, replacement, and unauthorized access. Keep buckets private; use signed URLs or authorized server-mediated reads.

### QA-06 — Production health checks have different meanings
**Severity:** Low  
**Evidence:** `artifacts/api-server/src/routes/health.ts` defines `/live` as process liveness, `/ready` as database readiness (Redis failure is explicitly allowed to degrade to in-process rate limiting), and `/health` as a combined status.  
**Recommendation:** Keep Render's health check on `/ready`; monitor Redis degradation separately because multi-instance rate limiting is weaker when Redis is unavailable.

## Manual regression matrix
The following must be run before describing the whole product as fully QA-passed:
- Authentication: OTP request/verify, new-user onboarding, returning-user PIN login, PIN change requiring current PIN, SMS recovery when PIN is not set, logout and session revocation.
- Authorization: user/admin token separation, role permissions, business data isolation, unauthenticated and cross-business denial.
- Profile: photo upload, replacement, remove/default avatar, signed URL refresh, persistence after reload and re-login.
- Customers/CRM: create/edit/search/filter, optional fields, notes and follow-ups, photo operations, export/print, validation and empty states.
- Transactions/receipts: CRUD/status changes, receipt logo upload/remove, branding persistence, printed output.
- Inventory: product CRUD, image upload with configured size/type limits, stock adjustments, low-stock thresholds, GMD/NGN/USD separation.
- Daily ledger: create/edit/status, date filters, summary totals, mobile table navigation, CSV export.
- Reliability/security: API 4xx/5xx feedback, loading/error/empty states, retry behavior, rate limits, expired sessions, secrets absent from frontend bundles/logs.
- Accessibility/responsive: keyboard navigation, labels/focus, 320–390px mobile widths, no overlapping or clipped controls.

## Scope limitations
- No source code was changed by this audit.
- No production database rows were modified.
- No live CRM records or test accounts were created.
- No complete authenticated browser E2E run was executed.
- No CI run was triggered by this documentation commit.
- No new application deployment was triggered by this audit.
- This report deliberately distinguishes source review, observed service state, and owner-reported manual behavior; unexecuted tests are not marked passed.

## Engineering next steps
1. Add browser-level smoke tests to CI.
2. Run backend typecheck, frontend typecheck/build, backend tests, migration validation, and Docker build on the current branch.
3. Add/extend isolated CRM and storage security tests.
4. Execute the safe production verification script and record redacted output.
5. Run authorized live smoke tests for key workflows, then document actual results and commit fixes individually.
