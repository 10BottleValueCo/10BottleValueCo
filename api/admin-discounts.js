import { requireAdmin } from './_auth.js';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fields = 'id,email,code,rate,used,created_at,active,title,starts_at,ends_at,minimum_subtotal_cents,revision,updated_at';
const invalid = message => Object.assign(new Error(message), { status: 400 });
export function discountInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid('Enter the discount details.');
  const id = body.id || null, revision = body.revision ?? null;
  const code = String(body.code || '').trim().toUpperCase();
  const email = body.audience === 'public' ? '__PUBLIC__' : String(body.email || '').trim().toLowerCase();
  const rate = Number(body.percentage) / 100;
  const minimum = Number(body.minimumSubtotal || 0);
  const title = String(body.title || '').trim();
  if ((id !== null && !UUID.test(id)) || (id && (!Number.isSafeInteger(revision) || revision < 1)) || (!id && revision !== null)
    || !/^[A-Z0-9_-]{1,80}$/.test(code) || ['REVIEW10', 'OWNERFREESHIP'].includes(code)
    || !['public', 'personal'].includes(body.audience)
    || (email !== '__PUBLIC__' && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    || !Number.isFinite(rate) || rate <= 0 || rate > 1 || typeof body.active !== 'boolean' || title.length > 120
    || !Number.isFinite(minimum) || minimum < 0 || minimum > 100000 || Math.abs(minimum * 100 - Math.round(minimum * 100)) > 1e-7)
    throw invalid('Check the code, percentage, customer and minimum order amount.');
  const date = value => {
    if (value === null || value === '' || value === undefined) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw invalid('Enter a date with a time zone.');
    return new Date(value).toISOString();
  };
  const starts = date(body.startsAt), ends = date(body.endsAt);
  if (starts && ends && ends <= starts) throw invalid('The end must be after the start.');
  return { p_id: id, p_expected_revision: revision, p_code: code, p_email: email, p_rate: rate, p_active: body.active,
    p_title: title, p_starts_at: starts, p_ends_at: ends, p_minimum_subtotal_cents: Math.round(minimum * 100) };
}
export function discountView(row) {
  if (!row || !UUID.test(row.id || '') || typeof row.email !== 'string' || typeof row.code !== 'string'
    || !Number.isFinite(Number(row.rate)) || Number(row.rate) <= 0 || Number(row.rate) > 1
    || typeof row.active !== 'boolean' || !Number.isSafeInteger(row.revision) || row.revision < 1
    || !Number.isSafeInteger(row.minimum_subtotal_cents) || row.minimum_subtotal_cents < 0) throw new Error('Malformed discount');
  return { id: row.id, code: row.code, title: row.title, percentage: Number((Number(row.rate)*100).toFixed(4)),
    audience: row.email === '__PUBLIC__' ? 'public' : 'personal', email: row.email === '__PUBLIC__' ? '' : row.email,
    used: row.used === true, active: row.active, startsAt: row.starts_at, endsAt: row.ends_at,
    minimumSubtotal: row.minimum_subtotal_cents / 100, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function storage(path, { method = 'GET', body } = {}) {
  const base = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Storage unavailable');
  const response = await fetch(`${base}/rest/v1/${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000), redirect: 'error' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (['DISCOUNT_REVISION_CONFLICT','DISCOUNT_ALREADY_EXISTS','DISCOUNT_IDENTITY_OR_USAGE_LOCKED','MERIT_PROMO_RESERVED'].some(code => String(data?.message || '').includes(code)))
      throw Object.assign(new Error('This code changed, is already in use, or is reserved by a payment. Refresh before editing.'), { status: 409 });
    throw new Error('Storage unavailable');
  }
  return data;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Vary', 'Authorization');
  if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); return res.status(405).json({ok:false,error:'Method not allowed.'}); }
  const admin = await requireAdmin(req, res); if (!admin) return;
  if (!admin.email_confirmed_at) return res.status(403).json({ok:false,error:'A confirmed administrator account is required.'});
  try {
    if (req.method === 'GET') {
      const page = Number(req.query?.page ?? 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 1000) throw invalid('Invalid page.');
      const rows = await storage(`user_promos?${new URLSearchParams({select:fields,order:'created_at.desc,id.asc',limit:'101',offset:String(page*100)})}`);
      if (!Array.isArray(rows) || rows.length > 101) throw new Error('Malformed list');
      return res.status(200).json({ok:true,discounts:rows.slice(0,100).map(discountView),page,hasMore:rows.length>100,fetchedAt:new Date().toISOString()});
    }
    if (Buffer.byteLength(JSON.stringify(req.body || {})) > 8000) throw invalid('The discount details are too long.');
    const input = discountInput(req.body);
    const row = await storage('rpc/save_operations_discount',{method:'POST',body:{...input,p_actor_id:admin.id}});
    const discount = discountView(row);
    if (discount.code !== input.p_code || row.email !== input.p_email || Number(row.rate) !== input.p_rate || row.active !== input.p_active
      || row.minimum_subtotal_cents !== input.p_minimum_subtotal_cents || row.title !== input.p_title
      || (row.starts_at ? new Date(row.starts_at).toISOString() : null) !== input.p_starts_at
      || (row.ends_at ? new Date(row.ends_at).toISOString() : null) !== input.p_ends_at
      || (input.p_id && row.id !== input.p_id)) throw new Error('Save unacknowledged');
    return res.status(200).json({ok:true,discount});
  } catch (error) { return res.status(error.status || 503).json({ok:false,error:error.status ? error.message : 'Discounts could not be verified. Please refresh and retry.'}); }
}
