# Kaira Africa — team invitation acceptance implementation

Date: 2026-11-03

## Scope

This change replaces the old pending-roster-row-only behavior with a real invitation lifecycle. It keeps the existing Kaira phone OTP/PIN authentication system and requires the invited person to sign in with the Gambian number recorded on the invitation.

## User flow

1. An owner or admin creates an invitation with invitee name, optional email, required Gambian phone, job title, department, and Kaira access level.
2. The API creates or reuses a pending roster row and a separate invitation record. The raw token is returned only to the inviter for manual sharing and sent by email when an email address and SMTP configuration are available. Only a SHA-256 hash of the high-entropy token is stored.
3. The inviter can copy the secure link or open a prefilled WhatsApp share action. This project does not currently have an authorized WhatsApp Business sender configured; the UI must not claim automatic WhatsApp delivery.
4. The public invitation page shows the business, job title, access role, masked phone, and expiry. Acceptance requires the invitee to authenticate using the same Gambian phone number.
5. Acceptance locks and validates the invitation, user, business, and pending member in one database transaction. It assigns the invited manager/staff role, links the account to the business, activates the roster row, records acceptance, and notifies the inviter.
6. Resend rotates the token and invalidates the prior link. Revocation disables a pending or expired invitation. Links expire after seven days.

## Authorization decisions

- Job title is the existing free-text team_members.role field.
- The actual permission level is a distinct team_members.access_role field and team_invitations.access_role.
- Invitation assignment allows only manager and staff; owner/admin cannot be granted through an invitation.
- A Kaira account already associated with another business, or already associated with the invited business, cannot accept a second membership.
- Removing an accepted member clears their business association and revokes their existing user sessions.

## Database migration

Migration 0023_team_invitation_acceptance.sql adds the access role, corrects existing pending joined_at values to NULL, enforces one roster membership per business/user, and creates the invitation table. Follow-up migration 0024_team_member_joined_at_no_default.sql removes the database default from joined_at so future pending roster-only inserts do not receive a false join date. The invitation table has RLS enabled and no direct Data API privileges for PUBLIC/anon/authenticated; all mutations use the trusted Kaira API server-side database connection.

## Follow-up usability and lifecycle fixes

- The invitation page uses the existing KairaLogo component and the official `kaira-logo.png` brand asset in its header.
- Because the frontend is a Render Static Site, invitation URLs use `/invite?token=<opaque-token>` and the build generates static entry pages for `/invite` and `/invite/accept`.
- When an invitation is pending, the remembered-user login shortcut is bypassed so the invitee can enter the exact invited Gambian number. If that number has PIN login enabled, the PIN page prefers the current sign-in session's pending phone over an older phone remembered on the device.
- Expired invitations mark their unjoined roster entries inactive while retaining invitation history. Resending rotates the token and restores the roster row to pending.

## Production verification recorded

- PR #171 passed workspace build, API/frontend typechecks, API tests, fresh PostgreSQL migration validation, health smoke, and production Docker image build before merge.
- Render frontend and API deployed merge commit `581e80c98b1134fbfec7e04782d040fc8cc63361` successfully. The API logged successful migration application and returned HTTP 200 from `/ready`.
- Supabase verification confirmed migration 0023, invitation table columns, RLS enabled, no anon/authenticated table privileges, token/phone uniqueness indexes, and no duplicate existing team memberships or pending phones.
- The frontend build generated 34 SPA route entry files, including the invitation routes.

## Remaining controlled acceptance tests

- Use a dedicated test business/member and a phone number whose owner has consented. Test new-user OTP, returning-user PIN, correct and incorrect invited phone, expiration, revocation, resend token rotation, one-time acceptance, and cross-business rejection.
- Verify actual SMS delivery with the configured provider and SMTP delivery when an email address is provided. Automatic WhatsApp Business sending remains unconfigured; the shipped WhatsApp action is manual sharing.
- Visually verify the branded invitation page and acceptance flow on physical mobile and desktop browsers after PR #172 deploys. Automated builds do not replace this device-level check.
## Delivery

- Email: existing Nodemailer service, using Render SMTP configuration. If SMTP is unavailable in a non-production environment, the API reports not_configured and does not write one-time links to logs.
- WhatsApp: manual share via the inviter's WhatsApp app. Automatic sending requires a verified WhatsApp Business sender and credentials, which are not currently present in the repository configuration.
- OTP delivery: uses the existing SMS provider abstraction. Production OTP delivery still depends on valid configured SMS provider credentials.

## Verification still required before production

- GitHub Actions workspace typecheck/build/API tests/fresh migration validation/Docker build must pass on the feature branch.
- Render deployment after merge must report Live for the expected commit.
- Supabase migration ledger must include migration 0023; verify the new table, enum, indexes, RLS and grants.
- Test invitations end-to-end with controlled test accounts: correct phone, wrong phone, expired, revoked, reused token, existing business membership, and resend token rotation.
- Confirm SMTP and SMS provider delivery using controlled recipient/test accounts. Do not create test invitations against live customers or the production pending member.
- Verify the invitation page and login continuation in actual mobile and desktop browsers.
