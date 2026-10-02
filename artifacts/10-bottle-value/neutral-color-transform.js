const NUMBER = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)";
const RGB_FUNCTION = new RegExp(
  `\\brgba?\\(\\s*(${NUMBER}%?)\\s*(?:,\\s*|\\s+)(${NUMBER}%?)\\s*(?:,\\s*|\\s+)(${NUMBER}%?)(?:\\s*[,/]\\s*(${NUMBER}%?|var\\([^)]*\\)))?\\s*\\)`,
  "gi",
);
const HSL_FUNCTION = new RegExp(
  `\\bhsla?\\(\\s*(${NUMBER}(?:deg|rad|turn)?)\\s*(?:,\\s*|\\s+)(${NUMBER}%?)\\s*(?:,\\s*|\\s+)(${NUMBER}%?)(?:\\s*[,/]\\s*(${NUMBER}%?|var\\([^)]*\\)))?\\s*\\)`,
  "gi",
);
const HEX_COLOR = /#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b/gi;
const DARKEN_FACTOR = 0.805;
const DEFAULT_NEUTRAL_SPREAD = 24;

function darkerChannel(value) {
  return String(Math.round(Number.parseFloat(value) * DARKEN_FACTOR));
}

function darkenHexColor(hex, maxSpread) {
  let digits = hex.slice(1);
  if (digits.length === 3 || digits.length === 4) {
    digits = [...digits].map((digit) => digit + digit).join("");
  }
  const hasAlpha = digits.length === 8;
  const channels = [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
  if (
    Math.max(...channels) - Math.min(...channels) > maxSpread ||
    channels.every((channel) => channel === 0) ||
    channels.every((channel) => channel === 255)
  ) {
    return hex;
  }
  const adjusted = channels.map((channel) => darkerChannel(channel.toString()));
  if (hasAlpha) adjusted.push(digits.slice(6, 8));
  return `#${adjusted.map((channel, index) => index === 3 ? channel : Number(channel).toString(16).padStart(2, "0")).join("")}`;
}

function scaleCssChannel(channel) {
  const isPercent = channel.endsWith("%");
  const numericValue = Number.parseFloat(channel);
  const scaled = isPercent
    ? Math.round(numericValue * DARKEN_FACTOR * 1000) / 1000
    : Math.round(numericValue * DARKEN_FACTOR);
  return `${scaled}${isPercent ? "%" : ""}`;
}

export function darkenNeutralColorTokens(value, maxSpread = DEFAULT_NEUTRAL_SPREAD) {
  if (typeof value !== "string" || !value) return value;

  return value
    .replace(HEX_COLOR, (hex) => darkenHexColor(hex, maxSpread))
    .replace(RGB_FUNCTION, (match, red, green, blue, alpha) => {
      const channels = [red, green, blue].map((channel) => Number.parseFloat(channel));
      const isPureWhite = [red, green, blue].every((channel) =>
        channel.endsWith("%") ? Number.parseFloat(channel) === 100 : Number.parseFloat(channel) === 255,
      );
      if (
        Math.max(...channels) - Math.min(...channels) > maxSpread ||
        channels.every((channel) => channel === 0) ||
        isPureWhite
      ) {
        return match;
      }
      return match.replace(
        /(\brgba?\(\s*)([^,/\s]+)(\s*(?:,|\s)\s*)([^,/\s]+)(\s*(?:,|\s)\s*)([^,/\s)]+)/i,
        (prefix, start, r, separatorOne, g, separatorTwo, b) =>
          `${start}${scaleCssChannel(r)}${separatorOne}${scaleCssChannel(g)}${separatorTwo}${scaleCssChannel(b)}`,
      );
    })
    .replace(HSL_FUNCTION, (match, hue, saturation, lightness) => {
      const saturationValue = Number.parseFloat(saturation);
      if (
        !Number.isFinite(saturationValue) ||
        saturationValue > 1 ||
        Number.parseFloat(lightness) === 100
      ) return match;
      const lightnessIndex = match.lastIndexOf(lightness);
      if (lightnessIndex < 0) return match;
      return `${match.slice(0, lightnessIndex)}${scaleCssChannel(lightness)}${match.slice(lightnessIndex + lightness.length)}`;
    });
}

function darkenNeutralHslTriplet(value) {
  return value.replace(
    /^(\s*)([+-]?(?:\d+\.?\d*|\.\d+)(?:deg|rad|turn)?)\s+([+-]?(?:\d+\.?\d*|\.\d+))%\s+([+-]?(?:\d+\.?\d*|\.\d+))%(?=\s*(?:\/|$))/i,
    (match, leading, hue, saturation, lightness) => {
      if (Number.parseFloat(saturation) > 1 || Number.parseFloat(lightness) === 0) return match;
      const adjusted = Math.round(Number.parseFloat(lightness) * DARKEN_FACTOR * 1000) / 1000;
      return `${leading}${hue} ${saturation}% ${adjusted}%`;
    },
  );
}

export function darkenNeutralColorsInSource(code) {
  return darkenNeutralColorTokens(code).replace(
    /(^\s*--([\w-]+)\s*:\s*)([^;\n]+)(;?)/gm,
    (match, prefix, property, value, semicolon) =>
      property.endsWith("foreground")
        ? match
        : `${prefix}${darkenNeutralHslTriplet(value)}${semicolon}`,
  );
}