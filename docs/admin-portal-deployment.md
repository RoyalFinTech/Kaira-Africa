# Kaira Africa deployment notes

## Twilio SMS (no credentials committed)

The API has a Twilio provider. In Render API environment settings, set `SMS_PROVIDER=twilio`. Set `SMS_API_KEY` to the Twilio Account SID, a colon, then the Auth Token (the current adapter expects this combined format). Set `SMS_SENDER_ID` to the Twilio sender phone number in E.164 format. These values must be obtained from your Twilio account and stored only in Render secrets.

## SMTP email

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in Render using the values from your email provider. Do not commit real values or share them in chat.

## Production readiness

Keep `NODE_ENV=development` until production requirements are set and checked. Production additionally requires `JWT_SECRET` (32+ characters), `SESSION_SECRET` (32+), `OTP_SECRET` (16+), `PASSWORD_RESET_SECRET` (16+), `REDIS_URL`, `ADMIN_SEED_EMAIL`, and `ADMIN_SEED_PASSWORD` (10+), as enforced by the API configuration. Configure `WEB_BASE_URL` and `FRONTEND_URL` to the intended frontend origins. The admin bootstrap script uses the seed email/password; rotate the password after first login.

## Separate admin site

Admin pages currently live in the frontend at `/admin` and `/admin/dashboard`. A second Render static-site service can use the same repository/build/publish settings to give the admin entry point its own URL while sharing the API. A separate URL is not a security boundary; backend admin authorization remains mandatory.

## Push notifications

True background browser push requires a service worker, subscription storage, VAPID key pair, permission UI, and a server-side push sender. Supabase Edge Functions can be the sender and store VAPID secrets server-side. The existing in-app notification list does not prove background push is configured. No push credentials are generated or committed here.