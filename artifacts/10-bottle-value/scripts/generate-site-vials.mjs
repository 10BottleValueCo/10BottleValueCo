// Re-label the archived vial renders without changing the bottle, logo, or
// transparent silhouette. Run from the workspace root with:
// node artifacts/10-bottle-value/scripts/generate-site-vials.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const archive = resolve(appDir, "../../attached_assets/10BottleValue-v14-detail-quality_1790470546633.zip");
const manifest = JSON.parse(readFileSync(join(appDir, "src/native-vial-manifest.json"), "utf8"));
const font = join(appDir, "scripts/fonts/Oswald.ttf");
const destination = join(appDir, "public/vials/v14");
mkdirSync(destination, { recursive: true });

const groups = [
  { compound: "Semaglutide", title: ["GLP-1-S"] },
  { compound: "Tirzepatide / GLP-2", title: ["GLP-2-T"] },
  { compound: "Retatrutide / GLP-3", title: ["GLP-3-R"] },
  { compound: "BAC Water", title: ["RECONSTITUTION", "SOLUTION"] },
  { compound: "Cagrilintide + Semaglutide", title: ["CAGRILINTIDE +", "GLP-1-S"], dose: "10mg" },
  { compound: "CJC-1295 + Ipamorelin no/d", title: ["CJC-1295 +", "IPAMORELIN NO/D"], dose: "10mg" },
];

function run(program, args, input, maxBuffer = 20_000_000) {
  return execFileSync(program, args, { input, maxBuffer });
}

function repairRegion(pixels, width, region) {
  const { left, right, top, bottom, sampleTop, sampleBottom } = region;
  const original = Buffer.from(pixels);
  const blueSample = (x, y) => {
    const i = (y * width + x) * 4;
    return original[i + 2] - original[i] > 35 &&
      original[i + 2] - original[i + 1] > 25 &&
      original[i] < 115;
  };
  const findBlue = (x, from, to, step) => {
    for (let y = from; step > 0 ? y <= to : y >= to; y += step) {
      if (blueSample(x, y)) return y;
    }
    return from;
  };
  const blue = region.blue === true;
  const anchor = (sample, from, to, step) => {
    const colors = Array.from({ length: right - left + 1 }, (_, i) => {
      const x = left + i;
      const y = blue ? findBlue(x, from, to, step) : sample;
      return [...original.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)];
    });
    const radius = blue ? 17 : 9;
    return colors.map((_, i) => {
      const sum = [0, 0, 0];
      let count = 0;
      for (let j = Math.max(0, i - radius); j <= Math.min(colors.length - 1, i + radius); j++) {
        for (let c = 0; c < 3; c++) sum[c] += colors[j][c];
        count++;
      }
      return sum.map((value) => value / count);
    });
  };
  const upperColors = anchor(sampleTop, sampleTop, Math.min(bottom, sampleTop + 48), 1);
  const lowerColors = anchor(sampleBottom, sampleBottom, Math.max(top, sampleBottom - 42), -1);
  for (let y = top; y <= bottom; y++) {
    const vertical = (y - top) / (bottom - top);
    for (let x = left; x <= right; x++) {
      const horizontalFade = Math.min(1, (x - left) / (blue ? 28 : 12), (right - x) / (blue ? 28 : 12));
      const verticalFade = Math.min(1, (y - top) / 5, (bottom - y) / 5);
      const opacity = Math.max(0, Math.min(horizontalFade, verticalFade));
      const dest = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const background = upperColors[x - left][channel] * (1 - vertical) + lowerColors[x - left][channel] * vertical;
        pixels[dest + channel] = Math.round(original[dest + channel] * (1 - opacity) + background * opacity);
      }
    }
  }
}

