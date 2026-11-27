# Scheduled meeting reminder delivery — 27 November 2026

## Problem
Meeting creation and edits already add immediate in-app notifications for selected active Kaira team members. They do not provide a reminder shortly before the meeting begins.

## Implementation on `feat/scheduled-meeting-reminders-20261127`
- Add a 60-second API scheduler for scheduled meetings starting within the next 15 minutes.
- Notify selected, active team members other than the meeting creator. Re-check team membership at delivery time; inactive members and non-members are excluded.
- Ignore cancelled meetings and meetings without a start time or selected app users.
- Include the approximate time remaining and meeting time formatted in the meeting's IANA timezone.
- Persist a reminder-delivery key for `(meeting, recipient, exact scheduled start)`. Repeated scheduler runs are idempotent, and rescheduling generates a new key for the new start time.
- Insert the delivery key and in-app notification in the same transaction. A PostgreSQL advisory lock protects concurrent worker runs.

## Tests
`artifacts/api-server/test/work-meeting-reminders-db.test.ts` is gated by `KAIRA_DB_INTEGRATION_TESTS=true` and targets the disposable PostgreSQL database in Backend CI. It covers the 15-minute window, duplicate suppression, rescheduling, cancelled meetings, and recipient membership/creator exclusions.

## Boundaries
This implementation delivers in-app reminders only. It does not send SMS, email, web-push or external calendar alerts, and does not implement the separate urgent dashboard popup/admin broadcast requirements. No real meeting is created or changed by CI. No production migration, data mutation, secrets change, Render configuration update, merge or deployment is included.

## Release status
Branch implementation complete; exact-head typechecks, tests, fresh migration validation, Docker build and review are pending. After an approved release, verify one controlled meeting reminder through the live notification UI on desktop and mobile without adding synthetic production records.
