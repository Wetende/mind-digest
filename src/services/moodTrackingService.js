import { supabase } from '../config/supabase';
import userProfileService from './userProfileService';

class MoodTrackingService {
  // Log daily mood entry
  async logMoodEntry(userId, moodData) {
    try {
      // Ensure user profile exists before creating mood entry
      const profileResult = await userProfileService.ensureUserProfile(userId);
      if (!profileResult.success) {
        throw new Error(`Failed to ensure user profile: ${profileResult.error}`);
      }

      const entry = {
        user_id: userId,
        mood_score: moodData.moodScore, // 1-10 scale
        energy_level: moodData.energyLevel, // 1-10 scale
        anxiety_level: moodData.anxietyLevel, // 1-10 scale
        stress_level: moodData.stressLevel, // 1-10 scale
        sleep_quality: moodData.sleepQuality, // 1-10 scale
        symptoms: moodData.symptoms || [], // Array of symptom strings
        triggers: moodData.triggers || [], // Array of trigger strings
        notes: moodData.notes || '',
        activities: moodData.activities || [], // Activities that helped/hurt
        medications: moodData.medications || [], // Medications taken
        weather: moodData.weather || null,
        social_interactions: moodData.socialInteractions || 0, // Number of social interactions
        exercise_minutes: moodData.exerciseMinutes || 0,
        created_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };

      const { data, error } = await supabase
        .from('mood_entries')
        .insert(entry)
        .select()
        .single();

      if (error) throw error;

      // Update user's mood streak
      await this.updateMoodStreak(userId);

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get mood entries for a date range
  async getMoodEntries(userId, startDate, endDate, limit = 30) {
    try {
      let query = supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get today's mood entry
  async getTodaysMoodEntry(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return { success: true, data: data || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update existing mood entry
  async updateMoodEntry(entryId, userId, moodData) {
    try {
      const updates = {
        mood_score: moodData.moodScore,
        energy_level: moodData.energyLevel,
        anxiety_level: moodData.anxietyLevel,
        stress_level: moodData.stressLevel,
        sleep_quality: moodData.sleepQuality,
        symptoms: moodData.symptoms || [],
        triggers: moodData.triggers || [],
        notes: moodData.notes || '',
        activities: moodData.activities || [],
        medications: moodData.medications || [],
        weather: moodData.weather || null,
        social_interactions: moodData.socialInteractions || 0,
        exercise_minutes: moodData.exerciseMinutes || 0,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mood_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get mood analytics and trends
  async getMoodAnalytics(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data: entries, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .order('date', { ascending: true });

      if (error) throw error;

      if (entries.length === 0) {
        return { 
          success: true, 
          data: {
            averages: {},
            trends: {},
            patterns: {},
            insights: []
          }
        };
      }

      // Calculate averages
      const averages = this.calculateAverages(entries);
      
      // Analyze trends
      const trends = this.analyzeTrends(entries);
      
      // Find patterns
      const patterns = this.findPatterns(entries);
      
      // Generate insights
      const insights = this.generateInsights(entries, averages, trends, patterns);

      return {
        success: true,
        data: {
          averages,
          trends,
          patterns,
          insights,
          totalEntries: entries.length,
          dateRange: { start: startDateStr, end: new Date().toISOString().split('T')[0] }
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Calculate average scores
  calculateAverages(entries) {
    const totals = entries.reduce((acc, entry) => ({
      mood_score: acc.mood_score + (entry.mood_score || 0),
      energy_level: acc.energy_level + (entry.energy_level || 0),
      anxiety_level: acc.anxiety_level + (entry.anxiety_level || 0),
      stress_level: acc.stress_level + (entry.stress_level || 0),
      sleep_quality: acc.sleep_quality + (entry.sleep_quality || 0),
      social_interactions: acc.social_interactions + (entry.social_interactions || 0),
      exercise_minutes: acc.exercise_minutes + (entry.exercise_minutes || 0)
    }), {
      mood_score: 0,
      energy_level: 0,
      anxiety_level: 0,
      stress_level: 0,
      sleep_quality: 0,
      social_interactions: 0,
      exercise_minutes: 0
    });

    const count = entries.length;
    return {
      mood_score: Math.round((totals.mood_score / count) * 10) / 10,
      energy_level: Math.round((totals.energy_level / count) * 10) / 10,
      anxiety_level: Math.round((totals.anxiety_level / count) * 10) / 10,
      stress_level: Math.round((totals.stress_level / count) * 10) / 10,
      sleep_quality: Math.round((totals.sleep_quality / count) * 10) / 10,
      social_interactions: Math.round((totals.social_interactions / count) * 10) / 10,
      exercise_minutes: Math.round((totals.exercise_minutes / count) * 10) / 10
    };
  }

  // Analyze trends over time
  analyzeTrends(entries) {
    if (entries.length < 7) return {};

    const recent = entries.slice(-7); // Last 7 entries
    const previous = entries.slice(-14, -7); // Previous 7 entries

    if (previous.length === 0) return {};

    const recentAvg = this.calculateAverages(recent);
    const previousAvg = this.calculateAverages(previous);

    return {
      mood_trend: this.getTrendDirection(previousAvg.mood_score, recentAvg.mood_score),
      energy_trend: this.getTrendDirection(previousAvg.energy_level, recentAvg.energy_level),
      anxiety_trend: this.getTrendDirection(previousAvg.anxiety_level, recentAvg.anxiety_level, true), // Lower is better
      stress_trend: this.getTrendDirection(previousAvg.stress_level, recentAvg.stress_level, true),
      sleep_trend: this.getTrendDirection(previousAvg.sleep_quality, recentAvg.sleep_quality)
    };
  }

  // Get trend direction
  getTrendDirection(previous, current, lowerIsBetter = false) {
    const difference = current - previous;
    const threshold = 0.5;

    if (Math.abs(difference) < threshold) return 'stable';
    
    if (lowerIsBetter) {
      return difference > threshold ? 'worsening' : 'improving';
    } else {
      return difference > threshold ? 'improving' : 'worsening';
    }
  }

  // Find patterns in mood data
  findPatterns(entries) {
    const patterns = {};

    // Day of week patterns
    const dayPatterns = {};
    entries.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      
      if (!dayPatterns[dayName]) {
        dayPatterns[dayName] = { mood_scores: [], count: 0 };
      }
      
      dayPatterns[dayName].mood_scores.push(entry.mood_score || 0);
      dayPatterns[dayName].count++;
    });

    // Calculate average mood by day
    Object.keys(dayPatterns).forEach(day => {
      const scores = dayPatterns[day].mood_scores;
      dayPatterns[day].average = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    patterns.dayOfWeek = dayPatterns;

    // Common symptoms
    const symptomCounts = {};
    entries.forEach(entry => {
      (entry.symptoms || []).forEach(symptom => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      });
    });

    patterns.commonSymptoms = Object.entries(symptomCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([symptom, count]) => ({ symptom, count, percentage: Math.round((count / entries.length) * 100) }));

    // Common triggers
    const triggerCounts = {};
    entries.forEach(entry => {
      (entry.triggers || []).forEach(trigger => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      });
    });

    patterns.commonTriggers = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count, percentage: Math.round((count / entries.length) * 100) }));

    return patterns;
  }

  // Generate personalized insights
  generateInsights(entries, averages, trends, patterns) {
    const insights = [];

    // Mood trend insights
    if (trends.mood_trend === 'improving') {
      insights.push({
        type: 'positive',
        title: 'Mood Improving',
        message: 'Your mood has been trending upward over the past week. Keep up the great work!',
        icon: 'trending-up'
      });
    } else if (trends.mood_trend === 'worsening') {
      insights.push({
        type: 'concern',
        title: 'Mood Declining',
        message: 'Your mood has been declining recently. Consider reaching out for support or trying some self-care activities.',
        icon: 'trending-down'
      });
    }

    // Sleep quality insights
    if (averages.sleep_quality < 5) {
      insights.push({
        type: 'suggestion',
        title: 'Sleep Quality',
        message: 'Your sleep quality has been below average. Good sleep is crucial for mental health. Try establishing a bedtime routine.',
        icon: 'moon'
      });
    }

    // Exercise insights
    if (averages.exercise_minutes < 30) {
      insights.push({
        type: 'suggestion',
        title: 'Physical Activity',
        message: 'Regular exercise can significantly improve mood. Try to aim for at least 30 minutes of activity daily.',
        icon: 'fitness'
      });
    }

    // Social interaction insights
    if (averages.social_interactions < 2) {
      insights.push({
        type: 'suggestion',
        title: 'Social Connection',
        message: 'Social connections are important for mental health. Consider reaching out to friends or joining our peer support groups.',
        icon: 'people'
      });
    }

    // Pattern-based insights
    if (patterns.dayOfWeek) {
      const worstDay = Object.entries(patterns.dayOfWeek)
        .sort(([,a], [,b]) => a.average - b.average)[0];
      
      if (worstDay && worstDay[1].average < averages.mood_score - 1) {
        insights.push({
          type: 'pattern',
          title: `${worstDay[0]} Pattern`,
          message: `Your mood tends to be lower on ${worstDay[0]}s. Consider planning something positive for these days.`,
          icon: 'calendar'
        });
      }
    }

    // Common trigger insights
    if (patterns.commonTriggers && patterns.commonTriggers.length > 0) {
      const topTrigger = patterns.commonTriggers[0];
      insights.push({
        type: 'awareness',
        title: 'Common Trigger',
        message: `"${topTrigger.trigger}" appears to be a frequent trigger (${topTrigger.percentage}% of entries). Consider developing coping strategies for this.`,
        icon: 'warning'
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  // Update mood tracking streak
  async updateMoodStreak(userId) {
    try {
      // Get user's current streak
      const { data: user } = await supabase
        .from('users')
        .select('mood_streak, last_mood_entry')
        .eq('id', userId)
        .single();

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;

      if (user?.last_mood_entry === yesterdayStr) {
        // Continuing streak
        newStreak = (user.mood_streak || 0) + 1;
      } else if (user?.last_mood_entry === today) {
        // Already logged today, keep current streak
        newStreak = user.mood_streak || 1;
      }

      // Update user's streak
      await supabase
        .from('users')
        .update({
          mood_streak: newStreak,
          last_mood_entry: today
        })
        .eq('id', userId);

      return { success: true, streak: newStreak };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get mood statistics for dashboard
  async getMoodStats(userId) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('mood_streak')
        .eq('id', userId)
        .single();

      // Get total entries
      const { count: totalEntries } = await supabase
        .from('mood_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Get this week's entries
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { count: weekEntries } = await supabase
        .from('mood_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .gte('date', weekStartStr);

      return {
        success: true,
        data: {
          currentStreak: user?.mood_streak || 0,
          totalEntries: totalEntries || 0,
          weekEntries: weekEntries || 0,
          weekGoal: 7
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Export mood data for healthcare providers
  async exportMoodData(userId, startDate, endDate, format = 'json') {
    try {
      const { data: entries, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Get analytics for the period
      const analytics = await this.getMoodAnalytics(userId, 
        Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
      );

      const exportData = {
        user_id: userId,
        export_date: new Date().toISOString(),
        date_range: { start: startDate, end: endDate },
        entries: entries,
        analytics: analytics.data,
        summary: {
          total_entries: entries.length,
          date_range_days: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)),
          completion_rate: Math.round((entries.length / Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))) * 100)
        }
      };

      if (format === 'csv') {
        return { success: true, data: this.convertToCSV(entries), format: 'csv' };
      }

      return { success: true, data: exportData, format: 'json' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert mood data to CSV format
  convertToCSV(entries) {
    if (entries.length === 0) return '';

    const headers = [
      'Date', 'Mood Score', 'Energy Level', 'Anxiety Level', 'Stress Level', 
      'Sleep Quality', 'Social Interactions', 'Exercise Minutes', 'Symptoms', 
      'Triggers', 'Activities', 'Notes'
    ];

    const csvRows = [headers.join(',')];

    entries.forEach(entry => {
      const row = [
        entry.date,
        entry.mood_score || '',
        entry.energy_level || '',
        entry.anxiety_level || '',
        entry.stress_level || '',
        entry.sleep_quality || '',
        entry.social_interactions || '',
        entry.exercise_minutes || '',
        (entry.symptoms || []).join(';'),
        (entry.triggers || []).join(';'),
        (entry.activities || []).join(';'),
        (entry.notes || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

export default new MoodTrackingService();