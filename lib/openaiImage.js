async function generateOutfitImage(outfit) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const piecesList = (outfit.pieces || []).join(', ');
  const colorsList = (outfit.colors || []).join(', ');

  const prompt = `Professional editorial fashion flat-lay photography, shot from directly above on a clean, soft neutral cream background. No people, no models, no mannequins, no faces or body parts of any kind — only the clothing items and accessories arranged neatly and aesthetically, as if styled for a fashion magazine spread.

The outfit, described head to toe: ${piecesList}.
Color palette: ${colorsList}.
Overall styling direction: ${outfit.title} — ${outfit.description}

High-resolution, soft natural daylight, minimal shadows, true-to-life fabric textures and accurate colors matching the palette above, professional editorial styling and arrangement.`;

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('Image generation failed:', res.status, errText.slice(0, 300));
      return null;
    }

    const data = await res.json();
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) return null;

    return { imageBase64: b64 };
  } catch (err) {
    console.error('Image generation error:', err.message);
    return null;
  }
}

module.exports = { generateOutfitImage };
