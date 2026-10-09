const ID = /^[A-Za-z0-9_-]{1,100}$/;
export async function readNowPaymentsPayment(paymentId, { env = process.env, fetcher = globalThis.fetch } = {}) {
  const id = String(paymentId ?? '');
  if (!ID.test(id)) return { status: 400, code: 'INVALID_PAYMENT_ID' };
  const key = env.NOWPAYMENTS_API_KEY || env.NOW_PAYMENTS_API_KEY;
  if (!key) return { status: 503, code: 'PAYMENT_VERIFICATION_UNAVAILABLE' };
  try {
    const response = await fetcher(`https://api.nowpayments.io/v1/payment/${encodeURIComponent(id)}`, {
      headers: { 'x-api-key': key }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Provider verification unavailable');
    const text = await response.text();
    if (Buffer.byteLength(text) > 100000) throw new Error('Unexpected provider response');
    const payment = JSON.parse(text);
    if (!payment || typeof payment !== 'object' || Array.isArray(payment)
      || String(payment.payment_id ?? '') !== id || typeof payment.order_id !== 'string'
      || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(payment.order_id)) throw new Error('Payment binding missing');
    return { payment };
  } catch { return { status: 503, code: 'PAYMENT_VERIFICATION_UNAVAILABLE' }; }
}
