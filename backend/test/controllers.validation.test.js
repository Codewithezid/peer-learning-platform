const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const peerController = require('../src/controllers/peer.controller');
const feedbackController = require('../src/controllers/feedback.controller');

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

test('createPeerRequest returns 400 when topic or skill_id is missing', async () => {
  const req = {
    user: { id: 'u-1' },
    body: { description: 'Need help with architecture.' },
  };
  const res = createRes();

  await peerController.createPeerRequest(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /topic and skill_id are required/i);
});

test('createPeerSession returns 400 when request_id or peer_user_id is missing', async () => {
  const req = {
    user: { id: 'u-1' },
    body: { request_id: 'r-1' },
  };
  const res = createRes();

  await peerController.createPeerSession(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /request_id and peer_user_id are required/i);
});

test('createFeedback returns 400 for out-of-range ratings', async () => {
  const req = {
    user: { id: 'u-1' },
    body: {
      session_id: 's-1',
      to_user_id: 'u-2',
      rating: 8,
      comments: 'Great session',
    },
  };
  const res = createRes();

  await feedbackController.createFeedback(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /between 1 and 5/i);
});
