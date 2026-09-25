/**
 * useSEO — dynamic meta management for 10BottleValue.co
 * Updates document.title, meta tags, canonical, and JSON-LD
 * based on the current page and selected product.
 * Zero user-visible changes.
 */
import { useEffect } from "react";
import { productSlug, publicProductName } from "./productNames.js";

const SITE_NAME  = "10BottleValue.co";
const SITE_URL   = "https://10bottlevalue.co";
const SITE_IMAGE = `${SITE_URL}/logo.png`;

// Mirrors getProductVisual() in App.jsx — returns the bottle image actually
// shown for this product. Must stay in sync if App.jsx image logic changes.
function productImage(name) {
  const n = name.toLowerCase();
  if (n.includes("ghk-cu") || n.includes("ghk"))
    return `${SITE_URL}/bottle-blue.png`;
  if (n.includes("glow") || n.includes("klow"))
    return `${SITE_URL}/bottle-light-blue.png`;
  if (n.includes("bac water"))
    return `${SITE_URL}/bottle-water.png`;
  return `${SITE_URL}/bottle-white.png`;
}

// Slug formula — must mirror makeProductSlug() in App.jsx
function makeSlug(p) {
  return productSlug(p);
}

// Strictly pharmacological/biochemical class labels.
// No implied effects, applications, or health claims.
// Falls back to "research peptide" for anything not firmly classified.
function productClass(name) {
  const n = name.toLowerCase();
  if (/glp-[123]-[str]|semaglutide|tirzepatide|retatrutide|cagrilintide|mazdutide|survodutide|eloralintide/.test(n))
    return "GLP receptor research peptide";
  if (/ipamorelin|sermorelin|tesamorelin|cjc-1295|ghrp/.test(n))
    return "growth hormone secretagogue research peptide";
  if (/semax|selank|dsip|vip|pinealon/.test(n))
    return "neuropeptide research compound";
  if (/\bigf\b|igf-des|igf-1|peg-mgf|\bmgf\b|gdf-8|foxo4|ace-031/.test(n))
    return "growth factor research peptide";
  if (/melanotan|pt-141/.test(n))
    return "melanocortin research peptide";
  if (/\bhcg\b|\bhmg\b|gonadorelin|kisspeptin|triptorelin/.test(n))
    return "endocrine research peptide";
  if (/mots-c|ss-31|nad|5-amino-1mq|aicar|epitalon|cartalax/.test(n))
    return "metabolic research compound";
  // Everything else: no classification assigned
  return "research peptide";
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

function setCanonical(href) {
  // useSEO owns the canonical — index.html has no static canonical tag.
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setMeta(attr, value, content) {
  const sel = `meta[${attr}="${value}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setJsonLd(id, data) {
  let el = document.querySelector(`script[data-seo-id="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-id", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id) {
  document.querySelector(`script[data-seo-id="${id}"]`)?.remove();
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSEO({ page, product }) {
  useEffect(() => {
    const publicPages = {
      refund: {
        path: "/refund-policy",
        title: `Refund & Return Policy | ${SITE_NAME}`,
        description: "Refund and return conditions, request deadlines, eligibility, resolution options, and contact instructions for 10BottleValueCo orders.",
      },
      shipping: {
        path: "/shipping-policy",
        title: `Shipping Policy | ${SITE_NAME}`,
        description: "Shipping destinations, delivery estimates, customs handling, tracking, delays, and support information for 10BottleValueCo orders.",
      },
      privacy: {
        path: "/privacy-policy",
        title: `Privacy Policy | ${SITE_NAME}`,
        description: "How 10BottleValueCo collects, uses, stores, and protects personal information.",
      },
      terms: {
        path: "/terms-and-conditions",
        title: `Terms & Conditions | ${SITE_NAME}`,
        description: "Terms and conditions governing use of the 10BottleValueCo website and purchase of research products.",
      },
      shop: {
        path: "/shop",
        title: `Worldwide Research Peptide Shop | ${SITE_NAME}`,
        description: "Browse 10-vial research peptide kits available for worldwide shipping.",
      },
      "us-warehouse": {
        path: "/us-warehouse",
        title: `US Warehouse Research Peptides | ${SITE_NAME}`,
        description: "Browse research peptide kits available from the 10BottleValueCo US warehouse.",
      },
      bonuses: {
        path: "/shipping-prices",
        title: `Shipping Prices | ${SITE_NAME}`,
        description: "Shipping prices, delivery options, and free-shipping thresholds for 10BottleValueCo orders.",
      },
      affiliate: {
        path: "/affiliate",
        title: `Affiliate Program | ${SITE_NAME}`,
        description: "Information about the 10BottleValueCo affiliate program.",
      },
      about: {
        path: "/about",
        title: `About Us | ${SITE_NAME}`,
        description: "Learn about 10BottleValueCo and our research-product standards.",
      },
      faq: {
        path: "/faq",
        title: `Frequently Asked Questions | ${SITE_NAME}`,
        description: "Answers to common questions about products, orders, payment, shipping, and support.",
      },
      contact: {
        path: "/contact",
        title: `Contact 10BottleValueCo SIA | ${SITE_NAME}`,
        description: "Contact 10BottleValueCo SIA for order and product support. Business address: Avotu iela 8, Lielvārde, Ogres nov., LV-5071, Latvia.",
      },
      attestation: {
        path: "/researcher-attestation",
        title: `Qualified Purchaser & Researcher Attestation | ${SITE_NAME}`,
        description: "Mandatory qualified researcher or licensed professional attestation and no-human-or-animal-use commitment required before purchase.",
      },
      track: {
        path: "/track-order",
        title: `Track Your Order | ${SITE_NAME}`,
        description: "Track a 10BottleValueCo shipment using the carrier tracking tools.",
      },
      account: {
        path: "/account",
        title: `My Account | ${SITE_NAME}`,
        description: "Sign in to your 10BottleValueCo customer account.",
      },
      cart: {
        path: "/cart",
        title: `Shopping Cart | ${SITE_NAME}`,
        description: "Review the products in your 10BottleValueCo shopping cart.",
      },
    };

    if (publicPages[page]) {
      const publicPage = publicPages[page];
      const canonical = `${SITE_URL}${publicPage.path}`;
      document.title = publicPage.title;
      setCanonical(canonical);
      setMeta("name", "description", publicPage.description);
      setMeta("name", "robots", "index, follow");
      setMeta("property", "og:title", publicPage.title);
      setMeta("property", "og:description", publicPage.description);
      setMeta("property", "og:type", "website");
      setMeta("property", "og:url", canonical);
      setMeta("property", "og:image", SITE_IMAGE);
      setMeta("property", "og:site_name", SITE_NAME);
      setMeta("name", "twitter:card", "summary_large_image");
      setMeta("name", "twitter:title", publicPage.title);
      setMeta("name", "twitter:description", publicPage.description);
      setMeta("name", "twitter:image", SITE_IMAGE);
      removeJsonLd("product");
      removeJsonLd("breadcrumb");
      setJsonLd("webpage", {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": publicPage.title,
        "description": publicPage.description,
        "url": canonical,
        "isPartOf": { "@id": SITE_URL + "/#website" }
      });
      if (page === "contact") {
        setJsonLd("organization", {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "10BottleValueCo SIA",
          "url": SITE_URL,
          "email": "support@10bottlevalue.co",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Avotu iela 8",
            "addressLocality": "Lielvārde",
            "addressRegion": "Ogres nov.",
            "postalCode": "LV-5071",
            "addressCountry": "LV"
          }
        });
      } else {
        removeJsonLd("organization");
      }
    } else if (page === "product" && product) {
      // ── Product page ────────────────────────────────────────────────────────
      const slug      = makeSlug(product);
      const canonical = `${SITE_URL}/${slug}`;
      const name      = publicProductName(product.name);
      const dose      = product.dose;
      const price     = product.price;
      const total     = product.total;
      const inStock   = !product.outOfStock;
      const cls       = productClass(name);
      const prodImg   = productImage(name); // actual bottle shown for this product

      // Title: name + dose + kit indicator
      const title = `${name} ${dose} Research Peptide — 10-Vial Kit | ${SITE_NAME}`;

      // Description: strictly factual — name, dose, kit size, price, shipping, disclaimer.
      // No health claims, no inferred effects.
      const desc = `${name} ${dose} research peptide kit — 10 vials (${total}), from $${price}. Ships worldwide. For laboratory research use only. | ${SITE_NAME}`;

      document.title = title;
      setCanonical(canonical);

      setMeta("name",     "description",         desc);
      setMeta("name",     "robots",              "index, follow");
      setMeta("property", "og:title",            title);
      setMeta("property", "og:description",      desc);
      setMeta("property", "og:type",             "website");
      setMeta("property", "og:url",              canonical);
      setMeta("property", "og:image",            prodImg); // product bottle, not logo
      setMeta("property", "og:site_name",        SITE_NAME);
      setMeta("name",     "twitter:card",        "summary_large_image");
      setMeta("name",     "twitter:title",       title);
      setMeta("name",     "twitter:description", desc);
      setMeta("name",     "twitter:image",       prodImg); // product bottle, not logo

      // Product JSON-LD — only factual fields from real product data
      setJsonLd("product", {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${name} ${dose}`,
        "description": `${name} ${dose} ${cls}. Kit of 10 vials (${total}). For laboratory and research use only. Not for human or animal consumption.`,
        "sku": slug,
        "brand": { "@type": "Brand", "name": "10BottleValue" },
        "category": "Research Peptides",
        "url": canonical,
        "image": prodImg, // actual product bottle image, not site logo
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": "USD",
          "availability": inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          "url": canonical,
          "seller": { "@type": "Organization", "name": "10BottleValue.co" }
        }
      });

      // BreadcrumbList — 2 levels only (no fake intermediate page)
      setJsonLd("breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
          { "@type": "ListItem", "position": 2, "name": `${name} ${dose}`, "item": canonical }
        ]
      });

      removeJsonLd("webpage");
      removeJsonLd("organization");

    } else {
      // ── Home / other pages ──────────────────────────────────────────────────
      const canonical = SITE_URL + "/";
      const title = "10BottleValueCo — Research Peptides At Wholesale Prices";
      const desc  = "Buy research peptides in 10-vial kits. Up to 4× cheaper than most brands. BPC-157, TB-500, GLP-1-S, GLP-2-T, GLP-3-R and more. Ships worldwide. Research use only.";

      document.title = title;
      setCanonical(canonical);

      setMeta("name",     "description",         desc);
      setMeta("name",     "robots",              "index, follow");
      setMeta("property", "og:title",            title);
      setMeta("property", "og:description",      desc);
      setMeta("property", "og:type",             "website");
      setMeta("property", "og:url",             canonical);
      setMeta("property", "og:image",            SITE_IMAGE);
      setMeta("property", "og:site_name",        SITE_NAME);
      setMeta("name",     "twitter:card",        "summary_large_image");
      setMeta("name",     "twitter:title",       title);
      setMeta("name",     "twitter:description", desc);
      setMeta("name",     "twitter:image",       SITE_IMAGE);

      removeJsonLd("product");
      removeJsonLd("breadcrumb");
      removeJsonLd("organization");

      setJsonLd("webpage", {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": desc,
        "url": canonical,
        "isPartOf": { "@id": SITE_URL + "/#website" }
      });
    }
  }, [page, product]);
}
