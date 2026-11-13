/**
 * Minimal Slack Web API client built on native fetch (Node 20+).
 * No external SDK needed, which keeps the Lambda bundle tiny and cold starts fast.
 */

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { config } from "./config.js";

let cachedToken = null;

/** Fetch and cache the bot token from SSM Parameter Store (SecureString). */
export async function getToken() {
  if (cachedToken) return cachedToken;
  const ssm = new SSMClient({ region: config.region });
  const res = await ssm.send(
    new GetParameterCommand({ Name: config.slackTokenParam, WithDecryption: true })
  );
  cachedToken = res.Parameter.Value;
  return cachedToken;
}

let cachedSigningSecret = null;

/** Fetch and cache the Slack signing secret from SSM (SecureString). */
export async function getSigningSecret() {
  if (cachedSigningSecret) return cachedSigningSecret;
  const ssm = new SSMClient({ region: config.region });
  const res = await ssm.send(
    new GetParameterCommand({
      Name: config.slackSigningSecretParam,
      WithDecryption: true,
    })
  );
  cachedSigningSecret = res.Parameter.Value;
  return cachedSigningSecret;
}

/**
 * Core Slack Web API call. Throws on `ok: false`.
 *
 * Uses application/x-www-form-urlencoded, which every Slack Web API method
 * accepts — both the read methods (conversations.members, users.info, ...)
 * and the write methods (chat.postMessage, conversations.open). A JSON body is
 * only accepted by a subset of write methods and is rejected with
 * `invalid_arguments` by the read methods, so form encoding is the safe choice.
 */
export async function slack(method, params = {}) {
  const token = await getToken();
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    form.append(key, String(value));
  }
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: form.toString(),
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Slack API ${method} failed: ${json.error}`);
  }
  return json;
}

/** Workspace identity — used by the Gentrack guard. */
export async function getTeamInfo() {
  const { team } = await slack("team.info");
  return team;
}

/** Resolve a channel name (without #) to its ID. Paginates the conversations list. */
export async function resolveChannelId(channelName) {
  if (config.slackChannelId) return config.slackChannelId;
  let cursor;
  do {
    const res = await slack("conversations.list", {
      exclude_archived: true,
      types: "public_channel,private_channel",
      limit: 200,
      cursor,
    });
    const match = res.channels.find((c) => c.name === channelName);
    if (match) return match.id;
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor);
  throw new Error(`Channel #${channelName} not found (is the bot invited to it?).`);
}

/** All non-bot, active human members of a channel. */
export async function getChannelMembers(channelId) {
  // 1. Collect member user IDs (paginated).
  const ids = [];
  let cursor;
  do {
    const res = await slack("conversations.members", {
      channel: channelId,
      limit: 200,
      cursor,
    });
    ids.push(...res.members);
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor);

  // 2. Hydrate each ID into a user profile, filtering out bots/deleted/deactivated.
  const members = [];
  for (const id of ids) {
    const { user } = await slack("users.info", { user: id });
    if (user.is_bot || user.deleted || user.id === "USLACKBOT") continue;
    members.push({
      id: user.id,
      name: user.profile?.display_name || user.real_name || user.name,
    });
  }
  return members;
}

/**
 * Post a message to a channel.
 * Pass either a string, or an object { text, blocks } for Block Kit messages.
 * (Blocks must be JSON-stringified for the form-encoded Web API.)
 */
export async function postToChannel(channelId, message) {
  const params = { channel: channelId };
  if (typeof message === "string") {
    params.text = message;
  } else {
    if (message.text) params.text = message.text;
    if (message.blocks) params.blocks = JSON.stringify(message.blocks);
  }
  return slack("chat.postMessage", params);
}

/**
 * Open a group DM (multi-person IM) with the given user IDs and post a message.
 * Works for 2 or more users. `message` may be a string or { text, blocks }.
 */
export async function dmGroup(userIds, message) {
  const { channel } = await slack("conversations.open", { users: userIds.join(",") });
  const params = { channel: channel.id };
  if (typeof message === "string") {
    params.text = message;
  } else {
    if (message.text) params.text = message.text;
    if (message.blocks) params.blocks = JSON.stringify(message.blocks);
  }
  return slack("chat.postMessage", params);
}

/** DM a single user some text (opens an IM first). */
export async function dmUser(userId, text) {
  const { channel } = await slack("conversations.open", { users: userId });
  return slack("chat.postMessage", { channel: channel.id, text });
}

/** Open a modal in response to a trigger_id (from a button click). */
export async function openView(triggerId, view) {
  return slack("views.open", { trigger_id: triggerId, view: JSON.stringify(view) });
}

/** Reset cached secrets — used in tests. */
export function _resetTokenCache() {
  cachedToken = null;
  cachedSigningSecret = null;
}
