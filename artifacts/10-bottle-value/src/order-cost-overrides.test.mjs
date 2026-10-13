import assert from "node:assert/strict";
import { test } from "node:test";
import { createDatabaseOrderCostSaver as createOrderCostSaver, parseCostAmount, unitCostToLineCost } from "./order-cost-overrides.js";

const copy = value => JSON.parse(JSON.stringify(value));

function storage(metadata, options = {}) {
  let row = { id: "order-1", items: [{}, {}], metadata: copy(metadata) };
  let writes = 0;
  let reads = 0;
  let conflicts = 0;
  return {
    get snapshot() { return copy(row); },
    get writes() { return writes; },
    get reads() { return reads; },
    get conflicts() { return conflicts; },
    from(table) {
      assert.equal(table, "orders");
      let payload;
      const filters = {};
      const query = {
        select(fields) { assert.ok(["id,metadata", "id,metadata,items"].includes(fields)); return query; },
        eq(field, value) { filters[field] = value; return query; },
        is(field, value) { filters[field] = value; return query; },
        update(value) { payload = value; return query; },
        async single() {
          reads++;
          assert.equal(filters.id, row.id);
          return options.denyRead
            ? { data: null, error: { code: "42501" } }
            : { data: copy(row), error: null };
        },
        async maybeSingle() {
          writes++;
          assert.equal(filters.id, row.id);
          if (options.denyWrite) return { data: null, error: { code: "42501" } };
          if (options.conflictOnce && !conflicts) {
            conflicts++;
            row.metadata = { ...row.metadata, note: "concurrent edit" };
          }
          const matched = filters.metadata === null
            ? row.metadata === null
            : JSON.stringify(JSON.parse(filters.metadata)) === JSON.stringify(row.metadata);
          if (!matched) return options.zeroRowError
            ? { data: null, error: { code: "PGRST116", details: "The result contains 0 rows" } }
            : { data: null, error: null };
          row = { ...row, metadata: copy(payload.metadata) };
          return { data: copy(row), error: null };
        },
      };
      return query;
    },
  };
}

test("accepts USD cents, zero and decimal comma; rejects malformed costs", () => {
  assert.equal(parseCostAmount(" 145,25 "), 145.25);
  assert.equal(parseCostAmount(".50"), .5);
  assert.equal(parseCostAmount("0"), 0);
  for (const raw of ["", "-1", "abc", "1e3", "1.234", "1,2.3", "$12", "1000001", null]) {
    assert.throws(() => parseCostAmount(raw));
  }
  assert.equal(unitCostToLineCost(145.25, 2), 290.5);
  assert.throws(() => unitCostToLineCost(50, 0));
});

test("saves unit-derived line cost, another line and shipping without losing other order fields", async () => {
  const db = storage({
    status: "paid",
    email: "fixture@example.test",
    address: "existing shipping details",
    lineCostOverrides: { 1: 50 },
    supplierShippingOverride: 60,
  });
  const save = createOrderCostSaver(db);
  const results = await Promise.all([
    save("order-1", { kind: "line", index: 0, amount: unitCostToLineCost(145.25, 2) }),
    save("order-1", { kind: "shipping", amount: 100 }),
  ]);
  assert.equal(results[0].metadata.lineCostOverrides[0], 290.5);
  assert.equal(results[1].metadata.lineCostOverrides[0], 290.5);
  assert.deepEqual(db.snapshot.metadata, {
    status: "paid",
    email: "fixture@example.test",
    address: "existing shipping details",
    lineCostOverrides: { 0: 290.5, 1: 50 },
    supplierShippingOverride: 100,
  });
  const reloaded = await db.from("orders").select("id,metadata").eq("id", "order-1").single();
  assert.equal(reloaded.data.metadata.supplierShippingOverride, 100);
  assert.equal(reloaded.data.metadata.lineCostOverrides[0], 290.5);
});

test("unknown cost can be saved as an override", async () => {
  const db = storage({ items: [{ name: "Unknown" }], status: "paid" });
  const saved = await createOrderCostSaver(db)("order-1", { kind: "line", index: 0, amount: 42 });
  assert.equal(saved.metadata.lineCostOverrides[0], 42);
  assert.deepEqual(saved.metadata.items, [{ name: "Unknown" }]);
});

test("older orders with empty metadata items use the structured items column", async () => {
  const db = storage({ status: "paid", items: [] });
  const saved = await createOrderCostSaver(db)("order-1", { kind: "line", index: 1, amount: 25 });
  assert.equal(saved.metadata.lineCostOverrides[1], 25);
  assert.deepEqual(saved.metadata.items, []);
});

test("a concurrent metadata change is preserved on retry", async () => {
  const db = storage({ status: "paid", shippingType: "express" }, { conflictOnce: true, zeroRowError: true });
  await createOrderCostSaver(db)("order-1", { kind: "shipping", amount: 99.5 });
  assert.equal(db.conflicts, 1);
  assert.equal(db.writes, 2);
  assert.equal(db.snapshot.metadata.note, "concurrent edit");
  assert.equal(db.snapshot.metadata.supplierShippingOverride, 99.5);
});

test("denied updates and reads cannot report success or change local storage", async () => {
  const deniedWrite = storage({ status: "paid" }, { denyWrite: true });
  await assert.rejects(createOrderCostSaver(deniedWrite)("order-1", { kind: "line", index: 0, amount: 25 }), /denied.*42501/);
  assert.deepEqual(deniedWrite.snapshot.metadata, { status: "paid" });
  const deniedRead = storage({ status: "paid" }, { denyRead: true });
  await assert.rejects(createOrderCostSaver(deniedRead)("order-1", { kind: "shipping", amount: 25 }), /denied.*42501/);
  assert.equal(deniedRead.writes, 0);
});

test("invalid input never reaches storage; later valid edits still work", async () => {
  const db = storage({ status: "paid" });
  const save = createOrderCostSaver(db);
  await assert.rejects(save("order-1", { kind: "line", index: 0, amount: -1 }), /non-negative/);
  await assert.rejects(save("order-1", { kind: "line", index: -2, amount: 5 }), /Invalid order line/);
  assert.equal(db.reads, 0);
  assert.equal(db.writes, 0);
  await save("order-1", { kind: "line", index: 0, amount: 5 });
  assert.equal(db.snapshot.metadata.lineCostOverrides[0], 5);
});

test("existing metadata cannot be overwritten if its structure is invalid", async () => {
  const db = storage({ lineCostOverrides: ["old", "values"] });
  await assert.rejects(createOrderCostSaver(db)("order-1", { kind: "line", index: 0, amount: 5 }), /invalid/);
  assert.equal(db.writes, 0);
});
