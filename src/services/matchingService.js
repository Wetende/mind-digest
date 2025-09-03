import { supabase } from '../config/supabase';
import behaviorLearningService from './behaviorLearningService';
import aiService from './aiService';

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

      // Calculate compatibility scores with AI enhancement
      const scoredMatches = await Promise.all(
        potentialMatches.map(async (match) => ({
          ...match,
          compatibilityScore: await this.calculateEnhancedCompatibility(currentUser, match, userId),
          behavioralSimilarity: await this.calculateBehavioralSimilarity(userId, match.id),
          sharedInterests: this.getSharedInterests(currentUser, match),
          sharedExperiences: this.getSharedExperiences(currentUser, match),
          aiInsights: await this.getAIMatchingInsights(currentUser, match, userId)
        }))
      );

      // Sort by enhanced compatibility score
      const filteredMatches = scoredMatches
        .filter(match => match.compatibilityScore >= 0.3)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, preferences.limit || 10);

      return { success: true, data: filteredMatches };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Enhanced compatibility calculation with AI and behavioral data
  async calculateEnhancedCompatibility(user1, user2, userId1) {
    let score = 0;
    let factors = 0;

    // Traditional compatibility (60% weight)
    const traditionalScore = this.calculateCompatibility(user1, user2);
    score += traditionalScore * 0.6;
    factors += 0.6;

    // Behavioral similarity (30% weight)
    try {
      const behavioralSimilarity = await this.calculateBehavioralSimilarity(userId1, user2.id);
      score += behavioralSimilarity * 0.3;
    } catch (error) {
      console.warn('Failed to calculate behavioral similarity:', error);
    }
    factors += 0.3;

    // AI-powered insights (10% weight)
    if (factors > 0.8) {
      try {
        const aiInsights = await aiService.analyzePeerCompatibility(user1, user2);
        if (aiInsights && aiInsights.compatibilityScore !== undefined) {
          score += aiInsights.compatibilityScore * 0.1;
        }
      } catch (error) {
        console.warn('Failed to get AI compatibility insights:', error);
      }
    }
    factors += 0.1;

    return factors > 0 ? score / factors : 0;
  }

  // Calculate behavioral similarity between users
  async calculateBehavioralSimilarity(userId1, userId2) {
    try {
      // Get behavior patterns for both users
      const user1Patterns = await behaviorLearningService.learnUserPatterns();
      const user2Interactions = await this.getUserBehavioralData(userId2);

      if (!user2Interactions || user2Interactions.length < 5) {
        return 0.5; // Default moderate similarity if insufficient data
      }

      // Calculate similarity in activity patterns
      let similarityScore = 0;
      let factors = 0;

      // Compare activity preferences
      const user1Activities = user1Patterns.contentPreferences?.activityTypes || {};
      const user2Activities = this.extractActivityPreferences(user2Interactions);

      if (Object.keys(user1Activities).length > 0 && Object.keys(user2Activities).length > 0) {
        const activityOverlap = this.calculateOverlap(Object.keys(user1Activities), Object.keys(user2Activities));
        similarityScore += activityOverlap * 0.4;
        factors += 0.4;
      }

      // Compare engagement times
      const user1TimePrefs = user1Patterns.timePreferences || {};
      const user2TimePrefs = this.extractTimePreferences(user2Interactions);

      if (Object.keys(user1TimePrefs).length > 0) {
        const timeSimilarity = this.calculateTimeSimilarity(user1TimePrefs, user2TimePrefs);
        similarityScore += timeSimilarity * 0.3;
        factors += 0.3;
      }

      // Compare mood-based preferences
      const user1MoodPrefs = user1Patterns.moodPatterns || {};
      const user2MoodPrefs = this.extractMoodPreferences(user2Interactions);

      if (Object.keys(user1MoodPrefs).length > 0) {
        const moodSimilarity = this.calculateMoodSimilarity(user1MoodPrefs, user2MoodPrefs);
        similarityScore += moodSimilarity * 0.3;
        factors += 0.3;
      }

      return factors > 0 ? similarityScore / factors : 0.5;

    } catch (error) {
      console.warn('Failed to calculate behavioral similarity:', error);
      return 0.5; // Default to moderate similarity
    }
  }

  // Get behavioral data for a user
  async getUserBehavioralData(userId) {
    try {
      // This would typically fetch from a database of user interactions
      // For now, return mock data structure
      return []; // Placeholder - would be populated with actual data
    } catch (error) {
      return [];
    }
  }

  // Extract activity preferences from interaction data
  extractActivityPreferences(interactions) {
    const activityCounts = {};
    interactions.forEach(interaction => {
      const type = interaction.type || 'general';
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    });
    return activityCounts;
  }

  // Extract time preferences from interaction data
  extractTimePreferences(interactions) {
    const timePrefs = {};
    interactions.forEach(interaction => {
      if (interaction.context && interaction.context.timeOfDay) {
        const timeOfDay = interaction.context.timeOfDay;
        timePrefs[timeOfDay] = (timePrefs[timeOfDay] || 0) + 1;
      }
    });
    return timePrefs;
  }

  // Extract mood preferences from interaction data
  extractMoodPreferences(interactions) {
    const moodPrefs = {};
    interactions.forEach(interaction => {
      if (interaction.context && interaction.context.mood) {
        const mood = this.normalizeMood(interaction.context.mood.emotion) || 'neutral';
        moodPrefs[mood] = (moodPrefs[mood] || 0) + 1;
      }
    });
    return moodPrefs;
  }

  // Calculate activity overlap between user preferences
  calculateOverlap(activities1, activities2) {
    if (activities1.length === 0 || activities2.length === 0) return 0;

    const set1 = new Set(activities1);
    const set2 = new Set(activities2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  // Calculate time preference similarity
  calculateTimeSimilarity(timePrefs1, timePrefs2) {
    const timesOfDay = ['morning', 'afternoon', 'evening', 'night'];
    let similarity = 0;
    let validComparisons = 0;

    timesOfDay.forEach(timeOfDay => {
      const pref1 = timePrefs1[timeOfDay] || 0;
      const pref2 = timePrefs2[timeOfDay] || 0;

      if (pref1 > 0 || pref2 > 0) {
        const normalizedPref1 = pref1 / Math.max(1, Object.values(timePrefs1).reduce((a, b) => a + b, 0));
        const normalizedPref2 = pref2 / Math.max(1, Object.values(timePrefs2).reduce((a, b) => a + b, 0));
        similarity += 1 - Math.abs(normalizedPref1 - normalizedPref2);
        validComparisons++;
      }
    });

    return validComparisons > 0 ? similarity / validComparisons : 0.5;
  }

  // Calculate mood preference similarity
  calculateMoodSimilarity(moodPrefs1, moodPrefs2) {
    const moods = ['happy', 'neutral', 'sad', 'anxious', 'stressed'];
    let similarity = 0;
    let validComparisons = 0;

    moods.forEach(mood => {
      const pref1 = moodPrefs1[mood] || 0;
      const pref2 = moodPrefs2[mood] || 0;

      if (pref1 > 0 || pref2 > 0) {
        const normalizedPref1 = pref1 / Math.max(1, Object.values(moodPrefs1).reduce((a, b) => a + b, 0));
        const normalizedPref2 = pref2 / Math.max(1, Object.values(moodPrefs2).reduce((a, b) => a + b, 0));
        similarity += 1 - Math.abs(normalizedPref1 - normalizedPref2);
        validComparisons++;
      }
    });

    return validComparisons > 0 ? similarity / validComparisons : 0.5;
  }

  // Normalize mood categories
  normalizeMood(mood) {
    if (!mood) return 'neutral';
    const moodMap = {
      'joy': 'happy',
      'happiness': 'happy',
      'happy': 'happy',
      'sad': 'sad',
      'sadness': 'sad',
      'depressed': 'sad',
      'anxious': 'anxious',
      'anxiety': 'anxious',
      'worried': 'anxious',
      'stressed': 'stressed',
      'stress': 'stressed',
      'overwhelmed': 'stressed',
      'calm': 'neutral',
      'neutral': 'neutral'
    };
    return moodMap[mood.toLowerCase()] || 'neutral';
  }

  // Get AI-powered matching insights
  async getAIMatchingInsights(user1, user2, userId1) {
    try {
      // Only use AI if we have sufficient interaction data
      const user1Patterns = await behaviorLearningService.learnUserPatterns();
      const user1Interactions = await behaviorLearningService.getRecentInteractions(20);

      if (user1Interactions.length >= 10) {
        const insights = await aiService.generatePeerMatchingInsights({
          user1: { profile: user1, patterns: user1Patterns },
          user2: { profile: user2 },
          compatibilityData: {
            sharedInterests: this.getSharedInterests(user1, user2),
            sharedExperiences: this.getSharedExperiences(user1, user2),
            ageCompatible: user1.age_range && user2.age_range ?
              this.areAgeRangesCompatible(user1.age_range, user2.age_range) : null,
            communicationMatch: user1.preferred_communication_style === user2.preferred_communication_style
          }
        });

        return insights || {};
      }

      return {};
    } catch (error) {
      console.warn('Failed to get AI matching insights:', error);
      return {};
    }
  }

  // Get compatible peers with enhanced filtering and AI suggestions
  async getCompatiblePeers(userId, options = {}) {
    try {
      const matchResult = await this.findMatches(userId, { limit: 20 });
      if (!matchResult.success) {
        return matchResult;
      }

      let peers = matchResult.data;

      // Apply additional AI-powered filtering if requested
      if (options.useAISuggestions) {
        peers = await this.applyAISuggestionsFilter(peers, userId, options);
      }

      // Sort by recommendation priority
      peers = this.sortByRecommendationPriority(peers, options.context || {});

      // Group by interaction type recommendations
      const categorizedPeers = {
        primarySupport: peers.filter(peer => peer.aiInsights?.recommendedRole === 'primary_support' || peer.compatibilityScore > 0.8),
        activityPartners: peers.filter(peer => peer.aiInsights?.recommendedRole === 'activity_partner'),
        mentorMentee: peers.filter(peer => peer.aiInsights?.recommendedRole === 'mentor' || peer.aiInsights?.recommendedRole === 'mentee'),
        casualConnections: peers.filter(peer => peer.compatibilityScore >= 0.4 && peer.compatibilityScore <= 0.7)
      };

      return {
        success: true,
        data: categorizedPeers,
        meta: {
          totalMatches: peers.length,
          aiEnhanced: options.useAISuggestions || false,
          averageSimilarity: peers.length > 0 ?
            peers.reduce((sum, peer) => sum + (peer.behavioralSimilarity || 0.5), 0) / peers.length : 0
        }
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Apply AI suggestions filtering
  async applyAISuggestionsFilter(peers, userId, options) {
    try {
      const userContext = await behaviorLearningService.getCurrentContext();
      const patterns = await behaviorLearningService.learnUserPatterns();

      const aiFilteredPeers = await aiService.filterPeerSuggestions({
        peers,
        userContext,
        patterns,
        options
      });

      return aiFilteredPeers || peers; // Fall back to original peers if AI filtering fails

    } catch (error) {
      console.warn('AI suggestions filtering failed:', error);
      return peers;
    }
  }

  // Sort peers by recommendation priority
  sortByRecommendationPriority(peers, context) {
    const currentFrame = context.mood || 'neutral';

    return peers.sort((a, b) => {
      // Priority scoring based on context and behavioral match
      const aScore = this.calculateRecommendationScore(a, context);
      const bScore = this.calculateRecommendationScore(b, context);
      return bScore - aScore;
    });
  }

  // Calculate recommendation score for sorting
  calculateRecommendationScore(peer, context) {
    let score = peer.compatibilityScore * 0.4;
    score += (peer.behavioralSimilarity || 0.5) * 0.3;

    // Add context-based scoring
    if (context.mood) {
      const normalizedMood = this.normalizeMood(context.mood);
      if (peer.aiInsights && peer.aiInsights.moodSuitability) {
        if (peer.aiInsights.moodSuitability[normalizedMood] > 0.7) {
          score += 0.2;
        }
      }
    }

    // Recency bonus for active users
    const daysSinceActive = (Date.now() - new Date(peer.last_active).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActive < 7) {
      score += 0.1;
    }

    return score;
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
