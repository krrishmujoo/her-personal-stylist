// Fetches one real photo per outfit from Unsplash's free API, biased toward
// clothing/flat-lay shots rather than photos of people. If the API key
// isn't configured, or the request fails, or nothing decent is found, we
// return null rather than ever fabricating a URL — the frontend shows a
// clean placeholder in that case instead of a broken or fake image.

async function fetchClothingImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const searchQuery = `${query} clothing flat lay fashion`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    searchQuery
  )}&per_page=1&content_filter=high&orientation=squarish`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.results && data.results[0];
    if (!result) return null;

    return {
      imageUrl: result.urls.regular,
      photographerName: result.user.name,
      photographerLink: `${result.user.links.html}?utm_source=her_personal_stylist&utm_medium=referral`,
      unsplashLink: `${result.links.html}?utm_source=her_personal_stylist&utm_medium=referral`,
    };
  } catch (err) {
    return null;
  }
}

module.exports = { fetchClothingImage };
