import { createHmac } from "node:crypto";

export const EMAIL_FACTOR_NAME = "10BottleValueCo email login";

// The user and bearer token MUST already have been validated by Supabase.
export function validatedSessionClaims(user, token) {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
    return claims.sub === user.id ? claims : {};
  } catch { return {}; }
}

export function needsEmailLoginCode(user, token) {
  const claims = validatedSessionClaims(user, token);
  return Array.isArray(user?.factors)
    && user.factors.some(f => f.friendly_name === EMAIL_FACTOR_NAME && f.status === "verified")
    && (claims.aal !== "aal2" || !hasPasswordOrRecoveryProof(claims));
}

export function hasPasswordOrRecoveryProof(claims) {
  return Array.isArray(claims?.amr) && claims.amr.some(entry => entry?.method === "password" || entry?.method === "recovery");
}

export function enforceEmailLoginCode(user, token, res) {
  if (!needsEmailLoginCode(user, token)) return true;
  res.status(403).json({ ok: false, code: "EMAIL_LOGIN_CODE_REQUIRED", error: "Confirm the code sent to your email before continuing." });
  return false;
}

export function totpCode(secret, now = Date.now()) {
  if (!/^[A-Z2-7]{16,128}$/i.test(secret || "")) throw new Error("Invalid factor configuration");
  let bits = 0, value = 0;
  const bytes = [];
  for (const letter of secret.toUpperCase()) {
    value = (value << 5) | "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(letter);
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}
