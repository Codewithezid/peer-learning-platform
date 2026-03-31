const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * Get the authenticated user's profile with their skills.
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw new ApiError(400, profileError.message);

    // Fetch user skills with joined skill data
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select('*, skills(*)')
      .eq('user_id', userId);

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
 * Update the authenticated user's profile.
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, bio, headline, location, avatar_url } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (bio !== undefined) updates.bio = bio;
    if (headline !== undefined) updates.headline = headline;
    if (location !== undefined) updates.location = location;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

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
  getMe,
  updateProfile,
};
