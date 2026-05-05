const fetch = require('node-fetch');
const config = require('../config/env');

/**
 * Proxy transparente para 9Router
 * NÃO modifica o payload, apenas encaminha
 */
async function forwardToRouter(endpoint, body, headers) {
  try {
    const url = `${config.routerUrl}${endpoint}`;
    console.log('[PROXY] Forwarding to:', url);
    console.log('[PROXY] Model:', body.model || 'not specified');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    console.log('[PROXY] Response status:', response.status);

    return {
      status: response.status,
      response: response
    };
  } catch (err) {
    console.error('[PROXY] Error:', err.message);
    throw new Error('Failed to forward request to router');
  }
}

module.exports = { forwardToRouter };
