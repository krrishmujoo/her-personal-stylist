const { verifySessionToken, parseCookies } = require('./_session');
const { callClaudeForOutfits } = require('../lib/claudeClient');
const { generateOutfitImage } = require('../lib/openaiImage');
const profile = require('../lib/profile');

// Text generation is cheap; image generation costs real money per call.
// These are separate limits on purpose \u2014 searches can be generous,
// but total images generated per day needs a tighter leash.
const MAX_SEARCHES_PER_DAY = 30;
const MAX_IMAGES_PER_DAY = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
const usage = { searches: 0, images: 0, windowStart: Date.now() };

function resetUsageIfNewDay() {
  const now = Date.now();
  if (now - usage.windowStart > DAY_MS) {
    usage.searches = 0;
    usage.images = 0;
    usage.windowStart = now;
  }
}

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
- Only mention location or "coastal"/weather-driven framing when the occasion genuinely calls for it (e.g. "beach," "outdoor," "travel"). Do not default to coastal/Santa Cruz language for occasions like work, formal events, or dinner where it isn't relevant — vary your framing based on the occasion itself, not her location.
- Only suggest items from her existing wardrobe conceptually (general clothing categories, not specific purchase links — this app is wardrobe-only for now, no shopping suggestions).
- Never recommend heavy foundation by default. Never imply makeup is necessary to look presentable.
- The makeup and skincare guidance must genuinely vary based on THIS specific occasion — consider time of day, formality, how long she'll be out, and effort level implied by the occasion. A quick coffee run and a formal evening event should read as clearly different routines, not the same steps reworded.
- Actively avoid your own default patterns. Don't reuse the same blush placement ("blended high on the cheeks"), the same eye technique ("soft brown eyeliner smudged along the lash line"), or the same phrasing structure every time — vary the actual technique, not just the words describing it. Treat the styling angle given below as a genuine creative input that changes your specific choices, not decoration on the same underlying suggestion.
- Do not default to using the same owned product on every single outfit out of habit. Reference an owned product only when it specifically fits that look's color/finish/occasion — it is completely fine and expected for some outfits to use none of her owned products and instead describe a general shade/technique category (e.g. "a warm terracotta blush" rather than naming a specific owned product) when that fits better.
- Skincare prep should reflect the occasion's actual demands — e.g. a long evening event calls for different prep than a five-minute errand, and that difference should show in what you recommend, not just the wording.
- Do not force all three owned makeup products into every outfit — use what's genuinely relevant.
- Skincare guidance must be practical, never diagnostic. Recommend patch testing for anything new. Never recommend prescription medication. Never guarantee results.
- Be specific: name actual colors, fabrics, silhouettes, and layering — never vague phrases like "wear something cute."
- Respond with ONLY valid JSON, no markdown formatting, no code fences, no explanation before or after. The JSON must match this exact shape:

{
  "outfits": [
    {
      "title": "string, short evocative name for the look",
      "description": "string, 2-3 sentences describing the outfit specifically",
      "pieces": ["array of specific clothing pieces with color/material/fit detail, ordered head to toe"],
      "colors": ["array of 3-5 color names that define this outfit's palette"],
      "whyItWorks": "string, why this suits the occasion",
      "comfortNotes": "string, practical notes on comfort/weather/walking suitability",
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

Return 3 to 4 outfits that are genuinely different from each other in style or formality — not minor variations of the same idea. Keep every field concise — 1-2 sentences maximum for description, whyItWorks, and comfortNotes. Do not write long paragraphs.`;
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

  resetUsageIfNewDay();

  if (usage.searches >= MAX_SEARCHES_PER_DAY) {
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

  usage.searches += 1;

  // Claude has no memory of previous searches, so without something to
  // anchor variety to, it tends to default to the same comfortable
  // makeup/skincare pattern every time. Grounding each request in the
  // actual day plus a rotating styling angle gives it a genuine, natural
  // reason to vary \u2014 not just an instruction to "be different."
  const STYLING_ANGLES = [
    'soft romantic, rounded shapes, warm undertones',
    'clean and minimal, sharp precise lines, cool undertones',
    'editorial and a little bold, unexpected color placement',
    'effortless undone, barely-there texture, dewy finish',
    'polished and considered, structured, satin finish',
    'playful, warm-toned, a little sun-kissed',
  ];
  const today = new Date();
  const dayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const angle = STYLING_ANGLES[Math.floor(Math.random() * STYLING_ANGLES.length)];

  const userPrompt = `Today is ${dayLabel}.
Occasion: ${occasion}${notes ? `\nAdditional notes: ${notes}` : ''}

Let this styling angle subtly inform your specific choices for makeup technique, placement, and finish (not the outfit's formality, which should still match the occasion): ${angle}. Use it as inspiration for HOW you describe things, not as a rigid theme to force \u2014 it should read as a natural, specific choice, not a gimmick.`;

  let outfitData;
  try {
    outfitData = await callClaudeForOutfits(buildSystemPrompt(), userPrompt);
  } catch (err) {
    console.error('Outfit generation failed:', err.message);
    res.status(502).json({ error: 'Could not generate outfit ideas right now. Please try again in a moment.' });
    return;
  }

  // Generate a real image per outfit, but stop if the daily image budget
  // is exhausted \u2014 remaining outfits just render without an image
  // rather than blowing past the cost cap.
  const outfitsWithImages = await Promise.all(
    outfitData.outfits.map(async (outfit) => {
      if (usage.images >= MAX_IMAGES_PER_DAY) {
        return { ...outfit, image: null };
      }
      usage.images += 1;
      const image = await generateOutfitImage(outfit).catch(() => null);
      return { ...outfit, image };
    })
  );

  res.status(200).json({ outfits: outfitsWithImages });
};
