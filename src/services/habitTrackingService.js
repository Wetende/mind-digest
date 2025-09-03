import { supabase } from "../config/supabase";
import notificationService from "./notificationService";

class HabitTrackingService {
  constructor() {
    this.pointValues = {
      MOOD_LOG: 10,
      JOURNAL_ENTRY: 15,
      BREATHING_EXERCISE: 12,
      MEDITATION: 20,
      SOCIAL_INTERACTION: 18,
      WELLNESS_TASK: 10,
      DAILY_CHECKIN: 8,
      MILESTONE_ACHIEVEMENT: 50,
      STREAK_BONUS: 5, // per day in streak
    };

    this.badges = {
      FIRST_STEPS: {
        name: "First Steps",
        description: "Complete your first wellness activity",
        icon: "footsteps-outline",
        points: 25,
      },
      WEEK_WARRIOR: {
        name: "Week Warrior", 
        description: "Maintain a 7-day streak",
        icon: "trophy-outline",
        points: 100,
      },
      CONSISTENCY_CHAMPION: {
        name: "Consistency Champion",
        description: "Complete 30 wellness activities",
        icon: "medal-outline", 
        points: 200,
      },
      MOOD_MASTER: {
        name: "Mood Master",
        description: "Log your mood for 14 consecutive days",
        icon: "happy-outline",
        points: 150,
      },
      SOCIAL_BUTTERFLY: {
        name: "Social Butterfly",
        description: "Complete 10 social interactions",
        icon: "people-outline",
        points: 120,
      },
      MINDFULNESS_GURU: {
        name: "Mindfulness Guru", 
        description: "Complete 20 breathing or meditation sessions",
        icon: "leaf-outline",
        points: 180,
      },
    };

    this.challenges = {
      BEGINNER: [
        {
          id: "daily_mood_week",
          title: "Daily Mood Check",
          description: "Log your mood every day for a week",
          duration: 7,
          target: 7,
          activity: "mood_log",
          points: 70,
          badge: "MOOD_MASTER",
        },
        {
          id: "wellness_starter",
          title: "Wellness Starter",
          description: "Complete 5 wellness tasks",
          duration: 14,
          target: 5,
          activity: "wellness_task",
          points: 50,
          badge: "FIRST_STEPS",
        },
      ],
      INTERMEDIATE: [
        {
          id: "consistency_builder",
          title: "Consistency Builder", 
          description: "Maintain a 14-day activity streak",
          duration: 14,
          target: 14,
          activity: "any_activity",
          points: 140,
          badge: "CONSISTENCY_CHAMPION",
        },
        {
          id: "social_confidence",
          title: "Social Confidence",
          description: "Complete 8 social toolkit activities",
          duration: 21,
          target: 8,
          activity: "social_interaction",
          points: 120,
          badge: "SOCIAL_BUTTERFLY",
        },
      ],
      ADVANCED: [
        {
          id: "mindfulness_master",
          title: "Mindfulness Master",
          description: "Complete 25 mindfulness sessions",
          duration: 30,
          target: 25,
          activity: "mindfulness",
          points: 250,
          badge: "MINDFULNESS_GURU",
        },
        {
          id: "habit_champion",
          title: "Habit Champion",
          description: "Maintain multiple habit streaks simultaneously",
          duration: 30,
          target: 3, // 3 different habit types
          activity: "multiple_habits",
          points: 300,
          badge: "CONSISTENCY_CHAMPION",
        },
      ],
    };
  }

