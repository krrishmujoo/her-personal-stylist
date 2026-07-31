async function fetchClothingImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const searchQuery = `${query} women's fashion clothing flat lay`;
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
