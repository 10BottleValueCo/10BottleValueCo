const STORAGE_KEY = 'tbv-store-credit-admin-adjustment';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = (message = 'Store credit could not be confirmed. Retry the same adjustment before submitting another one.') => new Error(message);

export async function adjustStoreCredit({ supabase, storage, cryptoApi = globalThis.crypto, email, mode, amount, note = '' }) {
  const owner = String(email || '').trim().toLowerCase();
  const number = Number(amount);
  if ((mode === 'add' || mode === 'set') && number < 0) throw fail('Enter a nonnegative amount. Choose Subtract to remove Store Credit.');
  const cents = Math.round((mode === 'subtract' ? Math.abs(number) : number) * 100);
  const memo = String(note || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner) || !['set', 'add', 'subtract'].includes(mode)
    || String(amount).trim() === '' || !Number.isFinite(number) || !Number.isSafeInteger(cents) || cents < 0
    || Math.abs(Math.abs(number) * 100 - cents) > 1e-7 || memo.length > 2000) throw fail('Enter a valid email and an amount with no more than two decimal places.');
  if (!cryptoApi?.subtle || typeof cryptoApi.randomUUID !== 'function' || typeof supabase?.rpc !== 'function') throw fail();
  const digest = Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ email: owner, mode, amountCents: cents, note: memo })))), byte => byte.toString(16).padStart(2, '0')).join('');
  let previous;
  try { previous = JSON.parse(storage.getItem(STORAGE_KEY) || 'null'); } catch { throw fail(); }
  if (previous && (!uuid.test(previous.requestId || '') || !/^[a-f0-9]{64}$/.test(previous.digest || ''))) throw fail();
  if (previous && previous.digest !== digest) throw fail('A previous credit adjustment is unconfirmed. Retry those same inputs before starting another adjustment.');
  const requestId = previous?.requestId || cryptoApi.randomUUID();
  // Persist only a UUID and digest: no email, note, amount, balance, or token.
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ requestId, digest })); } catch { throw fail(); }
  let result;
  try {
    result = await supabase.rpc('adjust_store_credit', { p_request_id: requestId, p_email: owner, p_mode: mode, p_amount_cents: cents, p_note: memo });
  } catch { throw fail(); }
  const data = result?.data;
  if (result?.error || data?.ok !== true) {
    // Only explicit transaction-level business rejections can release this key.
    const definitive = { STORE_CREDIT_RESERVATION_PENDING: 'This balance has a pending payment reservation. Resolve that payment before adjusting credit.',
      STORE_CREDIT_ADMIN_REQUIRED: 'Sign in with the authorized administrator account.',
      MERIT_CREDIT_BALANCE_UNAVAILABLE: 'This credit balance needs support review before it can be adjusted.',
      CREDIT_ADJUSTMENT_INVALID: 'Check the credit adjustment and try again.' };
    if (!result?.error && Object.hasOwn(definitive, data?.error)) {
      storage.removeItem(STORAGE_KEY);
      throw fail(definitive[data.error]);
    }
    throw fail();
  }
  if (data.requestId !== requestId || data.email !== owner || data.mode !== mode || data.amountCents !== cents
    || data.note !== (memo || null) || typeof data.replayed !== 'boolean' || !Number.isSafeInteger(data.balanceCents) || data.balanceCents < 0) throw fail();
  try { storage.removeItem(STORAGE_KEY); } catch { throw fail(); }
  return { email: owner, balance: data.balanceCents / 100, note: memo, replayed: data.replayed };
}
