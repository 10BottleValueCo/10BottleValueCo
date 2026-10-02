import { loadMeritScripts, verifyMeritBuyer } from "./checkout.js";

// Public, browser-safe site identifier from the merchant's Merit snippet.
const siteToken = "site_0fa1ee6b819ebb8fa1c1e1740a51ae5ed8440baedaaf49eb";
const button = document.getElementById("verify");
const email = document.getElementById("email");
const result = document.getElementById("result");
const configuration = document.getElementById("configuration");
let ready = false;
let busy = false;

async function initialize() {
  try {
    await loadMeritScripts(siteToken);
    const response = await fetch(`https://getonmerit.com/api/connect/public-config?siteToken=${encodeURIComponent(siteToken)}`, {
      mode: "cors", credentials: "omit", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Merit rejected this site's public configuration.");
    const config = await response.json();
    if (config.ok !== true) throw new Error("Merit did not return a valid configuration.");
    ready = config.checkoutOtp?.enabled === true || config.buyerVerification?.enabled === true;
    configuration.textContent = [
      "Official Merit scripts loaded.",
      config.gate?.enabled === true ? "Gate is enabled." : "Gate is disabled in Merit. Enable it in Gate Studio for the gate review.",
      ready ? "Buyer verification is available." : "Buyer verification is disabled in Merit.",
    ].join(" ");
    button.disabled = !ready;
  } catch {
    configuration.textContent = "Merit configuration could not be loaded. Use the registered live domain, check the connection, and confirm the domain is authorized in Merit. Verification is unavailable until this is resolved.";
  }
}

document.getElementById("review-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!ready || busy) return;
  busy = true;
  button.disabled = true;
  email.disabled = true;
  result.dataset.state = "";
  result.textContent = "Complete verification in Merit's window.";
  try {
    const proof = await verifyMeritBuyer(email.value);
    // No persistence, token display, payment endpoint, or order mutation.
    result.dataset.state = proof ? "success" : "";
    result.textContent = proof
      ? "Merit returned a verification proof for this email. No payment session or order was created. Confirm the verification record in the Merit dashboard."
      : "Verification cancelled. No payment or order was created.";
  } catch (error) {
    result.dataset.state = "error";
    result.textContent = error.message || "Verification failed. No payment or order was created.";
  } finally {
    busy = false;
    button.disabled = !ready;
    email.disabled = false;
  }
});

initialize();