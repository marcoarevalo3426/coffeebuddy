# ☕ Coffee Buddy — Serverless Slack App

Randomly pairs 2–3 people from a Slack channel every week for a coffee chat.
Inspired by [Coffee / Donut / Chat](https://slack.com/marketplace/A0641FFPG80-coffee-donut-chat-alfy).

Built for the **Gentrack** workspace (`gentrack.slack.com`), channel
**`#team-eternals-bau-au-engineers`**.

---

## What it does

| When | Action |
|------|--------|
| **Every Sunday 09:00** (NZ time) | Reads channel members, randomly pairs them into groups of 2 (and one group of 3 if the count is odd), posts the round announcement to the channel, and DMs each group a kickoff message. |
| **Every Tuesday 09:00** (NZ time) | DMs each of this week's groups a reminder to find a time. |

### Sunday channel post
```
This round's random coffee buddies are:

1. Alice + Bob
2. Carla + Dan
3. Erin + Frank + Grace

Find a time with your match, or grab an icebreaker.
```

### Sunday group DM
```
Hey Alice, Bob

You've been connected together this week for a coffee chat, so let's make it happen.
```

### Tuesday group DM
```
Hey Alice, Bob

Have you found a time for your coffee chat yet?
```

---

## Architecture (fully serverless, pay-per-use)

```
EventBridge Scheduler ──(Sunday cron)──▶ Lambda: pairRound ──▶ Slack Web API
                       └─(Tuesday cron)─▶ Lambda: remind   ──▶ Slack Web API
                                                 │
                                                 ▼
                                           DynamoDB (round history)
                                                 ▲
                      Slack bot token ◀── SSM Parameter Store (SecureString)
```

**Why no EC2?** EC2 bills by the hour even when idle. This app runs for a few
seconds twice a week, so Lambda + on-demand DynamoDB keeps it effectively free
(well inside the AWS Free Tier). See `docs/COST.md`.

---

## Repo layout

```
.
├── src/
│   ├── slack.js          # Slack Web API helpers
│   ├── pairing.js        # grouping algorithm (2s + one 3)
│   ├── repo.js           # DynamoDB access (round history)
│   ├── config.js         # env + workspace guard (Gentrack only)
│   └── handlers/
│       ├── pairRound.js  # Sunday Lambda handler
│       └── remind.js     # Tuesday Lambda handler
├── infra/
│   └── template.yaml     # AWS SAM template (Lambdas, DynamoDB, Schedulers, SSM)
├── slack/
│   └── manifest.yaml     # one-paste Slack app manifest (fastest install)
├── docs/
│   ├── INSTALL.md        # step-by-step deploy + Slack install
│   └── COST.md           # cost breakdown
├── test/
│   └── pairing.test.js   # unit tests for the grouping algorithm
└── package.json
```

See **[docs/INSTALL.md](docs/INSTALL.md)** to deploy and install.
