const { validateLicense } = require('../services/licenseService');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] Missing or invalid authorization header');
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const apiKey = authHeader.substring(7);

  const validation = await validateLicense(apiKey);

  if (!validation.valid) {
    console.log(`[AUTH] Invalid license: ${validation.reason}`);
    return res.status(403).json({ error: validation.reason });
  }

  req.license = validation.license;
  console.log(`[AUTH] Valid license for: ${validation.license.id}`);
  next();
}

module.exports = authMiddleware;
