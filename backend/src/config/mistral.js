const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';

module.exports = { MISTRAL_API_KEY, MISTRAL_API_URL, MISTRAL_MODEL };
