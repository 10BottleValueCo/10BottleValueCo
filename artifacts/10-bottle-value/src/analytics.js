/**
 * Anonymous storefront analytics. Events are sent through the server API so the
 * browser never needs database write permissions or the Supabase service key.
 */

import { supabase } from "./supabase.js";

const SESSION_KEY = "tbv-sid";

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getSessionId() {
  if (typeof window === "undefined") return createSessionId();
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id || !SESSION_ID_PATTERN.test(id)) {
      id = createSessionId();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return createSessionId();
  }
}

export const SESSION_ID = getSessionId();

function getDeviceType() {
  if (typeof navigator === "undefined") return "desktop";
  const userAgent = navigator.userAgent || "";
  const isTouchMac = /Macintosh|Mac OS X/i.test(userAgent) && navigator.maxTouchPoints > 1;
  const isTablet =
    /iPad|Tablet|PlayBook|Silk/i.test(userAgent) ||
    (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) ||
    isTouchMac;
  if (isTablet) return "tablet";
  if (/iPhone|iPod|Mobile|Windows Phone|Android/i.test(userAgent)) return "phone";

  const shortScreen = Math.min(window.screen?.width || 0, window.screen?.height || 0);
  if (navigator.maxTouchPoints > 1 && shortScreen > 0 && shortScreen < 700) return "phone";
  return "desktop";
}

function getSafeReferrer() {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

async function sendEvent(payload, keepalive = false) {
  const headers = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Anonymous event tracking still works if the visitor has no auth session.
  }

  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive,
    });
    if (!response.ok && import.meta.env.DEV) {
      console.debug("[analytics] event was not accepted:", response.status);
    }
  } catch {
    // Analytics must never block or interrupt the storefront.
  }
}

function makePayload(eventType, properties = {}) {
  return {
    session_id: SESSION_ID,
    event_type: eventType,
    page: typeof properties.page === "string" ? properties.page : null,
    referrer: getSafeReferrer(),
    properties: { ...properties, device_type: getDeviceType() },
  };
}

export function track(eventType, properties = {}) {
  if (typeof window === "undefined") return;
  void sendEvent(makePayload(eventType, properties));
}

let _pageEnterAt = Date.now();
let _lastPage = null;
let _pageExitQueued = false;

export function trackPageView(page, extra = {}) {
  const now = Date.now();
  if (_lastPage) {
    track("page_exit", { page: _lastPage, duration_ms: now - _pageEnterAt });
  }
  _pageEnterAt = now;
  _lastPage = page;
  _pageExitQueued = false;
  track("page_view", { page, ...extra });
}

function flushPageExit() {
  if (!_lastPage || _pageExitQueued) return;
  _pageExitQueued = true;
  const payload = makePayload("page_exit", {
    page: _lastPage,
    duration_ms: Date.now() - _pageEnterAt,
  });

  try {
    const queued = navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
    if (queued) return;
  } catch {
    // Fall through to a keepalive fetch if sendBeacon is unavailable.
  }
  void sendEvent(payload, true);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPageExit);
  window.addEventListener("beforeunload", flushPageExit);
}
