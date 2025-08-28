import { supabase } from '../config/supabase';

class SocialProgressService {
  // Save role-play scenario completion
  async saveRolePlayProgress(userId, scenarioId, score, totalPoints, completedAt = new Date()) {
    try {
      const { data, error } = await supabase
        .from('social_progress')
        .insert([
          {
            user_id: userId,
            activity_type: 'roleplay',
            scenario_id: scenarioId,
            score: score,
            total_points: totalPoints,
            percentage: Math.round((score / totalPoints) * 100),
            completed_at: completedAt.toISOString(),
            metadata: {
              scenario_id: scenarioId,
              score: score,
              total_points: totalPoints
            }
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving role-play progress:', error);
      throw error;
    }
  }

  // Save scenario planner completion
  async saveScenarioPlannerProgress(userId, templateId, completedTasks, totalTasks, completedAt = new Date()) {
    try {
      const percentage = Math.round((completedTasks / totalTasks) * 100);
      
      const { data, error } = await supabase
        .from('social_progress')
        .insert([
          {
            user_id: userId,
            activity_type: 'scenario_planner',
            scenario_id: templateId,
            score: completedTasks,
            total_points: totalTasks,
            percentage: percentage,
            completed_at: completedAt.toISOString(),
            metadata: {
              template_id: templateId,
              completed_tasks: completedTasks,
              total_tasks: totalTasks
            }
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving scenario planner progress:', error);
      throw error;
    }
  }

  // Get user's social skills progress
  async getUserProgress(userId) {
    try {
      const { data, error } = await supabase
        .from('social_progress')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  // Get progress statistics
  async getProgressStats(userId) {
    try {
      const progress = await this.getUserProgress(userId);
      
      const rolePlaySessions = progress.filter(p => p.activity_type === 'roleplay');
      const scenarioPlannerSessions = progress.filter(p => p.activity_type === 'scenario_planner');
      
      const stats = {
        totalSessions: progress.length,
        rolePlaySessions: rolePlaySessions.length,
        scenarioPlannerSessions: scenarioPlannerSessions.length,
        averageRolePlayScore: rolePlaySessions.length > 0 
          ? Math.round(rolePlaySessions.reduce((sum, session) => sum + session.percentage, 0) / rolePlaySessions.length)
          : 0,
        averageScenarioCompletion: scenarioPlannerSessions.length > 0
          ? Math.round(scenarioPlannerSessions.reduce((sum, session) => sum + session.percentage, 0) / scenarioPlannerSessions.length)
          : 0,
        recentActivity: progress.slice(0, 5),
        improvementTrend: this.calculateImprovementTrend(rolePlaySessions)
      };

      return stats;
    } catch (error) {
      console.error('Error calculating progress stats:', error);
      throw error;
    }
  }

  // Calculate improvement trend for role-play sessions
  calculateImprovementTrend(sessions) {
    if (sessions.length < 2) return 'insufficient_data';
    
    // Sort by completion date
    const sortedSessions = sessions.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
    
    // Compare first half vs second half
    const midPoint = Math.floor(sortedSessions.length / 2);
    const firstHalf = sortedSessions.slice(0, midPoint);
    const secondHalf = sortedSessions.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.percentage, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.percentage, 0) / secondHalf.length;
    
    const improvement = secondHalfAvg - firstHalfAvg;
    
    if (improvement > 10) return 'improving';
    if (improvement < -10) return 'declining';
    return 'stable';
  }

  // Get achievements based on progress
  async getAchievements(userId) {
    try {
      const stats = await this.getProgressStats(userId);
      const achievements = [];

      // First steps achievements
      if (stats.rolePlaySessions >= 1) {
        achievements.push({
          id: 'first_roleplay',
          title: 'First Steps',
          description: 'Completed your first role-play scenario',
          icon: 'star',
          unlockedAt: new Date()
        });
      }

      if (stats.scenarioPlannerSessions >= 1) {
        achievements.push({
          id: 'first_planner',
          title: 'Prepared Mind',
          description: 'Used the scenario planner for the first time',
          icon: 'clipboard',
          unlockedAt: new Date()
        });
      }

      // Progress achievements
      if (stats.rolePlaySessions >= 5) {
        achievements.push({
          id: 'practice_makes_perfect',
          title: 'Practice Makes Perfect',
          description: 'Completed 5 role-play scenarios',
          icon: 'trophy',
          unlockedAt: new Date()
        });
      }

      if (stats.averageRolePlayScore >= 80) {
        achievements.push({
          id: 'social_star',
          title: 'Social Star',
          description: 'Maintained an 80% average in role-play scenarios',
          icon: 'star-outline',
          unlockedAt: new Date()
        });
      }

      // Improvement achievements
      if (stats.improvementTrend === 'improving') {
        achievements.push({
          id: 'on_the_rise',
          title: 'On the Rise',
          description: 'Your social skills are improving over time',
          icon: 'trending-up',
          unlockedAt: new Date()
        });
      }

      return achievements;
    } catch (error) {
      console.error('Error getting achievements:', error);
      throw error;
    }
  }
}

export default new SocialProgressService();