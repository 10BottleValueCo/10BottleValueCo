// Never persist OTP proofs or attach them to order/payment metadata.
export async function verifyMeritBuyer(email, otp = globalThis.window?.AttestlyOTP) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (typeof otp?.verify !== "function") {
    throw new Error("Merit verification is unavailable. Reload the verification scripts and try again.");
  }
  const result = await otp.verify({ email: normalizedEmail });
  if (!result?.verified) return null; // Cancellation never starts a payment.
  // The test explicitly requires proof, even when the vendor fails open.
  if (result.skipped || typeof result.token !== "string" || !result.token.trim()) {
    throw new Error("Merit skipped verification or could not complete it. No payment session was created. Please try again.");
  }
  const verifiedEmail = String(result.email || "").trim().toLowerCase();
  if (verifiedEmail !== normalizedEmail) {
    throw new Error("The verified email does not match this checkout. Restart verification.");
  }
  return { otpToken: result.token, verifiedEmail };
}

export async function verifyAndCreateMeritSession(email, createSession, otp) {
  const proof = await verifyMeritBuyer(email, otp);
  if (!proof) return { cancelled: true };
  return createSession(proof);
}

let scriptLoad;
let activeToken;

export function loadMeritScripts(siteToken) {
  const token = String(siteToken || "").trim();
  if (!/^site_[A-Za-z0-9_-]{16,256}$/.test(token)) {
    return Promise.reject(new Error("Enter the public site token from Merit, not the private API key."));
  }
  if (activeToken && activeToken !== token) {
    return Promise.reject(new Error("Reload this test page before using a different site token."));
  }
  if (scriptLoad) return scriptLoad;
  activeToken = token;
  const load = (filename) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://getonmerit.com/${filename}`;
    script.setAttribute("data-attestly-site-token", token);
    script.defer = true;
    const timer = setTimeout(() => finish(new Error("Merit script loading timed out. Reload the page and retry.")), 15000);
    function finish(error) {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (error) reject(error);
      else resolve();
    }
    script.onload = () => finish();
    script.onerror = () => finish(new Error("Could not load the Merit verification script. Reload the page and retry."));
    document.head.appendChild(script);
  });
  // One gate and one OTP script; use the vendor's built-in email/SMS UI.
  scriptLoad = load("attestly-gate.js").then(() => load("attestly-otp.js")).then(() => {
    if (typeof window.AttestlyOTP?.verify !== "function") {
      throw new Error("Merit loaded without its verification API. Reload this page.");
    }
  });
  return scriptLoad;
}