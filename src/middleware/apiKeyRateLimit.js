// Rate limiter baseado em API Key
// Armazena timestamps de requisições em memória por API Key

const requestStore = new Map();

// Configuração
const WINDOW_MS = 60 * 1000; // 60 segundos
const MAX_REQUESTS = 60; // 60 requisições por janela

// Limpa requisições antigas periodicamente (a cada 2 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [apiKey, timestamps] of requestStore.entries()) {
    const validTimestamps = timestamps.filter(t => now - t < WINDOW_MS);
    if (validTimestamps.length === 0) {
      requestStore.delete(apiKey);
    } else {
      requestStore.set(apiKey, validTimestamps);
    }
  }
}, 2 * 60 * 1000);

function apiKeyRateLimit(req, res, next) {
  // Obtém a API Key do objeto license (já validada pelo auth middleware)
  const apiKey = req.license?.api_key;

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();

  // Obtém ou cria array de timestamps para esta API Key
  let timestamps = requestStore.get(apiKey) || [];

  // Remove timestamps fora da janela de tempo
  timestamps = timestamps.filter(timestamp => now - timestamp < WINDOW_MS);

  // Verifica se excedeu o limite
  if (timestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = timestamps[0];
    const resetTime = new Date(oldestTimestamp + WINDOW_MS);

    // Headers informativos
    res.setHeader('RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('RateLimit-Remaining', 0);
    res.setHeader('RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));

    console.log(`[RATE-LIMIT] API Key ${apiKey} exceeded limit`);

    return res.status(429).json({
      error: 'Rate limit exceeded. Try again in a few seconds.'
    });
  }

  // Adiciona timestamp atual
  timestamps.push(now);
  requestStore.set(apiKey, timestamps);

  // Calcula tempo de reset (quando a requisição mais antiga expira)
  const oldestTimestamp = timestamps[0];
  const resetTime = new Date(oldestTimestamp + WINDOW_MS);
  const remaining = MAX_REQUESTS - timestamps.length;

  // Headers informativos
  res.setHeader('RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));

  next();
}

module.exports = apiKeyRateLimit;
