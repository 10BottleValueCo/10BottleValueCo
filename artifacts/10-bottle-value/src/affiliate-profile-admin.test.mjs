import assert from "node:assert/strict";
import { test } from "node:test";
import { issueAffiliateAccess } from "./affiliate-profile-admin.js";

const correct = { email: "partner@example.org", code: "VAL30", active: true };
const revoked = { ...correct, email: "partner@example.org)", active: false };
const ok = (data) => ({ data, error: null });

function mockClient(results) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      const query = {};
      for (const method of ["select", "ilike", "limit", "update", "insert", "eq"]) {
        query[method] = (...args) => { call.operations.push([method, ...args]); return query; };
      }
      query.then = (resolve, reject) => {
        assert.ok(results.length, "Unexpected database request");
        return Promise.resolve(results.shift()).then(resolve, reject);
      };
      return query;
    },
  };
}
const input = { email: correct.email, code: "val30" };

test("rejects a trailing parenthesis before any database call", async () => {
  const client = mockClient([]);
  await assert.rejects(issueAffiliateAccess({ client, ...input, email: revoked.email }), /valid email/);
  assert.equal(client.calls.length, 0);
});

test("creates new access and verifies persistence", async () => {
  const client = mockClient([ok([]), ok([]), ok([correct]), ok([correct])]);
  assert.deepEqual(await issueAffiliateAccess({ client, ...input }), { ...input, code: "VAL30", restored: false });
  assert.deepEqual(client.calls[2].operations[0], ["insert", correct]);
});

test("restores a revoked code by updating its existing row, preserving code and history", async () => {
  const client = mockClient([ok([revoked]), ok([]), ok([correct]), ok([correct])]);
  let prompt;
  const result = await issueAffiliateAccess({ client, ...input, confirmRestore: (details) => { prompt = details; return true; } });
  assert.equal(result.restored, true);
  assert.equal(prompt.previousEmail, revoked.email);
  assert.deepEqual(client.calls[2].operations, [
    ["update", { email: correct.email, active: true }],
    ["eq", "code", "VAL30"], ["eq", "email", revoked.email], ["eq", "active", false],
    ["select", "email,code,active"],
  ]);
  assert.ok(client.calls.every((call) => call.table === "affiliates"));
});

test("cancelling restoration does not write", async () => {
  const client = mockClient([ok([revoked]), ok([])]);
  assert.deepEqual(await issueAffiliateAccess({ client, ...input, confirmRestore: () => false }), { cancelled: true });
  assert.equal(client.calls.length, 2);
});

test("cannot silently take a code from another active owner", async () => {
  const client = mockClient([ok([{ ...revoked, active: true }]), ok([])]);
  await assert.rejects(issueAffiliateAccess({ client, ...input }), /another active affiliate/);
  assert.equal(client.calls.length, 2);
});

test("does not replace a different code already owned by the target email", async () => {
  const client = mockClient([ok([revoked]), ok([{ ...correct, code: "OTHER" }])]);
  await assert.rejects(issueAffiliateAccess({ client, ...input }), /another affiliate code/);
});

test("zero-row guarded writes are not reported as success", async () => {
  const client = mockClient([ok([revoked]), ok([]), ok([])]);
  await assert.rejects(issueAffiliateAccess({ client, ...input, confirmRestore: () => true }), /not confirmed/);
});

test("database permission failures are surfaced, not bypassed", async () => {
  const client = mockClient([ok([revoked]), ok([]), { data: null, error: { message: "Permission denied" } }]);
  await assert.rejects(issueAffiliateAccess({ client, ...input, confirmRestore: () => true }), /Permission denied/);
});

test("failed readback cannot produce a success message", async () => {
  const client = mockClient([ok([revoked]), ok([]), ok([correct]), ok([revoked])]);
  await assert.rejects(issueAffiliateAccess({ client, ...input, confirmRestore: () => true }), /verify the saved/);
});

test("duplicate owner records stop the operation before any write", async () => {
  const client = mockClient([ok([revoked]), ok([correct, correct])]);
  await assert.rejects(issueAffiliateAccess({ client, ...input }), /Multiple affiliate profiles/);
});
