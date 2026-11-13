# Install & Deploy — Coffee Buddy

Two parts: **(A)** create the Slack app and get a bot token, **(B)** deploy the
AWS stack. Takes ~15 minutes.

---

## Prerequisites

- An AWS account + the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- AWS credentials configured (`aws configure`) for region `ap-southeast-2` (Sydney)
- Workspace Admin rights on **gentrack.slack.com** (to install the app)
- Node.js 20+

---

## A. Create the Slack app (fastest route — manifest)

1. Open <https://api.slack.com/apps> → **Create New App** → **From a manifest**.
2. Select the **Gentrack** workspace (`gentrack.slack.com`).
3. Paste the contents of [`slack/manifest.yaml`](../slack/manifest.yaml) → **Next** → **Create**.
4. On the app's **Install App** page, click **Install to Workspace** and approve.
5. Copy the **Bot User OAuth Token** (`xoxb-...`).
6. In Slack, invite the bot to the channel:
   ```
   /invite @Coffee Buddy
   ```
   run inside **#team-eternals-bau-au-engineers**.

> Why a manifest instead of a public OAuth "Add to Slack" button? This is an
> internal, single-workspace tool. A manifest provisions every scope in one
> paste and needs no hosted install endpoint — cheaper and faster than building
> an OAuth redirect flow. If you later want to distribute it to other orgs,
> add an OAuth install Lambda Function URL; the manifest already declares the
> scopes you'd need.

---

## B. Store the token in SSM (SecureString)

CloudFormation can't create encrypted SSM params, so do it once by hand:

```bash
aws ssm put-parameter \
  --name /coffee-buddy/slack-bot-token \
  --type SecureString \
  --value "xoxb-your-token-here" \
  --region ap-southeast-2
```

To rotate later, re-run with `--overwrite`.

---

## C. Deploy the AWS stack

```bash
npm install
sam build --template infra/template.yaml
sam deploy --guided --template infra/template.yaml
```

During `--guided`, accept the defaults. Key parameters:

| Parameter | Default |
|-----------|---------|
| `SlackChannel` | `team-eternals-bau-au-engineers` |
| `AllowedTeamDomain` | `gentrack` |
| `Timezone` | `Pacific/Auckland` |

This creates: 2 Lambdas, 1 DynamoDB table, 2 EventBridge schedules, and the IAM roles.

---

## D. Test it before Sunday

Fire the Sunday job manually:

```bash
aws lambda invoke --function-name coffee-buddy-pairRound \
  --payload '{}' --cli-binary-format raw-in-base64-out /dev/stdout
```

You should see the announcement in the channel and a DM to each group.
Then test the reminder:

```bash
aws lambda invoke --function-name coffee-buddy-remind \
  --payload '{}' --cli-binary-format raw-in-base64-out /dev/stdout
```

---

## Schedules

| Job | Cron | Timezone |
|-----|------|----------|
| Pair + announce | `cron(0 9 ? * SUN *)` | Pacific/Auckland |
| Reminder | `cron(0 9 ? * TUE *)` | Pacific/Auckland |

EventBridge Scheduler handles the timezone (including DST) natively — no UTC math.

---

## Changing the group size / wording

- **Wording:** edit `src/messages.js`.
- **Group logic (trio rules, repeat-avoidance window):** `src/pairing.js` and
  `config.historyLookbackRounds` in `src/config.js`.

Re-deploy with `sam build && sam deploy`.
