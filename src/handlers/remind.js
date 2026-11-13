/**
 * Tuesday 09:00 handler.
 *
 * Reads back the most recent round and DMs each group the reminder message.
 * If there's no round for the current week (e.g. the app was installed after
 * Sunday), it simply no-ops.
 */

import { assertGentrackWorkspace } from "../config.js";
import { getTeamInfo, dmGroup } from "../slack.js";
import { reminderDMBlocks } from "../messages.js";
import { getLatestRound } from "../repo.js";

export const handler = async () => {
  const team = await getTeamInfo();
  assertGentrackWorkspace(team);

  const round = await getLatestRound();
  if (!round || !Array.isArray(round.groups) || round.groups.length === 0) {
    return { ok: true, reminded: 0, reason: "no-active-round" };
  }

  for (const group of round.groups) {
    await dmGroup(group.map((m) => m.id), reminderDMBlocks(group));
  }

  return { ok: true, reminded: round.groups.length };
};
