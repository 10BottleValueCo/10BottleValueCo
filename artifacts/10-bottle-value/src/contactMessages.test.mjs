import assert from "node:assert/strict";
import { test } from "node:test";
import { buildContactTimeline, fetchContactMessages, hasContactEmail } from "./contactMessages.js";

test("guest messages need a reply address", () => {
  assert.equal(hasContactEmail("guest@example.com"), true);
  assert.equal(hasContactEmail(""), false);
  assert.equal(hasContactEmail("not-an-email"), false);
});

test("a new reply to an old message appears at the end of the customer conversation", () => {
  const rows = [
    { id: 1, message: "July question", created_at: "2026-07-13T01:00:00Z", admin_reply: "September answer", replied_at: "2026-09-28T06:05:00Z" },
    { id: 2, message: "Recent question", created_at: "2026-09-28T06:04:00Z" },
    { id: 3, message: "[Admin initiated message]", created_at: "2026-09-28T06:06:00Z", admin_reply: "Follow up", replied_at: "2026-09-28T06:06:00Z" },
  ];
  assert.deepEqual(
    buildContactTimeline(rows).map(({ type, message }) => `${type}:${message.id}`),
    ["sent:1", "sent:2", "reply:1", "reply:3"],
  );
});

test("all pages of a conversation are loaded, not just the first Supabase page", async () => {
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id, email: "test@example.com" }));
  const requests = [];
  const supabase = {
    from(table) {
      assert.equal(table, "contact_messages");
      return {
        select() { return this; },
        eq(field, email) { assert.equal(field, "email"); assert.equal(email, "test@example.com"); return this; },
        order() { return this; },
        async range(start, end) { requests.push(start); return { data: rows.slice(start, end + 1), error: null }; },
      };
    },
  };
  assert.equal((await fetchContactMessages(supabase, "test@example.com")).length, 1001);
  assert.deepEqual(requests, [0, 500, 1000]);
});

test("a failed page rejects rather than returning an incomplete conversation", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        order() { return this; },
        async range(start) {
          if (start) return { error: { message: "Network unavailable" } };
          return { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null };
        },
      };
    },
  };
  await assert.rejects(fetchContactMessages(supabase), { message: "Network unavailable" });
});