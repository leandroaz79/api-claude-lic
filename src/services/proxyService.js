const fetch = require('node-fetch');
const config = require('../config/env');

async function forwardToRouter(body, headers) {
  try {
    const url = `${config.routerUrl}/chat/completions`;
    console.log('[PROXY] Forwarding to:', url);
    console.log('[PROXY] Body:', JSON.stringify(body));

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
