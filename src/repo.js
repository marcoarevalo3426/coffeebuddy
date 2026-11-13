/**
 * DynamoDB access for round history.
 *
 * Table: coffee-buddy-history (on-demand billing)
 *   PK  pk   = "ROUND"                 (single partition, small data set)
 *   SK  sk   = "<ISO timestamp>"       (sort by time; newest rounds last)
 * Attributes:
 *   groups     = [[{id,name}, ...], ...]   the groups for that round
 *   pairKeys   = ["a::b", ...]             flattened pair keys for fast lookup
 *   ttl        = epoch seconds             auto-expire old rounds (90 days)
 *
 * The current (most recent) round is what Tuesday's reminder reads back.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config.js";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));
const PK = "ROUND";
const TTL_DAYS = 90;

/** Persist a newly built round. */
export async function saveRound({ groups, pairKeys }) {
  const now = new Date();
  await doc.send(
    new PutCommand({
      TableName: config.historyTable,
      Item: {
        pk: PK,
        sk: now.toISOString(),
        groups,
        pairKeys,
        ttl: Math.floor(now.getTime() / 1000) + TTL_DAYS * 86400,
      },
    })
  );
}

/** The most recent round (used by Tuesday's reminder). Returns null if none. */
export async function getLatestRound() {
  const res = await doc.send(
    new QueryCommand({
      TableName: config.historyTable,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": PK },
      ScanIndexForward: false, // newest first
      Limit: 1,
    })
  );
  return res.Items?.[0] || null;
}

/** Union of pair keys across the last N rounds, for repeat-avoidance. */
export async function getRecentPairKeys(lookback = config.historyLookbackRounds) {
  const res = await doc.send(
    new QueryCommand({
      TableName: config.historyTable,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": PK },
      ScanIndexForward: false,
      Limit: lookback,
    })
  );
  const keys = new Set();
  for (const item of res.Items || []) {
    for (const k of item.pairKeys || []) keys.add(k);
  }
  return keys;
}
