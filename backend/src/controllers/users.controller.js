const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * List all users with pagination and optional search by full_name.
 */
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, error, count } = await query;

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
 * Get a single user profile with their skills.
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError) throw new ApiError(404, 'User not found');

    // Fetch user skills with skill details
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select('*, skills(*)')
      .eq('user_id', id);

    if (skillsError) throw new ApiError(400, skillsError.message);

    res.json({
      success: true,
      data: {
        ...profile,
        user_skills: userSkills,
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
 * Get activity log for a user, ordered by created_at DESC, limit 20.
 */
const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

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
  getUsers,
  getUserById,
  getUserActivity,
};
