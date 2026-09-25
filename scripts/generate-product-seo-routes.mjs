import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sitemapPath = new URL("../artifacts/10-bottle-value/public/sitemap.xml", import.meta.url);
const outputPath = new URL("../seo-product-routes.js", import.meta.url);

const sitemap = await readFile(sitemapPath, "utf8");
const canonicalPaths = [...sitemap.matchAll(/<loc>https:\/\/10bottlevalue\.co([^<]*)<\/loc>/g)]
  .map((match) => match[1])
  .filter((path) => path && path !== "/");

// Keep old shared product URLs recognized so the edge middleware can redirect
// them to the new public names without changing the underlying catalog.
const legacyPath = (path) => path
  .replace(/^\/glp-1-s-/, "/semaglutide-")
  .replace(/^\/glp-2-t-/, "/tirzepatide-glp-2-")
  .replace(/^\/glp-3-r-/, "/retatrutide-glp-3-")
  .replace(/^\/cagrilintide-glp-1-s-/, "/cagrilintide-semaglutide-");
const paths = [...new Set([...canonicalPaths, ...canonicalPaths.map(legacyPath)])].sort();

if (paths.length === 0) {
  throw new Error("No product routes found in sitemap.xml");
}

const output = `// Generated from artifacts/10-bottle-value/public/sitemap.xml. Do not edit manually.
export const PRODUCT_SEO_PATHS = new Set(${JSON.stringify(paths, null, 2)});
`;

await writeFile(outputPath, output, "utf8");
console.log(`Generated ${paths.length} product SEO routes in ${root}seo-product-routes.js`);