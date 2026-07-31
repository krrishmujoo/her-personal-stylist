// Shared helper used by every /api function that needs to know
// "is this request actually from Divya, after she logged in?"
//
// How it works, in plain terms:
// 1. On successful login we create a token: `<expiryTimestamp>.<signature>`
// 2. The signature is an HMAC of the expiry, using a secret only the server knows
//    (SESSION_SECRET, set in Vercel env vars — never in the code, never in git).
// 3. We store that token in an HttpOnly cookie, so browser JS can't read it
//    and it isn't visible in page source.
// 4. On every protected request, we recompute the signature and compare.
//    If it doesn't match, or the expiry has passed, the session is invalid.

const crypto = require('crypto');

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail loudly on the server, but never leak this detail to the browser.
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function createSessionToken() {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = String(expiry);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  // Constant-time comparison so response timing can't leak the correct signature.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const expiry = Number(payload);
  if (Number.isNaN(expiry) || Date.now() > expiry) return false;

  return true;
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.trim().split('=');
        return [key, decodeURIComponent(rest.join('='))];
      })
  );
}

module.exports = { createSessionToken, verifySessionToken, parseCookies };
