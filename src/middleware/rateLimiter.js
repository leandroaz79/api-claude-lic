const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Global - Proteção Anti-DDoS
 *
 * Limite alto para não interferir no uso normal de múltiplos usuários
 * Serve apenas como proteção contra ataques de negação de serviço
 *
 * O controle principal de rate limit é feito por API Key (apiKeyRateLimit.js)
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por IP (muito alto, apenas anti-DDoS)
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplica rate limit em rotas de health check
    return req.path === '/health' || req.path === '/';
  }
});

module.exports = { limiter };
