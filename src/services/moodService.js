import { supabase } from '../config/supabase';
import { TABLES } from '../config/supabase';

class MoodService {
  // Create a new mood entry
  async createMoodEntry(moodData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .insert([{
          user_id: moodData.userId,
          mood: moodData.mood,
          energy: moodData.energy || null,
          anxiety: moodData.anxiety || null,
          emotions: moodData.emotions || [],
          triggers: moodData.triggers || [],
          notes: moodData.notes || null,
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get mood entries for a user
  async getMoodEntries(userId, limit = 30, offset = 0) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get mood trends and analytics
  async getMoodAnalytics(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .select('mood, energy, anxiety, emotions, triggers, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process analytics
      const analytics = this.processMoodAnalytics(data);
      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get today's mood entry
  async getTodaysMood(userId) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return { success: true, data: data[0] || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update mood entry
  async updateMoodEntry(entryId, updates) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .update(updates)
        .eq('id', entryId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete mood entry
  async deleteMoodEntry(entryId) {
    try {
      const { error } = await supabase
        .from(TABLES.MOODS)
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Process mood analytics
  processMoodAnalytics(entries) {
    if (!entries || entries.length === 0) {
      return {
        averageMood: 0,
        moodTrend: 'stable',
        averageEnergy: 0,
        averageAnxiety: 0,
        commonEmotions: [],
        frequentTriggers: [],
        totalEntries: 0,
        moodHistory: [],
      };
    }

    // Calculate averages
    const averageMood = entries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / entries.length;
    const averageEnergy = entries.reduce((sum, entry) => sum + (entry.energy || 0), 0) / entries.length;
    const averageAnxiety = entries.reduce((sum, entry) => sum + (entry.anxiety || 0), 0) / entries.length;

    // Calculate mood trend
    const recentEntries = entries.slice(-7);
    const olderEntries = entries.slice(0, -7);
    const recentAvg = recentEntries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / recentEntries.length;
    const olderAvg = olderEntries.length > 0 ? olderEntries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / olderEntries.length : recentAvg;
    
    let moodTrend = 'stable';
    if (recentAvg > olderAvg + 0.5) moodTrend = 'improving';
    else if (recentAvg < olderAvg - 0.5) moodTrend = 'declining';

    // Count emotions and triggers
    const emotionCounts = {};
    const triggerCounts = {};

    entries.forEach(entry => {
      // Count emotions
      if (entry.emotions) {
        entry.emotions.forEach(emotion => {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
      }

      // Count triggers
      if (entry.triggers) {
        entry.triggers.forEach(trigger => {
          triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
        });
      }
    });

    // Get top emotions and triggers
    const commonEmotions = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([emotion, count]) => ({ emotion, count }));

    const frequentTriggers = Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    // Create mood history for charts
    const moodHistory = entries.map(entry => ({
      date: entry.created_at,
      mood: entry.mood,
      energy: entry.energy,
      anxiety: entry.anxiety,
    }));

    return {
      averageMood: Math.round(averageMood * 10) / 10,
      moodTrend,
      averageEnergy: Math.round(averageEnergy * 10) / 10,
      averageAnxiety: Math.round(averageAnxiety * 10) / 10,
      commonEmotions,
      frequentTriggers,
      totalEntries: entries.length,
      moodHistory,
    };
  }

  // Get mood streak (consecutive days with mood entries)
  async getMoodStreak(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MOODS)
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(365); // Check last year

      if (error) throw error;

      let streak = 0;
      const today = new Date();
      const entries = data.map(entry => new Date(entry.created_at));

      // Check if there's an entry today or yesterday
      const hasToday = entries.some(date => this.isSameDay(date, today));
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const hasYesterday = entries.some(date => this.isSameDay(date, yesterday));

      if (!hasToday && !hasYesterday) {
        return { success: true, data: 0 };
      }

      // Count consecutive days
      let currentDate = hasToday ? new Date(today) : new Date(yesterday);
      
      while (true) {
        const hasEntry = entries.some(date => this.isSameDay(date, currentDate));
        if (hasEntry) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return { success: true, data: streak };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper function to check if two dates are the same day
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Get mood recommendations based on current mood and history
  getMoodRecommendations(currentMood, analytics) {
    const recommendations = [];

    if (currentMood <= 2) {
      recommendations.push({
        type: 'breathing',
        title: 'Try a breathing exercise',
        description: 'Deep breathing can help calm anxiety and improve mood',
        action: 'breathing_exercise'
      });
      
      recommendations.push({
        type: 'support',
        title: 'Connect with peers',
        description: 'Talking to others who understand can provide comfort',
        action: 'peer_support'
      });
    }

    if (currentMood >= 4) {
      recommendations.push({
        type: 'journal',
        title: 'Capture this moment',
        description: 'Journal about what\'s going well to remember for tough days',
        action: 'journal_entry'
      });
    }

    if (analytics?.moodTrend === 'declining') {
      recommendations.push({
        type: 'professional',
        title: 'Consider professional support',
        description: 'Your mood has been declining. A counselor might help',
        action: 'crisis_resources'
      });
    }

    return recommendations;
  }
}

export default new MoodService();