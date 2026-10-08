import { requireVerifiedCustomer } from "./_require-customer.js";

const PAGE_SIZE = 100;
const MAX_OFFSET = 100000;
const ORDER_METADATA_FIELDS = [
  "affiliateCode",
  "affiliateCommission",
  "affiliateCommissionAdjustment",
  "affiliateCommissionDeduction",
  "createdAt",
  "fromWarehouse",
  "items",
  "paidAt",
  "refundCommissionDeduction",
  "shippingType",
  "status",
  "subtotal",
  "total",
];

class AffiliateAccountError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getSupabaseConfig() {
  const url = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new AffiliateAccountError(503, "Affiliate account data is unavailable.");
  }
  return { url, key };
}

async function supabaseGet(path) {
  const { url, key } = getSupabaseConfig();
  let response;
  try {
    response = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new AffiliateAccountError(503, "Affiliate account data is unavailable.");
  }
  if (!response.ok) {
    throw new AffiliateAccountError(503, "Affiliate account data is unavailable.");
  }
  const data = await response.json().catch(() => null);
  if (!Array.isArray(data)) {
    throw new AffiliateAccountError(503, "Affiliate account data is unavailable.");
  }
  return data;
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const allowed = ["dose", "fromWarehouse", "name", "noteLabel", "price", "quantity"];
  return Object.fromEntries(
    allowed
      .filter((key) => item[key] !== undefined && item[key] !== null)
      .map((key) => [key, item[key]]),
  );
}

function sanitizeMetadata(value) {
  const metadata =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const safe = Object.fromEntries(
    ORDER_METADATA_FIELDS
      .filter((key) => metadata[key] !== undefined && metadata[key] !== null)
      .map((key) => [key, metadata[key]]),
  );
  if (Array.isArray(safe.items)) {
    safe.items = safe.items.map(sanitizeItem).filter(Boolean);
  } else {
    delete safe.items;
  }
  return safe;
}

function sanitizeOrder(row) {
  return {
    id: String(row.id || ""),
    status: row.status || "",
    created_at: row.created_at || null,
    total: row.total ?? null,
    affiliate_code: row.affiliate_code || "",
    metadata: sanitizeMetadata(row.metadata),
  };
}

function readOffset(value) {
  if (value === undefined) return 0;
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new AffiliateAccountError(400, "Invalid page.");
  }
  return offset;
}

function pagedParams(select, filters, offset) {
  const params = new URLSearchParams({
    select,
    ...filters,
    order: "created_at.desc",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  return params.toString();
}

async function getAffiliate(email) {
  const params = new URLSearchParams({
    select: "code,email,active,created_at",
    email: `eq.${email}`,
    limit: "2",
  });
  const rows = await supabaseGet(`affiliates?${params.toString()}`);
  if (rows.length > 1) {
    throw new AffiliateAccountError(409, "Affiliate account needs support review.");
  }
  return rows[0] || null;
}

function normalizePublicCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,64}$/.test(code)) {
    throw new AffiliateAccountError(400, "Invalid affiliate code.");
  }
  return code;
}

async function getPublicAffiliateCode(code) {
  const params = new URLSearchParams({
    select: "code,active",
    code: `eq.${code}`,
    limit: "2",
  });
  const rows = await supabaseGet(`affiliates?${params.toString()}`);
  if (rows.length > 1) {
    throw new AffiliateAccountError(409, "Affiliate code needs support review.");
  }
  const affiliate = rows[0];
  return affiliate
    ? { code: String(affiliate.code || "").trim().toUpperCase(), active: affiliate.active !== false }
    : null;
}

async function getPayoutTotal(code) {
  const rows = await supabaseGet(
    `affiliate_payouts?${new URLSearchParams({
      select: "amount",
      affiliate_code: `eq.${code}`,
      order: "created_at.asc",
      limit: "10000",
    }).toString()}`,
  );
  return rows.reduce((total, row) => total + Number(row.amount || 0), 0);
}

async function getAffiliatePage(code, offset) {
  const orderSelect = "id,status,created_at,total,metadata,affiliate_code";
  const payoutsPromise =
    offset === 0 ? getPayoutTotal(code).catch(() => null) : Promise.resolve(null);
  const [
    ledgerRows,
    codeColumnOrders,
    codeMetadataOrders,
    payoutsTotal,
  ] = await Promise.all([
    supabaseGet(
      `affiliate_orders?${pagedParams(
        "order_id,affiliate_code,commission_amount,shipping_type,created_at",
        { affiliate_code: `eq.${code}` },
        offset,
      )}`,
    ),
    supabaseGet(
      `orders?${pagedParams(
        orderSelect,
        { affiliate_code: `eq.${code}` },
        offset,
      )}`,
    ),
    supabaseGet(
      `orders?${pagedParams(
        orderSelect,
        { "metadata->>affiliateCode": `eq.${code}` },
        offset,
      )}`,
    ),
    payoutsPromise,
  ]);

  return {
    ledgerRows,
    codeColumnOrders: codeColumnOrders.map(sanitizeOrder),
    codeMetadataOrders: codeMetadataOrders.map(sanitizeOrder),
    payoutsTotal,
    hasMore:
      ledgerRows.length === PAGE_SIZE ||
      codeColumnOrders.length === PAGE_SIZE ||
      codeMetadataOrders.length === PAGE_SIZE,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  if (req.query?.code !== undefined) {
    try {
      const code = normalizePublicCode(req.query.code);
      const affiliate = await getPublicAffiliateCode(code);
      return res.status(200).json({ ok: true, affiliate });
    } catch (error) {
      const status =
        error instanceof AffiliateAccountError ? error.status : 503;
      if (status >= 500) {
        req.log?.error({ statusCode: status }, "Affiliate code lookup failed");
      }
      return res.status(status).json({
        ok: false,
        error:
          error instanceof AffiliateAccountError
            ? error.message
            : "Affiliate code lookup is temporarily unavailable.",
      });
    }
  }

  const customer = await requireVerifiedCustomer(req, res);
  if (!customer) return;

  try {
    const offset = readOffset(req.query?.offset);
    const affiliate = await getAffiliate(customer.email);
    if (!affiliate) {
      return res.status(200).json({
        ok: true,
        affiliate: null,
        ledgerRows: [],
        codeColumnOrders: [],
        codeMetadataOrders: [],
        payoutsTotal: 0,
        hasMore: false,
      });
    }

    const code = String(affiliate.code || "").trim().toUpperCase();
    const includeOrders = req.query?.orders === "1";
    const page = includeOrders
      ? await getAffiliatePage(code, offset)
      : {
          ledgerRows: [],
          codeColumnOrders: [],
          codeMetadataOrders: [],
          payoutsTotal: 0,
          hasMore: false,
        };
    return res.status(200).json({
      ok: true,
      affiliate: {
        code,
        email: customer.email,
        active: affiliate.active !== false,
        created_at: affiliate.created_at || null,
      },
      ...page,
    });
  } catch (error) {
    const status =
      error instanceof AffiliateAccountError ? error.status : 503;
    if (status >= 500) {
      req.log?.error(
        { statusCode: status },
        "Affiliate account request failed",
      );
    }
    return res.status(status).json({
      ok: false,
      error:
        error instanceof AffiliateAccountError
          ? error.message
          : "Affiliate account data is temporarily unavailable.",
    });
  }
}
