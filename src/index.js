const express = require('express');
const config = require('./config/env');
const loggerMiddleware = require('./middleware/logger');
const { limiter } = require('./middleware/rateLimiter');
const chatRoutes = require('./routes/chat');

const app = express();

/**
 * Ordem correta dos middlewares:
 * 1. JSON parser
 * 2. Logger (registra todas as requisições)
 * 3. Rate limit global (proteção anti-DDoS, muito alto)
 * 4. Rotas (autenticação e rate limit por API Key são aplicados nas rotas específicas)
 */
app.use(express.json());
app.use(loggerMiddleware);
app.use(limiter); // Rate limit global leve (1000 req/15min por IP)

app.get('/', (req, res) => {
  res.send('API Gateway Online 🚀');
});

app.use('/v1', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`AI Gateway running on port ${config.port}`);
  console.log(`Router URL: ${config.routerUrl}`);
});
