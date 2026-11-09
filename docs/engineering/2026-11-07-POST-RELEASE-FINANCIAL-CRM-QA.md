# Kaira Africa — post-release financial and CRM QA

Date: 7 November 2026  
Release under verification: `00938a997371efe77e40dae296266c8fda4e17c9`  
Follow-up branch: `qa/savings-investment-crm-followup`

## Release #196 production verification

- PR #196 was squash-merged to `main` as `00938a997371efe77e40dae296266c8fda4e17c9`.
- Render frontend service `srv-db257gjbc2fs73f9nsj0`: deployment `dep-dbnf0vnavr4c73ad1iq0` completed with status `live`.
- Render API service `srv-da6fnem7bikc738ekde0`: deployment `dep-dbnf0vnavr4c73ad1idg` completed with status `live`.
- Both Render events report successful build and deploy for the exact release SHA.
- Public HTTP verification of the frontend, API health endpoint, manifest, icon and social-card asset could not be completed from the engineering execution environment because outbound DNS resolution for `onrender.com` failed. This is an environment limitation, not a confirmed application failure. WhatsApp/Facebook/LinkedIn crawler preview and physical-device tests remain user/device acceptance items.
- No production database writes, migrations, or Render configuration changes were made for this release.

## CRM source review — correction to prior summary

The previous summary described CRM as a basic customer form. That description was incomplete and is corrected here. The current CRM implementation already includes:
- customer directory search across core fields and serialized profile data (including date of birth and optional marital status);
- customer create/edit with optional identity, contact, address, preferences, tags and notes fields;
- customer photo upload and camera capture, private Storage object paths and signed preview URLs;
- customer photo replacement/removal cleanup safeguards;
- CRM interaction notes, calls, meetings, emails and follow-ups with completion tracking;
- directory print/export paths.

Existing automated coverage includes CRM photo validation and storage-path/signing safeguards (`artifacts/api-server/test/crm-photo.test.ts`). Remaining acceptance is real-account end-to-end verification of customer create/edit/search, date-of-birth search, photo capture/upload/replace/remove, interaction permissions and print/export on mobile and desktop. CRM data is business-scoped in API queries and customer-photo paths are checked against the exact business/customer prefix.

## Savings review and follow-up fixes

Backend source review confirms:
- GMD, NGN and USD are stored as minor units and converted for API responses.
- withdrawal pools are isolated by goal or unassigned currency; a goal cannot spend unassigned funds or another goal's funds.
- withdrawals are serialized with a PostgreSQL advisory transaction lock to prevent concurrent overspending of the same pool.
- totals are calculated over the complete ledger even though the activity endpoint returns only the latest 500 entries.
- date, amount, currency, destination, provider and note inputs are validated server-side.

Follow-up branch changes:
- Paused savings goals can now be resumed from the goal card; status update failures are surfaced instead of becoming unhandled rejected click handlers.
- Savings overview loading and fetch failures now have explicit loading/error/retry UI. This avoids an API failure being mistaken for an empty savings account.
- The activity caption now clearly discloses that the latest 500 entries are shown/exported while totals use the full ledger.

Existing automated savings coverage includes minor-unit balance calculation, overspend rejection, invalid ledger entries and safe-integer boundaries (`artifacts/api-server/test/savings-ledger.test.ts`). Remaining acceptance: create/pause/resume goals, deposit/withdrawal boundaries, goal/unassigned/currency isolation, full-ledger totals vs 500-row activity display, CSV and print/PDF on a real business account. Do not use production test transactions; use an authorized controlled test account only if available.

## Investment planner review and follow-up fixes

Backend source review confirms:
- GMD, NGN and USD are represented in minor units.
- plans are business-scoped; `Other` requires a custom category.
- expected revenue must cover planned capital plus additional costs; expected profit cannot exceed the planned margin.
- daily entries require an active plan, non-negative values, valid non-future dates, and are business/plan scoped.
- the plan overview aggregates actual sales and expenses across all daily records.

Follow-up branch changes:
- Investment plan and daily-record fetch failures now display explicit retry states instead of looking like empty plans or empty history.
- The daily-history caption discloses that the latest 200 records are shown/exported while plan summary totals aggregate all recorded days.

Existing automated investment coverage includes planned-cost/profit boundaries and invalid/unsafe monetary values (`artifacts/api-server/test/investment-plan-validation.test.ts`). Remaining acceptance: plan creation for each currency/model/category, Other/custom category validation, daily sales/expense records, status transitions, 200-row display/export limit, and print/PDF on a controlled account.

## Scope and release controls

- This follow-up remains on `qa/savings-investment-crm-followup`; do not merge until exact-head CI passes and review is complete.
- No schema changes or migrations are proposed by the current follow-up.
- No production test records have been created.
- Mobile acceptance must include narrow viewports, Android keyboard/number input, date pickers, camera permission, photo upload progress/errors, and print/save-to-PDF behavior.
- Social preview acceptance still requires opening the deployed app link in WhatsApp and confirming the Kaira-branded image appears. If the preview is stale or absent, use WhatsApp's link preview refresh/cache behavior only after confirming the deployed image URL is reachable and returns `image/png`.
