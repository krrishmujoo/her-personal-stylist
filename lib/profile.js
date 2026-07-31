// This is the one place that holds what we know about her preferences.
// Nothing here is ever sent to the browser directly — it's used server-side
// to ground the Claude prompt so recommendations feel personal instead of
// generic. When the admin panel is built (a later phase), this moves from
// a hardcoded file to something editable without touching code.

module.exports = {
  name: 'Divya',
  location: 'Santa Cruz, CA',
  makeupStyle: 'Minimal and natural. Never wants to feel like heavy makeup is required to look presentable.',
  ownedMakeupProducts: [
    'Rare Beauty Soft Pinch Liquid Blush — Hope',
    'Clinique Almost Lipstick — Pink Honey',
    'TONYMOLY Mask Melt Firming Overnight Mask',
    'TONYMOLY Mask Melt Brightening Overnight Mask',
    'e.l.f. Vegan Bubble Gum and Cherry Lip Balm Duo',
  ],
  skincarePreferences:
    'Enjoys skincare but does not need every recommendation to involve expensive or luxury brands. ' +
    'Prioritize suitability, practicality, comfort, and value.',
  // Left intentionally blank until she (or Krrish, with her input) fills these
  // in through the admin panel — never guessed at or invented.
  skinType: null,
  allergiesOrSensitivities: null,
  clothingSizePreferences: null,
  favoriteColors: null,
  dislikedColors: null,
  budgetNote: 'Prefer wardrobe-only suggestions for now — no shopping links yet.',
};
