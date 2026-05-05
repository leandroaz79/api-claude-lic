const express = require('express');
const config = require('./config/env');
const loggerMiddleware = require('./middleware/logger');
const { limiter } = require('./middleware/rateLimiter');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(express.json());
app.use(loggerMiddleware);
app.use(limiter);

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
