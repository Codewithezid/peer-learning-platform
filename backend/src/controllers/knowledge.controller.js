const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * List articles with pagination, optional category filter. Join with profiles for author name.
 */
const getArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { category } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('articles')
      .select('*, profiles!articles_author_id_fkey(id, full_name, avatar_url)', { count: 'exact' })
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
 * Create an article. Logs activity with 75 XP.
 */
const createArticle = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      throw new ApiError(400, 'Title and content are required');
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        content,
        category,
        tags: tags || [],
        author_id: userId,
      })
      .select()
      .single();

    if (error) throw new ApiError(400, error.message);

    // Log activity with 75 XP
    await supabase.from('activity_log').insert({
      user_id: userId,
      action_type: 'article_created',
      description: `Published article: ${title}`,
      xp_earned: 75,
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
        .update({ xp_points: (profile.xp_points || 0) + 75 })
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
 * Get an article by ID, increment views_count. Join with profiles for author.
 */
const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the article with author profile
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*, profiles!articles_author_id_fkey(id, full_name, avatar_url)')
      .eq('id', id)
      .single();

    if (articleError) throw new ApiError(404, 'Article not found');

    // Increment views_count
    await supabase
      .from('articles')
      .update({ views_count: (article.views_count || 0) + 1 })
      .eq('id', id);

    res.json({
      success: true,
      data: {
        ...article,
        views_count: (article.views_count || 0) + 1,
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
 * Update an article (author only).
 */
const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, content, category, tags } = req.body;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', id)
      .single();

    if (fetchError) throw new ApiError(404, 'Article not found');
    if (existing.author_id !== userId) throw new ApiError(403, 'Not authorized to update this article');

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabase
      .from('articles')
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
 * Delete an article (author only).
 */
const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', id)
      .single();

    if (fetchError) throw new ApiError(404, 'Article not found');
    if (existing.author_id !== userId) throw new ApiError(403, 'Not authorized to delete this article');

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) throw new ApiError(400, error.message);

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Full-text search on articles using Supabase textSearch on title+content.
 */
const searchArticles = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      throw new ApiError(400, 'Search query (q) is required');
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*, profiles!articles_author_id_fkey(id, full_name, avatar_url)')
      .textSearch('title', q, { type: 'websearch' })
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
  getArticles,
  createArticle,
  getArticleById,
  updateArticle,
  deleteArticle,
  searchArticles,
};
