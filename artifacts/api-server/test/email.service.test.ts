import assert from "node:assert/strict";
import { test } from "node:test";
import {
  escapeHtml,
  isEmailDeliveryConfigured,
  sendTeamInvitationEmail,
  verifyEmailTransport,
} from "../src/services/email.service";

test("email HTML values escape markup, quotes and ampersands", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("team invitation email reports unavailable delivery without SMTP and keeps manual sharing available", {
  skip: isEmailDeliveryConfigured(),
}, async () => {
  const sent = await sendTeamInvitationEmail({
    to: "ci-recipient@example.test",
    firstName: "CI",
    jobTitle: "Operations assistant",
    accessRole: "staff",
    businessName: "CI Test Business",
    inviterName: "CI Owner",
    inviteUrl: "https://kaira-africa-frontend.onrender.com/invite?token=ci-only-token",
    expiresInDays: 7,
  });
  assert.equal(sent, false);
  assert.equal(await verifyEmailTransport(), false);
});
