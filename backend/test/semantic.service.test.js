const test = require('node:test');
const assert = require('node:assert/strict');

const originalFetch = global.fetch;

const loadSemanticService = () => {
  const modulePath = '../src/services/semantic.service';
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
};

test('rankDocumentsSemantic returns null when AI_SERVICE_URL is not configured', async () => {
  delete process.env.AI_SERVICE_URL;
  const { rankDocumentsSemantic } = loadSemanticService();
  const result = await rankDocumentsSemantic('react', [{ id: '1', text: 'React basics' }]);
  assert.equal(result, null);
});

test('rankDocumentsSemantic returns ranked payload when service responds with success', async () => {
  process.env.AI_SERVICE_URL = 'http://localhost:8001';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      ranked: [{ id: '2', score: 0.92 }, { id: '1', score: 0.55 }],
      model: 'all-MiniLM-L6-v2',
    }),
  });

  const { rankDocumentsSemantic } = loadSemanticService();
  const result = await rankDocumentsSemantic('react hooks', [
    { id: '1', text: 'Intro to JS' },
    { id: '2', text: 'React hooks guide' },
  ]);

  assert.deepEqual(result?.ranked?.map((item) => item.id), ['2', '1']);
  assert.equal(result?.model, 'all-MiniLM-L6-v2');
});

test('rankPeersSemantic returns null when semantic service fails', async () => {
  process.env.AI_SERVICE_URL = 'http://localhost:8001';
  global.fetch = async () => ({
    ok: false,
    text: async () => 'service down',
  });

  const { rankPeersSemantic } = loadSemanticService();
  const result = await rankPeersSemantic(['react'], [{ id: 'u1', text: 'I teach React' }]);

  assert.equal(result, null);
});

test('searchSemanticDocuments calls semantic-search endpoint and returns ranked payload', async () => {
  process.env.AI_SERVICE_URL = 'http://localhost:8001';
  let calledUrl = '';
  global.fetch = async (url) => {
    calledUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        ranked: [{ id: 'a2', score: 0.99 }, { id: 'a1', score: 0.42 }],
        model: 'all-MiniLM-L6-v2',
      }),
    };
  };

  const { searchSemanticDocuments } = loadSemanticService();
  const result = await searchSemanticDocuments('api architecture', [
    { id: 'a1', text: 'Intro notes' },
    { id: 'a2', text: 'Architecture deep dive' },
  ]);

  assert.match(calledUrl, /semantic-search$/);
  assert.deepEqual(result?.ranked?.map((row) => row.id), ['a2', 'a1']);
});

test('generateQuizFromSemantic returns normalized quiz questions', async () => {
  process.env.AI_SERVICE_URL = 'http://localhost:8001';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      questions: [
        {
          question: 'What is React?',
          options: ['A library', 'A database', 'A protocol', 'A browser'],
          correct_answer: 0,
        },
      ],
      model: 'all-MiniLM-L6-v2',
    }),
  });

  const { generateQuizFromSemantic } = loadSemanticService();
  const result = await generateQuizFromSemantic('React basics');

  assert.equal(result?.questions?.length, 1);
  assert.equal(result?.questions?.[0]?.correct_answer, 0);
});

test('askRagQuestion returns answer and contexts from rag endpoint', async () => {
  process.env.AI_SERVICE_URL = 'http://localhost:8001';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      answer: 'Use Peer Requests and then start a Jitsi session.',
      contexts: [{ id: 'doc1', title: 'Video Session Guide' }],
      provider: 'haystack',
      model: 'all-MiniLM-L6-v2',
    }),
  });

  const { askRagQuestion } = loadSemanticService();
  const result = await askRagQuestion('How to start a session?', [
    { id: 'doc1', text: 'Create peer request then start session.' },
  ]);

  assert.match(result?.answer || '', /start a jitsi session/i);
  assert.equal(result?.contexts?.length, 1);
});

test.after(() => {
  global.fetch = originalFetch;
  delete process.env.AI_SERVICE_URL;
});
