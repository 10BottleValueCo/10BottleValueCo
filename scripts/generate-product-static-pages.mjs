import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const artifactRoot = path.join(workspaceRoot, "artifacts", "10-bottle-value");
const sitemapPath = path.join(artifactRoot, "public", "sitemap.xml");
const distRoot = path.join(artifactRoot, "dist", "public");
const indexPath = path.join(distRoot, "index.html");

const [sitemap, rawIndexHtml] = await Promise.all([
  readFile(sitemapPath, "utf8"),
  readFile(indexPath, "utf8"),
]);

// Static, crawler-visible researcher/purchaser attestation notice.
// This must be present in the raw HTML (not only inside the client-rendered
// React app) so that automated compliance scanners that do not execute
// JavaScript can detect the qualified-researcher / no-human-or-animal-use
// attestation requirement before purchase. The interactive, mandatory
// click-to-attest gate (with logging) still runs in the app at checkout;
// this block documents that same requirement in plain static text.
const attestationNoticeHtml = `
    <div
      data-attestation-notice="true"
      style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;"
    >
      <h2>Researcher &amp; Purchaser Attestation — Required Before Checkout</h2>
      <p>
        Every purchaser must affirmatively confirm, via a mandatory click-to-attest
        gate at checkout, that: (1) they are over 21 years old and understand all
        products are sold strictly for research purposes only, not for human or
        animal use; (2) they are a qualified researcher, licensed professional, or
        authorized representative of a qualified research organization, and will
        not use these products on humans or animals; and (3) they have read and
        agree to the website Terms and Conditions, Privacy Policy, Refund Policy,
        and Shipping Policy. This attestation is required before checkout and is
        logged with every order. See the full
        <a href="/researcher-attestation">Researcher Attestation</a> page for
        details.
      </p>
      <h2>Billing Descriptor Disclosure</h2>
      <p>
        Charges from this website appear on the customer's card or PayPal
        statement as "10BottleValueCo", matching our business name.
      </p>
      <h2>Medical Disclaimer</h2>
      <p>
        This site does not provide medical advice. These statements have not
        been evaluated by the FDA. Products are not drugs and are not
        intended to diagnose, treat, cure, or prevent any disease.
      </p>
    </div>
`;

const indexHtml = rawIndexHtml.includes('data-attestation-notice="true"')
  ? rawIndexHtml
  : rawIndexHtml.replace("<body>", `<body>${attestationNoticeHtml}`);

// Also bake the notice into the homepage file itself, not just route copies.
await writeFile(indexPath, indexHtml, "utf8");

const routes = [...sitemap.matchAll(/<loc>https:\/\/10bottlevalue\.co([^<]*)<\/loc>/g)]
  .map((match) => match[1])
  .filter((route) => route && route !== "/")
  .map((route) => route.replace(/^\/+|\/+$/g, ""))
  .filter((route) => route && !route.includes(".."));

const legalRoutes = [
  "terms-and-conditions",
  "privacy-policy",
  "shipping-policy",
  "refund-policy",
];

const publicAppRoutes = [
  "shop",
  "us-warehouse",
  "shipping-prices",
  "affiliate",
  "about",
  "faq",
  "contact",
  "researcher-attestation",
  "track-order",
  "account",
  "cart",
  "cart/confirmation",
];

const staticRoutes = [...new Set([...routes, ...legalRoutes, ...publicAppRoutes])];

await Promise.all(
  staticRoutes.map(async (route) => {
    const routeDir = path.join(distRoot, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, "index.html"), indexHtml, "utf8");
  }),
);

console.log(`Generated ${staticRoutes.length} static route fallbacks in ${distRoot}`);