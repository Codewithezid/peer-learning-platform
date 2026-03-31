const { getSemanticConfig } = require('../config/semantic');

const postToSemanticService = async (path, payload) => {
  const { AI_SERVICE_URL, AI_SERVICE_TIMEOUT_MS } = getSemanticConfig();
  if (!AI_SERVICE_URL) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const postToSemanticServiceWithFallback = async (paths, payload) => {
  for (const path of paths) {
    const result = await postToSemanticService(path, payload);
    if (result) {
      return result;
    }
  }
  return null;
};

const sanitizeRankedList = (payload) => {
  const ranked = Array.isArray(payload?.ranked)
    ? payload.ranked
        .filter((item) => item && item.id != null)
        .map((item) => ({
          id: String(item.id),
          score: Number(item.score || 0),
        }))
    : [];

  return {
    ranked,
    model: payload?.model || 'sentence-transformers',
  };
};

const rankDocumentsSemantic = async (query, documents) => {
  if (!query || !Array.isArray(documents) || documents.length === 0) {
    return null;
  }

  const payload = await postToSemanticService('/semantic/search', {
    query,
    documents,
  });

  if (!payload) {
    return null;
  }

  return sanitizeRankedList(payload);
};

const searchSemanticDocuments = async (query, documents) => {
  if (!query || !Array.isArray(documents) || documents.length === 0) {
    return null;
  }

  const payload = await postToSemanticServiceWithFallback(
    ['/semantic-search', '/semantic/search'],
    { query, documents }
  );

  if (!payload) {
    return null;
  }

  return sanitizeRankedList(payload);
};

const rankPeersSemantic = async (learningSkills, peers) => {
  if (!Array.isArray(learningSkills) || learningSkills.length === 0) {
    return null;
  }

  if (!Array.isArray(peers) || peers.length === 0) {
    return null;
  }

  const payload = await postToSemanticService('/semantic/peer-match', {
    learning_skills: learningSkills,
    peers,
  });

  if (!payload) {
    return null;
  }

  return sanitizeRankedList(payload);
};

const recommendPeersSemantic = async (learningSkills, peers) => {
  if (!Array.isArray(learningSkills) || learningSkills.length === 0) {
    return null;
  }
  if (!Array.isArray(peers) || peers.length === 0) {
    return null;
  }

  const payload = await postToSemanticServiceWithFallback(
    ['/recommend', '/semantic/peer-match'],
    {
      learning_skills: learningSkills,
      peers,
    }
  );

  if (!payload) {
    return null;
  }

  return sanitizeRankedList(payload);
};

const generateQuizFromSemantic = async (content, title = 'AI Quiz', numQuestions = 5) => {
  if (!content || !String(content).trim()) {
    return null;
  }

  const payload = await postToSemanticService('/quiz-gen', {
    title,
    content,
    num_questions: numQuestions,
  });

  if (!payload || !Array.isArray(payload.questions)) {
    return null;
  }

  const questions = payload.questions
    .filter((item) => item && item.question && Array.isArray(item.options))
    .map((item) => ({
      question: String(item.question),
      options: item.options.map((opt) => String(opt)),
      correct_answer: Number.isFinite(Number(item.correct_answer))
        ? Number(item.correct_answer)
        : 0,
      explanation: item.explanation ? String(item.explanation) : null,
    }));

  if (questions.length === 0) {
    return null;
  }

  return {
    questions,
    model: payload.model || 'sentence-transformers',
  };
};

const askRagQuestion = async (question, documents) => {
  if (!question || !String(question).trim()) {
    return null;
  }

  if (!Array.isArray(documents) || documents.length === 0) {
    return null;
  }

  const payload = await postToSemanticService('/rag/ask', {
    question: String(question).trim(),
    documents,
  });

  if (!payload || !payload.answer) {
    return null;
  }

  return {
    answer: String(payload.answer),
    contexts: Array.isArray(payload.contexts) ? payload.contexts : [],
    model: payload.model || 'sentence-transformers',
    provider: payload.provider || 'haystack',
  };
};

module.exports = {
  rankDocumentsSemantic,
  searchSemanticDocuments,
  rankPeersSemantic,
  recommendPeersSemantic,
  generateQuizFromSemantic,
  askRagQuestion,
};
