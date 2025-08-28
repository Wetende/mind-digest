import { supabase } from '../config/supabase';

class MatchingService {
  // Find compatible peers based on shared experiences and interests
  async findMatches(userId, preferences = {}) {
    try {
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('mental_health_interests, shared_experiences, age_range, preferred_communication_style')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get potential matches based on shared interests and experiences
      const { data: potentialMatches, error: matchError } = await supabase
        .from('users')
        .select(`
          id,
          display_name,
          mental_health_interests,
          shared_experiences,
          age_range,
          preferred_communication_style,
          is_anonymous,
          last_active,
          avatar_url
        `)
        .neq('id', userId)
        .eq('is_active', true)
        .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Active in last 30 days

      if (matchError) throw matchError;

      // Calculate compatibility scores
      const scoredMatches = potentialMatches.map(match => ({
        ...match,
        compatibilityScore: this.calculateCompatibility(currentUser, match),
        sharedInterests: this.getSharedInterests(currentUser, match),
        sharedExperiences: this.getSharedExperiences(currentUser, match)
      }));

      // Sort by compatibility score and filter out low scores
      const filteredMatches = scoredMatches
        .filter(match => match.compatibilityScore >= 0.3)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, preferences.limit || 10);

      return { success: true, data: filteredMatches };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Calculate compatibility score between two users
  calculateCompatibility(user1, user2) {
    let score = 0;
    let factors = 0;

    // Shared mental health interests (40% weight)
    const sharedInterests = this.getSharedInterests(user1, user2);
    if (sharedInterests.length > 0) {
      const interestScore = sharedInterests.length / Math.max(
        (user1.mental_health_interests || []).length,
        (user2.mental_health_interests || []).length
      );
      score += interestScore * 0.4;
    }
    factors += 0.4;

    // Shared experiences (35% weight)
    const sharedExperiences = this.getSharedExperiences(user1, user2);
    if (sharedExperiences.length > 0) {
      const experienceScore = sharedExperiences.length / Math.max(
        (user1.shared_experiences || []).length,
        (user2.shared_experiences || []).length
      );
      score += experienceScore * 0.35;
    }
    factors += 0.35;

    // Age range compatibility (15% weight)
    if (user1.age_range && user2.age_range) {
      const ageCompatible = this.areAgeRangesCompatible(user1.age_range, user2.age_range);
      if (ageCompatible) {
        score += 0.15;
      }
    }
    factors += 0.15;

    // Communication style compatibility (10% weight)
    if (user1.preferred_communication_style && user2.preferred_communication_style) {
      if (user1.preferred_communication_style === user2.preferred_communication_style) {
        score += 0.1;
      }
    }
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

  // Get shared mental health interests
  getSharedInterests(user1, user2) {
    const interests1 = user1.mental_health_interests || [];
    const interests2 = user2.mental_health_interests || [];
    return interests1.filter(interest => interests2.includes(interest));
  }

  // Get shared experiences
  getSharedExperiences(user1, user2) {
    const experiences1 = user1.shared_experiences || [];
    const experiences2 = user2.shared_experiences || [];
    return experiences1.filter(exp => experiences2.includes(exp));
  }

  // Check if age ranges are compatible
  areAgeRangesCompatible(range1, range2) {
    const ageRanges = {
      '18-25': [18, 25],
      '26-35': [26, 35],
      '36-45': [36, 45],
      '46-55': [46, 55],
      '56+': [56, 100]
    };

    const [min1, max1] = ageRanges[range1] || [0, 0];
    const [min2, max2] = ageRanges[range2] || [0, 0];

    // Check for overlap
    return !(max1 < min2 || max2 < min1);
  }

  // Create a one-on-one chat pairing
  async createChatPairing(userId1, userId2) {
    try {
      // Check if pairing already exists
      const { data: existingPairing } = await supabase
        .from('chat_pairings')
        .select('id')
        .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
        .single();

      if (existingPairing) {
        return { success: false, error: 'Pairing already exists' };
      }

      // Create new pairing
      const { data, error } = await supabase
        .from('chat_pairings')
        .insert({
          user1_id: userId1,
          user2_id: userId2,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to the other user
      await this.sendPairingNotification(userId2, userId1);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Accept a chat pairing
  async acceptPairing(pairingId, userId) {
    try {
      const { data, error } = await supabase
        .from('chat_pairings')
        .update({ 
          status: 'active',
          accepted_at: new Date().toISOString()
        })
        .eq('id', pairingId)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .select()
        .single();

      if (error) throw error;

      // Create private chat room for the pairing
      const roomResult = await this.createPrivateRoom(data.user1_id, data.user2_id);
      
      if (roomResult.success) {
        // Update pairing with room ID
        await supabase
          .from('chat_pairings')
          .update({ room_id: roomResult.data.id })
          .eq('id', pairingId);
      }

      return { success: true, data: { ...data, room: roomResult.data } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Decline a chat pairing
  async declinePairing(pairingId, userId) {
    try {
      const { error } = await supabase
        .from('chat_pairings')
        .update({ status: 'declined' })
        .eq('id', pairingId)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get user's active pairings
  async getUserPairings(userId) {
    try {
      const { data, error } = await supabase
        .from('chat_pairings')
        .select(`
          *,
          user1:users!chat_pairings_user1_id_fkey(id, display_name, is_anonymous, avatar_url),
          user2:users!chat_pairings_user2_id_fkey(id, display_name, is_anonymous, avatar_url),
          room:chat_rooms(id, name)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .in('status', ['pending', 'active']);

      if (error) throw error;

      const processedPairings = data.map(pairing => {
        const otherUser = pairing.user1_id === userId ? pairing.user2 : pairing.user1;
        return {
          ...pairing,
          otherUser: {
            id: otherUser.id,
            name: otherUser.is_anonymous ? 'Anonymous User' : otherUser.display_name,
            avatar: otherUser.avatar_url,
            isAnonymous: otherUser.is_anonymous
          }
        };
      });

      return { success: true, data: processedPairings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create a private chat room for a pairing
  async createPrivateRoom(userId1, userId2) {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: 'Private Chat',
          description: 'One-on-one peer support conversation',
          category: 'private',
          is_private: true,
          created_by: userId1,
          max_members: 2
        })
        .select()
        .single();

      if (error) throw error;

      // Add both users to the room
      await supabase
        .from('room_members')
        .insert([
          { room_id: data.id, user_id: userId1, role: 'member' },
          { room_id: data.id, user_id: userId2, role: 'member' }
        ]);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send pairing notification
  async sendPairingNotification(toUserId, fromUserId) {
    try {
      // Get sender info
      const { data: sender } = await supabase
        .from('users')
        .select('display_name, is_anonymous')
        .eq('id', fromUserId)
        .single();

      const senderName = sender?.is_anonymous ? 'An anonymous user' : sender?.display_name;

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'pairing_request',
          title: 'New Chat Request',
          message: `${senderName} would like to connect with you for peer support`,
          data: { from_user_id: fromUserId }
        });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Report a user for inappropriate behavior
  async reportUser(reportedUserId, reporterId, reason, description = '') {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          reported_user_id: reportedUserId,
          reporter_id: reporterId,
          reason,
          description,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-moderate based on report count
      await this.checkAutoModeration(reportedUserId);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if user should be auto-moderated
  async checkAutoModeration(userId) {
    try {
      // Count recent reports
      const { count } = await supabase
        .from('user_reports')
        .select('*', { count: 'exact' })
        .eq('reported_user_id', userId)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      // Auto-suspend if 3+ reports in a week
      if (count >= 3) {
        await supabase
          .from('users')
          .update({ 
            is_suspended: true,
            suspension_reason: 'Multiple reports received',
            suspended_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour suspension
          })
          .eq('id', userId);

        // Notify moderators
        await this.notifyModerators(userId, 'auto_suspension', count);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Notify moderators of issues
  async notifyModerators(userId, type, reportCount) {
    try {
      // Get moderator user IDs
      const { data: moderators } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'moderator');

      if (moderators && moderators.length > 0) {
        const notifications = moderators.map(mod => ({
          user_id: mod.id,
          type: 'moderation_alert',
          title: 'Moderation Alert',
          message: `User ${userId} has been auto-suspended after ${reportCount} reports`,
          data: { user_id: userId, type, report_count: reportCount }
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Block a user
  async blockUser(blockerId, blockedUserId) {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: blockerId,
          blocked_id: blockedUserId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // End any active pairings
      await supabase
        .from('chat_pairings')
        .update({ status: 'ended' })
        .or(`and(user1_id.eq.${blockerId},user2_id.eq.${blockedUserId}),and(user1_id.eq.${blockedUserId},user2_id.eq.${blockerId})`);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get blocked users
  async getBlockedUsers(userId) {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          *,
          blocked_user:users!user_blocks_blocked_id_fkey(id, display_name, is_anonymous)
        `)
        .eq('blocker_id', userId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Unblock a user
  async unblockUser(blockerId, blockedUserId) {
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new MatchingService();