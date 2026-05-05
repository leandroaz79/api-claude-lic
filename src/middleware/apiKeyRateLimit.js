/**
 * Rate Limiter baseado em API Key
 *
 * Controla requisições por API Key individualmente
 * - 60 requisições por minuto por API Key
 * - Armazenamento em memória com limpeza automática
 * - Previne memory leak limitando o tamanho do Map
 */

const requestStore = new Map();

// Configuração
const WINDOW_MS = 60 * 1000; // 60 segundos
const MAX_REQUESTS = 60; // 60 requisições por janela
const MAX_KEYS_IN_MEMORY = 10000; // Limite de API Keys no Map (proteção contra memory leak)

/**
 * Limpa timestamps antigos de uma API Key específica
 * Remove a entrada do Map se não houver timestamps válidos
 */
function cleanupApiKey(apiKey, now) {
  const timestamps = requestStore.get(apiKey);
  if (!timestamps) return;

  const validTimestamps = timestamps.filter(t => now - t < WINDOW_MS);

  if (validTimestamps.length === 0) {
    requestStore.delete(apiKey);
  } else {
    requestStore.set(apiKey, validTimestamps);
  }
}

/**
 * Limpa todas as entradas antigas do Map periodicamente
 * Previne crescimento infinito da memória
 */
setInterval(() => {
  const now = Date.now();

  // Se o Map está muito grande, limpa tudo (proteção contra memory leak)
  if (requestStore.size > MAX_KEYS_IN_MEMORY) {
    console.log(`[RATE-LIMIT] Map size exceeded ${MAX_KEYS_IN_MEMORY}, clearing all entries`);
    requestStore.clear();
    return;
  }

  // Limpeza normal
  for (const [apiKey] of requestStore.entries()) {
    cleanupApiKey(apiKey, now);
  }

  console.log(`[RATE-LIMIT] Cleanup completed. Active API Keys: ${requestStore.size}`);
}, 2 * 60 * 1000); // A cada 2 minutos

/**
 * Middleware de Rate Limiting por API Key
 * Deve ser executado APÓS o middleware de autenticação
 */
function apiKeyRateLimit(req, res, next) {
  // Obtém a API Key do objeto license (já validada pelo auth middleware)
  const apiKey = req.license?.api_key;
  const licenseId = req.license?.id;

  if (!apiKey) {
    console.log('[RATE-LIMIT] No API Key found in request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();

  // Limpa timestamps antigos desta API Key antes de verificar
  cleanupApiKey(apiKey, now);

  // Obtém ou cria array de timestamps para esta API Key
  let timestamps = requestStore.get(apiKey) || [];

  // Verifica se excedeu o limite
  if (timestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = timestamps[0];
    const resetInSeconds = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);

    // Headers informativos
    res.setHeader('RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('RateLimit-Remaining', 0);
    res.setHeader('RateLimit-Reset', resetInSeconds);

    // Log detalhado
    console.log(`[RATE-LIMIT] API Key exceeded: ${apiKey} | License ID: ${licenseId} | Reset in: ${resetInSeconds}s`);

    return res.status(429).json({
      error: 'Rate limit exceeded. Try again in a few seconds.'
    });
  }

  // Adiciona timestamp atual
  timestamps.push(now);
  requestStore.set(apiKey, timestamps);

  // Calcula tempo de reset (quando a requisição mais antiga expira)
  const oldestTimestamp = timestamps[0];
  const resetInSeconds = Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000);
  const remaining = MAX_REQUESTS - timestamps.length;

  // Headers informativos
  res.setHeader('RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', resetInSeconds);

  next();
}

module.exports = apiKeyRateLimit;
