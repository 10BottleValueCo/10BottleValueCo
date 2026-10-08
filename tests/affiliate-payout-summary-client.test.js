import assert from "node:assert/strict";
import { test } from "node:test";
import { loadOwnedPayoutSummary } from "../artifacts/10-bottle-value/src/affiliate-payout-summary.js";

const supabase = {
  auth: {
    getSession: async () => ({
      data: { session: { access_token: "synthetic-session" } },
      error: null,
    }),
  },
};
const response = (body) => ({ ok: true, json: async () => body });
const summary = (totalPaid = 12.34, count = 2) => ({
  ok: true,
  summaries: [{ code: "FIXTURE", totalPaid, count }],
});

test("owner payout read sends Bearer and no caller-selected ownership parameters", async () => {
  const result = await loadOwnedPayoutSummary({
    supabase,
    code: "fixture",
    fetcher: async (url, options) => {
      assert.equal(url, "/api/affiliate-payout-summary");
      assert.deepEqual(options, {
        method: "GET",
        headers: { Authorization: "Bearer synthetic-session" },
        cache: "no-store",
      });
      return response(summary());
    },
  });
  assert.deepEqual(result, { code: "FIXTURE", totalPaid: 12.34, count: 2 });
});

test("an explicit owned zero-payout summary is valid", async () => {
  const result = await loadOwnedPayoutSummary({
    supabase,
    code: "FIXTURE",
    fetcher: async () => response(summary(0, 0)),
  });
  assert.equal(result.totalPaid, 0);
  assert.equal(result.count, 0);
});

test("missing session, server error, missing ownership and malformed totals never become zero", async () => {
  await assert.rejects(
    loadOwnedPayoutSummary({
      supabase: {
        auth: { getSession: async () => ({ data: { session: null } }) },
      },
      code: "FIXTURE",
      fetcher: async () => {
        assert.fail("anonymous fetch");
      },
    }),
  );
  await assert.rejects(
    loadOwnedPayoutSummary({
      supabase,
      code: "FIXTURE",
      fetcher: async () => ({ ok: false, status: 503 }),
    }),
  );
  for (const body of [
    { ok: true, summaries: [] },
    { ok: true, summaries: [{ code: "OTHER", totalPaid: 12, count: 1 }] },
    { ok: true, summaries: [...summary().summaries, ...summary().summaries] },
    ...[null, false, "12.34", -1, Infinity, 1.001].map((value) =>
      summary(value),
    ),
    summary(12, -1),
    summary(12, 1.5),
  ]) {
    await assert.rejects(
      loadOwnedPayoutSummary({
        supabase,
        code: "FIXTURE",
        fetcher: async () => response(body),
      }),
    );
  }
});

test("a changed account before session resolution prevents the request", async () => {
  const result = await loadOwnedPayoutSummary({
    supabase,
    code: "FIXTURE",
    isCurrent: () => false,
    fetcher: async () => {
      assert.fail("stale account fetch");
    },
  });
  assert.equal(result, null);
});

test("a changed account/request during fetch or JSON parsing discards private response", async () => {
  let current = true;
  const result = await loadOwnedPayoutSummary({
    supabase,
    code: "FIXTURE",
    isCurrent: () => current,
    fetcher: async () => {
      current = false;
      return {
        ok: true,
        json: async () => {
          assert.fail("stale data parsing");
        },
      };
    },
  });
  assert.equal(result, null);
  current = true;
  const parsed = await loadOwnedPayoutSummary({
    supabase,
    code: "FIXTURE",
    isCurrent: () => current,
    fetcher: async () => ({
      ok: true,
      json: async () => {
        current = false;
        return summary();
      },
    }),
  });
  assert.equal(parsed, null);
});
