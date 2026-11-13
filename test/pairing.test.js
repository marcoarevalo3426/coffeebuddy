import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGroups,
  chunkIntoGroups,
  groupsToPairKeys,
  pairKey,
  shuffle,
} from "../src/pairing.js";

/** Deterministic RNG so tests are repeatable. */
function seededRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const people = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: `U${i}`, name: `P${i}` }));

test("even count -> all pairs, everyone included", () => {
  const groups = chunkIntoGroups(people(6));
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => g.length === 2));
  assert.equal(groups.flat().length, 6);
});

test("odd count -> exactly one trio, everyone included", () => {
  const groups = chunkIntoGroups(people(7));
  const trios = groups.filter((g) => g.length === 3);
  const pairs = groups.filter((g) => g.length === 2);
  assert.equal(trios.length, 1);
  assert.equal(pairs.length, 2);
  assert.equal(groups.flat().length, 7);
});

test("3 people -> single trio", () => {
  const groups = chunkIntoGroups(people(3));
  assert.deepEqual(
    groups.map((g) => g.length),
    [3]
  );
});

test("fewer than 2 -> no groups", () => {
  assert.deepEqual(buildGroups(people(1)), []);
  assert.deepEqual(buildGroups(people(0)), []);
});

test("buildGroups covers everyone exactly once", () => {
  const members = people(9);
  const groups = buildGroups(members, new Set(), { rng: seededRng() });
  const ids = groups.flat().map((m) => m.id).sort();
  assert.deepEqual(ids, members.map((m) => m.id).sort());
});

test("avoids recent pairings when possible", () => {
  const members = people(4); // U0..U3
  // Forbid U0::U1 and U2::U3 — a perfect alternative exists (U0::U2, U1::U3).
  const recent = new Set([pairKey("U0", "U1"), pairKey("U2", "U3")]);
  const groups = buildGroups(members, recent, { rng: seededRng(7), attempts: 500 });
  const keys = new Set(groupsToPairKeys(groups));
  assert.ok(!keys.has(pairKey("U0", "U1")));
  assert.ok(!keys.has(pairKey("U2", "U3")));
});

test("pairKey is order-independent", () => {
  assert.equal(pairKey("A", "B"), pairKey("B", "A"));
});

test("shuffle preserves membership", () => {
  const original = people(10);
  const shuffled = shuffle(original, seededRng(99));
  assert.deepEqual(
    shuffled.map((m) => m.id).sort(),
    original.map((m) => m.id).sort()
  );
});
