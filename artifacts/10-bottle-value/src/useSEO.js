/**
 * useSEO — dynamic meta management for 10BottleValue.co
 * Updates document.title, meta tags, canonical, and JSON-LD
 * based on the current page and selected product.
 * Zero user-visible changes.
 */
import { useEffect } from "react";

const SITE_NAME   = "10BottleValue.co";
const SITE_URL    = "https://10bottlevalue.co";
const SITE_IMAGE  = `${SITE_URL}/logo.png`;

// Slug formula — must mirror makeProductSlug() in App.jsx
function makeSlug(p) {
  return `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${p.dose.toLowerCase().replace(/\s+/g, "")}`;
}

// Category-aware description snippets (research-neutral language)
function productCategory(name) {
  const n = name.toLowerCase();
  if (/semaglutide|tirzepatide|retatrutide|cagrilintide|mazdutide|survodutide|eloralintide/.test(n))
    return "GLP receptor research peptide";
  if (/bpc-157|tb-500|bpc\+tb/.test(n))
    return "tissue-repair research peptide";
  if (/ipamorelin|sermorelin|tesamorelin|cjc-1295|ghrp/.test(n))
    return "growth hormone secretagogue research peptide";
  if (/semax|selank|dsip|vip|pinealon/.test(n))
    return "neuropeptide research compound";
  if (/ghk-cu|ahk-cu|snap-8|lipo-c/.test(n))
    return "cosmetic/skin research peptide";
  if (/igf|igf-des|mgf|peg-mgf|gdf-8|foxo4|ace-031/.test(n))
    return "growth factor research peptide";
  if (/thymosin|kpv|ll37|ara290/.test(n))
    return "immune-support research peptide";
  if (/epitalon|cartalax|mots-c|ss-31|nad|5-amino|aicar/.test(n))
    return "longevity/metabolic research compound";
  if (/hgh|hcg|hmg|lh-rh|triptorelin|gonadorelin|kisspeptin/.test(n))
    return "endocrine research peptide";
  if (/melanotan|pt-141/.test(n))
    return "melanocortin research peptide";
  if (/glutathione|l-carnitine|melatonin|oxytocin/.test(n))
    return "biochemical research compound";
  return "research peptide";
}

// Canonical helper
function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

// Meta setter (property = og:*, name = standard)
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

// JSON-LD manager
function setJsonLd(id, data) {
  let el = document.querySelector(`script[data-seo-id="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-id", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 0);
}
function removeJsonLd(id) {
  document.querySelector(`script[data-seo-id="${id}"]`)?.remove();
}

// ─── Main hook ─────────────────────────────────────────────────────────────
export function useSEO({ page, product }) {
  useEffect(() => {
    if (page === "product" && product) {
      // ── Product page ──────────────────────────────────────────────────────
      const slug      = makeSlug(product);
      const canonical = `${SITE_URL}/${slug}`;
      const dispName  = product.name;        // e.g. "BPC-157"
      const dose      = product.dose;        // e.g. "5 mg"
      const price     = product.price;       // e.g. 79
      const cat       = productCategory(dispName);
      const inStock   = !product.outOfStock;

      const title = `${dispName} ${dose} Research Peptide — 10-Vial Kit | ${SITE_NAME}`;
      const desc  = `${dispName} ${dose} — ${cat}. 10-vial kit (${product.total}). From $${price}. Wholesale pricing, ships worldwide. For laboratory research use only. | ${SITE_NAME}`;

      document.title = title;
      setCanonical(canonical);

      setMeta("name",     "description",        desc);
      setMeta("name",     "robots",             "index, follow");

      setMeta("property", "og:title",           title);
      setMeta("property", "og:description",     desc);
      setMeta("property", "og:type",            "website");
      setMeta("property", "og:url",             canonical);
      setMeta("property", "og:image",           SITE_IMAGE);
      setMeta("property", "og:site_name",       SITE_NAME);

      setMeta("name",     "twitter:card",       "summary_large_image");
      setMeta("name",     "twitter:title",      title);
      setMeta("name",     "twitter:description",desc);
      setMeta("name",     "twitter:image",      SITE_IMAGE);

      // Product JSON-LD
      setJsonLd("product", {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${dispName} ${dose}`,
        "description": `${dispName} ${dose} ${cat}. Kit of 10 vials (${product.total}). For laboratory and research use only. Not for human or animal consumption.`,
        "sku": slug,
        "brand": { "@type": "Brand", "name": "10BottleValue" },
        "category": "Research Peptides",
        "url": canonical,
        "image": SITE_IMAGE,
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

      // BreadcrumbList
      setJsonLd("breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",            "item": SITE_URL + "/" },
          { "@type": "ListItem", "position": 2, "name": "Research Peptides","item": SITE_URL + "/" },
          { "@type": "ListItem", "position": 3, "name": `${dispName} ${dose}`, "item": canonical }
        ]
      });

      removeJsonLd("webpage");

    } else {
      // ── Home / other pages ────────────────────────────────────────────────
      const isShop    = page === "shop" || page === "home";
      const canonical = SITE_URL + "/";

      const title = "10BottleValueCo — Research Peptides At Wholesale Prices";
      const desc  = "Buy research peptides in 10-vial kits. Up to 4× cheaper than most brands. BPC-157, TB-500, Semaglutide, Tirzepatide, Retatrutide and more. Ships worldwide. Research use only.";

      document.title = title;
      setCanonical(canonical);

      setMeta("name",     "description",        desc);
      setMeta("name",     "robots",             "index, follow");

      setMeta("property", "og:title",           title);
      setMeta("property", "og:description",     desc);
      setMeta("property", "og:type",            "website");
      setMeta("property", "og:url",             canonical);
      setMeta("property", "og:image",           SITE_IMAGE);
      setMeta("property", "og:site_name",       SITE_NAME);

      setMeta("name",     "twitter:card",       "summary_large_image");
      setMeta("name",     "twitter:title",      title);
      setMeta("name",     "twitter:description",desc);
      setMeta("name",     "twitter:image",      SITE_IMAGE);

      removeJsonLd("product");
      removeJsonLd("breadcrumb");

      // WebPage schema for home
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
