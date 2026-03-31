const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * List all quizzes with pagination.
 */
const getQuizzes = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
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
 * Get a quiz by ID.
 */
const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new ApiError(404, 'Quiz not found');

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Submit a quiz attempt.
 * Takes {answers} in body, calculates score by comparing with quiz questions' correct answers.
 * Stores in quiz_attempts. If score >= 70, log activity with 50 XP.
 */
const submitAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: quizId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      throw new ApiError(400, 'Answers array is required');
    }

    // Fetch the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) throw new ApiError(404, 'Quiz not found');

    const questions = quiz.questions;

    if (!questions || !Array.isArray(questions)) {
      throw new ApiError(400, 'Quiz has no valid questions');
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
      if (i < answers.length && answers[i] === questions[i].correct_answer) {
        correctCount++;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Store the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: userId,
        answers,
        score,
      })
      .select()
      .single();

    if (attemptError) throw new ApiError(400, attemptError.message);

    // If score >= 70, log activity with 50 XP
    if (score >= 70) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action_type: 'quiz_passed',
        description: `Passed quiz: ${quiz.title} with score ${score}%`,
        xp_earned: 50,
      });

      // Update user XP
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_points')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp_points: (profile.xp_points || 0) + 50 })
          .eq('id', userId);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...attempt,
        correct_count: correctCount,
        total_questions: totalQuestions,
        passed: score >= 70,
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
 * Get all quiz_attempts for the authenticated user, joined with quizzes.
 */
const getMyAttempts = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getQuizzes,
  getQuizById,
  submitAttempt,
  getMyAttempts,
};
