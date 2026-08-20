import { PRODUCT_SEO_PATHS } from "./seo-product-routes.js";

const SITE_URL = "https://10bottlevalue.co";

export const config = { matcher: "/(.*)" };

/**
 * The storefront is a Vite SPA, so its normal index.html is shared by every
 * route. For product routes, inject the canonical into the server response so
 * crawlers receive it before JavaScript runs.
 */
export default async function middleware(request) {
  const url = new URL(request.url);

  if (!PRODUCT_SEO_PATHS.has(url.pathname)) {
    return;
  }

  const indexResponse = await fetch(new URL("/index.html", url.origin));
  if (!indexResponse.ok) {
    return indexResponse;
  }

  const canonical = `${SITE_URL}${url.pathname}`;
  const html = (await indexResponse.text()).replace(
    "</head>",
    `    <link rel="canonical" href="${canonical}" />\n  </head>`,
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
