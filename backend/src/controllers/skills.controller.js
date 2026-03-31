const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * List all skills, optional filter by category.
 */
const getSkills = async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

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

/**
 * Create a new skill.
 */
const createSkill = async (req, res) => {
  try {
    const { name, category, description, icon } = req.body;

    if (!name || !category) {
      throw new ApiError(400, 'Name and category are required');
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({ name, category, description, icon })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    res.status(201).json({
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
 * Get a skill by ID with all user_skills referencing it (with profile data).
 */
const getSkillById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();

    if (skillError) throw new ApiError(404, 'Skill not found');

    // Fetch users who have this skill with profile data
    const { data: userSkills, error: usError } = await supabase
      .from('user_skills')
      .select('*, profiles(*)')
      .eq('skill_id', id);

    if (usError) throw new ApiError(400, usError.message);

    res.json({
      success: true,
      data: {
        ...skill,
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
 * Add a skill to the authenticated user. Logs activity with 10 XP.
 */
const addUserSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skill_id, proficiency_level, is_teaching, is_learning } = req.body;

    if (!skill_id) {
      throw new ApiError(400, 'skill_id is required');
    }

    const { data, error } = await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_id,
        proficiency_level: proficiency_level || 'beginner',
        is_teaching: is_teaching || false,
        is_learning: is_learning || false,
      })
      .select('*, skills(*)')
      .single();

    if (error) throw new ApiError(400, error.message);

    // Log activity with 10 XP
    await supabase.from('activity_log').insert({
      user_id: userId,
      action_type: 'skill_added',
      description: `Added a new skill`,
      xp_earned: 10,
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
        .update({ xp_points: (profile.xp_points || 0) + 10 })
        .eq('id', userId);
    }

    res.status(201).json({
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
 * Update a user_skill by id.
 */
const updateUserSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { proficiency_level, is_teaching, is_learning } = req.body;

    const updates = {};
    if (proficiency_level !== undefined) updates.proficiency_level = proficiency_level;
    if (is_teaching !== undefined) updates.is_teaching = is_teaching;
    if (is_learning !== undefined) updates.is_learning = is_learning;

    const { data, error } = await supabase
      .from('user_skills')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*, skills(*)')
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

/**
 * Delete a user_skill by id.
 */
const deleteUserSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      message: 'User skill removed successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get all user_skills for a given userId param, joined with skills table.
 */
const getUserSkills = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_skills')
      .select('*, skills(*)')
      .eq('user_id', userId);

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
  getSkills,
  createSkill,
  getSkillById,
  addUserSkill,
  updateUserSkill,
  deleteUserSkill,
  getUserSkills,
};
