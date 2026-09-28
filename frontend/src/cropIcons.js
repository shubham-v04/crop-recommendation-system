// Lightweight emoji stand-ins for crop photos — no image hosting/network
// dependency required, but still gives the result card a visual identity.
export const CROP_ICONS = {
  rice: "🌾",
  maize: "🌽",
  chickpea: "🫘",
  kidneybeans: "🫘",
  pigeonpeas: "🫛",
  mothbeans: "🫘",
  mungbean: "🫘",
  blackgram: "🫘",
  lentil: "🟤",
  pomegranate: "🍈",
  banana: "🍌",
  mango: "🥭",
  grapes: "🍇",
  watermelon: "🍉",
  muskmelon: "🍈",
  apple: "🍎",
  orange: "🍊",
  papaya: "🍈",
  coconut: "🥥",
  cotton: "🌱",
  jute: "🌿",
  coffee: "☕",
};

export function getCropIcon(crop) {
  return CROP_ICONS[crop?.toLowerCase()] || "🌱";
}
