const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const literalLike = (value) => value.replace(/[\\%_]/g, "\\$&");

function checkedRows(result) {
  if (result.error) throw new Error(result.error.message || "Affiliate access could not be saved.");
  if (!Array.isArray(result.data)) throw new Error("Affiliate access could not be verified.");
  return result.data;
}

export async function issueAffiliateAccess({ client, email: inputEmail, code: inputCode, confirmRestore }) {
  const email = normalizeEmail(inputEmail);
  const code = String(inputCode || "").trim().toUpperCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error("Enter a valid email address without extra brackets or punctuation.");
  if (!code) throw new Error("Enter an affiliate code.");

  const codeRows = checkedRows(await client.from("affiliates")
    .select("email,code,active").ilike("code", literalLike(code)).limit(2));
  const ownerRows = checkedRows(await client.from("affiliates")
    .select("email,code,active").ilike("email", literalLike(email)).limit(2));
  if (codeRows.length > 1 || ownerRows.length > 1) {
    throw new Error("Multiple affiliate profiles were found. Resolve the duplicates before issuing access.");
  }
  const existing = codeRows[0];
  if (ownerRows.some((row) => String(row.code).trim().toUpperCase() !== code)) {
    throw new Error("This email already has another affiliate code. Its existing history must be reviewed first.");
  }
  if (existing && existing.active !== false && normalizeEmail(existing.email) !== email) {
    throw new Error("This code belongs to another active affiliate. Revoke its access before reassigning it.");
  }

  if (existing?.active === false) {
    const confirmed = typeof confirmRestore === "function"
      && await confirmRestore({ code: existing.code, previousEmail: existing.email, email });
    if (!confirmed) return { cancelled: true };
  }

  if (!existing || existing.active === false) {
    const write = existing
      ? client.from("affiliates").update({ email, active: true })
        .eq("code", existing.code).eq("email", existing.email).eq("active", false)
      : client.from("affiliates").insert({ email, code, active: true });
    const changed = checkedRows(await write.select("email,code,active"));
    if (changed.length !== 1) {
      throw new Error("Affiliate access was not confirmed. The record may have changed; refresh and retry.");
    }
  }

  const persisted = checkedRows(await client.from("affiliates")
    .select("email,code,active").ilike("code", literalLike(code)).limit(2));
  if (persisted.length !== 1 || normalizeEmail(persisted[0].email) !== email || persisted[0].active !== true) {
    throw new Error("Could not verify the saved affiliate access. Refresh before retrying.");
  }
  return { code: persisted[0].code, email, restored: existing?.active === false };
}
