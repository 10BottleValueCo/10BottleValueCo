// Contact drafts only. Never persist payment data, verification, or attestations.
export const CONTACT_FIELDS = Object.freeze(['firstName', 'lastName', 'country', 'address', 'address2', 'city', 'state', 'postalCode', 'phone', 'carrierPreference']);
const DRAFT_FIELDS = [...CONTACT_FIELDS, 'taxId', 'orderNotes'];
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
export const checkoutOwner = user => user?.id || user?.email?.trim().toLowerCase() || 'guest';
export const checkoutDraftKey = user => `tbv-checkout-details-v1:${checkoutOwner(user)}`;
export function contactDetails(form) {
  return Object.fromEntries(CONTACT_FIELDS.map(field => [field, typeof form?.[field] === 'string' ? form[field].slice(0, 500).trim() : '']));
}
export function checkoutDetails(user, draft = {}) {
  return { ...Object.fromEntries(DRAFT_FIELDS.map(field => [field,
    typeof draft?.[field] === 'string' ? draft[field].slice(0, 500) : typeof user?.[field] === 'string' ? user[field].slice(0, 500) : '',
  ])), email: user?.email || '' };
}
export function loadCheckoutDetails(storage, user, now = Date.now()) {
  try {
    const saved = JSON.parse(storage?.getItem(checkoutDraftKey(user)) || 'null');
    if (saved?.version === 1 && saved.owner === checkoutOwner(user) && Number.isFinite(saved.savedAt)
      && saved.savedAt <= now && now - saved.savedAt < MAX_AGE) return checkoutDetails(user, saved.form);
    storage?.removeItem(checkoutDraftKey(user));
  } catch { /* Disabled/corrupt storage must not break checkout. */ }
  return checkoutDetails(user);
}
export function saveCheckoutDetails(storage, user, form, now = Date.now()) {
  const safe = checkoutDetails(user, form);
  delete safe.email; // Always derive email from the signed-in account.
  try {
    storage?.setItem(checkoutDraftKey(user), JSON.stringify({ version: 1, owner: checkoutOwner(user), savedAt: now, form: safe }));
    return true;
  } catch { return false; }
}
export function clearCheckoutDetails(storage, user) {
  try { storage?.removeItem(checkoutDraftKey(user)); } catch { /* Best effort. */ }
}

// Bind the write to the captured session token, even if another account signs in
// while it is in flight. This never updates authentication email or passwords.
export async function saveCheckoutProfile({ auth, url, anonKey, user, form, fetcher = fetch }) {
  try {
    const { data } = await auth.getSession();
    const session = data?.session;
    if (!user?.id || session?.user?.id !== user.id || !session?.access_token) return false;
    const response = await fetcher(`${url}/auth/v1/user`, {
      method: 'PUT', headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: contactDetails(form) }), signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch { return false; }
}
