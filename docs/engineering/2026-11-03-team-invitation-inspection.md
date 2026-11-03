# Team invitation inspection — 2026-11-03

## Repository review

Reviewed the current `main` implementation:
- UI: `artifacts/kaira-africa/src/pages/app/TeamPage.tsx`
- API: `artifacts/api-server/src/routes/team.ts`
- Repository: `artifacts/api-server/src/repositories/team-members.ts`
- Schema: `lib/db/src/schema/team-members.ts`
- Input type: `lib/api-zod/src/generated/types/teamMemberInput.ts`

## What it currently does

- Team page collects first name, last name, email (required), role/title (required), optional department, and optional phone.
- The UI calls `POST /team` through `useCreateTeamMember`.
- Backend restricts create/update/delete to owner/admin and stores the team-member row scoped to the current business.
- New rows default to `pending`; they do not become an authenticated Kaira user at creation.
- The current POST response returns the stored team-member record. In the inspected route there is no invite-token creation, WhatsApp/email delivery, acceptance endpoint, account-linking flow, or push-notification subscription step.
- The database schema has nullable `userId`, documented as linking when the invitee accepts, but the inspected routes do not implement that acceptance/linking flow.
- `joinedAt` currently has a default timestamp even on a pending row; treat this as a data-model semantics issue to review before using it as the actual acceptance date.

## Result

The current “Send Invite” action creates a pending roster entry; it does not currently deliver an invitation to the person or enable them to join the app. That explains why entering their contact details alone does not reach a non-user.

## Recommended implementation sequence

1. Confirm product decisions: invited role is a business title or actual permission role; required verification channel; invite expiry; who can invite; and whether phone or email is primary.
2. Design invitation records separately from team roster membership (opaque random token, hash at rest, expiry, used/revoked state, inviter, target contact, business, and role).
3. Add authenticated create/resend/revoke endpoints and public token-preview/accept endpoints with rate limiting, one-time use, tenant scoping, and audit events.
4. Make acceptance require identity verification and explicit consent; attach the existing pending member to the verified account transactionally. Do not grant dashboard access based only on possession of a URL.
5. Add delivery adapter. WhatsApp auto-send requires WhatsApp Business Platform credentials, approved templates as applicable, verified sender, and consent. Until configured, offer manual WhatsApp share with a prefilled message. Avoid collecting a “sender WhatsApp number” per invite; use the configured business sender or the inviter's own app via manual share.
6. Add tests for expired/reused/revoked tokens, cross-business access, duplicate invites, wrong identity, permissions, and accepted-member linking.
7. Separately wire team activity/assignments to in-app notification records and PWA push subscriptions. WhatsApp notifications should be opt-in and independently configured.

## Not done

No team-invite code, schema, migration, messaging integration, or production setting was changed. This is a repository inspection and implementation plan only. Mobile viewport QA for PR #170 remains unperformed; PR #170 remains unmerged pending actual viewport verification.
