import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTeamInvitationToken,
  hashTeamInvitationToken,
  isAssignableTeamInvitationRole,
  maskInvitationPhone,
  teamInvitationExpiresAt,
  TEAM_INVITATION_TTL_MS,
} from "../src/lib/team-invitations";

test("invitation tokens are high-entropy URL-safe opaque values", () => {
  const first = generateTeamInvitationToken();
  const second = generateTeamInvitationToken();
  assert.match(first, /^[A-Za-z0-9_-]{40,50}$/);
  assert.notEqual(first, second);
});

test("invitation tokens are stored as deterministic SHA-256 hashes, never plaintext", () => {
  const token = generateTeamInvitationToken();
  const hash = hashTeamInvitationToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashTeamInvitationToken(token), hash);
});

test("invitation expiry is exactly seven days after creation", () => {
  const now = new Date("2026-11-03T00:00:00.000Z");
  assert.equal(teamInvitationExpiresAt(now).getTime() - now.getTime(), TEAM_INVITATION_TTL_MS);
});

test("only least-privilege team roles can be assigned by invitation", () => {
  assert.equal(isAssignableTeamInvitationRole("staff"), true);
  assert.equal(isAssignableTeamInvitationRole("manager"), true);
  assert.equal(isAssignableTeamInvitationRole("admin"), false);
  assert.equal(isAssignableTeamInvitationRole("owner"), false);
});

test("invitation preview masks the invited phone number", () => {
  assert.equal(maskInvitationPhone("+220", "871234567"), "+220 87 ••• •••");
});
