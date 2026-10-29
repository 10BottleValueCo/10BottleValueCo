import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sitemapPath = new URL("../artifacts/10-bottle-value/public/sitemap.xml", import.meta.url);
const outputPath = new URL("../seo-product-routes.js", import.meta.url);

const sitemap = await readFile(sitemapPath, "utf8");
const canonicalPaths = [...sitemap.matchAll(/<loc>https:\/\/10bottlevalue\.co([^<]*)<\/loc>/g)]
  .map((match) => match[1])
  .filter((path) => path && path !== "/");

// Recognize every prior catalog/GLP label URL so the edge can redirect it to
// the restored compound URL, preserving shared links and the catalog identity.
const aliasPrefixes = [
  ["/semaglutide-", ["/glp-1-s-", "/glp-sg-1-"]],
  ["/tirzepatide-", ["/tirzepatide-glp-2-", "/glp-2-t-", "/glp-tz-2-"]],
  ["/retatrutide-", ["/retatrutide-glp-3-", "/glp-3-r-", "/glp-rt-3-"]],
  ["/cagrilintide-semaglutide-", ["/cagrilintide-glp-1-s-", "/cagrilintide-glp-sg-1-"]],
];
const legacyPaths = (path) => aliasPrefixes.flatMap(([canonical, aliases]) =>
  path.startsWith(canonical) ? aliases.map((alias) => `${alias}${path.slice(canonical.length)}`) : []);
const paths = [...new Set([...canonicalPaths, ...canonicalPaths.flatMap(legacyPaths)])].sort();

if (paths.length === 0) {
  throw new Error("No product routes found in sitemap.xml");
}

const output = `// Generated from artifacts/10-bottle-value/public/sitemap.xml. Do not edit manually.
export const PRODUCT_SEO_PATHS = new Set(${JSON.stringify(paths, null, 2)});
`;

await writeFile(outputPath, output, "utf8");
console.log(`Generated ${paths.length} product SEO routes in ${root}seo-product-routes.js`);
