import { PRODUCT_SEO_PATHS } from "./seo-product-routes.js";

const SITE_URL = "https://10bottlevalue.co";

export const config = { matcher: "/(.*)" };

function getProductPath(url) {
  const cleanPath = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");

  if (PRODUCT_SEO_PATHS.has(cleanPath)) {
    return cleanPath;
  }

  // Older shared links used /?product=<slug>. Keep supporting them, but make
  // the product's clean path the single server-side canonical destination.
  if (cleanPath === "/") {
    const legacySlug = (url.searchParams.get("product") || "").toLowerCase().trim();
    const legacyProductPath = `/${legacySlug}`;
    if (PRODUCT_SEO_PATHS.has(legacyProductPath)) {
      return legacyProductPath;
    }
  }

  return null;
}

/**
 * The storefront is a Vite SPA, so its normal index.html is shared by every
 * route. For product routes, inject the canonical into the server response so
 * crawlers receive it before JavaScript runs.
 */
export default async function middleware(request) {
  const url = new URL(request.url);
  const productPath = getProductPath(url);

  if (!productPath) {
    return;
  }

  // Consolidate trailing-slash product URLs and legacy ?product= links onto
  // their clean product URL. Keep non-product parameters (such as ?c=) intact.
  if (url.pathname !== productPath || url.searchParams.has("product")) {
    url.pathname = productPath;
    url.searchParams.delete("product");
    return Response.redirect(url, 308);
  }

  const indexResponse = await fetch(new URL("/index.html", url.origin));
  if (!indexResponse.ok) {
    return indexResponse;
  }

  const canonical = `${SITE_URL}${productPath}`;
  const html = (await indexResponse.text()).replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${canonical}" />`,
  );

  return new Response(html, {
    status: indexResponse.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The canonical must stay current if a product URL is ever changed.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
