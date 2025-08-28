import { supabase } from "../config/supabase";
import aiService from "./aiService";
import moodService from "./moodService";

class WellnessPlanService {
  constructor() {
    this.planTypes = {
      ANXIETY_MANAGEMENT: "anxiety_management",
      MOOD_IMPROVEMENT: "mood_improvement",
      SOCIAL_SKILLS: "social_skills",
      STRESS_REDUCTION: "stress_reduction",
      HABIT_BUILDING: "habit_building",
      CRISIS_PREVENTION: "crisis_prevention",
    };

    this.taskCategories = {
      MINDFULNESS: "mindfulness",
      EXERCISE: "exercise",
      SOCIAL: "social",
      JOURNALING: "journaling",
      BREATHING: "breathing",
      SELF_CARE: "self_care",
      LEARNING: "learning",
      CREATIVE: "creative",
    };
  }

  // Generate AI-powered wellness plan based on user goals and preferences
  async generateWellnessPlan(userId, goals, preferences = {}) {
    try {
      // Get user's mood history and patterns
      const moodAnalytics = await moodService.getMoodAnalytics(userId, 30);
      const userProfile = await this.getUserProfile(userId);

      // Generate plan using AI insights
      const planData = await this.createPersonalizedPlan(
        goals,
        preferences,
        moodAnalytics.data,
        userProfile
      );

      // Save plan to database
      const { data, error } = await supabase
        .from("wellness_plans")
        .insert([
          {
            user_id: userId,
            title: planData.title,
            description: planData.description,
            plan_type: planData.planType,
            goals: goals,
            preferences: preferences,
            duration_weeks: planData.durationWeeks,
            daily_tasks: planData.dailyTasks,
            milestones: planData.milestones,
            ai_insights: planData.aiInsights,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;

      // Generate initial daily tasks for the first week
      await this.generateDailyTasks(data[0].id, userId, planData.dailyTasks);

      return { success: true, data: data[0] };
    } catch (error) {
      console.error("Error generating wellness plan:", error);
      return { success: false, error: error.message };
    }
  }

  // Create personalized plan based on user data
  async createPersonalizedPlan(goals, preferences, moodAnalytics, userProfile) {
    const planType = this.determinePlanType(goals, moodAnalytics);
    const durationWeeks =
      preferences.duration || this.getRecommendedDuration(planType);

    // Generate AI-powered insights and recommendations
    const aiInsights = await this.generateAIInsights(
      goals,
      moodAnalytics,
      userProfile
    );

    const planData = {
      title: this.generatePlanTitle(planType, goals),
      description: this.generatePlanDescription(planType, goals),
      planType,
      durationWeeks,
      dailyTasks: this.generateDailyTaskTemplates(planType, preferences),
      milestones: this.generateMilestones(planType, durationWeeks),
      aiInsights,
    };

    return planData;
  }

  // Determine the most appropriate plan type based on goals and mood data
  determinePlanType(goals, moodAnalytics) {
    const goalKeywords = goals.join(" ").toLowerCase();

    if (goalKeywords.includes("anxiety") || goalKeywords.includes("worry")) {
      return this.planTypes.ANXIETY_MANAGEMENT;
    }
    if (goalKeywords.includes("mood") || goalKeywords.includes("depression")) {
      return this.planTypes.MOOD_IMPROVEMENT;
    }
    if (
      goalKeywords.includes("social") ||
      goalKeywords.includes("confidence")
    ) {
      return this.planTypes.SOCIAL_SKILLS;
    }
    if (goalKeywords.includes("stress") || goalKeywords.includes("overwhelm")) {
      return this.planTypes.STRESS_REDUCTION;
    }
    if (goalKeywords.includes("habit") || goalKeywords.includes("routine")) {
      return this.planTypes.HABIT_BUILDING;
    }

    // Default based on mood analytics
    if (moodAnalytics?.averageMood < 3) {
      return this.planTypes.MOOD_IMPROVEMENT;
    }
    if (moodAnalytics?.averageAnxiety > 3) {
      return this.planTypes.ANXIETY_MANAGEMENT;
    }

    return this.planTypes.HABIT_BUILDING;
  }

  // Generate AI insights for personalized recommendations
  async generateAIInsights(goals, moodAnalytics, userProfile) {
    try {
      const context = {
        goals,
        moodTrend: moodAnalytics?.moodTrend,
        averageMood: moodAnalytics?.averageMood,
        commonEmotions: moodAnalytics?.commonEmotions,
        frequentTriggers: moodAnalytics?.frequentTriggers,
        preferences: userProfile?.preferences,
      };

      // Use AI service to generate personalized insights
      const insights = await aiService.generateWellnessInsights(context);

      return {
        personalizedRecommendations: insights.recommendations || [],
        riskFactors: insights.riskFactors || [],
        strengths: insights.strengths || [],
        focusAreas: insights.focusAreas || [],
        adaptationSuggestions: insights.adaptationSuggestions || [],
      };
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return this.getDefaultInsights();
    }
  }

  // Generate daily task templates based on plan type
  generateDailyTaskTemplates(planType, preferences) {
    const baseTasksPerDay = preferences.tasksPerDay || 3;
    const difficulty = preferences.difficulty || "beginner";

    const taskTemplates = {
      [this.planTypes.ANXIETY_MANAGEMENT]: [
        {
          category: this.taskCategories.BREATHING,
          title: "Morning Breathing Exercise",
          description: "Start your day with 5 minutes of deep breathing",
          duration: 5,
          difficulty: "beginner",
          points: 10,
        },
        {
          category: this.taskCategories.MINDFULNESS,
          title: "Mindful Moment",
          description: "Take a 3-minute mindfulness break",
          duration: 3,
          difficulty: "beginner",
          points: 8,
        },
        {
          category: this.taskCategories.JOURNALING,
          title: "Anxiety Check-in",
          description: "Write about your anxiety levels and triggers",
          duration: 10,
          difficulty: "intermediate",
          points: 15,
        },
      ],
      [this.planTypes.MOOD_IMPROVEMENT]: [
        {
          category: this.taskCategories.JOURNALING,
          title: "Gratitude Practice",
          description: "Write down 3 things you're grateful for",
          duration: 5,
          difficulty: "beginner",
          points: 10,
        },
        {
          category: this.taskCategories.EXERCISE,
          title: "Mood-Boosting Movement",
          description: "10 minutes of physical activity",
          duration: 10,
          difficulty: "beginner",
          points: 12,
        },
        {
          category: this.taskCategories.SOCIAL,
          title: "Connect with Someone",
          description: "Reach out to a friend or family member",
          duration: 15,
          difficulty: "intermediate",
          points: 18,
        },
      ],
      [this.planTypes.SOCIAL_SKILLS]: [
        {
          category: this.taskCategories.SOCIAL,
          title: "Practice Conversation",
          description: "Use the Social Ease Toolkit for 10 minutes",
          duration: 10,
          difficulty: "intermediate",
          points: 15,
        },
        {
          category: this.taskCategories.LEARNING,
          title: "Social Skills Learning",
          description: "Read about social interaction techniques",
          duration: 15,
          difficulty: "beginner",
          points: 12,
        },
        {
          category: this.taskCategories.MINDFULNESS,
          title: "Confidence Building",
          description: "Practice positive self-talk and affirmations",
          duration: 8,
          difficulty: "beginner",
          points: 10,
        },
      ],
    };

    const selectedTasks =
      taskTemplates[planType] || taskTemplates[this.planTypes.HABIT_BUILDING];
    return selectedTasks.slice(0, baseTasksPerDay);
  }

  // Generate milestones for the wellness plan
  generateMilestones(planType, durationWeeks) {
    const milestones = [];
    const totalWeeks = durationWeeks;

    // Week 1 milestone
    milestones.push({
      week: 1,
      title: "Getting Started",
      description: "Complete your first week of daily wellness tasks",
      criteria: {
        tasksCompleted: 5,
        streakDays: 3,
      },
      reward: {
        points: 50,
        badge: "First Steps",
        message: "Great job starting your wellness journey!",
      },
    });

    // Mid-point milestone
    const midWeek = Math.floor(totalWeeks / 2);
    if (midWeek > 1) {
      milestones.push({
        week: midWeek,
        title: "Halfway Hero",
        description: "You're halfway through your wellness plan!",
        criteria: {
          tasksCompleted: midWeek * 7 * 0.7, // 70% completion rate
          streakDays: 7,
        },
        reward: {
          points: 100,
          badge: "Consistency Champion",
          message: "Your dedication is paying off!",
        },
      });
    }

    // Final milestone
    milestones.push({
      week: totalWeeks,
      title: "Wellness Warrior",
      description: "Complete your entire wellness plan",
      criteria: {
        tasksCompleted: totalWeeks * 7 * 0.8, // 80% completion rate
        streakDays: 14,
      },
      reward: {
        points: 200,
        badge: "Plan Completer",
        message: "Congratulations on completing your wellness journey!",
      },
    });

    return milestones;
  }

  // Generate daily tasks for a specific plan
  async generateDailyTasks(planId, userId, taskTemplates) {
    try {
      const tasks = [];
      const today = new Date();

      // Generate tasks for the next 7 days
      for (let i = 0; i < 7; i++) {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + i);

        // Create daily tasks based on templates
        taskTemplates.forEach((template, index) => {
          tasks.push({
            plan_id: planId,
            user_id: userId,
            title: template.title,
            description: template.description,
            category: template.category,
            duration_minutes: template.duration,
            points: template.points,
            difficulty: template.difficulty,
            scheduled_date: taskDate.toISOString().split("T")[0],
            status: "pending",
            created_at: new Date().toISOString(),
          });
        });
      }

      const { data, error } = await supabase
        .from("wellness_tasks")
        .insert(tasks)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error generating daily tasks:", error);
      return { success: false, error: error.message };
    }
  }

  // Get user's wellness plans
  async getUserWellnessPlans(userId) {
    try {
      const { data, error } = await supabase
        .from("wellness_plans")
        .select(
          `
          *,
          wellness_tasks (
            id,
            title,
            status,
            scheduled_date,
            completed_at,
            points
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get active wellness plan for user
  async getActiveWellnessPlan(userId) {
    try {
      const { data, error } = await supabase
        .from("wellness_plans")
        .select(
          `
          *,
          wellness_tasks!inner (
            id,
            title,
            description,
            category,
            duration_minutes,
            points,
            difficulty,
            status,
            scheduled_date,
            completed_at
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return { success: true, data: data[0] || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  generatePlanTitle(planType, goals) {
    const titles = {
      [this.planTypes.ANXIETY_MANAGEMENT]: "Anxiety Relief Journey",
      [this.planTypes.MOOD_IMPROVEMENT]: "Mood Boost Challenge",
      [this.planTypes.SOCIAL_SKILLS]: "Social Confidence Builder",
      [this.planTypes.STRESS_REDUCTION]: "Stress-Free Living Plan",
      [this.planTypes.HABIT_BUILDING]: "Healthy Habits Formation",
      [this.planTypes.CRISIS_PREVENTION]: "Stability & Resilience Plan",
    };
    return titles[planType] || "Personal Wellness Plan";
  }

  generatePlanDescription(planType, goals) {
    const descriptions = {
      [this.planTypes.ANXIETY_MANAGEMENT]:
        "A comprehensive plan to help you manage anxiety through proven techniques and daily practices.",
      [this.planTypes.MOOD_IMPROVEMENT]:
        "Boost your mood and emotional well-being with evidence-based activities and mindfulness practices.",
      [this.planTypes.SOCIAL_SKILLS]:
        "Build confidence in social situations through structured practice and skill-building exercises.",
      [this.planTypes.STRESS_REDUCTION]:
        "Learn effective stress management techniques and create a more balanced lifestyle.",
      [this.planTypes.HABIT_BUILDING]:
        "Develop sustainable wellness habits that support your mental health goals.",
      [this.planTypes.CRISIS_PREVENTION]:
        "Build resilience and create safety nets to maintain emotional stability.",
    };
    return (
      descriptions[planType] ||
      "A personalized wellness plan tailored to your specific goals and needs."
    );
  }

  getRecommendedDuration(planType) {
    const durations = {
      [this.planTypes.ANXIETY_MANAGEMENT]: 8,
      [this.planTypes.MOOD_IMPROVEMENT]: 6,
      [this.planTypes.SOCIAL_SKILLS]: 12,
      [this.planTypes.STRESS_REDUCTION]: 6,
      [this.planTypes.HABIT_BUILDING]: 8,
      [this.planTypes.CRISIS_PREVENTION]: 16,
    };
    return durations[planType] || 8;
  }

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

  getDefaultInsights() {
    return {
      personalizedRecommendations: [
        "Start with small, achievable goals",
        "Focus on consistency over perfection",
        "Celebrate small wins along the way",
      ],
      riskFactors: [],
      strengths: ["Willingness to improve", "Taking proactive steps"],
      focusAreas: ["Building healthy routines", "Stress management"],
      adaptationSuggestions: [
        "Adjust difficulty based on progress",
        "Add variety to prevent boredom",
      ],
    };
  }

  // Get specific wellness plan by ID
  async getWellnessPlan(planId) {
    try {
      const { data, error } = await supabase
        .from("wellness_plans")
        .select(
          `
          *,
          wellness_tasks (
            id,
            title,
            description,
            category,
            duration_minutes,
            points,
            difficulty,
            status,
            scheduled_date,
            completed_at
          )
        `
        )
        .eq("id", planId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Complete a wellness task
  async completeTask(taskId) {
    try {
      const { data, error } = await supabase
        .from("wellness_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .select();

      if (error) throw error;

      // Update plan progress
      if (data && data[0]) {
        await this.updatePlanProgress(data[0].plan_id);
      }

      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update plan progress and streaks
  async updatePlanProgress(planId) {
    try {
      // Get all tasks for this plan
      const { data: tasks, error: tasksError } = await supabase
        .from("wellness_tasks")
        .select("*")
        .eq("plan_id", planId);

      if (tasksError) throw tasksError;

      const completedTasks = tasks.filter(
        (task) => task.status === "completed"
      ).length;
      const totalTasks = tasks.length;
      const progressPercentage =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate current streak
      const currentStreak = await this.calculateCurrentStreak(planId);

      // Update plan
      const { error: updateError } = await supabase
        .from("wellness_plans")
        .update({
          progress_percentage: progressPercentage,
          tasks_completed: completedTasks,
          total_tasks: totalTasks,
          current_streak: currentStreak,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      if (updateError) throw updateError;

      // Check for milestone achievements
      await this.checkMilestoneAchievements(planId);

      return { success: true };
    } catch (error) {
      console.error("Error updating plan progress:", error);
      return { success: false, error: error.message };
    }
  }

  // Calculate current streak of consecutive days with completed tasks
  async calculateCurrentStreak(planId) {
    try {
      const { data: tasks, error } = await supabase
        .from("wellness_tasks")
        .select("scheduled_date, status")
        .eq("plan_id", planId)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      if (!tasks || tasks.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      // Group tasks by date
      const tasksByDate = {};
      tasks.forEach((task) => {
        const date = task.scheduled_date;
        if (!tasksByDate[date]) {
          tasksByDate[date] = 0;
        }
        tasksByDate[date]++;
      });

      // Count consecutive days with completed tasks
      while (true) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (tasksByDate[dateStr] && tasksByDate[dateStr] > 0) {
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

  // Check and award milestone achievements
  async checkMilestoneAchievements(planId) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("wellness_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      const milestones = plan.milestones || [];

      for (const milestone of milestones) {
        // Check if milestone criteria are met
        const isMet = await this.checkMilestoneCriteria(
          planId,
          milestone.criteria,
          plan
        );

        if (isMet) {
          // Check if already achieved
          const { data: existing } = await supabase
            .from("wellness_milestones")
            .select("*")
            .eq("plan_id", planId)
            .eq("milestone_data->title", milestone.title)
            .eq("is_achieved", true);

          if (!existing || existing.length === 0) {
            // Award milestone
            await supabase.from("wellness_milestones").insert([
              {
                plan_id: planId,
                user_id: plan.user_id,
                milestone_data: milestone,
                achieved_at: new Date().toISOString(),
                is_achieved: true,
              },
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Error checking milestones:", error);
    }
  }

  // Check if milestone criteria are met
  async checkMilestoneCriteria(planId, criteria, plan) {
    try {
      const tasksCompleted = plan.tasks_completed || 0;
      const currentStreak = plan.current_streak || 0;

      // Check tasks completed criteria
      if (criteria.tasksCompleted && tasksCompleted < criteria.tasksCompleted) {
        return false;
      }

      // Check streak criteria
      if (criteria.streakDays && currentStreak < criteria.streakDays) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking milestone criteria:", error);
      return false;
    }
  }

  // Skip a task
  async skipTask(taskId, reason = "") {
    try {
      const { data, error } = await supabase
        .from("wellness_tasks")
        .update({
          status: "skipped",
          skipped_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get today's tasks for a user
  async getTodaysTasks(userId) {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("wellness_tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate next week's tasks for an active plan
  async generateNextWeekTasks(planId) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("wellness_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      const taskTemplates = plan.daily_tasks || [];
      const tasks = [];
      const today = new Date();

      // Generate tasks for the next 7 days
      for (let i = 7; i < 14; i++) {
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + i);

        taskTemplates.forEach((template) => {
          tasks.push({
            plan_id: planId,
            user_id: plan.user_id,
            title: template.title,
            description: template.description,
            category: template.category,
            duration_minutes: template.duration,
            points: template.points,
            difficulty: template.difficulty,
            scheduled_date: taskDate.toISOString().split("T")[0],
            status: "pending",
            created_at: new Date().toISOString(),
          });
        });
      }

      const { data, error } = await supabase
        .from("wellness_tasks")
        .insert(tasks)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Adaptive plan management - analyze user behavior and adapt plan
  async adaptPlanBasedOnBehavior(planId) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("wellness_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      // Get user's task completion data for the last 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data: recentTasks, error: tasksError } = await supabase
        .from("wellness_tasks")
        .select("*")
        .eq("plan_id", planId)
        .gte("scheduled_date", twoWeeksAgo.toISOString().split("T")[0])
        .order("scheduled_date", { ascending: false });

      if (tasksError) throw tasksError;

      const behaviorAnalysis = this.analyzeBehaviorPatterns(recentTasks);
      const adaptations = this.generatePlanAdaptations(behaviorAnalysis, plan);

      // Apply adaptations to the plan
      if (adaptations.length > 0) {
        await this.applyPlanAdaptations(planId, adaptations);
      }

      return { success: true, adaptations, behaviorAnalysis };
    } catch (error) {
      console.error("Error adapting plan:", error);
      return { success: false, error: error.message };
    }
  }

  // Analyze user behavior patterns
  analyzeBehaviorPatterns(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const skippedTasks = tasks.filter((t) => t.status === "skipped").length;
    const missedTasks = tasks.filter((t) => t.status === "missed").length;

    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const skipRate = totalTasks > 0 ? skippedTasks / totalTasks : 0;
    const missRate = totalTasks > 0 ? missedTasks / totalTasks : 0;

    // Analyze by category
    const categoryPerformance = {};
    const categories = [...new Set(tasks.map((t) => t.category))];

    categories.forEach((category) => {
      const categoryTasks = tasks.filter((t) => t.category === category);
      const categoryCompleted = categoryTasks.filter(
        (t) => t.status === "completed"
      ).length;
      categoryPerformance[category] = {
        total: categoryTasks.length,
        completed: categoryCompleted,
        rate:
          categoryTasks.length > 0
            ? categoryCompleted / categoryTasks.length
            : 0,
      };
    });

    // Analyze by difficulty
    const difficultyPerformance = {};
    const difficulties = [...new Set(tasks.map((t) => t.difficulty))];

    difficulties.forEach((difficulty) => {
      const difficultyTasks = tasks.filter((t) => t.difficulty === difficulty);
      const difficultyCompleted = difficultyTasks.filter(
        (t) => t.status === "completed"
      ).length;
      difficultyPerformance[difficulty] = {
        total: difficultyTasks.length,
        completed: difficultyCompleted,
        rate:
          difficultyTasks.length > 0
            ? difficultyCompleted / difficultyTasks.length
            : 0,
      };
    });

    // Analyze streak patterns
    const currentStreak = this.calculateStreakFromTasks(tasks);
    const longestStreak = this.calculateLongestStreak(tasks);

    return {
      completionRate,
      skipRate,
      missRate,
      categoryPerformance,
      difficultyPerformance,
      currentStreak,
      longestStreak,
      totalTasks,
      completedTasks,
      engagementLevel: this.calculateEngagementLevel(
        completionRate,
        skipRate,
        missRate
      ),
    };
  }

  // Generate plan adaptations based on behavior analysis
  generatePlanAdaptations(analysis, plan) {
    const adaptations = [];

    // If completion rate is low, reduce difficulty or task count
    if (analysis.completionRate < 0.5) {
      if (plan.preferences?.difficulty === "advanced") {
        adaptations.push({
          type: "difficulty_reduction",
          from: "advanced",
          to: "intermediate",
          reason: "Low completion rate detected",
        });
      } else if (plan.preferences?.difficulty === "intermediate") {
        adaptations.push({
          type: "difficulty_reduction",
          from: "intermediate",
          to: "beginner",
          reason: "Low completion rate detected",
        });
      }

      if (plan.preferences?.tasksPerDay > 2) {
        adaptations.push({
          type: "task_count_reduction",
          from: plan.preferences.tasksPerDay,
          to: Math.max(2, plan.preferences.tasksPerDay - 1),
          reason: "Reducing task load to improve completion rate",
        });
      }
    }

    // If completion rate is very high, increase difficulty or add variety
    if (analysis.completionRate > 0.8 && analysis.currentStreak > 7) {
      if (plan.preferences?.difficulty === "beginner") {
        adaptations.push({
          type: "difficulty_increase",
          from: "beginner",
          to: "intermediate",
          reason: "High completion rate - ready for more challenge",
        });
      } else if (plan.preferences?.difficulty === "intermediate") {
        adaptations.push({
          type: "difficulty_increase",
          from: "intermediate",
          to: "advanced",
          reason: "High completion rate - ready for more challenge",
        });
      }
    }

    // Adapt based on category performance
    Object.entries(analysis.categoryPerformance).forEach(
      ([category, performance]) => {
        if (performance.rate < 0.3 && performance.total > 3) {
          adaptations.push({
            type: "category_reduction",
            category,
            reason: `Low completion rate for ${category} tasks`,
          });
        } else if (performance.rate > 0.9 && performance.total > 5) {
          adaptations.push({
            type: "category_increase",
            category,
            reason: `High engagement with ${category} tasks`,
          });
        }
      }
    );

    // Engagement recovery strategies
    if (analysis.engagementLevel === "low") {
      adaptations.push({
        type: "engagement_recovery",
        strategies: [
          "Add variety to task types",
          "Reduce task duration",
          "Increase reward points",
          "Add social elements",
        ],
        reason: "Low engagement detected",
      });
    }

    return adaptations;
  }

  // Apply adaptations to the plan
  async applyPlanAdaptations(planId, adaptations) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("wellness_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      let updatedPreferences = { ...plan.preferences };
      let updatedDailyTasks = [...plan.daily_tasks];

      adaptations.forEach((adaptation) => {
        switch (adaptation.type) {
          case "difficulty_reduction":
          case "difficulty_increase":
            updatedPreferences.difficulty = adaptation.to;
            // Update existing task templates
            updatedDailyTasks = updatedDailyTasks.map((task) => ({
              ...task,
              difficulty: adaptation.to,
              duration:
                adaptation.to === "beginner"
                  ? Math.max(5, task.duration - 2)
                  : adaptation.to === "advanced"
                  ? task.duration + 3
                  : task.duration,
            }));
            break;

          case "task_count_reduction":
            updatedPreferences.tasksPerDay = adaptation.to;
            updatedDailyTasks = updatedDailyTasks.slice(0, adaptation.to);
            break;

          case "category_reduction":
            updatedDailyTasks = updatedDailyTasks.filter(
              (task) => task.category !== adaptation.category
            );
            break;

          case "engagement_recovery":
            // Reduce task durations and increase points
            updatedDailyTasks = updatedDailyTasks.map((task) => ({
              ...task,
              duration: Math.max(5, task.duration - 3),
              points: task.points + 5,
            }));
            break;
        }
      });

      // Update the plan in database
      const { error: updateError } = await supabase
        .from("wellness_plans")
        .update({
          preferences: updatedPreferences,
          daily_tasks: updatedDailyTasks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      if (updateError) throw updateError;

      // Log the adaptation
      await this.logPlanAdaptation(planId, adaptations);

      return { success: true };
    } catch (error) {
      console.error("Error applying adaptations:", error);
      return { success: false, error: error.message };
    }
  }

  // Calculate engagement level
  calculateEngagementLevel(completionRate, skipRate, missRate) {
    if (completionRate > 0.7) return "high";
    if (completionRate > 0.4) return "medium";
    return "low";
  }

  // Calculate streak from tasks array
  calculateStreakFromTasks(tasks) {
    const sortedTasks = tasks.sort(
      (a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)
    );
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const tasksByDate = {};
    sortedTasks.forEach((task) => {
      const date = task.scheduled_date;
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    });

    while (true) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayTasks = tasksByDate[dateStr] || [];
      const completedTasks = dayTasks.filter((t) => t.status === "completed");

      if (completedTasks.length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Calculate longest streak
  calculateLongestStreak(tasks) {
    const sortedTasks = tasks.sort(
      (a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)
    );
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    const tasksByDate = {};
    sortedTasks.forEach((task) => {
      const date = task.scheduled_date;
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    });

    Object.keys(tasksByDate)
      .sort()
      .forEach((dateStr) => {
        const dayTasks = tasksByDate[dateStr];
        const completedTasks = dayTasks.filter((t) => t.status === "completed");

        if (completedTasks.length > 0) {
          const currentDate = new Date(dateStr);
          if (lastDate && currentDate - lastDate === 86400000) {
            // 1 day in ms
            currentStreak++;
          } else {
            currentStreak = 1;
          }
          longestStreak = Math.max(longestStreak, currentStreak);
          lastDate = currentDate;
        } else {
          currentStreak = 0;
        }
      });

    return longestStreak;
  }

  // Log plan adaptation for tracking
  async logPlanAdaptation(planId, adaptations) {
    try {
      const { error } = await supabase
        .from("wellness_plan_adaptations")
        .insert([
          {
            plan_id: planId,
            adaptations: adaptations,
            applied_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error("Error logging adaptation:", error);
      }
    } catch (error) {
      console.error("Error logging adaptation:", error);
    }
  }

  // Check for users who need engagement recovery
  async identifyUsersNeedingEngagementRecovery() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find users with active plans who haven't completed tasks recently
      const { data: inactiveUsers, error } = await supabase
        .from("wellness_plans")
        .select(
          `
          id,
          user_id,
          title,
          wellness_tasks!inner (
            id,
            status,
            scheduled_date
          )
        `
        )
        .eq("status", "active")
        .lt(
          "wellness_tasks.scheduled_date",
          threeDaysAgo.toISOString().split("T")[0]
        )
        .neq("wellness_tasks.status", "completed");

      if (error) throw error;

      return { success: true, data: inactiveUsers || [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send engagement recovery notification
  async sendEngagementRecoveryNotification(userId, planId) {
    try {
      const recoveryStrategies = [
        {
          title: "Let's get back on track! 🌟",
          message:
            "We noticed you've missed a few wellness tasks. How about starting with just one small task today?",
          action: "Start with 5-minute breathing exercise",
        },
        {
          title: "Your wellness journey matters 💙",
          message:
            "It's okay to have off days. Would you like to adjust your plan to make it more manageable?",
          action: "Customize your plan",
        },
        {
          title: "Small steps, big impact 🚀",
          message:
            "Even 2 minutes of self-care counts. What's one tiny thing you can do for yourself today?",
          action: "Quick mood check-in",
        },
      ];

      const randomStrategy =
        recoveryStrategies[
          Math.floor(Math.random() * recoveryStrategies.length)
        ];

      // Create notification in database
      const { error } = await supabase.from("notifications").insert([
        {
          user_id: userId,
          type: "engagement_recovery",
          title: randomStrategy.title,
          message: randomStrategy.message,
          data: {
            plan_id: planId,
            action: randomStrategy.action,
            recovery_type: "gentle_nudge",
          },
        },
      ]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark missed tasks and trigger recovery if needed
  async processMissedTasks() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Find all pending tasks from yesterday
      const { data: missedTasks, error } = await supabase
        .from("wellness_tasks")
        .update({ status: "missed" })
        .eq("status", "pending")
        .eq("scheduled_date", yesterdayStr)
        .select();

      if (error) throw error;

      // Group by user and check if they need engagement recovery
      const userMissedCounts = {};
      missedTasks?.forEach((task) => {
        if (!userMissedCounts[task.user_id]) {
          userMissedCounts[task.user_id] = { count: 0, planId: task.plan_id };
        }
        userMissedCounts[task.user_id].count++;
      });

      // Send recovery notifications for users with multiple missed tasks
      for (const [userId, data] of Object.entries(userMissedCounts)) {
        if (data.count >= 2) {
          await this.sendEngagementRecoveryNotification(userId, data.planId);
        }
      }

      return { success: true, processedTasks: missedTasks?.length || 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new WellnessPlanService();
