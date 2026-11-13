/**
 * Centralised configuration + the Gentrack workspace guard.
 *
 * All runtime config comes from environment variables set by the SAM template,
 * except the Slack bot token, which is read from SSM Parameter Store at runtime
 * (so the secret never lives in an env var or in source control).
 */

export const config = {
  // Slack
  slackChannel: process.env.SLACK_CHANNEL || "my-amazing-team",
  slackChannelId: process.env.SLACK_CHANNEL_ID || "", // optional: skips a lookup
  slackTokenParam: process.env.SLACK_TOKEN_PARAM || "/coffee-buddy/slack-bot-token",
  // Signing secret (from the Slack app) used to verify interactive requests.
  slackSigningSecretParam:
    process.env.SLACK_SIGNING_SECRET_PARAM || "/coffee-buddy/slack-signing-secret",
  // Who receives feedback submissions (the app owner, @marco).
  feedbackUserId: process.env.FEEDBACK_USER_ID || "",

  // Workspace lock: the app only runs against this Slack workspace domain.
  allowedTeamDomain: process.env.ALLOWED_TEAM_DOMAIN || "anchortagworkspace",

  // Pairing
  minGroupSize: 2,
  // When the member count is odd, one group becomes a trio (size 3).

  // DynamoDB
  historyTable: process.env.HISTORY_TABLE || "coffee-buddy-history",
  // How many past rounds to consider when avoiding repeat pairings.
  historyLookbackRounds: Number(process.env.HISTORY_LOOKBACK || 4),

  region: process.env.AWS_REGION || "ap-southeast-2",
};

/**
 * Guard: verify the connected Slack workspace is Gentrack before doing anything.
 * `team` is the object returned by Slack's `team.info` API.
 * Throws if the workspace is not the allowed one.
 */
export function assertGentrackWorkspace(team) {
  const domain = (team?.domain || "").toLowerCase();
  if (domain !== config.allowedTeamDomain.toLowerCase()) {
    throw new Error(
      `Coffee Buddy is locked to the '${config.allowedTeamDomain}' Slack workspace, ` +
        `but it is installed on '${domain || "unknown"}'. Aborting.`
    );
  }
}
