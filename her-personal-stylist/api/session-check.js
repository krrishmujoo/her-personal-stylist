const { verifySessionToken, parseCookies } = require('./_session');

module.exports = async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const authenticated = verifySessionToken(cookies.session);
  res.status(200).json({ authenticated });
};
