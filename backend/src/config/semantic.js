const getSemanticConfig = () => {
  const url = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
  const timeout = Number(process.env.AI_SERVICE_TIMEOUT_MS || 8000);
  return {
    AI_SERVICE_URL: url,
    AI_SERVICE_TIMEOUT_MS: Number.isFinite(timeout) ? timeout : 8000,
  };
};

module.exports = { getSemanticConfig };
