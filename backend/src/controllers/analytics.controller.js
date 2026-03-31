const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * Get dashboard stats for the authenticated user:
 * total skills count, courses enrolled, articles written, xp_points, level, recent activity.
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch profile for xp_points and level
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('xp_points, level')
      .eq('id', userId)
      .single();

    if (profileError) throw new ApiError(400, profileError.message);

    // Count user skills
    const { count: skillsCount, error: skillsError } = await supabase
      .from('user_skills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (skillsError) throw new ApiError(400, skillsError.message);

    // Count enrollments
    const { count: enrollmentsCount, error: enrollError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (enrollError) throw new ApiError(400, enrollError.message);

    // Count articles written
    const { count: articlesCount, error: articlesError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (articlesError) throw new ApiError(400, articlesError.message);

    // Recent activity (5 items)
    const { data: recentActivity, error: activityError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (activityError) throw new ApiError(400, activityError.message);

    res.json({
      success: true,
      data: {
        total_skills: skillsCount || 0,
        courses_enrolled: enrollmentsCount || 0,
        articles_written: articlesCount || 0,
        xp_points: profile.xp_points || 0,
        level: profile.level || 1,
        recent_activity: recentActivity,
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
 * Get XP breakdown by action_type from activity_log.
 */
const getScores = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: activities, error } = await supabase
      .from('activity_log')
      .select('action_type, xp_earned')
      .eq('user_id', userId);

    if (error) throw new ApiError(400, error.message);

    // Aggregate XP by action_type
    const breakdown = {};
    let totalXp = 0;

    for (const activity of activities) {
      const type = activity.action_type;
      const xp = activity.xp_earned || 0;
      if (!breakdown[type]) {
        breakdown[type] = { action_type: type, total_xp: 0, count: 0 };
      }
      breakdown[type].total_xp += xp;
      breakdown[type].count += 1;
      totalXp += xp;
    }

    res.json({
      success: true,
      data: {
        total_xp: totalXp,
        breakdown: Object.values(breakdown),
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
 * Get top 10 users by xp_points from profiles (leaderboard).
 */
const getLeaderboard = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, xp_points, level')
      .order('xp_points', { ascending: false })
      .limit(10);

    if (error) throw new ApiError(400, error.message);

    // Add rank
    const leaderboard = data.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  getScores,
  getLeaderboard,
};
