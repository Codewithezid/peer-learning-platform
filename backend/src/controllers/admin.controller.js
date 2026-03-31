const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

const countRows = async (tableName) => {
  const { count, error } = await supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (error) throw new ApiError(400, error.message);
  return count || 0;
};

const checkAccess = async (req, res) => {
  res.json({
    success: true,
    data: {
      allowed: true,
      user_id: req.user.id,
    },
  });
};

const getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalResources, totalSessions, totalFeedback, totalAIRequests] = await Promise.all([
      countRows('profiles'),
      countRows('articles'),
      countRows('video_sessions'),
      countRows('feedback'),
      countRows('ai_logs'),
    ]);

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { count: activeUsers30d = 0, error: activeUsersError } = await supabase
      .from('activity_log')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    if (activeUsersError) throw new ApiError(400, activeUsersError.message);

    const { data: feedbackRows, error: ratingError } = await supabase
      .from('feedback')
      .select('rating');
    if (ratingError) throw new ApiError(400, ratingError.message);

    const avgRating =
      !feedbackRows || feedbackRows.length === 0
        ? null
        : Number(
            (
              feedbackRows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / feedbackRows.length
            ).toFixed(2)
          );

    res.json({
      success: true,
      data: {
        generated_at: new Date().toISOString(),
        summary: {
          total_users: totalUsers,
          active_users_30d: activeUsers30d,
          total_resources: totalResources,
          total_sessions: totalSessions,
          total_feedback: totalFeedback,
          total_ai_requests: totalAIRequests,
          average_feedback_rating: avgRating,
        },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, headline, location, xp_points, level, created_at, updated_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getResources = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('articles')
      .select('id, title, category, tags, views_count, created_at, profiles!articles_author_id_fkey(id, full_name)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getSessions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('video_sessions')
      .select(
        `
          *,
          requester:profiles!video_sessions_requester_id_fkey(id, full_name, avatar_url),
          mentor:profiles!video_sessions_mentor_user_id_fkey(id, full_name, avatar_url)
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAIUsage = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { action_type: actionType } = req.query;

    let query = supabase
      .from('ai_logs')
      .select(
        `
          id,
          user_id,
          action_type,
          prompt_summary,
          created_at,
          profiles(id, full_name)
        `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    const { data, error, count } = await query;
    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getReports = async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalResources, totalSessions, totalFeedback] = await Promise.all([
      countRows('profiles'),
      countRows('courses'),
      countRows('articles'),
      countRows('video_sessions'),
      countRows('feedback'),
    ]);

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('profiles')
      .select('id, full_name, xp_points, level')
      .order('xp_points', { ascending: false })
      .limit(10);
    if (leaderboardError) throw new ApiError(400, leaderboardError.message);

    const { data: aiUsage, error: aiUsageError } = await supabase
      .from('ai_logs')
      .select('action_type');
    if (aiUsageError) throw new ApiError(400, aiUsageError.message);

    const aiActionBreakdown = {};
    for (const row of aiUsage || []) {
      const key = row.action_type || 'unknown';
      aiActionBreakdown[key] = (aiActionBreakdown[key] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        generated_at: new Date().toISOString(),
        summary: {
          total_users: totalUsers,
          total_courses: totalCourses,
          total_resources: totalResources,
          total_sessions: totalSessions,
          total_feedback: totalFeedback,
        },
        top_contributors: leaderboard || [],
        ai_action_breakdown: aiActionBreakdown,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  checkAccess,
  getDashboard,
  getUsers,
  getResources,
  getSessions,
  getAIUsage,
  getReports,
};
