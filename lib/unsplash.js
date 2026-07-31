const MENSWEAR_SIGNAL_WORDS = [
  'man ', 'men ', "men's", 'mens ', 'male', 'menswear', 'businessman',
  'suit and tie', 'necktie', ' tie,', ' tie ',
];

function looksLikeMenswear(text) {
  const lower = (text || '').toLowerCase();
  return MENSWEAR_SIGNAL_WORDS.some((signal) => lower.includes(signal));
}

async function fetchClothingImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const searchQuery = `${query}, women's fashion`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    searchQuery
  )}&per_page=8&content_filter=high&orientation=squarish`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return null;

    const goodResult = results.find((r) => {
      const altText = r.alt_description || '';
      const tagText = (r.tags || []).map((t) => t.title).join(' ');
      return !looksLikeMenswear(altText) && !looksLikeMenswear(tagText);
    });

    if (!goodResult) return null;

    return {
      imageUrl: goodResult.urls.regular,
      photographerName: goodResult.user.name,
      photographerLink: `${goodResult.user.links.html}?utm_source=her_personal_stylist&utm_medium=referral`,
      unsplashLink: `${goodResult.links.html}?utm_source=her_personal_stylist&utm_medium=referral`,
    };
  } catch (err) {
    return null;
  }
}

module.exports = { fetchClothingImage };
