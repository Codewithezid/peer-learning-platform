const { MISTRAL_API_KEY, MISTRAL_API_URL, MISTRAL_MODEL } = require('../config/mistral');

/**
 * Makes a POST request to the Mistral API with the given system prompt and user content.
 * @param {string} systemPrompt - The system-level instruction for the model.
 * @param {string} userContent - The user-level content/query.
 * @returns {Promise<string>} The response message content string.
 */
async function callMistral(systemPrompt, userContent) {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Mistral API:', error.message);
    throw error;
  }
}

/**
 * Summarizes the given content into 3-5 clear, concise bullet points.
 * @param {string} content - The content to summarize.
 * @returns {Promise<string>} The summary as a bullet-point string.
 */
async function summarizeContent(content) {
  try {
    const systemPrompt =
      'You are an educational content summarizer. Summarize the following content into 3-5 clear, concise bullet points. Focus on key concepts and takeaways.';
    const summary = await callMistral(systemPrompt, content);
    return summary;
  } catch (error) {
    console.error('Error summarizing content:', error.message);
    throw error;
  }
}

/**
 * Generates multiple-choice quiz questions from the given content.
 * @param {string} content - The content to generate questions from.
 * @param {number} [numQuestions=5] - The number of questions to generate.
 * @returns {Promise<Array<{question: string, options: string[], correct: number, explanation: string}>>}
 */
async function generateQuizQuestions(content, numQuestions = 5) {
  try {
    const systemPrompt = `You are an educational quiz generator. Generate exactly ${numQuestions} multiple choice questions based on the provided content. Return ONLY a valid JSON array with no additional text. Each object in the array must have this exact format:
[
  {
    "question": "The question text",
    "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
    "correct": 0,
    "explanation": "Brief explanation of why the correct answer is right"
  }
]
The "correct" field is the zero-based index of the correct option.`;

    const response = await callMistral(systemPrompt, content);

    // Handle potential markdown code blocks in the response
    let jsonString = response.trim();
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    const questions = JSON.parse(jsonString);
    return questions;
  } catch (error) {
    console.error('Error generating quiz questions:', error.message);
    throw error;
  }
}

/**
 * Uses Mistral to rank search results by relevance to the query.
 * @param {string} query - The user's search query.
 * @param {Array<{id: string, title: string, content_snippet: string}>} searchResults - The search results to rank.
 * @returns {Promise<Array<{id: string, title: string, relevance_explanation: string, score: number}>>}
 */
async function intelligentSearch(query, searchResults) {
  try {
    const systemPrompt = `You are a search relevance ranker. Given a user query and a list of search results, rank them by relevance. Return ONLY a valid JSON array with no additional text. Each object must have this exact format:
[
  {
    "id": "the original result id",
    "title": "the original result title",
    "relevance_explanation": "Brief explanation of why this result is relevant",
    "score": 0.95
  }
]
The "score" field should be a number between 0 and 1 indicating relevance. Sort by score descending.`;

    const userContent = JSON.stringify({ query, results: searchResults });
    const response = await callMistral(systemPrompt, userContent);

    // Handle potential markdown code blocks in the response
    let jsonString = response.trim();
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    const rankedResults = JSON.parse(jsonString);
    return rankedResults;
  } catch (error) {
    console.error('Error in intelligent search:', error.message);
    throw error;
  }
}

/**
 * Generates an explanation of why two users would be good learning partners.
 * @param {object} userProfile - The current user's profile data.
 * @param {object} peerProfile - The potential peer's profile data.
 * @param {string[]} sharedSkills - List of skill names they have in common.
 * @returns {Promise<string>} A human-readable explanation of the match.
 */
async function getMatchExplanation(userProfile, peerProfile, sharedSkills) {
  try {
    const systemPrompt =
      'You are a peer learning matchmaker. Given two user profiles and their shared skills, explain in 2-3 sentences why they would be good learning partners. Be encouraging and specific about the mutual benefits.';

    const userContent = JSON.stringify({
      user: userProfile,
      peer: peerProfile,
      sharedSkills,
    });

    const explanation = await callMistral(systemPrompt, userContent);
    return explanation;
  } catch (error) {
    console.error('Error generating match explanation:', error.message);
    throw error;
  }
}

module.exports = {
  callMistral,
  summarizeContent,
  generateQuizQuestions,
  intelligentSearch,
  getMatchExplanation,
};
