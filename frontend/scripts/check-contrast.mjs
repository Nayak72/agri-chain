const pairs = [
  ["dark body", "#ECFDF5", "#06120E", 4.5],
  ["light body", "#062016", "#EEF6F1", 4.5],
  ["dark primary", "#04120C", "#34D399", 4.5],
  ["light primary", "#FFFFFF", "#047857", 4.5],
  ["dark muted", "#9DB8AC", "#06120E", 4.5],
  ["light muted", "#3F5B4E", "#EEF6F1", 4.5],
  ["dark accent", "#04120C", "#BEF264", 4.5],
  ["light accent", "#FFFFFF", "#4D7C0F", 4.5],
];

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

for (const [name, foreground, background, threshold] of pairs) {
  const ratio = (Math.max(luminance(foreground), luminance(background)) + 0.05) / (Math.min(luminance(foreground), luminance(background)) + 0.05);
  if (ratio < threshold) throw new Error(`${name} contrast ${ratio.toFixed(2)}:1 is below ${threshold}:1`);
  console.log(`${name}: ${ratio.toFixed(2)}:1`);
}
