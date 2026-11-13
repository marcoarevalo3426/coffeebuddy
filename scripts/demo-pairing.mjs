/**
 * Local demo of the pairing algorithm with random synthetic people.
 * Does NOT touch Slack or AWS — it just exercises src/pairing.js and
 * src/messages.js so you can see how groups would form.
 *
 * Usage:  node scripts/demo-pairing.mjs [count]   (default 15)
 */

import { buildGroups, groupsToPairKeys } from "../src/pairing.js";
import { roundAnnouncement } from "../src/messages.js";

const FIRST = [
  "Ava", "Liam", "Noah", "Mia", "Zoe", "Kai", "Ella", "Leo", "Ivy", "Max",
  "Nina", "Omar", "Ruby", "Sam", "Tara", "Finn", "Hana", "Jack", "Lucy", "Theo",
];

const count = Math.max(2, Math.min(50, Number(process.argv[2]) || 15));

// Build synthetic members with fake-but-stable IDs.
const members = Array.from({ length: count }, (_, i) => ({
  id: `FAKE${String(i + 1).padStart(2, "0")}`,
  name: `${FIRST[i % FIRST.length]}${i >= FIRST.length ? i : ""}`,
}));

const groups = buildGroups(members, new Set());

console.log(`\nGenerated ${count} random people:`);
console.log("  " + members.map((m) => m.name).join(", "));

console.log(`\nGroups (${groups.length}):`);
groups.forEach((g, i) => {
  const kind = g.length === 3 ? " (trio)" : "";
  console.log(`  ${i + 1}. ${g.map((m) => m.name).join(" + ")}${kind}`);
});

const trios = groups.filter((g) => g.length === 3).length;
const pairs = groups.filter((g) => g.length === 2).length;
console.log(`\nSummary: ${pairs} pair(s), ${trios} trio(s), everyone included = ${
  groups.flat().length === count
}`);

// Show the channel announcement text the app would build (names shown raw here
// because synthetic people have no real Slack IDs to mention).
console.log("\n--- Channel announcement (preview, names instead of @mentions) ---");
console.log(
  roundAnnouncement(groups).replace(/<@(FAKE\d+)>/g, (_, id) => {
    const m = members.find((x) => x.id === id);
    return m ? m.name : id;
  })
);

console.log(`\nDistinct pairings this round: ${groupsToPairKeys(groups).length}`);
