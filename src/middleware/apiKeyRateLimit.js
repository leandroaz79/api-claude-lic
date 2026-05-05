/**
 * Rate Limiter baseado em API Key
 *
 * Controla requisições por API Key individualmente
 * - 60 requisições por minuto por API Key
 * - Armazenamento em memória com limpeza inteligente
 * - Remove apenas entradas inativas (sem requisições há 5+ minutos)
 */

const requestStore = new Map();

// Configuração
const WINDOW_MS = 60 * 1000; // 60 segundos (janela de rate limit)
const MAX_REQUESTS = 60; // 60 requisições por janela
const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutos sem atividade = inativo

/**
 * Limpa timestamps antigos de uma API Key específica
 * Remove apenas timestamps fora da janela de 60 segundos
 * Retorna os timestamps válidos
 */
function cleanupApiKeyTimestamps(apiKey, now) {
  const timestamps = requestStore.get(apiKey);
  if (!timestamps) return [];

  // Filtra apenas timestamps dentro da janela de rate limit
  const validTimestamps = timestamps.filter(t => now - t < WINDOW_MS);

  if (validTimestamps.length === 0) {
    requestStore.delete(apiKey);
    return [];
  }

  requestStore.set(apiKey, validTimestamps);
  return validTimestamps;
}

/**
 * Remove API Keys inativas do Map
 * Uma API Key é considerada inativa se não recebe requisições há mais de 5 minutos
 * NUNCA limpa o Map inteiro - apenas entradas inativas
 */
function cleanupInactiveKeys() {
  const now = Date.now();
  let removedCount = 0;

  for (const [apiKey, timestamps] of requestStore.entries()) {
    if (timestamps.length === 0) {
      requestStore.delete(apiKey);
      removedCount++;
      continue;
    }

    // Pega o timestamp mais recente
    const lastActivity = Math.max(...timestamps);

    // Se não há atividade há mais de 5 minutos, remove
    if (now - lastActivity > INACTIVE_THRESHOLD) {
      requestStore.delete(apiKey);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`[RATE-LIMIT] Cleanup: removed ${removedCount} inactive API Keys. Active: ${requestStore.size}`);
  }
}

/**
 * Limpeza periódica de API Keys inativas
 * Executa a cada 2 minutos
 */
setInterval(() => {
  cleanupInactiveKeys();
}, 2 * 60 * 1000);

/**
 * Middleware de Rate Limiting por API Key
 * DEVE ser executado APÓS o middleware de autenticação
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
  let timestamps = cleanupApiKeyTimestamps(apiKey, now);

  console.log(`[RATE-LIMIT] API Key: ${apiKey} | Current requests: ${timestamps.length}/${MAX_REQUESTS}`);

  // Verifica se excedeu o limite
  if (timestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = timestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000));

    // Headers informativos - Remaining sempre 0 quando excedido
    res.setHeader('RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('RateLimit-Remaining', 0);
    res.setHeader('RateLimit-Reset', resetInSeconds);
    res.setHeader('Retry-After', resetInSeconds);

    // Log detalhado
    console.log(`[RATE-LIMIT] API Key exceeded: ${apiKey} | License ID: ${licenseId} | Reset in: ${resetInSeconds}s`);

    return res.status(429).json({
      error: 'Rate limit exceeded. Try again in a few seconds.',
      retryAfter: resetInSeconds
    });
  }

  // Adiciona timestamp atual
  timestamps.push(now);
  requestStore.set(apiKey, timestamps);

  // Calcula tempo de reset (quando a requisição mais antiga expira)
  const oldestTimestamp = timestamps[0];
  const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000));
  const remaining = Math.max(0, MAX_REQUESTS - timestamps.length);

  // Headers informativos - Remaining nunca negativo
  res.setHeader('RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', resetInSeconds);

  next();
}

module.exports = apiKeyRateLimit;
