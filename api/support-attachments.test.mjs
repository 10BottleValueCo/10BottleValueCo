import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  extractSupportAttachmentPath,
  handleSupportAttachmentAccess,
  handleSupportAttachmentUpload,
} from "./_support-attachments.js";

const SUPABASE_URL = "https://supabase.test";
const USER_EMAIL = "customer@example.org";
const OBJECT_PATH = "4de52af1-c117-4987-83d1-48959d947a3d.png";

function response(body, status = 200) {
  if (status === 204) return new Response(null, { status });
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function withEnvironment(t, fetchMock) {
  const keys = [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPPORT_ATTACHMENTS_SUPABASE_URL",
    "SUPPORT_ATTACHMENTS_ANON_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPPORT_ATTACHMENTS_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SUPPORT_ATTACHMENTS_SERVICE_ROLE_KEY = "test-service-role-key";

  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPPORT_ATTACHMENTS_SERVICE_ROLE_KEY;
  });
}

function request(body, options = {}) {
  return {
    method: options.method || "POST",
    headers: options.headers || {},
    body,
  };
}

function serviceHeaders(options) {
  return options.headers.apikey === "test-service-role-key";
}

function verifiedUserResponse(email = USER_EMAIL) {
  return response({
    email,
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
  });
}

test("guest upload uses a server-generated object path and stores only a capability hash", async (t) => {
  const calls = [];
  withEnvironment(t, async (url, options = {}) => {
    calls.push({ url: String(url), options });
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/storage/v1/object/upload/sign/chat-images/")) {
      const path = String(url).split("/").at(-1);
      return response({
        url: `/object/upload/sign/chat-images/${path}?token=short-upload-token`,
      });
    }
    if (String(url).endsWith("/rest/v1/support_chat_attachments")) {
      return response(undefined, 204);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentUpload(
    request({
      fileName: "research.png",
      contentType: "image/png",
      size: 128,
    }),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.match(res.body.path, /^[a-f0-9-]{36}\.png$/);
  assert.equal(
    new URL(res.body.uploadUrl).origin,
    SUPABASE_URL,
    "the signed upload URL stays on the configured Supabase project",
  );
  assert.match(res.body.uploadUrl, /short-upload-token/);

  const cookie = res.headers["Set-Cookie"];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/support-attachments\//);
  const capability = cookie.match(/tbv_guest_attachment=([^;]+)/)?.[1];
  assert.ok(capability);

  const metadataCall = calls.find((call) =>
    call.url.endsWith("/rest/v1/support_chat_attachments"),
  );
  const metadata = JSON.parse(metadataCall.options.body);
  assert.equal(
    metadata.guest_capability_hash,
    createHash("sha256").update(decodeURIComponent(capability)).digest("hex"),
  );
  assert.notEqual(metadata.guest_capability_hash, decodeURIComponent(capability));
});

test("guest upload never reflects a request cookie into Set-Cookie", async (t) => {
  const capability = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmno";
  let storedHash = "";
  withEnvironment(t, async (url, options = {}) => {
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/storage/v1/object/upload/sign/chat-images/")) {
      const path = String(url).split("/").at(-1);
      return response({
        url: `/object/upload/sign/chat-images/${path}?token=short-upload-token`,
      });
    }
    if (String(url).endsWith("/rest/v1/support_chat_attachments")) {
      storedHash = JSON.parse(options.body).guest_capability_hash;
      return response(undefined, 204);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentUpload(
    request(
      {
        fileName: "research.png",
        contentType: "image/png",
        size: 128,
      },
      { headers: { cookie: `tbv_guest_attachment=${capability}` } },
    ),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Set-Cookie"], undefined);
  assert.equal(
    storedHash,
    createHash("sha256").update(capability).digest("hex"),
  );
});

test("invalid attachment types fail before any storage or database request", async (t) => {
  let fetchCount = 0;
  withEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected request");
  });

  const res = mockResponse();
  await handleSupportAttachmentUpload(
    request({
      fileName: "payload.js",
      contentType: "application/javascript",
      size: 8,
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCount, 0);
});

test("a dedicated staging URL never falls back to the shared project key", async (t) => {
  let fetchCount = 0;
  withEnvironment(t, async () => {
    fetchCount += 1;
    throw new Error("Unexpected request");
  });
  process.env.SUPPORT_ATTACHMENTS_SUPABASE_URL =
    "https://staging-supabase.test";
  delete process.env.SUPPORT_ATTACHMENTS_SERVICE_ROLE_KEY;

  const res = mockResponse();
  await handleSupportAttachmentUpload(
    request({
      fileName: "sample.png",
      contentType: "image/png",
      size: 128,
    }),
    res,
  );
  assert.equal(res.statusCode, 503);
  assert.equal(fetchCount, 0);
});

test("guest read links require the matching HttpOnly capability", async (t) => {
  const capability = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmno";
  const capabilityHash = createHash("sha256").update(capability).digest("hex");
  const calls = [];
  withEnvironment(t, async (url, options = {}) => {
    calls.push({ url: String(url), options });
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/rest/v1/support_chat_attachments?")) {
      assert.match(String(url), /guest_capability_hash/);
      return response([{ object_path: OBJECT_PATH }]);
    }
    if (String(url).endsWith("/storage/v1/object/sign/chat-images")) {
      assert.deepEqual(JSON.parse(options.body), {
        expiresIn: 3600,
        paths: [OBJECT_PATH],
      });
      return response([
        {
          path: OBJECT_PATH,
          signedURL: `/object/sign/chat-images/${OBJECT_PATH}?token=short-read-token`,
        },
      ]);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentAccess(
    request(
      { attachments: [{ path: OBJECT_PATH }] },
      {
        headers: {
          cookie: `tbv_guest_attachment=${capability}`,
        },
      },
    ),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.attachments.length, 1);
  assert.equal(res.body.attachments[0].reference, OBJECT_PATH);
  assert.match(res.body.attachments[0].url, /short-read-token/);
  const ownershipLookup = calls.find((call) =>
    String(call.url).includes("/rest/v1/support_chat_attachments?"),
  );
  const ownershipParams = new URL(ownershipLookup.url).searchParams;
  assert.equal(
    ownershipParams.get("object_path"),
    `in.(${OBJECT_PATH})`,
  );
  assert.equal(
    ownershipParams.get("guest_capability_hash"),
    `eq.${capabilityHash}`,
  );
  assert.equal(capabilityHash.length, 64);
});

test("guest capability cannot sign another guest's object", async (t) => {
  let readSigningCalls = 0;
  withEnvironment(t, async (url, options = {}) => {
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/rest/v1/support_chat_attachments?")) {
      return response([]);
    }
    if (String(url).endsWith("/storage/v1/object/sign/chat-images")) {
      readSigningCalls += 1;
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentAccess(
    request(
      { attachments: [{ path: OBJECT_PATH }] },
      {
        headers: {
          cookie: "tbv_guest_attachment=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmno",
        },
      },
    ),
    res,
  );
  assert.equal(res.statusCode, 403);
  assert.equal(readSigningCalls, 0);
});

test("signed-in customers can sign only paths in their own support message", async (t) => {
  const calls = [];
  withEnvironment(t, async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/auth/v1/user")) {
      return verifiedUserResponse();
    }
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/rest/v1/contact_messages?")) {
      return response([
        {
          id: 41,
          email: USER_EMAIL,
          message: `[IMAGE:${OBJECT_PATH}]`,
          admin_reply: null,
        },
      ]);
    }
    if (String(url).endsWith("/storage/v1/object/sign/chat-images")) {
      return response([
        {
          path: OBJECT_PATH,
          signedURL: `/object/sign/chat-images/${OBJECT_PATH}?token=customer-read-token`,
        },
      ]);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentAccess(
    request(
      {
        attachments: [
          { path: OBJECT_PATH, messageId: 41, field: "message" },
        ],
      },
      { headers: { authorization: "Bearer verified-user-token" } },
    ),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.match(res.body.attachments[0].url, /customer-read-token/);
  assert.ok(
    calls.some((call) =>
      call.url.includes("/rest/v1/contact_messages?"),
    ),
  );
});

test("customers cannot sign an attachment from another email's message", async (t) => {
  let readSigningCalls = 0;
  withEnvironment(t, async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) {
      return verifiedUserResponse();
    }
    assert.ok(serviceHeaders(options));
    if (String(url).includes("/rest/v1/contact_messages?")) {
      return response([
        {
          id: 41,
          email: "someone-else@example.org",
          message: `[IMAGE:${OBJECT_PATH}]`,
          admin_reply: null,
        },
      ]);
    }
    if (String(url).endsWith("/storage/v1/object/sign/chat-images")) {
      readSigningCalls += 1;
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const res = mockResponse();
  await handleSupportAttachmentAccess(
    request(
      {
        attachments: [
          { path: OBJECT_PATH, messageId: 41, field: "message" },
        ],
      },
      { headers: { authorization: "Bearer verified-user-token" } },
    ),
    res,
  );
  assert.equal(res.statusCode, 403);
  assert.equal(readSigningCalls, 0);
});

test("legacy public URLs normalize only for the configured bucket and project", () => {
  const legacyUrl = `${SUPABASE_URL}/storage/v1/object/public/chat-images/20261006-old_photo.png`;
  assert.equal(
    extractSupportAttachmentPath(legacyUrl, SUPABASE_URL),
    "20261006-old_photo.png",
  );
  assert.equal(
    extractSupportAttachmentPath(
      "https://attacker.example/storage/v1/object/public/chat-images/image.png",
      SUPABASE_URL,
    ),
    null,
  );
  assert.equal(
    extractSupportAttachmentPath("../private/key.png", SUPABASE_URL),
    null,
  );
});
