# Hosted runtime authentication hardening — 2026-11-16

## Finding

Render's API startup log reported `env: development`. The application derives its development/production behavior from `NODE_ENV`, which defaults to `development` when unset. In that state, the OTP and admin password-reset routes could include development-only OTP/reset tokens in their API responses. The mock SMS provider could also log OTP message content. This is a potential production credential-exposure path; there is no evidence in this audit that it was exploited.

## Changes on branch `security/hosted-runtime-auth-guards`

- Treat Render-hosted services as production-like for authentication and delivery safeguards even if `NODE_ENV` was accidentally left unset.
- Never expose development OTP or password-reset tokens from a hosted runtime.
- Keep the admin password-reset response indistinguishable when email delivery fails: consume the unsent reset token and record the failure server-side rather than returning a different HTTP status.
- Refuse to log mock SMS OTP content in a hosted runtime; OTP requests fail closed until a real SMS provider is configured.
- Fail outbound email requests explicitly when SMTP is unavailable, without crashing the API process at startup.
- Log only presence booleans for required secrets and delivery configuration; never log secret values, OTPs, reset tokens, or email links.
- Require `OTP_SECRET` for OTP hashing in hosted/production runtime.
- Add unit coverage for Render runtime detection.

## Configuration follow-up

The current Render log also reports `NODE_ENV=development`. After verifying required secrets exist, set `NODE_ENV=production` in the Render API service. The production environment schema requires `SESSION_SECRET`, `OTP_SECRET`, `PASSWORD_RESET_SECRET`, `REDIS_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `ADMIN_SEED_EMAIL`, and `ADMIN_SEED_PASSWORD`. Do not switch the setting before those values are present; otherwise startup validation will stop the service.

## Verification boundary

CI tests use disposable databases and fake/example addresses. They do not send real SMS or email. After deployment, verify the new startup log booleans, configure a real SMS provider and SMTP credentials, and run controlled test deliveries to approved test accounts. No production data or environment variables were changed by this branch.
