const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');
const { MISTRAL_API_KEY, MISTRAL_API_URL, MISTRAL_MODEL } = require('../config/mistral');
const {
  searchSemanticDocuments,
  recommendPeersSemantic,
  generateQuizFromSemantic,
  askRagQuestion,
} = require('../services/semantic.service');

/**
 * Helper: call Mistral chat completions API.
 */
const callMistral = async (systemPrompt, userMessage) => {
  if (!MISTRAL_API_KEY) {
    throw new ApiError(503, 'Mistral API key is not configured');
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ApiError(502, `Mistral API error: ${errBody}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
};

const logAIUsage = async ({ userId, actionType, promptSummary, latencyMs }) => {
  try {
    await supabase.from('ai_logs').insert({
      user_id: userId || null,
      action_type: actionType,
      prompt_summary: promptSummary || null,
      model: MISTRAL_MODEL,
      latency_ms: Number.isFinite(latencyMs) ? latencyMs : null,
    });
  } catch {
    // Keep AI endpoint resilient even if logging fails.
  }
};

/**
 * Summarize content using Mistral.
 */
const summarize = async (req, res) => {
  try {
    const { content } = req.body;
    const startedAt = Date.now();

    if (!content) {
      throw new ApiError(400, 'Content is required');
    }

    const summary = await callMistral(
      'You are a helpful assistant that creates concise, well-structured summaries. Provide a clear summary in 3-5 bullet points.',
      `Please summarize the following content:\n\n${content}`
    );

    await logAIUsage({
      userId: req.user?.id,
      actionType: 'summary',
      promptSummary: content.slice(0, 500),
      latencyMs: Date.now() - startedAt,
    });

    res.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Generate quiz questions from content using Mistral, store in quizzes table.
 */
const generateQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, title, source_type, source_id } = req.body;
    const startedAt = Date.now();

    if (!content || !title) {
      throw new ApiError(400, 'Content and title are required');
    }

    let questions;
    let aiActionType = 'quiz';

    const semanticQuiz = await generateQuizFromSemantic(content, title, 5);
    if (semanticQuiz?.questions?.length) {
      questions = semanticQuiz.questions;
      aiActionType = 'quiz-semantic';
    } else {
      const quizResponse = await callMistral(
        `You are a quiz generator. Create exactly 5 multiple-choice questions based on the provided content. 
Return a valid JSON array of objects with this exact structure:
[
  {
    "question": "the question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correct_answer": 0
  }
]
Where correct_answer is the zero-based index of the correct option. Return ONLY the JSON array, no other text.`,
        `Generate quiz questions based on this content:\n\n${content}`
      );

      try {
        const jsonMatch = quizResponse.match(/\[[\s\S]*\]/);
        questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(quizResponse);
      } catch {
        throw new ApiError(502, 'Failed to parse quiz questions from AI response');
      }
    }

    // Store quiz in database
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title,
        questions,
        source_type: source_type || null,
        source_id: source_id || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    await logAIUsage({
      userId,
      actionType: aiActionType,
      promptSummary: `${title}: ${content.slice(0, 350)}`,
      latencyMs: Date.now() - startedAt,
    });

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Intelligent search: searches articles via full-text, then uses Mistral to re-rank and explain.
 */
const intelligentSearch = async (req, res) => {
  try {
    const { query } = req.body;
    const startedAt = Date.now();

    if (!query) {
      throw new ApiError(400, 'Query is required');
    }

    // Search articles using full-text search
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, content, category, tags, created_at')
      .textSearch('title', query, { type: 'websearch' })
      .limit(10);

    if (error) throw new ApiError(400, error.message);

    if (articles.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          explanation: 'No articles found matching your query.',
        },
      });
    }

    const semanticRanking = await searchSemanticDocuments(
      query,
      articles.map((article) => ({
        id: article.id,
        text: `${article.title || ''}\n${article.content?.slice(0, 400) || ''}`,
      }))
    );

    if (semanticRanking?.ranked?.length) {
      const articleById = new Map(articles.map((article) => [String(article.id), article]));
      const rankedArticles = semanticRanking.ranked
        .map((row) => articleById.get(String(row.id)))
        .filter(Boolean);

      const includedIds = new Set(rankedArticles.map((item) => String(item.id)));
      for (const article of articles) {
        if (!includedIds.has(String(article.id))) {
          rankedArticles.push(article);
        }
      }

      await logAIUsage({
        userId: req.user?.id,
        actionType: 'search-semantic',
        promptSummary: query.slice(0, 500),
        latencyMs: Date.now() - startedAt,
      });

      return res.json({
        success: true,
        data: {
          results: rankedArticles,
          explanation: `Results ranked by semantic relevance (${semanticRanking.model || 'sentence-transformers'}).`,
        },
      });
    }

    // Use Mistral to re-rank and explain
    const articlesContext = articles
      .map((a, i) => `[${i + 1}] Title: ${a.title}\nSnippet: ${a.content?.substring(0, 200)}...`)
      .join('\n\n');

    const aiResponse = await callMistral(
      `You are a search assistant. Given a user query and a list of articles, re-rank them by relevance and provide a brief explanation of why each result is relevant. Return your response as a JSON object with this structure:
{
  "ranked_ids": [array of article indices in order of relevance, 1-based],
  "explanation": "A brief summary of the search results and their relevance"
}
Return ONLY the JSON, no other text.`,
      `Query: "${query}"\n\nArticles:\n${articlesContext}`
    );

    let aiResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
    } catch {
      // If parsing fails, return articles in original order
      aiResult = {
        ranked_ids: articles.map((_, i) => i + 1),
        explanation: 'Results returned in default order.',
      };
    }

    // Re-order articles based on AI ranking
    const rankedArticles = aiResult.ranked_ids
      .map((idx) => articles[idx - 1])
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        results: rankedArticles.length > 0 ? rankedArticles : articles,
        explanation: aiResult.explanation,
      },
    });

    await logAIUsage({
      userId: req.user?.id,
      actionType: 'search',
      promptSummary: query.slice(0, 500),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get personalized recommendations: find users teaching skills the current user is learning.
 */
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const startedAt = Date.now();

    // Get the current user's learning skills
    const { data: learningSkills, error: lsError } = await supabase
      .from('user_skills')
      .select('skill_id, skills(name)')
      .eq('user_id', userId)
      .eq('is_learning', true);

    if (lsError) throw new ApiError(400, lsError.message);

    if (!learningSkills || learningSkills.length === 0) {
      return res.json({
        success: true,
        data: {
          recommendations: [],
          message: 'Add some skills you want to learn to get recommendations.',
        },
      });
    }

    const skillIds = learningSkills.map((s) => s.skill_id);

    // Find users teaching those skills
    const { data: teachers, error: tError } = await supabase
      .from('user_skills')
      .select('*, skills(name, category), profiles(id, full_name, avatar_url, headline)')
      .in('skill_id', skillIds)
      .eq('is_teaching', true)
      .neq('user_id', userId);

    if (tError) throw new ApiError(400, tError.message);

    // Group by user to avoid duplicates
    const userMap = new Map();
    for (const t of teachers) {
      const uid = t.profiles?.id;
      if (!uid) continue;
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user: t.profiles,
          teaching_skills: [],
        });
      }
      userMap.get(uid).teaching_skills.push({
        skill_name: t.skills?.name,
        proficiency_level: t.proficiency_level,
      });
    }

    const recommendations = Array.from(userMap.values());
    const learningSkillNames = learningSkills
      .map((item) => item.skills?.name)
      .filter(Boolean);

    const semanticPeerRanking = await recommendPeersSemantic(
      learningSkillNames,
      recommendations.map((item) => ({
        id: item.user?.id,
        text: `${item.user?.headline || ''}\n${item.teaching_skills.map((s) => s.skill_name).join(', ')}`,
      }))
    );

    let rankedRecommendations = recommendations;
    if (semanticPeerRanking?.ranked?.length) {
      const recById = new Map(recommendations.map((item) => [String(item.user?.id), item]));
      rankedRecommendations = semanticPeerRanking.ranked
        .map((row) => recById.get(String(row.id)))
        .filter(Boolean);

      const includedIds = new Set(rankedRecommendations.map((item) => String(item.user?.id)));
      for (const rec of recommendations) {
        if (!includedIds.has(String(rec.user?.id))) {
          rankedRecommendations.push(rec);
        }
      }
    }

    await logAIUsage({
      userId,
      actionType: semanticPeerRanking?.ranked?.length ? 'recommend-peer-semantic' : 'recommend-peer',
      promptSummary: `learning_skills_count=${learningSkills.length}`,
      latencyMs: Date.now() - startedAt,
    });

    res.json({
      success: true,
      data: {
        recommendations: rankedRecommendations,
        learning_skills: learningSkills.map((s) => s.skills?.name),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Ask a question over repository resources using Haystack-backed retrieval.
 */
const askRepository = async (req, res) => {
  try {
    const { question } = req.body || {};
    const startedAt = Date.now();

    if (!question || !String(question).trim()) {
      throw new ApiError(400, 'question is required');
    }

    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, content, category, tags, created_at')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) throw new ApiError(400, error.message);

    const docs = (articles || []).map((article) => ({
      id: article.id,
      title: article.title,
      text: `${article.title || ''}\n${article.content || ''}`,
      category: article.category || null,
      tags: article.tags || [],
    }));

    const ragResponse = await askRagQuestion(question, docs);

    if (ragResponse) {
      await logAIUsage({
        userId: req.user?.id,
        actionType: 'rag-answer',
        promptSummary: String(question).slice(0, 500),
        latencyMs: Date.now() - startedAt,
      });

      return res.json({
        success: true,
        data: ragResponse,
      });
    }

    // Fallback: lightweight answer from top text-search snippets.
    const { data: fallbackArticles, error: fallbackError } = await supabase
      .from('articles')
      .select('id, title, content')
      .textSearch('title', question, { type: 'websearch' })
      .limit(5);

    if (fallbackError) throw new ApiError(400, fallbackError.message);

    const snippets = (fallbackArticles || []).map((item) => ({
      id: item.id,
      title: item.title,
      snippet: (item.content || '').slice(0, 220),
    }));

    const fallbackAnswer =
      snippets.length > 0
        ? `I couldn't reach the semantic service, but here are the most relevant resources I found for "${question}".`
        : `I couldn't find matching resources for "${question}".`;

    await logAIUsage({
      userId: req.user?.id,
      actionType: 'rag-fallback',
      promptSummary: String(question).slice(0, 500),
      latencyMs: Date.now() - startedAt,
    });

    return res.json({
      success: true,
      data: {
        answer: fallbackAnswer,
        contexts: snippets,
        model: 'fallback-search',
        provider: 'fallback',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  summarize,
  generateQuiz,
  intelligentSearch,
  getRecommendations,
  askRepository,
};
