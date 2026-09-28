// Make only the gray parts of the TB-500 label black.
// Keep the blue stripe, white print, glass, and cap unchanged.
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(appDir, "public/vials/v14");
const keys = ["tb-500-ecdc3ab8d386", "tb-500-de03b4d1320a"];
const width = 553;
const height = 1126;
const clamp = (value) => Math.max(0, Math.min(1, value));

for (const key of keys) {
  if (process.argv[2] && process.argv[2] !== key) continue;
  const raw = Buffer.from(execFileSync("magick", [
    join(directory, `${key}-native.webp`), "-depth", "8", "rgba:-",
  ], { maxBuffer: 10_000_000 }));
  if (raw.length !== width * height * 4) throw new Error(`Unexpected TB-500 dimensions: ${key}`);

  for (let y = 460; y < 952; y++) {
    if (y > 582 && y < 778) continue;
    for (let x = 23; x <= 530; x++) {
      const i = (y * width + x) * 4;
      const r = raw[i], g = raw[i + 1], b = raw[i + 2], alpha = raw[i + 3];
      // The colored blue pixels and translucent glass are not label gray.
      if (alpha < 100 || Math.max(r, g, b) - Math.min(r, g, b) > 16) continue;
      const brightness = (r + g + b) / 3;
      // Leave the white logo and strength readable with antialiased edges.
      const whiteLetter = clamp((brightness - 200) / 45);
      const edge = Math.min(1, (x - 23) / 6, (530 - x) / 6);
      const black = (1 - whiteLetter) * edge * clamp(alpha / 250);
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(raw[i + c] * (1 - black));
    }
  }

  const native = join(directory, `${key}-black-native.webp`);
  execFileSync("magick", [
    "-size", `${width}x${height}`, "-depth", "8", "rgba:-",
    "-define", "webp:lossless=true", native,
  ], { input: raw, maxBuffer: 10_000_000 });
  execFileSync("magick", [native, "-resize", "x800", "-quality", "88", join(directory, `${key}-black-h800.webp`)]);
  console.log(`Recolored TB-500 label: ${key}`);
}