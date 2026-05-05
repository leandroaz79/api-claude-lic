const express = require('express');
const { forwardToRouter } = require('../services/proxyService');
const authMiddleware = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/chat/completions', strictLimiter, authMiddleware, async (req, res) => {
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
