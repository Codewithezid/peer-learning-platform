const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');
const { getRecommendedPeers } = require('../services/recommendation.service');

const listPeerRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = supabase
      .from('peer_requests')
      .select('*, skills(id, name, category)')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;
    if (error) throw new ApiError(400, error.message);

    const requestIds = (requests || []).map((r) => r.id);
    let matchCounts = {};
    if (requestIds.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from('peer_matches')
        .select('request_id')
        .in('request_id', requestIds);

      if (matchesError) throw new ApiError(400, matchesError.message);

      for (const row of matches || []) {
        matchCounts[row.request_id] = (matchCounts[row.request_id] || 0) + 1;
      }
    }

    const enriched = (requests || []).map((r) => ({
      ...r,
      matches_count: matchCounts[r.id] || 0,
    }));

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createPeerRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, description, skill_id } = req.body || {};

    if (!topic || !skill_id) {
      throw new ApiError(400, 'topic and skill_id are required');
    }

    const { data: requestRow, error } = await supabase
      .from('peer_requests')
      .insert({
        requester_id: userId,
        topic,
        description: description || null,
        skill_id,
        status: 'open',
      })
      .select('*, skills(id, name, category)')
      .single();

    if (error) throw new ApiError(400, error.message);

    const recommendations = await getRecommendedPeers(userId, 8, [skill_id]);

    let createdMatches = [];
    if (recommendations.length > 0) {
      const payload = recommendations.map((rec) => ({
        request_id: requestRow.id,
        matched_user_id: rec.user.id,
        match_score: rec.matchScore,
        accepted: false,
      }));

      const { data: matches, error: matchesError } = await supabase
        .from('peer_matches')
        .upsert(payload, { onConflict: 'request_id,matched_user_id' })
        .select('*, profiles!peer_matches_matched_user_id_fkey(id, full_name, avatar_url, headline)');

      if (matchesError) throw new ApiError(400, matchesError.message);
      createdMatches = matches || [];
    }

    res.status(201).json({
      success: true,
      data: {
        request: requestRow,
        matches: createdMatches,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getPeerMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { request_id: requestId } = req.query;

    if (requestId) {
      const { data: requestRow, error: requestError } = await supabase
        .from('peer_requests')
        .select('*')
        .eq('id', requestId)
        .eq('requester_id', userId)
        .single();

      if (requestError || !requestRow) {
        throw new ApiError(404, 'Peer request not found');
      }

      const { data: existingMatches, error: existingError } = await supabase
        .from('peer_matches')
        .select('*, profiles!peer_matches_matched_user_id_fkey(id, full_name, avatar_url, headline)')
        .eq('request_id', requestId)
        .order('match_score', { ascending: false });

      if (existingError) throw new ApiError(400, existingError.message);

      if (existingMatches && existingMatches.length > 0) {
        return res.json({
          success: true,
          data: existingMatches,
        });
      }

      const recommendations = await getRecommendedPeers(userId, 8, [requestRow.skill_id]);

      if (recommendations.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const payload = recommendations.map((rec) => ({
        request_id: requestRow.id,
        matched_user_id: rec.user.id,
        match_score: rec.matchScore,
        accepted: false,
      }));

      const { data: created, error: createdError } = await supabase
        .from('peer_matches')
        .upsert(payload, { onConflict: 'request_id,matched_user_id' })
        .select('*, profiles!peer_matches_matched_user_id_fkey(id, full_name, avatar_url, headline)')
        .order('match_score', { ascending: false });

      if (createdError) throw new ApiError(400, createdError.message);

      return res.json({
        success: true,
        data: created || [],
      });
    }

    const recommendations = await getRecommendedPeers(userId, 8);
    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createPeerSession = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { request_id: requestId, peer_user_id: peerUserId, provider = 'jitsi' } = req.body || {};

    if (!requestId || !peerUserId) {
      throw new ApiError(400, 'request_id and peer_user_id are required');
    }

    const { data: requestRow, error: requestError } = await supabase
      .from('peer_requests')
      .select('*')
      .eq('id', requestId)
      .eq('requester_id', requesterId)
      .single();

    if (requestError || !requestRow) {
      throw new ApiError(404, 'Peer request not found');
    }

    const { data: matchRow, error: matchError } = await supabase
      .from('peer_matches')
      .select('*')
      .eq('request_id', requestId)
      .eq('matched_user_id', peerUserId)
      .single();

    if (matchError || !matchRow) {
      throw new ApiError(400, 'Selected peer is not matched for this request');
    }

    const roomName = `peer-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const joinUrl = `https://meet.jit.si/${roomName}`;

    const { data: session, error: sessionError } = await supabase
      .from('video_sessions')
      .insert({
        request_id: requestId,
        requester_id: requesterId,
        mentor_user_id: peerUserId,
        room_name: roomName,
        provider,
        join_url: joinUrl,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (sessionError) throw new ApiError(400, sessionError.message);

    const { error: updateRequestError } = await supabase
      .from('peer_requests')
      .update({ status: 'in_session' })
      .eq('id', requestId);
    if (updateRequestError) throw new ApiError(400, updateRequestError.message);

    const { error: updateMatchError } = await supabase
      .from('peer_matches')
      .update({ accepted: true })
      .eq('id', matchRow.id);
    if (updateMatchError) throw new ApiError(400, updateMatchError.message);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  listPeerRequests,
  createPeerRequest,
  getPeerMatches,
  createPeerSession,
};
