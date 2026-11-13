/**
 * Conversation starters for the Gentrack Coffee Buddy app.
 * Grouped into sections; section titles render bold in the modal.
 */

export const STARTERS = [
  {
    title: "Warm-up",
    intro: null,
    items: [
      "What's your go-to coffee order, and has it always been that?",
      "What's been the best part of your week so far?",
      "Are you a morning person, a night owl, or somewhere in between?",
      "What does a typical weekend look like for you?",
      "What's something small that reliably makes your day better?",
    ],
  },
  {
    title: "Life at Gentrack",
    intro: null,
    items: [
      "What brought you to Gentrack, and what's kept you here?",
      "How would you explain what you do to a friend who has never heard of Gentrack?",
      "What's a project or moment at Gentrack you're quietly proud of?",
      "Which team or person here would you like to know more about, and why?",
      "If you could change one thing about how we work, what would it be?",
    ],
  },
  {
    title: "Getting to know you",
    intro:
      "A little more personal, but nothing anyone has to share. These work best once you've warmed up.",
    items: [
      "What's a hobby or interest people at work might not guess you have?",
      "Where did you grow up, and what do you miss about it?",
      "What's something you've learned or got better at in the last year?",
      "What's the best piece of advice you've ever been given?",
      "What's something on your list to try, see or do in the next year?",
    ],
  },
  {
    title: "Just for fun",
    intro: null,
    items: [
      "If you could swap jobs with anyone at Gentrack for a day, who would it be?",
      "You can master any skill instantly, but only one. What do you pick?",
      "What would you choose as your walk-up song if you had one every time you joined a meeting?",
      "If you could have coffee with anyone, living or historical, who would it be?",
      "If Gentrack gave everyone an extra day off each month, how would you spend yours?",
    ],
  },
];

/**
 * Build the Slack modal view for the conversation starters.
 * Uses section blocks with *bold* mrkdwn headers; questions are numbered 1-20
 * continuously to match the brief.
 */
export function startersModalView() {
  const blocks = [];
  let n = 0;
  for (const section of STARTERS) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${section.title}*` },
    });
    if (section.intro) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `_${section.intro}_` }],
      });
    }
    const lines = section.items.map((q) => {
      n += 1;
      return `${n}. ${q}`;
    });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    });
    blocks.push({ type: "divider" });
  }
  // Drop the trailing divider for a cleaner finish.
  if (blocks[blocks.length - 1]?.type === "divider") blocks.pop();

  return {
    type: "modal",
    callback_id: "starters_modal",
    title: { type: "plain_text", text: "Conversation starters" },
    close: { type: "plain_text", text: "Close" },
    blocks,
  };
}

/** The feedback modal. Submitting it fires a `view_submission` to the handler. */
export function feedbackModalView() {
  return {
    type: "modal",
    callback_id: "feedback_modal",
    title: { type: "plain_text", text: "Coffee Buddy" },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Help us improve this Coffee Buddy app" },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Suggest improvements or share features you'd like to see.",
          },
        ],
      },
      {
        type: "input",
        block_id: "feedback_block",
        label: { type: "plain_text", text: "Your feedback" },
        element: {
          type: "plain_text_input",
          action_id: "feedback_input",
          multiline: true,
          max_length: 2000,
          placeholder: { type: "plain_text", text: "Type your suggestion here..." },
        },
      },
    ],
  };
}

/** The confirmation modal shown after a successful feedback submission. */
export function feedbackThanksView() {
  return {
    type: "modal",
    callback_id: "feedback_thanks",
    title: { type: "plain_text", text: "Thank you" },
    close: { type: "plain_text", text: "Close" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":tada: *Thanks for the feedback!*\n\nWe appreciate you helping make Coffee Buddy better.",
        },
      },
    ],
  };
}
