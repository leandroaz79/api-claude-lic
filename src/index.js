const express = require('express');
const config = require('./config/env');
const loggerMiddleware = require('./middleware/logger');
const chatRoutes = require('./routes/chat');

const app = express();

/**
 * Ordem correta dos middlewares globais:
 * 1. JSON parser (com limite de 10MB para suportar payloads grandes do Claude CLI)
 * 2. Logger (registra todas as requisições)
 *
 * Rate limiting é aplicado nas rotas específicas:
 * - Auth middleware (valida API Key)
 * - Rate limit por API Key (60 req/min) - PRINCIPAL
 * - Rate limit global (1000 req/15min) - apenas anti-DDoS
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(loggerMiddleware);

app.get('/', (req, res) => {
  res.send('API Gateway Online 🚀');
});

app.use('/v1', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  // Tratamento específico para payload muito grande
  if (err.type === 'entity.too.large') {
    console.error('[ERROR] Payload too large:', err.length);
    return res.status(413).json({
      error: 'Request payload too large'
    });
  }

  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`AI Gateway running on port ${config.port}`);
  console.log(`Router URL: ${config.routerUrl}`);
});
