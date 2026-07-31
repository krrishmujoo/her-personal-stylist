// Included on every protected page. Checks with the server whether the
// session cookie is valid; if not, sends the browser back to the login
// screen. This is a UX convenience, not the real security boundary —
// the real boundary is that /api/* routes independently re-check the
// session before doing anything sensitive (reading wardrobe data,
// calling Claude, etc).
(async function guard() {
  try {
    const res = await fetch('/api/session-check');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/index.html';
    }
  } catch (err) {
    // If the check itself fails (e.g. network hiccup), fail safe
    // by sending back to login rather than showing a broken page.
    window.location.href = '/index.html';
  }
})();
