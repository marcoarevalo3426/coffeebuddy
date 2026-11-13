/**
 * Interactivity handler — fronted by a Lambda Function URL.
 *
 * Slack sends:
 *   - block_actions   : a button was clicked -> open the matching modal
 *   - view_submission : the feedback modal was submitted -> DM the owner, say thanks
 *
 * Every request is signature-verified before we act on it.
 *
 * Function URL event shape (payload format 2.0): the body is form-encoded as
 * `payload=<url-encoded-json>`, and may be base64-encoded by Lambda.
 */

import { config } from "../config.js";
import { getSigningSecret, openView, dmUser } from "../slack.js";
import { verifySlackSignature } from "../verify.js";
import {
  startersModalView,
  feedbackModalView,
  feedbackThanksView,
} from "../starters.js";

const OK = (body = "") => ({ statusCode: 200, body });
const UNAUTHORIZED = { statusCode: 401, body: "invalid signature" };

export const handler = async (event) => {
  // 1. Recover the raw body exactly as Slack sent it (needed for signature).
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  // 2. Verify the Slack signature.
  const headers = normaliseHeaders(event.headers);
  const signingSecret = await getSigningSecret();
  const valid = verifySlackSignature({
    signingSecret,
    timestamp: headers["x-slack-request-timestamp"],
    signature: headers["x-slack-signature"],
    rawBody,
  });
  if (!valid) return UNAUTHORIZED;

  // 3. Parse the interaction payload.
  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") || "{}");

  // 4. Route.
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0]?.action_id;
    try {
      if (action === "open_starters") {
        await openView(payload.trigger_id, startersModalView());
      } else if (action === "open_feedback") {
        await openView(payload.trigger_id, feedbackModalView());
      }
    } catch (err) {
      console.error("[interactions] openView failed:", err.message);
    }
    // Acknowledge within 3s; the view opens via the API call above.
    return OK();
  }

  if (payload.type === "view_submission") {
    if (payload.view?.callback_id === "feedback_modal") {
      const text =
        payload.view.state?.values?.feedback_block?.feedback_input?.value || "";
      const fromUser = payload.user?.id;
      const fromName = payload.user?.username || payload.user?.name || fromUser;

      // DM the app owner (@marco) the feedback.
      const recipient = config.feedbackUserId;
      if (recipient && text.trim()) {
        await dmUser(
          recipient,
          [
            ":speech_balloon: *New Coffee Buddy feedback*",
            `From: <@${fromUser}> (${fromName})`,
            "",
            text,
          ].join("\n")
        );
      }

      // Swap the modal to a thank-you (keeps the user in-flow, with a Close button).
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_action: "update",
          view: feedbackThanksView(),
        }),
      };
    }
    return OK();
  }

  // Unknown interaction type — acknowledge so Slack doesn't retry.
  return OK();
};

/** Lowercase header keys (Function URLs may vary casing). */
function normaliseHeaders(h = {}) {
  const out = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
  return out;
}
