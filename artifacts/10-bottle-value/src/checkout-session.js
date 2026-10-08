const routes = new Set([
  "/api/create-payment",
  "/api/create-catalystpay-session",
  "/api/create-payment-intent",
  "/api/create-stripe-session",
]);
const emailKey = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const sessionError = () =>
  Object.assign(
    new Error(
      "Your checkout session changed or expired. Sign in again and retry.",
    ),
    { code: "CHECKOUT_SESSION_CHANGED" },
  );

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const normalizedText = (value) =>
  typeof value === "string" ? value.trim() : value;
const draftError = () =>
  new Error("Your order could not be saved. Please retry checkout.");

// This is only the request identity, not a price quote. Keep it in memory;
// raw contact details, retry keys and request fingerprints are never persisted.
function draftRequest(draft, email) {
  if (!isRecord(draft)) throw new Error("Invalid order draft.");
  const body = { email };
  for (const key of [
    "firstName",
    "lastName",
    "country",
    "address",
    "address2",
    "city",
    "state",
    "postalCode",
    "phone",
    "taxId",
    "orderNotes",
    "shippingType",
    "promoCode",
    "affiliateCode",
  ]) {
    body[key] = normalizedText(draft[key] ?? "");
  }
  body.storeCreditUsed = draft.storeCreditUsed ?? 0;
  const attestation = draft.purchaserAttestation;
  body.purchaserAttestation = isRecord(attestation)
    ? Object.fromEntries(
        [
          "over21AndResearchUseOnly",
          "qualifiedResearcherOrLicensedProfessional",
          "noHumanOrAnimalUse",
          "policiesAccepted",
        ].map((key) => [key, attestation[key]]),
      )
    : attestation;
  body.items = draft.items?.map((item) => {
    if (!isRecord(item)) throw new Error("Invalid cart item.");
    const warehouse = item.fromWarehouse;
    return {
      name: normalizedText(item.name),
      dose: normalizedText(item.dose),
      quantity: item.quantity,
      noteLabel: normalizedText(item.noteLabel ?? ""),
      ...(![undefined, "", "worldwide"].includes(warehouse)
        ? { fromWarehouse: warehouse }
        : {}),
    };
  });
  return body;
}

function newDraftKey() {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID !== "function") throw draftError();
  const key = crypto.randomUUID();
  if (!UUID_V4.test(key)) throw draftError();
  return key.toLowerCase();
}

// Check before draft persistence, and again immediately before payment I/O.
// Never keep the token in local storage or send it to caller-selected hosts.
export async function createCheckoutSession({
  supabase,
  expectedEmail,
  isCurrent = () => true,
  fetcher = fetch,
  draftAttemptRef = { current: null },
  accountScope = null,
}) {
  const email = emailKey(expectedEmail);
  async function readSession(expectedId) {
    if (!isCurrent()) throw sessionError();
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    if (
      !isCurrent() ||
      error ||
      !email ||
      !session?.access_token ||
      !session.user?.id ||
      emailKey(session.user.email) !== email ||
      (expectedId && session.user.id !== expectedId)
    )
      throw sessionError();
    return session;
  }
  // Session refresh can also stall before saveDraft gets control. Bound this
  // initial check separately; a late auth result cannot resume checkout.
  let initialTimer;
  let initial;
  try {
    initial = await Promise.race([
      readSession(),
      new Promise((_, reject) => {
        initialTimer = setTimeout(() => reject(sessionError()), 10_000);
      }),
    ]);
  } finally {
    clearTimeout(initialTimer);
  }
  return {
    email,
    async saveDraft(draft) {
      const controller = new AbortController();
      let attempt;
      let active = true;
      let timedOut = false;
      let timer;
      const assertActive = () => {
        if (!active || timedOut) throw draftError();
        if (!isCurrent()) throw sessionError();
      };
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(draftError());
        }, 10_000);
      });
      const save = async () => {
        const session = await readSession(initial.user.id);
        assertActive();
        const body = draftRequest(draft, email);
        const fingerprint = JSON.stringify(body);
        const previous = draftAttemptRef.current;
        const sameAccount =
          previous?.ownerId === session.user.id &&
          previous.email === email &&
          Object.is(previous.accountScope, accountScope);
        if (sameAccount && previous.pending)
          throw new Error("Your order is already being saved.");
        attempt =
          sameAccount && previous.fingerprint === fingerprint
            ? previous
            : {
                ownerId: session.user.id,
                email,
                accountScope,
                fingerprint,
                key: newDraftKey(),
                pending: false,
              };
        attempt.pending = true;
        draftAttemptRef.current = attempt;
        const response = await fetcher("/api/checkout-draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
          body: JSON.stringify({ ...body, requestIdempotencyKey: attempt.key }),
          signal: controller.signal,
        });
        assertActive();
        if (!response.ok) throw draftError();
        const payload = await response.json();
        assertActive();
        const order = payload?.order;
        if (
          payload?.ok !== true ||
          !order ||
          !/^INV-[A-F0-9]{24}$/.test(order.id) ||
          order.email !== email ||
          order.status !== "pending" ||
          order.total !== null ||
          order.pricingState !== "awaiting_provider_quote" ||
          !Array.isArray(order.items) ||
          order.items.length === 0 ||
          typeof order.subtotal !== "number" ||
          !Number.isFinite(order.subtotal) ||
          order.subtotal <= 0 ||
          typeof order.createdAt !== "string" ||
          !Number.isFinite(Date.parse(order.createdAt))
        ) {
          throw new Error("Invalid draft response.");
        }
        // Email-only React state cannot detect a replaced UUID with the same
        // email. Re-read the actual session before accepting private results.
        await readSession(initial.user.id);
        assertActive();
        return order;
      };
      try {
        // Abort is best effort. This deadline also covers a fetch implementation
        // that ignores abort and a response body that never finishes parsing.
        const order = await Promise.race([save(), deadline]);
        assertActive();
        if (draftAttemptRef.current !== attempt) throw sessionError();
        // A later deliberate order gets a new key. Only uncertain/failed saves
        // retain a key; provider requests have their own, separate lifecycle.
        draftAttemptRef.current = null;
        return order;
      } catch (error) {
        if (!isCurrent() || error?.code === "CHECKOUT_SESSION_CHANGED")
          throw sessionError();
        throw draftError();
      } finally {
        active = false;
        clearTimeout(timer);
        if (attempt && draftAttemptRef.current === attempt)
          attempt.pending = false;
      }
    },
    async post(route, body) {
      if (!routes.has(route))
        throw new Error("Unknown checkout payment route.");
      const session = await readSession(initial.user.id);
      const emailField =
        route === "/api/create-payment" ||
        route === "/api/create-catalystpay-session"
          ? "customer_email"
          : "email";
      const response = await fetcher(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        body: JSON.stringify({ ...body, [emailField]: email }),
      });
      if (!isCurrent()) throw sessionError();
      const read = async (method) => {
        const value = await response[method]();
        if (!isCurrent()) throw sessionError();
        return value;
      };
      return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        text: () => read("text"),
        json: () => read("json"),
      };
    },
  };
}
