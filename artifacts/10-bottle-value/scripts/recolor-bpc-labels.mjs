// Give only the BPC-157 label's gray shoulders a darker matte finish.
// The blue panel, glass, cap, logo, and printed white lettering are retained.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(appDir, "public/vials/v14");
const keys = ["bpc-157-f4e551bb3098", "bpc-157-4a596acd979f"];
const width = 553;
const height = 1126;
const clamp = (n) => Math.max(0, Math.min(1, n));

for (const key of keys) {
  if (process.argv[2] && process.argv[2] !== key) continue;
  const source = join(directory, `${key}-native.webp`);
  const raw = Buffer.from(execFileSync("magick", [source, "-depth", "8", "rgba:-"], { maxBuffer: 10_000_000 }));
  if (raw.length !== width * height * 4) throw new Error(`Unexpected BPC-157 dimensions: ${key}`);

  for (let y = 460; y < 952; y++) {
    // The blue label has a curved edge; its pixels are excluded by color
    // rather than covering it with a rectangular gray shape.
    if (y > 582 && y < 778) continue;
    for (let x = 23; x <= 530; x++) {
      const i = (y * width + x) * 4;
      const r = raw[i], g = raw[i + 1], b = raw[i + 2], alpha = raw[i + 3];
      if (alpha < 100 || Math.max(r, g, b) - Math.min(r, g, b) > 16) continue;
      const light = (r + g + b) / 3;
      // Only the near-white logo and dosage stay bright. Mid-gray highlights
      // belong to the label paper and should become matte too.
      const preserveLetter = clamp((245 - light) / 25);
      const edge = Math.min(1, (x - 23) / 8, (530 - x) / 8);
      const opacity = clamp(preserveLetter * edge * (alpha / 250));
      const matteGray = Math.min(light, light * 0.35 + 37);
      for (let c = 0; c < 3; c++) {
        raw[i + c] = Math.round(raw[i + c] * (1 - opacity) + (matteGray + (c === 2 ? 1 : 0)) * opacity);
      }
    }
  }

  const native = join(directory, `${key}-gray-native.webp`);
  execFileSync("magick", ["-size", `${width}x${height}`, "-depth", "8", "rgba:-", "-define", "webp:lossless=true", native], {
    input: raw,
    maxBuffer: 10_000_000,
  });
  execFileSync("magick", [native, "-resize", "x800", "-quality", "88", join(directory, `${key}-gray-h800.webp`)]);
  console.log(`Recolored BPC-157 label: ${key}`);
}