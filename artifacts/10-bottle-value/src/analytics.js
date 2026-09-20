/**
 * 10BottleValue Analytics
 * Tracks anonymous + authenticated user behaviour.
 * Every event is a fire-and-forget insert into `analytics_events` (Supabase).
 * Session ID persists in localStorage so anonymous visitors are tracked across pages.
 */

import { supabase } from "./supabase.js";

// ── Session ID ─────────────────────────────────────────────────────────────
function getSessionId() {
  const KEY = "tbv-sid";
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

export const SESSION_ID = getSessionId();

// ── Core track function ────────────────────────────────────────────────────
let _userId = null;
export function setAnalyticsUser(uid) {
  _userId = uid || null;
}

export function track(eventType, properties = {}) {
  const payload = {
    session_id: SESSION_ID,
    user_id: _userId || null,
    event_type: eventType,
    page: properties.page || null,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    properties,
    created_at: new Date().toISOString(),
  };

  // Fire and forget – never block the UI
  supabase
    .from("analytics_events")
    .insert(payload)
    .then(({ error }) => {
      if (error) console.debug("[analytics] insert error:", error.message);
    })
    .catch(() => {});
}

// ── Page view helper ──────────────────────────────────────────────────────
let _pageEnterAt = Date.now();
let _lastPage = null;

export function trackPageView(page, extra = {}) {
  const now = Date.now();
  // Track time spent on previous page
  if (_lastPage) {
    track("page_exit", { page: _lastPage, duration_ms: now - _pageEnterAt });
  }
  _pageEnterAt = now;
  _lastPage = page;
  track("page_view", { page, ...extra });
}

// Track when user closes/leaves the tab
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_lastPage) {
      // Use sendBeacon so it fires even on tab close
      const payload = JSON.stringify({
        session_id: SESSION_ID,
        user_id: _userId,
        event_type: "page_exit",
        page: _lastPage,
        properties: { page: _lastPage, duration_ms: Date.now() - _pageEnterAt },
        created_at: new Date().toISOString(),
      });
      // Best-effort via beacon — falls back to nothing on failure
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`;
        navigator.sendBeacon?.(url, new Blob([payload], { type: "application/json" }));
      } catch (_) {}
    }
  });
}
