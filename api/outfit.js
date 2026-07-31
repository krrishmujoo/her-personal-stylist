const { verifySessionToken, parseCookies } = require('./_session');
const { callClaudeForOutfits } = require('../lib/claudeClient');
const { fetchClothingImage } = require('../lib/unsplash');
const profile = require('../lib/profile');

// Simple daily cost-control limit. Resets on cold start, like the login
// rate limiter — a known, accepted limitation for a single-user app.
const MAX_REQUESTS_PER_DAY = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const usage = { count: 0, windowStart: Date.now() };

function buildSystemPrompt() {
  return `You are a personal styling assistant for one specific person. Ground every recommendation in her actual stated preferences below — do not invent products, prices, or facts about her.

HER PROFILE:
- Name: ${profile.name}
- Location: ${profile.location}
- Makeup style: ${profile.makeupStyle}
- Products she already owns: ${profile.ownedMakeupProducts.join('; ')}
- Skincare preferences: ${profile.skincarePreferences}
- Skin type: ${profile.skinType || 'not specified — keep skincare guidance general and skin-type-agnostic'}
- Allergies/sensitivities: ${profile.allergiesOrSensitivities || 'none specified — do not assume any'}
- Budget note: ${profile.budgetNote}

RULES:
- Only suggest items from her existing wardrobe conceptually (general clothing categories, not specific purchase links — this app is wardrobe-only for now, no shopping suggestions).
- Never recommend heavy foundation by default. Never imply makeup is necessary to look presentable.
- Do not force all three owned makeup products into every outfit — use what's genuinely relevant.
- Skincare guidance must be practical, never diagnostic. Recommend patch testing for anything new. Never recommend prescription medication. Never guarantee results.
- Be specific: name actual colors, fabrics, silhouettes, and layering — never vague phrases like "wear something cute."
- Respond with ONLY valid JSON, no markdown formatting, no code fences, no explanation before or after. The JSON must match this exact shape:

{
  "outfits": [
    {
      "title": "string, short evocative name for the look",
      "description": "string, 2-3 sentences describing the outfit specifically",
      "pieces": ["array of specific clothing pieces with color/material/fit detail"],
      "colors": ["array of 3-5 color names that define this outfit's palette"],
      "whyItWorks": "string, why this suits the occasion",
      "comfortNotes": "string, practical notes on comfort/weather/walking suitability",
      "imageSearchQuery": "string, a short 3-5 word search phrase for a clothing photo representing this outfit (e.g. 'linen wrap dress sage green')",
      "makeup": {
        "look": "string, overall makeup look description",
        "blush": "string, blush shade/placement suggestion",
        "lip": "string, lip suggestion",
        "eyes": "string, eye makeup suggestion",
        "usingWhatSheOwns": "string, how her owned products could work here, only if genuinely relevant, else say so honestly"
      },
      "skincare": {
        "prep": "string, pre-event skincare prep steps",
        "notes": "string, general practical notes, patch-test reminder where relevant"
      }
    }
  ]
}

Return exactly 2 outfits that are genuinely different from each other in style or formality. Keep every field concise — 1-2 sentences maximum for description, whyItWorks, and comfortNotes. Do not write long paragraphs.`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!verifySessionToken(cookies.session)) {
    res.status(401).json({ error: 'Not logged in.' });
    return;
  }

  const now = Date.now();
  if (now - usage.windowStart > DAY_MS) {
    usage.count = 0;
    usage.windowStart = now;
  }
  if (usage.count >= MAX_REQUESTS_PER_DAY) {
    res.status(429).json({ error: 'Daily limit reached for outfit generation. Please try again tomorrow.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const occasion = (body && body.occasion ? String(body.occasion) : '').trim().slice(0, 200);
  const notes = (body && body.notes ? String(body.notes) : '').trim().slice(0, 300);

  if (!occasion) {
    res.status(400).json({ error: 'Please describe what you\u2019re getting ready for.' });
    return;
  }

  usage.count += 1;

  const userPrompt = `Occasion: ${occasion}${notes ? `\nAdditional notes: ${notes}` : ''}`;

  let outfitData;
  try {
    outfitData = await callClaudeForOutfits(buildSystemPrompt(), userPrompt);
  } catch (err) {
    console.error('Outfit generation failed:', err.message);
    res.status(502).json({ error: 'Could not generate outfit ideas right now. Please try again in a moment.' });
    return;
  }

  // Attach a real image to each outfit, in parallel. Never blocks the whole
  // response if one image lookup fails.
  const outfitsWithImages = await Promise.all(
    outfitData.outfits.map(async (outfit) => {
      const image = await fetchClothingImage(outfit.imageSearchQuery).catch(() => null);
      return { ...outfit, image };
    })
  );

  res.status(200).json({ outfits: outfitsWithImages });
};
