// This cache is navigation assistance only. Orders, prices and paid state remain
// server-authoritative. An unchanged attempt reopens its original hosted page.
export function hostedPaymentUrl(value, provider) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const hosts = {
    nowpayments: ['nowpayments.io'],
    // CatalystPay validates its invoice and HTTPS link on the server.
    catalystpay: null,
    paylio: ['paylio.org'],
  };
  if (!Object.hasOwn(hosts, provider) || (hosts[provider] && !hosts[provider].includes(url.hostname))) return null;
  return url.href;
}
export function createLegacyAttemptManager({ cryptoApi = globalThis.crypto } = {}) {
  const attempts = new Map();
  let journey = '', owner = '';
  return {
    begin(id, userId) { if (journey !== id || owner !== userId) attempts.clear(); journey = id; owner = userId; },
    async prepare(provider, selection, snapshot, userId) {
      if (!journey || !owner || owner !== userId) throw new Error('Sign in again before continuing checkout.');
      const expectedJourney = journey, expectedOwner = owner;
      const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ provider, selection, snapshot })));
      if (journey !== expectedJourney || owner !== expectedOwner) throw new Error('Your checkout changed. Review it and continue again.');
      const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
      if (!attempts.has(key)) attempts.set(key, { orderId: `INV-${cryptoApi.randomUUID().replaceAll('-', '').toUpperCase()}`, provider, owner, journey, url: null });
      return attempts.get(key);
    },
    remember(attempt, url) {
      if (attempt.owner !== owner || attempt.journey !== journey || !Array.from(attempts.values()).includes(attempt)) throw new Error('Your checkout changed. Review it and continue again.');
      const safe = hostedPaymentUrl(url, attempt.provider);
      if (!safe) throw new Error('The payment page could not be verified. Please contact support.');
      attempt.url = safe;
      return safe;
    },
    clear() { journey = ''; owner = ''; attempts.clear(); },
  };
}
