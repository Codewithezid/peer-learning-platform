const { supabase } = require('../config/supabase');
const { recommendPeersSemantic } = require('./semantic.service');

/**
 * Gets recommended peers for a user based on skill matching.
 *
 * Logic:
 *  1. Fetch the user's skills where is_learning = true
 *  2. Find other users who have those same skills with is_teaching = true and proficiency >= 3
 *  3. For each matched peer, count how many skills overlap
 *  4. Sort by match count descending
 *  5. Return top `limit` results with profile data and matching skill details
 *
 * @param {string} userId - The ID of the user requesting recommendations.
 * @param {number} [limit=6] - Maximum number of peer recommendations to return.
 * @param {string[] | null} [targetSkillIds=null] - Optional skill IDs to constrain recommendations.
 * @returns {Promise<Array<{user: object, matchingSkills: Array<{skillName: string, peerProficiency: number}>, matchScore: number}>>}
 */
async function getRecommendedPeers(userId, limit = 6, targetSkillIds = null) {
  try {
    let skillIds = Array.isArray(targetSkillIds) ? targetSkillIds.filter(Boolean) : [];

    // Step 1: Get the current user's learning skills if none were provided explicitly
    if (skillIds.length === 0) {
      const { data: learningSkills, error: learningError } = await supabase
        .from('user_skills')
        .select('skill_id')
        .eq('user_id', userId)
        .eq('is_learning', true);

      if (learningError) {
        throw new Error(`Failed to fetch learning skills: ${learningError.message}`);
      }

      if (!learningSkills || learningSkills.length === 0) {
        return [];
      }

      skillIds = learningSkills.map((s) => s.skill_id).filter(Boolean);
    }

    if (skillIds.length === 0) {
      return [];
    }

    // Step 2: Find peers who can teach those skills (is_teaching = true, proficiency >= 3)
    const { data: teachingPeers, error: teachingError } = await supabase
      .from('user_skills')
      .select('user_id, skill_id, proficiency_level, skills(name)')
      .in('skill_id', skillIds)
      .eq('is_teaching', true)
      .gte('proficiency_level', 3)
      .neq('user_id', userId);

    if (teachingError) {
      throw new Error(`Failed to fetch teaching peers: ${teachingError.message}`);
    }

    if (!teachingPeers || teachingPeers.length === 0) {
      return [];
    }

    // Step 3: Group by peer and count matching skills
    const peerMap = {};
    for (const record of teachingPeers) {
      const peerId = record.user_id;
      if (!peerMap[peerId]) {
        peerMap[peerId] = {
          matchingSkills: [],
          matchScore: 0,
        };
      }
      peerMap[peerId].matchingSkills.push({
        skillId: record.skill_id,
        skillName: record.skills?.name || 'Unknown Skill',
        peerProficiency: record.proficiency_level,
      });
      peerMap[peerId].matchScore += 1;
    }

    // Step 4: Sort by match score descending and take top `limit`
    const sortedPeerIds = Object.keys(peerMap)
      .sort((a, b) => peerMap[b].matchScore - peerMap[a].matchScore)
      .slice(0, limit);

    if (sortedPeerIds.length === 0) {
      return [];
    }

    // Step 5: Fetch profile data for the matched peers
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', sortedPeerIds);

    if (profilesError) {
      throw new Error(`Failed to fetch peer profiles: ${profilesError.message}`);
    }

    // Build a lookup map for profiles
    const profileMap = {};
    for (const profile of profiles) {
      profileMap[profile.id] = profile;
    }

    // Load feedback to produce a useful rating signal for tie-breaking
    const { data: feedbackRows } = await supabase
      .from('feedback')
      .select('to_user_id, rating')
      .in('to_user_id', sortedPeerIds);

    const ratingMap = {};
    for (const row of feedbackRows || []) {
      if (!row.to_user_id || row.rating == null) continue;
      if (!ratingMap[row.to_user_id]) {
        ratingMap[row.to_user_id] = { sum: 0, count: 0 };
      }
      ratingMap[row.to_user_id].sum += Number(row.rating);
      ratingMap[row.to_user_id].count += 1;
    }

    // Assemble final results in sorted order
    let recommendations = sortedPeerIds
      .filter((peerId) => profileMap[peerId])
      .map((peerId) => ({
        user: profileMap[peerId],
        matchingSkills: peerMap[peerId].matchingSkills,
        matchScore: peerMap[peerId].matchScore,
        averageRating: ratingMap[peerId]
          ? Number((ratingMap[peerId].sum / ratingMap[peerId].count).toFixed(2))
          : null,
        ratingsCount: ratingMap[peerId]?.count || 0,
      }));

    recommendations = recommendations.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    const learningSkillNames = recommendations
      .flatMap((item) => item.matchingSkills || [])
      .map((item) => item.skillName)
      .filter(Boolean);

    const semanticRanking = await recommendPeersSemantic(
      learningSkillNames,
      recommendations.map((item) => ({
        id: item.user?.id,
        text: `${item.user?.headline || ''}\n${item.matchingSkills.map((s) => s.skillName).join(', ')}`,
      }))
    );

    if (semanticRanking?.ranked?.length) {
      const recById = new Map(recommendations.map((item) => [String(item.user?.id), item]));
      const semanticOrder = semanticRanking.ranked
        .map((row) => recById.get(String(row.id)))
        .filter(Boolean);

      const included = new Set(semanticOrder.map((item) => String(item.user?.id)));
      for (const rec of recommendations) {
        if (!included.has(String(rec.user?.id))) {
          semanticOrder.push(rec);
        }
      }
      recommendations = semanticOrder;
    }

    return recommendations;
  } catch (error) {
    console.error('Error getting recommended peers:', error.message);
    throw error;
  }
}

module.exports = {
  getRecommendedPeers,
};