function drawText(pixels, imageWidth, imageHeight, text, targetWidth, targetHeight, y, dose = false) {
  const glyphs = run("magick", [
    "-background", "none", "-fill", "white",
    "-font", dose ? "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" : font,
    "-weight", dose ? "400" : "700", "-pointsize", "110",
    ...(dose ? ["-stroke", "#555555", "-strokewidth", "2"] : []),
    `label:${text}`, "-trim", "+repage",
    "-resize", `${targetWidth}x${targetHeight}!`, "-depth", "8", "rgba:-",
  ]);
  const x0 = Math.round((imageWidth - targetWidth) / 2);
  if (!dose) {
    for (let row = 0; row < targetHeight; row++) {
      for (let column = 0; column < targetWidth; column++) {
        const src = (row * targetWidth + column) * 4;
        const shadowAlpha = glyphs[src + 3] / 255 * 0.27;
        const x = x0 + column + 2;
        const yy = y + row + 2;
        if (!shadowAlpha || x >= imageWidth || yy >= imageHeight) continue;
        const dst = (yy * imageWidth + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          pixels[dst + channel] = Math.round(pixels[dst + channel] * (1 - shadowAlpha));
        }
      }
    }
  }
  for (let row = 0; row < targetHeight; row++) {
    for (let column = 0; column < targetWidth; column++) {
      const src = (row * targetWidth + column) * 4;
      const alpha = glyphs[src + 3] / 255;
      if (!alpha) continue;
      const x = x0 + column;
      const yy = y + row;
      if (x < 0 || x >= imageWidth || yy < 0 || yy >= imageHeight) continue;
      const dst = (yy * imageWidth + x) * 4;
      // A tiny offset shadow and the label's original left-to-right lighting
      // make the new lettering sit on the curved, shaded bottle label.
      const illumination = dose ? 1 : 0.92 + 0.08 * x / imageWidth;
      const shade = Math.round(glyphs[src] * illumination);
      for (let channel = 0; channel < 3; channel++) {
        pixels[dst + channel] = Math.round(pixels[dst + channel] * (1 - alpha) + shade * alpha);
      }
    }
  }
}

function makeVial(vial, group) {
  const { width, height } = vial;
  const large = width > 600;
  const archivePath = `detail-quality-v14/${vial.path}`;
  const source = run("unzip", ["-p", archive, archivePath]);
  const pixels = Buffer.from(run("magick", ["webp:-", "-depth", "8", "rgba:-"], source));
  if (pixels.length !== width * height * 4) throw new Error(`Unexpected image dimensions: ${vial.configuration_key}`);

  if (large) {
    repairRegion(pixels, width, { left: 67, right: 604, top: 638, bottom: 817, sampleTop: 634, sampleBottom: 820, blue: true });
    repairRegion(pixels, width, { left: 155, right: 515, top: 865, bottom: 949, sampleTop: 860, sampleBottom: 954 });
  } else {
    repairRegion(pixels, width, { left: 44, right: 509, top: 576, bottom: 796, sampleTop: 575, sampleBottom: 794, blue: true });
    repairRegion(pixels, width, { left: 142, right: 410, top: 832, bottom: 934, sampleTop: 827, sampleBottom: 939 });
  }

  if (group.title.length === 1) {
    drawText(pixels, width, height, group.title[0], 270, 108, 632);
  } else if (large) {
    drawText(pixels, width, height, group.title[0], 435, 76, 648);
    drawText(pixels, width, height, group.title[1], 320, 76, 736);
  } else {
    const firstWidth = group.title[0] === "RECONSTITUTION" ? 380 : 360;
    const secondWidth = group.title[1] === "SOLUTION" ? 235 : 370;
    drawText(pixels, width, height, group.title[0], firstWidth, 77, 597);
    drawText(pixels, width, height, group.title[1], secondWidth, 76, 692);
  }

  // The front of a blend vial shows only the numeric amount. Component
  // breakdowns, where applicable, remain in the catalog details.
  const displayDose = (group.dose || vial.amount_display).replace(/\s*(?:each|total)$/i, "");
  drawText(pixels, width, height, displayDose, large ? 164 : 142, large ? 75 : 67, large ? 873 : 847, true);

  const file = join(destination, `${vial.configuration_key}-site-native.webp`);
  run("magick", ["-size", `${width}x${height}`, "-depth", "8", "rgba:-", "-define", "webp:lossless=true", file], pixels);
  const thumbnail = join(destination, `${vial.configuration_key}-site-h800.webp`);
  run("magick", [file, "-resize", "x800", "-quality", "88", thumbnail]);
  return { key: vial.configuration_key, name: group.title.join(" "), dose: displayDose, file };
}

const only = process.argv[2];
const results = [];
for (const group of groups) {
  for (const vial of manifest.filter((item) => item.compound === group.compound)) {
    if (only && vial.configuration_key !== only) continue;
    results.push(makeVial(vial, group));
  }
}
if (results.length !== (only ? 1 : 25)) throw new Error(`Expected ${only ? 1 : 25} vials, generated ${results.length}`);
for (const result of results) console.log(`${result.key}: ${result.name} — ${result.dose}`);