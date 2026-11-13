/**
 * Sunday 09:00 handler.
 *
 * 1. Verify we're on the Gentrack workspace.
 * 2. Read the channel's human members.
 * 3. Build groups (2s + one trio if odd), avoiding recent repeat pairings.
 * 4. Post the public announcement to the channel.
 * 5. DM each group a kickoff message.
 * 6. Persist the round so Tuesday's reminder and future repeat-avoidance can use it.
 */

import { config, assertGentrackWorkspace } from "../config.js";
import {
  getTeamInfo,
  resolveChannelId,
  getChannelMembers,
  postToChannel,
  dmGroup,
} from "../slack.js";
import { buildGroups, groupsToPairKeys } from "../pairing.js";
import { roundAnnouncementBlocks, kickoffDMBlocks } from "../messages.js";
import { saveRound, getRecentPairKeys } from "../repo.js";

export const handler = async () => {
  // 1. Workspace guard.
  const team = await getTeamInfo();
  assertGentrackWorkspace(team);

  // 2. Members.
  const channelId = await resolveChannelId(config.slackChannel);
  const members = await getChannelMembers(channelId);

  if (members.length < 2) {
    await postToChannel(
      channelId,
      "Not enough people in the channel to pair up this week. ☕"
    );
    return { ok: true, groups: 0, reason: "insufficient-members" };
  }

  // 3. Build groups, steering away from recent pairings.
  const recent = await getRecentPairKeys();
  const groups = buildGroups(members, recent);

  // 4. Public announcement (Block Kit: bold header, mentions, buttons).
  await postToChannel(channelId, roundAnnouncementBlocks(groups));

  // 5. Kickoff DMs (sequential to stay well under Slack rate limits).
  for (const group of groups) {
    await dmGroup(group.map((m) => m.id), kickoffDMBlocks(group));
  }

  // 6. Persist.
  await saveRound({ groups, pairKeys: groupsToPairKeys(groups) });

  return { ok: true, groups: groups.length, members: members.length };
};
