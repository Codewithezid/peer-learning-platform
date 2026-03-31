const { supabase } = require('../config/supabase');

/**
 * XP values awarded for each type of activity.
 */
const XP_VALUES = {
  COMPLETE_PROFILE: 50,
  ADD_SKILL: 10,
  ENROLL_COURSE: 15,
  COMPLETE_COURSE: 100,
  PUBLISH_ARTICLE: 75,
  PASS_QUIZ: 50,
  PEER_MESSAGE: 5, // first message in a conversation only
};

/**
 * Logs a user activity and awards XP.
 * The database trigger handles updating profiles.xp_points automatically.
 *
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} actionType - The type of action (e.g. 'ADD_SKILL', 'COMPLETE_COURSE').
 * @param {string} entityType - The type of entity involved (e.g. 'skill', 'course', 'article').
 * @param {string} entityId - The ID of the entity involved.
 * @param {number} xpEarned - The amount of XP earned for this activity.
 * @returns {Promise<object>} The inserted activity log record.
 */
async function logActivity(userId, actionType, entityType, entityId, xpEarned) {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        xp_earned: xpEarned,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error logging activity:', error.message);
    throw error;
  }
}

/**
 * Gets a breakdown of XP earned by action type for a given user.
 *
 * @param {string} userId - The ID of the user.
 * @returns {Promise<object>} An object mapping action_type to total xp_earned (e.g. { skill_added: 30, course_completed: 200 }).
 */
async function getXpBreakdown(userId) {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('action_type, xp_earned')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch XP breakdown: ${error.message}`);
    }

    // Group and sum xp_earned by action_type
    const breakdown = {};
    for (const record of data) {
      const actionType = record.action_type;
      if (!breakdown[actionType]) {
        breakdown[actionType] = 0;
      }
      breakdown[actionType] += record.xp_earned;
    }

    return breakdown;
  } catch (error) {
    console.error('Error getting XP breakdown:', error.message);
    throw error;
  }
}

/**
 * Calculates the user's level based on total XP points.
 * Every 200 XP = 1 level, starting at level 1.
 *
 * @param {number} xpPoints - The total XP points.
 * @returns {number} The calculated level.
 */
function calculateLevel(xpPoints) {
  return Math.floor(xpPoints / 200) + 1;
}

module.exports = {
  XP_VALUES,
  logActivity,
  getXpBreakdown,
  calculateLevel,
};
