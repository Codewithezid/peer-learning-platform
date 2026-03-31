const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { corsMiddleware } = require('./config/cors');
const { errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'peer-connect-backend',
    message: 'Backend is running. Use /health or /api/v1 endpoints.',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1',
    message: 'API base is available. Use /api/v1/<module> routes.',
  });
});

app.use('/api/v1', routes);

app.use(errorHandler);

module.exports = app;
