/**
 * Grouping algorithm.
 *
 * Rules (matching the product brief):
 *   - Pair people into groups of 2.
 *   - If the member count is odd, exactly one group becomes a trio (size 3),
 *     so we never leave anyone out.
 *   - "Smart" matching: prefer pairings that did NOT occur in recent rounds,
 *     mirroring the reference app's "people don't meet twice" behaviour.
 *
 * Edge cases:
 *   - 0 or 1 members -> no groups (nothing to pair).
 *   - 2 members      -> one pair.
 *   - 3 members      -> one trio.
 */

/** Fisher–Yates shuffle (pure, returns a new array). */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Stable key for a pair of user IDs, order-independent. */
export function pairKey(a, b) {
  return [a, b].sort().join("::");
}

/**
 * Score a candidate ordering by how many of its adjacent pairings are "fresh"
 * (not seen in recentPairKeys). Lower repeat count = better.
 */
function countRepeats(groups, recentPairKeys) {
  let repeats = 0;
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (recentPairKeys.has(pairKey(group[i].id, group[j].id))) repeats++;
      }
    }
  }
  return repeats;
}

/** Turn a flat ordered list of members into groups of 2, with one trio if odd. */
export function chunkIntoGroups(ordered) {
  const groups = [];
  const n = ordered.length;
  if (n < 2) return groups;

  const isOdd = n % 2 === 1;
  let i = 0;
  // All groups are pairs...
  while (i < n) {
    const remaining = n - i;
    // ...except, when the count is odd, make the final group a trio.
    if (isOdd && remaining === 3) {
      groups.push(ordered.slice(i, i + 3));
      i += 3;
    } else {
      groups.push(ordered.slice(i, i + 2));
      i += 2;
    }
  }
  return groups;
}

/**
 * Build this round's groups.
 *
 * @param {Array<{id:string,name:string}>} members
 * @param {Set<string>} recentPairKeys  keys of pairs seen in recent rounds
 * @param {object} opts { attempts, rng }
 * @returns {Array<Array<{id,name}>>}
 */
export function buildGroups(members, recentPairKeys = new Set(), opts = {}) {
  const attempts = opts.attempts ?? 200;
  const rng = opts.rng ?? Math.random;

  if (members.length < 2) return [];

  let best = null;
  let bestRepeats = Infinity;

  // Try several random shufflings and keep the one with the fewest repeat pairings.
  for (let k = 0; k < attempts; k++) {
    const groups = chunkIntoGroups(shuffle(members, rng));
    const repeats = countRepeats(groups, recentPairKeys);
    if (repeats < bestRepeats) {
      best = groups;
      bestRepeats = repeats;
      if (repeats === 0) break; // perfect; stop early
    }
  }
  return best;
}

/** All pair keys contained in a set of groups (for history storage). */
export function groupsToPairKeys(groups) {
  const keys = [];
  for (const group of groups) {
    const ids = group.map((m) => m.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        keys.push(pairKey(ids[i], ids[j]));
      }
    }
  }
  return keys;
}
