// We don't use a framework validation library here (no build step in this
// project), so this is a small hand-written checker. It exists to make sure
// Claude's JSON output actually matches what the frontend expects before we
// ever render it — if the model returns something malformed, we catch it
// here and retry, instead of showing broken UI or raw JSON to her.

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v) {
  return Array.isArray(v) && v.length > 0 && v.every((item) => isNonEmptyString(item));
}

function validateOutfit(outfit) {
  const errors = [];
  if (!isNonEmptyString(outfit.title)) errors.push('missing title');
  if (!isNonEmptyString(outfit.description)) errors.push('missing description');
  if (!isStringArray(outfit.pieces)) errors.push('missing/invalid pieces');
  if (!isStringArray(outfit.colors)) errors.push('missing/invalid colors');
  if (!isNonEmptyString(outfit.imageSearchQuery)) errors.push('missing imageSearchQuery');
  if (!isNonEmptyString(outfit.whyItWorks)) errors.push('missing whyItWorks');
  if (!isNonEmptyString(outfit.comfortNotes)) errors.push('missing comfortNotes');

  if (!outfit.makeup || typeof outfit.makeup !== 'object') {
    errors.push('missing makeup object');
  } else {
    if (!isNonEmptyString(outfit.makeup.look)) errors.push('missing makeup.look');
    if (!isNonEmptyString(outfit.makeup.lip)) errors.push('missing makeup.lip');
    if (!isNonEmptyString(outfit.makeup.blush)) errors.push('missing makeup.blush');
    if (!isNonEmptyString(outfit.makeup.eyes)) errors.push('missing makeup.eyes');
    if (!isNonEmptyString(outfit.makeup.usingWhatSheOwns)) errors.push('missing makeup.usingWhatSheOwns');
  }

  if (!outfit.skincare || typeof outfit.skincare !== 'object') {
    errors.push('missing skincare object');
  } else {
    if (!isNonEmptyString(outfit.skincare.prep)) errors.push('missing skincare.prep');
    if (!isNonEmptyString(outfit.skincare.notes)) errors.push('missing skincare.notes');
  }

  return errors;
}

function validateOutfitResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['response is not an object'] };
  }
  if (!Array.isArray(payload.outfits) || payload.outfits.length < 3 || payload.outfits.length > 4) {
    return { valid: false, errors: ['outfits must be an array of 3-4 items'] };
  }
  const allErrors = [];
  payload.outfits.forEach((outfit, i) => {
    const errors = validateOutfit(outfit);
    if (errors.length > 0) {
      allErrors.push(`outfit[${i}]: ${errors.join(', ')}`);
    }
  });

  return { valid: allErrors.length === 0, errors: allErrors };
}

module.exports = { validateOutfitResponse };
