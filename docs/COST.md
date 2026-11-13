# Cost breakdown

This app runs **twice a week** for a few seconds. There is no always-on compute.
Below is a realistic monthly estimate for one channel (~30 people), in
`ap-southeast-2`. All figures are approximate.

| Service | Usage/month | Cost |
|---------|-------------|------|
| **Lambda** | ~8 invocations, a few seconds each, 256 MB arm64 | **$0.00** (free tier: 1M requests + 400k GB-s) |
| **DynamoDB** | ~8 writes + a handful of reads, on-demand, tiny items | **$0.00** (free tier: 25 WCU/RCU + 25 GB) |
| **EventBridge Scheduler** | 2 schedules, ~8 invocations | **$0.00** (free tier: 14M invocations) |
| **SSM Parameter Store** | 1 standard SecureString param, ~8 reads | **$0.00** (standard params are free) |
| **CloudWatch Logs** | a few KB of logs | **~$0.00** (well under free tier) |
| **Total** | | **≈ $0.00 / month** |

Even outside the free tier, the real cost would be a few **cents** per month.

## Why not EC2?

A `t3.micro` left running 24/7 costs roughly **$7–9/month** even while doing
nothing, plus patching and uptime overhead. Since Coffee Buddy only needs to
run for seconds twice a week, Lambda is both cheaper and simpler — nothing to
patch, nothing idling. That's the reason this build drops EC2 from the
originally suggested stack.

## Keeping it cheap

- **arm64 (Graviton)** Lambda: ~20% cheaper than x86 for the same work.
- **On-demand DynamoDB**: no provisioned capacity sitting idle.
- **TTL on history rows** (90 days): the table never grows unbounded.
- **No API Gateway**: scheduled Lambdas are invoked directly by EventBridge.
