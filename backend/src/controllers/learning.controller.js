const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * List courses with pagination and optional category filter.
 */
const getCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { category } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('courses')
      .select('*, profiles!courses_created_by_fkey(id, full_name, avatar_url)', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
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
 * Create a new course. Logs activity with 15 XP.
 */
const createCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, skill_id, difficulty, thumbnail_url } = req.body;

    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        category,
        skill_id,
        difficulty: difficulty || 'beginner',
        thumbnail_url,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    // Log activity with 15 XP
    await supabase.from('activity_log').insert({
      user_id: userId,
      action_type: 'course_created',
      description: `Created course: ${title}`,
      xp_earned: 15,
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
        .update({ xp_points: (profile.xp_points || 0) + 15 })
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
 * Get a course by ID with its resources (ordered by order_index).
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*, profiles!courses_created_by_fkey(id, full_name, avatar_url)')
      .eq('id', id)
      .single();

    if (courseError) throw new ApiError(404, 'Course not found');

    // Fetch resources ordered by order_index
    const { data: resources, error: resError } = await supabase
      .from('resources')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    if (resError) throw new ApiError(400, resError.message);

    res.json({
      success: true,
      data: {
        ...course,
        resources,
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
 * Update a course (owner only).
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, category, skill_id, difficulty, thumbnail_url } = req.body;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) throw new ApiError(404, 'Course not found');
    if (existing.created_by !== userId) throw new ApiError(403, 'Not authorized to update this course');

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (skill_id !== undefined) updates.skill_id = skill_id;
    if (difficulty !== undefined) updates.difficulty = difficulty;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
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

/**
 * Delete a course (owner only).
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) throw new ApiError(404, 'Course not found');
    if (existing.created_by !== userId) throw new ApiError(403, 'Not authorized to delete this course');

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Add a resource to a course.
 */
const addResource = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, type, url, youtube_id, duration_minutes, order_index } = req.body;

    if (!title || !type) {
      throw new ApiError(400, 'Title and type are required');
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        course_id: courseId,
        title,
        type,
        url,
        youtube_id,
        duration_minutes,
        order_index: order_index || 0,
      })
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
 * Enroll in a course. Logs activity with 15 XP.
 */
const enrollInCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress_pct: 0,
      })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    // Log activity with 15 XP
    await supabase.from('activity_log').insert({
      user_id: userId,
      action_type: 'course_enrolled',
      description: `Enrolled in a course`,
      xp_earned: 15,
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
        .update({ xp_points: (profile.xp_points || 0) + 15 })
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
 * Update enrollment progress. If 100%, set completed_at and log activity with 100 XP.
 */
const updateProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enrollmentId } = req.params;
    const { progress_pct } = req.body;

    if (progress_pct === undefined || progress_pct < 0 || progress_pct > 100) {
      throw new ApiError(400, 'progress_pct must be between 0 and 100');
    }

    const updates = { progress_pct };

    if (progress_pct === 100) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    // If completed, log activity with 100 XP
    if (progress_pct === 100) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        action_type: 'course_completed',
        description: `Completed a course`,
        xp_earned: 100,
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_points')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp_points: (profile.xp_points || 0) + 100 })
          .eq('id', userId);
      }
    }

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
 * Get all enrollments for the authenticated user, joined with courses.
 */
const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
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
  getCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
  addResource,
  enrollInCourse,
  updateProgress,
  getMyEnrollments,
};
