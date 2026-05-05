const express = require('express');
const { forwardToRouter } = require('../services/proxyService');
const authMiddleware = require('../middleware/auth');
const apiKeyRateLimit = require('../middleware/apiKeyRateLimit');

const router = express.Router();

/**
 * POST /v1/chat/completions
 *
 * Ordem dos middlewares:
 * 1. authMiddleware - Valida API Key no Supabase
 * 2. apiKeyRateLimit - Rate limit por API Key (60 req/min)
 * 3. Handler - Encaminha para 9Router
 */
router.post('/chat/completions', authMiddleware, apiKeyRateLimit, async (req, res) => {
  try {
    const result = await forwardToRouter(req.body, {
      'x-license-id': req.license.id
    });

    res.status(result.status);

    result.response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    result.response.body.pipe(res);
  } catch (err) {
    console.error('[CHAT] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
