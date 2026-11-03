# Engineering handover — 2026-11-03

## Mobile dashboard/calculator layout — PR #170

- PR: https://github.com/RoyalFinTech/Kaira-Africa/pull/170
- Branch: `fix/mobile-margin-markup-overlap`
- Reviewed head: `d537096a0a5e0df5b1fd0ee01ffef4f4fa12d5dd`
- PR remains open, draft, unmerged; no production deployment was performed.
- Changes under review address narrow-screen calculator wrapping and dashboard quick-action wrapping.

### Verification completed

- Work Management Build Checks run `41604770860`: completed successfully.
- Backend CI run `41604770726`: completed successfully.

These results confirm configured automated jobs passed, not that the actual phone viewport is visually correct.

### Verification still required

- Run the app in a real mobile browser/device at narrow widths.
- Test long/large numeric values and inspect calculator results, footer text, and action button bounds.
- Exercise dashboard quick actions at the same widths.
- Capture screenshots or reproducible browser-test evidence and update the PR.
- Keep the PR unmerged and production unchanged until viewport checks pass.

## Team invitation / notifications — architecture review, not implemented

A WhatsApp invite is feasible, but automatic sending requires an authorized WhatsApp Business Platform integration. A personal number entered in a profile cannot itself be used as the sender by a web app. Use a verified business sender configured in the backend, or offer a manual “share on WhatsApp” fallback.

Recommended flow:
1. An authorized organization admin creates an invite with invitee name, normalized WhatsApp-capable phone, optional email, organization/team, role, inviter, and expiry.
2. Backend stores a pending invite and generates a random, single-use, expiring token. Store only a token hash; never put personal details or permissions in the URL.
3. Send a branded message through the configured provider with an app link containing only the opaque token and display names. Without provider integration, let the inviter share a prefilled message manually; do not claim it was automatically sent.
4. On open/install, validate the token server-side and show inviter, organization, role, and expiry. Require explicit acceptance and authentication/verification of the invited phone or email before creating membership.
5. Keep onboarding short and allow remaining profile details to be completed later. Do not bypass authentication or send an unauthenticated invitee to a private dashboard. Support decline, expiry, revocation, resend, and existing accounts.
6. Deliver team tasks, schedules, meeting notices, and announcements through in-app notifications/push when enabled. WhatsApp notifications are a separate opt-in integration using approved templates and consent.

### Decisions and implementation checks still open

- Inspect the existing invite form, API, schema, roles, and membership flow first.
- Decide who may invite and which roles they may assign.
- Confirm provider, verified sender, template approval, credentials, consent, and delivery/error handling.
- Decide whether invite acceptance verifies phone, email, or either; possession of the URL alone is insufficient.
- Check app install/deep-link behavior and the existing authentication/PIN flow.
- Add rate limits, duplicate handling, audit events, token hashing, expiry/revocation, and tests.

## Current stopping point

Automated CI is green, but visual mobile smoke testing has not been performed and PR #170 is intentionally unmerged. Team invitation is an architecture recommendation only; no code, schema, WhatsApp provider, or production behavior has changed. Next: inspect the existing team invitation implementation and determine a safe minimal change, while obtaining real mobile viewport evidence for PR #170.
