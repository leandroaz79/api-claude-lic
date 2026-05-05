const express = require('express');
const { forwardToRouter } = require('../services/proxyService');
const authMiddleware = require('../middleware/auth');
const apiKeyRateLimit = require('../middleware/apiKeyRateLimit');

const router = express.Router();

/**
 * Proxy handler genérico
 * Encaminha requisições de forma transparente sem modificar o payload
 */
function proxyHandler(endpoint) {
  return async (req, res) => {
    try {
      const result = await forwardToRouter(endpoint, req.body, {
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
      console.error('[PROXY] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * POST /v1/messages
 * Endpoint usado pelo Claude CLI
 * Proxy transparente - NÃO modifica model ou payload
 */
router.post('/messages', authMiddleware, apiKeyRateLimit, proxyHandler('/messages'));

/**
 * POST /v1/chat/completions
 * Endpoint OpenAI-compatible
 * Proxy transparente - NÃO modifica model ou payload
 */
router.post('/chat/completions', authMiddleware, apiKeyRateLimit, proxyHandler('/chat/completions'));

module.exports = router;