  // Award points for completing an activity
  async awardPoints(userId, activityType, metadata = {}) {
    try {
      const points = this.pointValues[activityType] || 10;
      const streakBonus = await this.calculateStreakBonus(userId, activityType);
      const totalPoints = points + streakBonus;

      // Record the activity
      const { data: activity, error: activityError } = await supabase
        .from("habit_activities")
        .insert([
          {
            user_id: userId,
            activity_type: activityType,
            points_earned: totalPoints,
            metadata: metadata,
            completed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (activityError) {
        console.error('Habit activity insert error:', activityError);
        // Don't throw error if table doesn't exist yet - just log it
        if (activityError.code === '42P01') {
          console.warn('habit_activities table does not exist yet. Skipping points tracking.');
          return { success: true, data: { pointsEarned: totalPoints, tableWarning: true } };
        }
        throw activityError;
      }

      // Update user's total points and streaks
      await this.updateUserStats(userId, totalPoints, activityType);

      // Check for badge achievements
      await this.checkBadgeAchievements(userId, activityType);

      // Check for challenge progress
      await this.updateChallengeProgress(userId, activityType);

      return {
        success: true,
        data: {
          activity,
          pointsEarned: totalPoints,
          streakBonus,
        },
      };
    } catch (error) {
      console.error("Error awarding points:", error);
      return { success: false, error: error.message };
    }
  }

  // Calculate streak bonus points
  async calculateStreakBonus(userId, activityType) {
    try {
      const streak = await this.getCurrentStreak(userId, activityType);
      return Math.min(streak * this.pointValues.STREAK_BONUS, 50); // Cap at 50 bonus points
    } catch (error) {
      console.error("Error calculating streak bonus:", error);
      return 0;
    }
  }

  // Get current streak for an activity type
  async getCurrentStreak(userId, activityType) {
    try {
      const { data: activities, error } = await supabase
        .from("habit_activities")
        .select("completed_at")
        .eq("user_id", userId)
        .eq("activity_type", activityType)
        .order("completed_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      if (!activities || activities.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Group activities by date
      const activitiesByDate = {};
      activities.forEach((activity) => {
        const date = new Date(activity.completed_at).toISOString().split("T")[0];
        activitiesByDate[date] = true;
      });

      // Count consecutive days
      while (true) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (activitiesByDate[dateStr]) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  }

  // Update user statistics
  async updateUserStats(userId, pointsEarned, activityType) {
    try {
      // Get or create user stats
      let { data: userStats, error: fetchError } = await supabase
        .from("user_habit_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      const currentStreak = await this.getCurrentStreak(userId, activityType);
      const totalActivities = await this.getTotalActivities(userId);

      if (!userStats) {
        // Create new stats record
        const { error: insertError } = await supabase
          .from("user_habit_stats")
          .insert([
            {
              user_id: userId,
              total_points: pointsEarned,
              current_streak: currentStreak,
              longest_streak: currentStreak,
              total_activities: 1,
              level: 1,
              updated_at: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;
      } else {
        // Update existing stats
        const newTotalPoints = userStats.total_points + pointsEarned;
        const newLevel = this.calculateLevel(newTotalPoints);
        const longestStreak = Math.max(userStats.longest_streak, currentStreak);

        const { error: updateError } = await supabase
          .from("user_habit_stats")
          .update({
            total_points: newTotalPoints,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            total_activities: totalActivities,
            level: newLevel,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;

        // Check for level up
        if (newLevel > userStats.level) {
          await this.celebrateLevelUp(userId, newLevel);
        }
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  }

  // Calculate user level based on total points
  calculateLevel(totalPoints) {
    // Level progression: 100 points for level 1, then +50 points per level
    if (totalPoints < 100) return 1;
    return Math.floor((totalPoints - 100) / 50) + 2;
  }

  // Get total activities count for user
  async getTotalActivities(userId) {
    try {
      const { count, error } = await supabase
        .from("habit_activities")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error getting total activities:", error);
      return 0;
    }
  }

  // Check and award badge achievements
  async checkBadgeAchievements(userId, activityType) {
    try {
      const userStats = await this.getUserStats(userId);
      const totalActivities = userStats.total_activities || 0;
      const currentStreak = userStats.current_streak || 0;

      // Check for badge eligibility
      const badgesToCheck = [];

      if (totalActivities === 1) {
        badgesToCheck.push("FIRST_STEPS");
      }
      if (currentStreak >= 7) {
        badgesToCheck.push("WEEK_WARRIOR");
      }
      if (totalActivities >= 30) {
        badgesToCheck.push("CONSISTENCY_CHAMPION");
      }

      // Activity-specific badges
      const moodLogs = await this.getActivityCount(userId, "MOOD_LOG");
      if (moodLogs >= 14) {
        badgesToCheck.push("MOOD_MASTER");
      }

      const socialActivities = await this.getActivityCount(userId, "SOCIAL_INTERACTION");
      if (socialActivities >= 10) {
        badgesToCheck.push("SOCIAL_BUTTERFLY");
      }

      const mindfulnessActivities = await this.getActivityCount(userId, "BREATHING_EXERCISE") +
        await this.getActivityCount(userId, "MEDITATION");
      if (mindfulnessActivities >= 20) {
        badgesToCheck.push("MINDFULNESS_GURU");
      }

      // Award new badges
      for (const badgeKey of badgesToCheck) {
        await this.awardBadge(userId, badgeKey);
      }
    } catch (error) {
      console.error("Error checking badge achievements:", error);
    }
  }

  // Award a badge to user
  async awardBadge(userId, badgeKey) {
    try {
      // Check if user already has this badge
      const { data: existing, error: checkError } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .eq("badge_key", badgeKey)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existing) return; // Already has badge

      const badge = this.badges[badgeKey];
      if (!badge) return;

      // Award the badge
      const { error: insertError } = await supabase
        .from("user_badges")
        .insert([
          {
            user_id: userId,
            badge_key: badgeKey,
            badge_data: badge,
            earned_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      // Award bonus points
      await this.awardPoints(userId, "MILESTONE_ACHIEVEMENT", { badge: badgeKey });

      // Send celebration notification
      await this.celebrateBadgeEarned(userId, badge);
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  }

  // Get activity count for specific type
  async getActivityCount(userId, activityType) {
    try {
      const { count, error } = await supabase
        .from("habit_activities")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("activity_type", activityType);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error getting activity count:", error);
      return 0;
    }
  }

  // Update challenge progress
  async updateChallengeProgress(userId, activityType) {
    try {
      // Get user's active challenges
      const { data: activeChallenges, error } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active");

      if (error) throw error;

      for (const challenge of activeChallenges || []) {
        const challengeData = this.findChallengeById(challenge.challenge_id);
        if (!challengeData) continue;

        // Check if activity matches challenge
        if (challengeData.activity === "any_activity" || 
            challengeData.activity === activityType.toLowerCase()) {
          
          const newProgress = challenge.current_progress + 1;
          const isCompleted = newProgress >= challengeData.target;

          // Update challenge progress
          const { error: updateError } = await supabase
            .from("user_challenges")
            .update({
              current_progress: newProgress,
              status: isCompleted ? "completed" : "active",
              completed_at: isCompleted ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", challenge.id);

          if (updateError) throw updateError;

          // Celebrate completion
          if (isCompleted) {
            await this.celebrateChallengeCompletion(userId, challengeData);
          }
        }
      }
    } catch (error) {
      console.error("Error updating challenge progress:", error);
    }
  }

  // Find challenge by ID
  findChallengeById(challengeId) {
    for (const difficulty in this.challenges) {
      const challenge = this.challenges[difficulty].find(c => c.id === challengeId);
      if (challenge) return challenge;
    }
    return null;
  }

  // Start a new challenge for user
  async startChallenge(userId, challengeId) {
    try {
      const challengeData = this.findChallengeById(challengeId);
      if (!challengeData) {
        return { success: false, error: "Challenge not found" };
      }

      // Check if user already has this challenge active
      const { data: existing, error: checkError } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("challenge_id", challengeId)
        .eq("status", "active")
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existing) {
        return { success: false, error: "Challenge already active" };
      }

      // Start the challenge
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + challengeData.duration);

      const { data, error } = await supabase
        .from("user_challenges")
        .insert([
          {
            user_id: userId,
            challenge_id: challengeId,
            challenge_data: challengeData,
            current_progress: 0,
            target_progress: challengeData.target,
            status: "active",
            started_at: new Date().toISOString(),
            ends_at: endDate.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Error starting challenge:", error);
      return { success: false, error: error.message };
    }
  }

  // Get user's habit statistics
  async getUserStats(userId) {
    try {
      const { data, error } = await supabase
        .from("user_habit_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data || {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        total_activities: 0,
        level: 1,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        total_activities: 0,
        level: 1,
      };
    }
  }

  // Get user's badges
  async getUserBadges(userId) {
    try {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error getting user badges:", error);
      return { success: false, error: error.message };
    }
  }

  // Get user's active challenges
  async getUserChallenges(userId) {
    try {
      const { data, error } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "completed"])
        .order("started_at", { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error getting user challenges:", error);
      return { success: false, error: error.message };
    }
  }

  // Get available challenges for user level
  getAvailableChallenges(userLevel) {
    const challenges = [];
    
    if (userLevel >= 1) {
      challenges.push(...this.challenges.BEGINNER);
    }
    if (userLevel >= 3) {
      challenges.push(...this.challenges.INTERMEDIATE);
    }
    if (userLevel >= 5) {
      challenges.push(...this.challenges.ADVANCED);
    }

    return challenges;
  }

  // Celebrate level up
  async celebrateLevelUp(userId, newLevel) {
    try {
      await notificationService.sendNotification(userId, {
        type: "level_up",
        title: "Level Up! 🎉",
        message: `Congratulations! You've reached level ${newLevel}!`,
        data: { level: newLevel },
      });
    } catch (error) {
      console.error("Error celebrating level up:", error);
    }
  }

  // Celebrate badge earned
  async celebrateBadgeEarned(userId, badge) {
    try {
      await notificationService.sendNotification(userId, {
        type: "badge_earned",
        title: "New Badge Earned! 🏆",
        message: `You've earned the "${badge.name}" badge!`,
        data: { badge },
      });
    } catch (error) {
      console.error("Error celebrating badge:", error);
    }
  }

  // Celebrate challenge completion
  async celebrateChallengeCompletion(userId, challenge) {
    try {
      // Award challenge points
      await this.awardPoints(userId, "MILESTONE_ACHIEVEMENT", { 
        challenge: challenge.id 
      });

      // Award badge if specified
      if (challenge.badge) {
        await this.awardBadge(userId, challenge.badge);
      }

      await notificationService.sendNotification(userId, {
        type: "challenge_completed",
        title: "Challenge Complete! 🎯",
        message: `You've completed the "${challenge.title}" challenge!`,
        data: { challenge },
      });
    } catch (error) {
      console.error("Error celebrating challenge completion:", error);
    }
  }

  // Handle broken streak recovery (legacy method - use handleBrokenStreakWithSupport for social features)
  async handleBrokenStreak(userId, activityType) {
    // Delegate to the enhanced version with social support
    return await this.handleBrokenStreakWithSupport(userId, activityType);
  }

  // Get habit insights and recommendations
  async getHabitInsights(userId) {
    try {
      const userStats = await this.getUserStats(userId);
      const recentActivities = await this.getRecentActivities(userId, 7);
      
      const insights = {
        level: userStats.level,
        totalPoints: userStats.total_points,
        currentStreak: userStats.current_streak,
        longestStreak: userStats.longest_streak,
        weeklyProgress: recentActivities.length,
        recommendations: [],
      };

      // Generate recommendations based on activity patterns
      if (recentActivities.length < 3) {
        insights.recommendations.push({
          type: "increase_activity",
          message: "Try to complete at least one wellness activity daily for better results.",
          action: "Start a beginner challenge",
        });
      }

      if (userStats.current_streak === 0 && userStats.longest_streak > 0) {
        insights.recommendations.push({
          type: "rebuild_streak",
          message: "You had a great streak before! Let's build it back up.",
          action: "Take the streak recovery challenge",
        });
      }

      const nextLevel = userStats.level + 1;
      const pointsNeeded = (nextLevel === 2 ? 100 : 100 + (nextLevel - 2) * 50) - userStats.total_points;
      
      if (pointsNeeded > 0) {
        insights.recommendations.push({
          type: "level_progress",
          message: `You need ${pointsNeeded} more points to reach level ${nextLevel}!`,
          action: "Complete daily activities",
        });
      }

      return { success: true, data: insights };
    } catch (error) {
      console.error("Error getting habit insights:", error);
      return { success: false, error: error.message };
    }
  }

  // Get recent activities
  async getRecentActivities(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("habit_activities")
        .select("*")
        .eq("user_id", userId)
        .gte("completed_at", startDate.toISOString())
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting recent activities:", error);
      return [];
    }
  }

  // Social Accountability Features

  // Share progress with peer network
  async shareProgress(userId, progressData, shareWith = 'all') {
    try {
      const userStats = await this.getUserStats(userId);
      const recentBadges = await this.getRecentBadges(userId, 7);
      
      const shareContent = {
        user_id: userId,
        share_type: progressData.type || 'general_progress',
        content: {
          level: userStats.level,
          totalPoints: userStats.total_points,
          currentStreak: userStats.current_streak,
          recentAchievements: recentBadges.data || [],
          message: progressData.message || '',
          milestone: progressData.milestone || null,
        },
        visibility: shareWith, // 'all', 'accountability_partners', 'specific_users'
        target_users: progressData.targetUsers || [],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("progress_shares")
        .insert([shareContent])
        .select()
        .single();

      if (error) throw error;

      // Notify accountability partners
      if (shareWith === 'accountability_partners' || shareWith === 'all') {
        await this.notifyAccountabilityPartners(userId, shareContent);
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error sharing progress:", error);
      return { success: false, error: error.message };
    }
  }

  // Get recent badges for sharing
  async getRecentBadges(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .gte("earned_at", startDate.toISOString())
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error getting recent badges:", error);
      return { success: false, error: error.message };
    }
  }

  // Find and match accountability partners
  async findAccountabilityPartners(userId, preferences = {}) {
    try {
      const userStats = await this.getUserStats(userId);
      const userProfile = await this.getUserProfile(userId);
      
      // Get potential partners based on similar level, interests, and activity
      const { data: potentialPartners, error } = await supabase
        .from("users")
        .select(`
          id,
          display_name,
          mental_health_interests,
          preferences,
          user_habit_stats (
            level,
            total_points,
            current_streak,
            total_activities
          )
        `)
        .neq("id", userId)
        .eq("is_active", true)
        .not("is_suspended", "eq", true);

      if (error) throw error;

      // Filter and score potential partners
      const scoredPartners = potentialPartners
        .filter(partner => partner.user_habit_stats)
        .map(partner => {
          let score = 0;
          const partnerStats = partner.user_habit_stats;

          // Level similarity (prefer similar levels)
          const levelDiff = Math.abs(userStats.level - partnerStats.level);
          score += Math.max(0, 10 - levelDiff);

          // Activity level similarity
          const activityDiff = Math.abs(userStats.total_activities - partnerStats.total_activities);
          score += Math.max(0, 10 - Math.floor(activityDiff / 10));

          // Shared interests
          const userInterests = userProfile?.mental_health_interests || [];
          const partnerInterests = partner.mental_health_interests || [];
          const sharedInterests = userInterests.filter(interest => 
            partnerInterests.includes(interest)
          );
          score += sharedInterests.length * 5;

          // Active streak bonus
          if (partnerStats.current_streak > 0) score += 5;

          return {
            ...partner,
            compatibilityScore: score,
            sharedInterests,
            levelDifference: levelDiff,
          };
        })
        .filter(partner => partner.compatibilityScore > 5)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, 10);

      return { success: true, data: scoredPartners };
    } catch (error) {
      console.error("Error finding accountability partners:", error);
      return { success: false, error: error.message };
    }
  }

  // Send accountability partner request
  async sendPartnerRequest(fromUserId, toUserId, message = '') {
    try {
      // Check if request already exists
      const { data: existing, error: checkError } = await supabase
        .from("accountability_requests")
        .select("*")
        .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      if (existing) {
        return { success: false, error: "Request already exists or you're already partners" };
      }

      const { data, error } = await supabase
        .from("accountability_requests")
        .insert([
          {
            from_user_id: fromUserId,
            to_user_id: toUserId,
            message: message,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send notification to target user
      await notificationService.sendNotification(toUserId, {
        type: "accountability_request",
        title: "New Accountability Partner Request",
        message: "Someone wants to be your accountability partner!",
        data: { requestId: data.id, fromUserId },
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error sending partner request:", error);
      return { success: false, error: error.message };
    }
  }

  // Accept accountability partner request
  async acceptPartnerRequest(requestId, userId) {
    try {
      // Get the request
      const { data: request, error: requestError } = await supabase
        .from("accountability_requests")
        .select("*")
        .eq("id", requestId)
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .single();

      if (requestError) throw requestError;

      if (!request) {
        return { success: false, error: "Request not found or already processed" };
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("accountability_requests")
        .update({ 
          status: "accepted", 
          accepted_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Create partnership
      const { data: partnership, error: partnershipError } = await supabase
        .from("accountability_partnerships")
        .insert([
          {
            user1_id: request.from_user_id,
            user2_id: request.to_user_id,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (partnershipError) throw partnershipError;

      // Notify both users
      await Promise.all([
        notificationService.sendNotification(request.from_user_id, {
          type: "partnership_accepted",
          title: "Accountability Partner Accepted! 🤝",
          message: "Your accountability partner request was accepted!",
          data: { partnershipId: partnership.id },
        }),
        notificationService.sendNotification(request.to_user_id, {
          type: "partnership_created",
          title: "New Accountability Partnership! 🤝",
          message: "You now have a new accountability partner!",
          data: { partnershipId: partnership.id },
        }),
      ]);

      return { success: true, data: partnership };
    } catch (error) {
      console.error("Error accepting partner request:", error);
      return { success: false, error: error.message };
    }
  }

  // Get user's accountability partners
  async getAccountabilityPartners(userId) {
    try {
      const { data, error } = await supabase
        .from("accountability_partnerships")
        .select(`
          *,
          user1:users!accountability_partnerships_user1_id_fkey (
            id,
            display_name,
            avatar_url,
            user_habit_stats (
              level,
              total_points,
              current_streak
            )
          ),
          user2:users!accountability_partnerships_user2_id_fkey (
            id,
            display_name,
            avatar_url,
            user_habit_stats (
              level,
              total_points,
              current_streak
            )
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("status", "active");

      if (error) throw error;

      // Format the data to show the partner (not the current user)
      const partners = data.map(partnership => {
        const isUser1 = partnership.user1_id === userId;
        const partner = isUser1 ? partnership.user2 : partnership.user1;
        
        return {
          partnershipId: partnership.id,
          partner: partner,
          createdAt: partnership.created_at,
          status: partnership.status,
        };
      });

      return { success: true, data: partners };
    } catch (error) {
      console.error("Error getting accountability partners:", error);
      return { success: false, error: error.message };
    }
  }

  // Notify accountability partners of progress
  async notifyAccountabilityPartners(userId, progressData) {
    try {
      const partnersResult = await this.getAccountabilityPartners(userId);
      if (!partnersResult.success) return;

      const partners = partnersResult.data;
      const userProfile = await this.getUserProfile(userId);

      for (const partnership of partners) {
        await notificationService.sendNotification(partnership.partner.id, {
          type: "partner_progress",
          title: "Partner Progress Update 📈",
          message: `${userProfile?.display_name || 'Your partner'} shared their progress!`,
          data: { 
            partnerId: userId,
            progressData,
            partnershipId: partnership.partnershipId,
          },
        });
      }
    } catch (error) {
      console.error("Error notifying accountability partners:", error);
    }
  }

  // Enhanced streak recovery with social support
  async handleBrokenStreakWithSupport(userId, activityType) {
    try {
      // Get accountability partners
      const partnersResult = await this.getAccountabilityPartners(userId);
      const partners = partnersResult.success ? partnersResult.data : [];

      const encouragementMessages = [
        "Don't worry about breaking your streak! Every day is a new opportunity to start fresh. 💪",
        "Streaks are great, but consistency over perfection is what matters most. Keep going! 🌟",
        "One missed day doesn't erase all your progress. You've got this! 🚀",
        "Remember, building habits is a journey, not a race. Be kind to yourself. ❤️",
      ];

      const randomMessage = encouragementMessages[
        Math.floor(Math.random() * encouragementMessages.length)
      ];

      // Send encouragement notification
      await notificationService.sendNotification(userId, {
        type: "streak_encouragement",
        title: "Keep Going! 💙",
        message: randomMessage,
        data: { activityType },
      });

      // Notify accountability partners for support
      if (partners.length > 0) {
        const userProfile = await this.getUserProfile(userId);
        
        for (const partnership of partners) {
          await notificationService.sendNotification(partnership.partner.id, {
            type: "partner_needs_support",
            title: "Partner Needs Encouragement 🤗",
            message: `${userProfile?.display_name || 'Your partner'} broke their streak and could use some support!`,
            data: { 
              partnerId: userId,
              activityType,
              partnershipId: partnership.partnershipId,
            },
          });
        }
      }

      // Offer streak recovery challenge
      const recoveryChallenge = {
        id: "streak_recovery_social",
        title: "Streak Recovery with Support",
        description: "Get back on track with 3 activities in the next 3 days, with partner encouragement",
        duration: 3,
        target: 3,
        activity: "any_activity",
        points: 40, // Extra points for recovery
        socialSupport: true,
      };

      await this.startChallenge(userId, "streak_recovery_social");

      return { success: true, partnersNotified: partners.length };
    } catch (error) {
      console.error("Error handling broken streak with support:", error);
      return { success: false, error: error.message };
    }
  }

  // Send encouragement to partner
  async sendEncouragement(fromUserId, toUserId, message, type = 'general') {
    try {
      // Verify they are accountability partners
      const partnersResult = await this.getAccountabilityPartners(fromUserId);
      if (!partnersResult.success) {
        return { success: false, error: "Failed to verify partnership" };
      }

      const isPartner = partnersResult.data.some(p => p.partner.id === toUserId);
      if (!isPartner) {
        return { success: false, error: "Not accountability partners" };
      }

      // Record the encouragement
      const { data, error } = await supabase
        .from("partner_encouragements")
        .insert([
          {
            from_user_id: fromUserId,
            to_user_id: toUserId,
            message: message,
            encouragement_type: type,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send notification
      const fromUserProfile = await this.getUserProfile(fromUserId);
      await notificationService.sendNotification(toUserId, {
        type: "partner_encouragement",
        title: "Partner Encouragement 🌟",
        message: `${fromUserProfile?.display_name || 'Your partner'}: ${message}`,
        data: { 
          fromUserId,
          encouragementId: data.id,
          type,
        },
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error sending encouragement:", error);
      return { success: false, error: error.message };
    }
  }

  // Get progress feed from accountability partners
  async getPartnerProgressFeed(userId, limit = 20) {
    try {
      const partnersResult = await this.getAccountabilityPartners(userId);
      if (!partnersResult.success) {
        return { success: true, data: [] };
      }

      const partnerIds = partnersResult.data.map(p => p.partner.id);
      
      if (partnerIds.length === 0) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from("progress_shares")
        .select(`
          *,
          user:users (
            id,
            display_name,
            avatar_url
          )
        `)
        .in("user_id", partnerIds)
        .in("visibility", ["all", "accountability_partners"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error getting partner progress feed:", error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile helper
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }
}

export default new HabitTrackingService();
