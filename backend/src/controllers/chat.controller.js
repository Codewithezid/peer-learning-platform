const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

/**
 * Get all conversations where the user is a participant.
 * Join with profiles to get the other participant's name/avatar.
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch conversations where user is participant_1
    const { data: asP1, error: err1 } = await supabase
      .from('conversations')
      .select('*, profiles!conversations_participant_2_fkey(id, full_name, avatar_url)')
      .eq('participant_1', userId)
      .order('last_message_at', { ascending: false });

    if (err1) throw new ApiError(400, err1.message);

    // Fetch conversations where user is participant_2
    const { data: asP2, error: err2 } = await supabase
      .from('conversations')
      .select('*, profiles!conversations_participant_1_fkey(id, full_name, avatar_url)')
      .eq('participant_2', userId)
      .order('last_message_at', { ascending: false });

    if (err2) throw new ApiError(400, err2.message);

    // Normalize: attach the "other" participant profile uniformly
    const conversations = [
      ...asP1.map((c) => ({
        ...c,
        other_participant: c.profiles,
        other_user: c.profiles,
        profiles: undefined,
      })),
      ...asP2.map((c) => ({
        ...c,
        other_participant: c.profiles,
        other_user: c.profiles,
        profiles: undefined,
      })),
    ].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Create or get existing conversation with another user.
 * Ensure participant_1 < participant_2 for the unique constraint.
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { user_id: userIdField, participantId } = req.body || {};
    const otherUserId = userIdField || participantId;

    if (!otherUserId) {
      throw new ApiError(400, 'user_id is required');
    }

    if (userId === otherUserId) {
      throw new ApiError(400, 'Cannot create a conversation with yourself');
    }

    // Ensure consistent ordering for the unique constraint
    const participant_1 = userId < otherUserId ? userId : otherUserId;
    const participant_2 = userId < otherUserId ? otherUserId : userId;

    // Check if conversation already exists
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1', participant_1)
      .eq('participant_2', participant_2)
      .single();

    if (existing && !findError) {
      return res.json({
        success: true,
        data: existing,
      });
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_1, participant_2 })
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
 * Get messages for a conversation (paginated, newest first).
 * Verify user is a participant.
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.conversationId || req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    // Verify user is a participant of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw new ApiError(404, 'Conversation not found');

    if (conversation.participant_1 !== userId && conversation.participant_2 !== userId) {
      throw new ApiError(403, 'Not authorized to view this conversation');
    }

    const { data, error, count } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

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

module.exports = {
  getConversations,
  createConversation,
  getMessages,
};
