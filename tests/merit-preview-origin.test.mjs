import assert from "node:assert/strict";
import test from "node:test";
import { assertCheckoutOrigin } from "../api/_merit-core.js";

const requestWithOrigin = origin => ({ headers: { origin } });
const rejectedByOriginGuard = error => error?.code === "MERIT_ORIGIN_REJECTED";

test("live Replit checkout accepts only the exact configured domain in development", () => {
  const env = { NODE_ENV: "development", MERIT_MODE: "live", MERIT_ALLOW_REPLIT_PREVIEW_LIVE: "true", REPLIT_DEV_DOMAIN: "workspace.replit.dev" };
  assert.doesNotThrow(() => assertCheckoutOrigin(requestWithOrigin("https://workspace.replit.dev"), env));
});

test("live Replit checkout rejects other domains and non-default ports", () => {
  const env = { NODE_ENV: "development", MERIT_MODE: "live", MERIT_ALLOW_REPLIT_PREVIEW_LIVE: "true", REPLIT_DEV_DOMAIN: "workspace.replit.dev" };
  assert.throws(() => assertCheckoutOrigin(requestWithOrigin("https://other.replit.dev"), env), rejectedByOriginGuard);
  assert.throws(() => assertCheckoutOrigin(requestWithOrigin("https://workspace.replit.dev:444"), env), rejectedByOriginGuard);
});

test("live Replit checkout requires the explicit preview flag", () => {
  const env = { NODE_ENV: "development", MERIT_MODE: "live", REPLIT_DEV_DOMAIN: "workspace.replit.dev" };
  assert.throws(() => assertCheckoutOrigin(requestWithOrigin("https://workspace.replit.dev"), env), rejectedByOriginGuard);
});

test("production never accepts a Replit preview origin", () => {
  const env = { NODE_ENV: "production", MERIT_MODE: "live", MERIT_ALLOW_REPLIT_PREVIEW_LIVE: "true", REPLIT_DEV_DOMAIN: "workspace.replit.dev" };
  assert.throws(() => assertCheckoutOrigin(requestWithOrigin("https://workspace.replit.dev"), env), rejectedByOriginGuard);
  assert.doesNotThrow(() => assertCheckoutOrigin(requestWithOrigin("https://10bottlevalue.co"), env));
});

test("test mode continues to allow secure Replit preview hosts", () => {
  assert.doesNotThrow(() => assertCheckoutOrigin(requestWithOrigin("https://workspace.replit.dev"), { MERIT_MODE: "test", REPLIT_DEV_DOMAIN: "workspace.replit.dev" }));
});
