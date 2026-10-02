import colors from "tailwindcss/colors.js";
import {
  darkenNeutralColorTokens,
  darkenNeutralColorsInSource,
} from "./neutral-color-transform.js";

const darkenPalette = (palette) =>
  Object.fromEntries(
    Object.entries(palette).map(([shade, color]) => [
      shade,
      typeof color === "string" ? darkenNeutralColorTokens(color, 255) : color,
    ]),
  );

/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    transform: {
      js: darkenNeutralColorsInSource,
      jsx: darkenNeutralColorsInSource,
      ts: darkenNeutralColorsInSource,
      tsx: darkenNeutralColorsInSource,
    },
  },
  theme: {
    extend: {
      colors: {
        white: colors.white,
        gray: darkenPalette(colors.gray),
        slate: darkenPalette(colors.slate),
        zinc: darkenPalette(colors.zinc),
        neutral: darkenPalette(colors.neutral),
        stone: darkenPalette(colors.stone),
      },
    },
  },
  plugins: [],
};
