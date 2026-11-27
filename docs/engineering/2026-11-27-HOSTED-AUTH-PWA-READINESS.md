# Hosted authentication and PWA readiness — 2026-11-27

## Baseline
- Source baseline: `8185d64b0cfbcb2547846d3ab8907880d1217d4c`.
- Production Render frontend and API deployments were both live on that exact commit.
- Render API startup logs through 2026-11-26 repeatedly reported `env: development`.
- No production API endpoint was invoked for OTP/password-reset testing; no exploitation is confirmed.

## Hosted authentication changes in this branch
- Treat Render-hosted processes as production-like for OTP, reset-token and delivery guards, even when `NODE_ENV` is development.
- Require `OTP_SECRET` when hashing OTPs on hosted/production runtimes.
- Prevent the mock SMS provider from simulating successful delivery on hosted/production runtimes; retain existing OTP-content log redaction.
- Keep the API online when SMTP is missing, but make outbound email fail explicitly at send time.
- Consume unsent password-reset tokens and keep the reset response anti-enumerating after a delivery failure.
- Log configuration-presence booleans and provider mode only; never log secret values or message tokens.

## PWA changes in this branch
- Add the existing official `/kaira-logo.png` (1254×1254 PNG) to the install manifest as a general-purpose icon.
- Extend the local PWA build verifier to validate its type, declared dimensions, PNG signature and actual dimensions.
- Precache the official logo in the service worker and bump the shell cache from v5 to v6.

## Rollout blockers — do not merge/deploy until resolved
- Verify `SMS_PROVIDER`, `SMS_API_KEY` and `SMS_SENDER_ID` are configured for the selected Twilio provider in Render. Do not print or expose secret values.
- Verify SMTP host, port, user, password and sender configuration. Provider delivery must be tested only with approved test destinations.
- Verify required auth secrets are present before setting `NODE_ENV=production`; do not change Render environment variables as part of this PR.
- A hosted mock-SMS configuration will fail closed after this change by design. OTP login recovery therefore requires the real SMS provider before release.
- Run exact-head Backend CI, Work Management checks, frontend PWA asset verification, and a post-deploy browser branding smoke test after an approved release.

## Safety boundary
- No production environment variables, database schema, production records, or user accounts were changed.
- This branch does not perform a migration or send real email/SMS.
- Physical Android/iOS installation and WhatsApp/social crawler previews remain unverified until explicitly tested.
