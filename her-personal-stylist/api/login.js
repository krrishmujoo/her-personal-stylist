const { createSessionToken } = require('./_session');

// Simple in-memory rate limiting. This resets whenever the serverless
// function "cold starts" (roughly every so often on Vercel's free tier),
// which is a real limitation — but for a single-user app where the goal
// is just "stop mindless guessing," it's a reasonable, zero-config start.
// If this ever needs to be bulletproof, the fix is swapping this Map for
// a tiny Redis/Upstash counter — same interface, five-minute change.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const attempts = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, windowStart: now };

  if (now - record.windowStart > WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }

  if (record.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
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
  const password = body && body.password;

  if (!process.env.SITE_PASSWORD) {
    // Server misconfiguration — never describe this to the client.
    console.error('SITE_PASSWORD is not set in environment variables');
    res.status(500).json({ error: 'Something went wrong. Please try again shortly.' });
    return;
  }

  if (!password || password !== process.env.SITE_PASSWORD) {
    record.count += 1;
    attempts.set(ip, record);
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  attempts.delete(ip);

  const token = createSessionToken();
  res.setHeader(
    'Set-Cookie',
    `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`
  );
  res.status(200).json({ success: true });
};
