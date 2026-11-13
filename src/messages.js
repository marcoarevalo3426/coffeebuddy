/**
 * Message templates. Kept in one place so the wording is easy to tweak.
 * Names are rendered as Slack mentions (<@UID>) so they're clickable and
 * always match the person's current Slack display name.
 */

/** "<@U1>, <@U2>" style mention list. */
export function mentionList(group) {
  return group.map((m) => `<@${m.id}>`).join(", ");
}

/** "<@U1> + <@U2>" mention list for the channel announcement (notifies users). */
export function mentionJoin(group) {
  return group.map((m) => `<@${m.id}>`).join(" + ");
}

/**
 * Encouraging scheduling prompts. One is picked at random for each pair DM
 * (both the Sunday kickoff and the Tuesday reminder) to keep the nudge fresh.
 */
export const SCHEDULE_PROMPTS = [
  ":date: Great chats start with a date in the calendar — lock yours in now",
  ":date: A quick coffee can spark a great connection. Book your time in one click",
  ':date: Every great connection starts with "when are you free?" — set a time now',
  ":coffee: Ten minutes, one coffee, a new connection. Schedule it in a click",
  ":date: Don't let this one slip — grab a time and turn a match into a real connection",
];

/** Pick a random scheduling prompt (rng injectable for tests). */
export function pickSchedulePrompt(rng = Math.random) {
  return SCHEDULE_PROMPTS[Math.floor(rng() * SCHEDULE_PROMPTS.length)];
}

/** Plain-text version of the announcement (fallback / notification preview). */
export function roundAnnouncement(groups) {
  const lines = groups.map((g, i) => `${i + 1}. ${mentionJoin(g)}`);
  return [
    "*This round's random coffee buddies are:*",
    "",
    ...lines,
    "",
    "Find a time with your match, or grab an icebreaker. :point_down:",
  ].join("\n");
}

/**
 * Block Kit version of the Sunday announcement: bold header, @-mention list,
 * the icebreaker line with a :point_down:, then two action buttons.
 * The buttons' action_ids are what the interactions handler listens for.
 */
export function roundAnnouncementBlocks(groups) {
  const lines = groups.map((g, i) => `${i + 1}. ${mentionJoin(g)}`);
  return {
    text: roundAnnouncement(groups), // fallback text for notifications
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "*This round's random coffee buddies are:*" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: lines.join("\n") },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Find a time with your match, or grab an icebreaker. :point_down:",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Conversation starters", emoji: true },
            action_id: "open_starters",
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Submit a feedback", emoji: true },
            action_id: "open_feedback",
          },
        ],
      },
    ],
  };
}

/**
 * Microsoft Teams "new meeting" deep link with the subject pre-filled as
 * "[Name 1], [Name 2] Coffee buddy chat". Opens the Teams scheduling form so
 * the pair can pick a time and save. (Teams deep links support `subject` but
 * not duration, so the 10-minute intent is stated in the message text.)
 */
export function teamsMeetingLink(group) {
  const subject = `${group.map((m) => m.name).join(", ")} Coffee buddy chat`;
  return `https://teams.microsoft.com/l/meeting/new?subject=${encodeURIComponent(subject)}`;
}

/**
 * Plain-text kickoff DM (fallback text for the Block Kit version).
 * `prompt` is the randomly-picked scheduling line; defaults to a fresh pick.
 */
export function kickoffDM(group, prompt = pickSchedulePrompt()) {
  return [
    `Hey ${mentionList(group)} :wave:`,
    "",
    "You've been connected together this week for a coffee chat, so let's make it happen.",
    "",
    prompt,
  ].join("\n");
}

/**
 * Block Kit kickoff DM: greeting, the connect line, a randomly-picked
 * encouraging scheduling prompt, and a URL button that opens Teams to create a
 * new "[Name 1], [Name 2] Coffee buddy chat" meeting.
 */
export function kickoffDMBlocks(group) {
  // Pick once so the fallback text and the block show the same prompt.
  const prompt = pickSchedulePrompt();
  return {
    text: kickoffDM(group, prompt), // notification fallback
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `Hey ${mentionList(group)} :wave:`,
            "",
            "You've been connected together this week for a coffee chat, so let's make it happen.",
          ].join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: prompt },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Schedule a Coffee chat", emoji: true },
            action_id: "schedule_teams",
            url: teamsMeetingLink(group),
          },
        ],
      },
    ],
  };
}

/**
 * Plain-text Tuesday reminder DM (fallback text for the Block Kit version).
 * `prompt` is the randomly-picked scheduling line; defaults to a fresh pick.
 */
export function reminderDM(group, prompt = pickSchedulePrompt()) {
  return [
    `Hey ${mentionList(group)} :wave:`,
    "",
    "Have you found a time for your coffee chat yet?",
    "",
    prompt,
  ].join("\n");
}

/**
 * Block Kit Tuesday reminder DM: the nudge, a randomly-picked encouraging
 * scheduling prompt, and the same Teams "new meeting" button as the kickoff.
 */
export function reminderDMBlocks(group) {
  const prompt = pickSchedulePrompt();
  return {
    text: reminderDM(group, prompt), // notification fallback
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `Hey ${mentionList(group)} :wave:`,
            "",
            "Have you found a time for your coffee chat yet?",
          ].join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: prompt },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Schedule a Coffee chat", emoji: true },
            action_id: "schedule_teams",
            url: teamsMeetingLink(group),
          },
        ],
      },
    ],
  };
}
