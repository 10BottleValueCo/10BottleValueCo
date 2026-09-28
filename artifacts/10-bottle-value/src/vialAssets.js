import nativeVialManifest from "./native-vial-manifest.json";
import { publicProductName } from "./productNames.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

const vialsByConfiguration = new Map(
  nativeVialManifest.map((vial) => [
    `${normalize(vial.compound)}|${normalize(vial.amount_display)}`,
    vial,
  ]),
);

const sitePrintedCompounds = new Set([
  "Semaglutide",
  "Tirzepatide / GLP-2",
  "Retatrutide / GLP-3",
  "BAC Water",
  "Cagrilintide + Semaglutide",
  "CJC-1295 + Ipamorelin",
]);

function assetUrls(vial, suffix = "") {
  const thumbnail = vial.smaller_candidates.find((candidate) => candidate.height === 800);
  if (!thumbnail) return null;
  return {
    nativeUrl: `/vials/v14/${vial.configuration_key}${suffix}-native.webp`,
    thumbnailUrl: `/vials/v14/${vial.configuration_key}${suffix}-h800.webp`,
    width: vial.width,
    height: vial.height,
    thumbnailWidth: thumbnail.width,
    thumbnailHeight: thumbnail.height,
  };
}

export function vialAssetFor(product) {
  if (!product?.name || !product?.dose) return null;

  // These exact configurations have new in-image artwork with public product
  // names and matching amounts, rather than the archive's old labels.
  if (sitePrintedCompounds.has(product.name)) {
    let name = product.name;
    let dose = product.dose;
    if (name === "CJC-1295 + Ipamorelin") {
      if (product.noteLabel !== "no/d" || normalize(dose) !== "10mgeach") return null;
      name += " no/d";
      dose = "10mg total";
    } else if (name === "Cagrilintide + Semaglutide") {
      if (normalize(dose) !== "10mg") return null;
      dose = "10mg total";
    }
    const siteVial = vialsByConfiguration.get(`${normalize(name)}|${normalize(dose)}`);
    return siteVial ? assetUrls(siteVial, "-site") : null;
  }

  // The archived artwork uses old names for these products. Keep their current
  // unprinted bottles rather than showing a label that contradicts the site.
  if (publicProductName(product.name) !== product.name) return null;
  // "10 mg each" is not the same as the archive's "10 mg total".
  if (/\beach\b/i.test(product.dose)) return null;

  let name = product.name;
  let dose = product.dose;

  if (name === "CJC-1295" && product.noteLabel) name += ` ${product.noteLabel}`;
  if (name === "L-Carnitine (600mg/ml)") name = "L-Carnitine";
  if (name === "TB-500 + BPC-157") dose += " total";

  const vial = vialsByConfiguration.get(`${normalize(name)}|${normalize(dose)}`);
  if (!vial) return null;

  return assetUrls(vial, name === "BPC-157" ? "-gray" : name === "TB-500" ? "-black" : "");
}