/**
 * Slack request signature verification.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Slack signs every interactive request with HMAC-SHA256 over
 *   v0:<timestamp>:<raw-body>
 * using the app's signing secret. We recompute it and compare in constant time.
 * Requests older than 5 minutes are rejected (replay protection).
 */

import crypto from "node:crypto";

export function verifySlackSignature({ signingSecret, timestamp, signature, rawBody }) {
  if (!timestamp || !signature) return false;

  // Reject stale requests (> 5 minutes) to guard against replay.
  const fiveMin = 60 * 5;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > fiveMin) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + crypto.createHmac("sha256", signingSecret).update(base).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
