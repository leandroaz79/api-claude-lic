const express = require('express');
const { forwardToRouter } = require('../services/proxyService');
const authMiddleware = require('../middleware/auth');
const apiKeyRateLimit = require('../middleware/apiKeyRateLimit');

const router = express.Router();

/**
 * Proxy handler genérico
 * Encaminha requisições de forma transparente sem modificar o payload
 * Suporta streaming com tratamento robusto de erros
 */
function proxyHandler(endpoint) {
  return async (req, res) => {
    try {
      const result = await forwardToRouter(endpoint, req.body, {
        'x-license-id': req.license.id
      });

      // Define status antes de iniciar streaming
      res.status(result.status);

      // Copia headers, exceto content-length (conflita com streaming chunked)
      result.response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-length') {
          res.setHeader(key, value);
        }
      });

      // Inicia streaming
      result.response.body.pipe(res);

      // Garante encerramento correto do stream
      result.response.body.on('end', () => {
        res.end();
      });

      // Tratamento de erro no stream
      result.response.body.on('error', (err) => {
        console.error('[STREAM ERROR]', err);
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.end();
        }
      });

    } catch (err) {
      console.error('[PROXY] Error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
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
