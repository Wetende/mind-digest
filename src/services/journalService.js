import { supabase } from '../config/supabase';
import { TABLES } from '../config/supabase';
import aiService from './aiService';
import habitTrackingService from './habitTrackingService';

class JournalService {
  // Create a new journal entry
  async createEntry(entryData) {
    try {
      // Get AI analysis first
      const aiAnalysis = await aiService.analyzeJournalEntry(entryData.content);
      
      const { data, error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .insert([{
          user_id: entryData.userId,
          content: entryData.content,
          mood: entryData.mood,
          emotions: entryData.emotions || [],
          triggers: entryData.triggers || [],
          ai_insights: aiAnalysis,
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) throw error;

      // Award points for journal entry
      if (data && data[0]) {
        try {
          await habitTrackingService.awardPoints(
            entryData.userId,
            'JOURNAL_ENTRY',
            {
              wordCount: entryData.content.length,
              hasMood: !!entryData.mood,
              hasEmotions: entryData.emotions && entryData.emotions.length > 0,
              hasAIInsights: !!aiAnalysis,
            }
          );
        } catch (pointsError) {
          console.warn('Failed to award points for journal entry, but entry was saved:', pointsError);
          // Don't fail the journal entry if points fail
        }
      }

      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get journal entries for a user
  async getEntries(userId, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
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

  // Update journal entry
  async updateEntry(entryId, updates) {
    try {
      // Re-analyze if content changed
      if (updates.content) {
        const aiAnalysis = await aiService.analyzeJournalEntry(updates.content);
        updates.ai_insights = aiAnalysis;
      }

      const { data, error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .update(updates)
        .eq('id', entryId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete journal entry
  async deleteEntry(entryId) {
    try {
      const { error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get journal insights and trends
  async getInsights(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .select('mood, emotions, triggers, ai_insights, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process insights
      const insights = this.processJournalInsights(data);
      return { success: true, data: insights };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Process journal data for insights
  processJournalInsights(entries) {
    if (!entries || entries.length === 0) {
      return {
        averageMood: 0,
        moodTrend: 'stable',
        commonEmotions: [],
        frequentTriggers: [],
        keyThemes: [],
        totalEntries: 0,
      };
    }

    // Calculate average mood
    const averageMood = entries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / entries.length;

    // Find mood trend
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
    const allThemes = [];

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

      // Collect AI themes
      if (entry.ai_insights && entry.ai_insights.keyThemes) {
        allThemes.push(...entry.ai_insights.keyThemes);
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

    // Get key themes
    const themeCounts = {};
    allThemes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const keyThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    return {
      averageMood: Math.round(averageMood * 10) / 10,
      moodTrend,
      commonEmotions,
      frequentTriggers,
      keyThemes,
      totalEntries: entries.length,
    };
  }

  // Export journal data for healthcare providers
  async exportData(userId, format = 'json') {
    try {
      const { data, error } = await supabase
        .from(TABLES.JOURNAL_ENTRIES)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (format === 'csv') {
        return { success: true, data: this.convertToCSV(data) };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convert journal data to CSV format
  convertToCSV(entries) {
    if (!entries || entries.length === 0) return '';

    const headers = ['Date', 'Mood', 'Content', 'Emotions', 'Triggers', 'AI Sentiment'];
    const rows = entries.map(entry => [
      new Date(entry.created_at).toLocaleDateString(),
      entry.mood || '',
      `"${(entry.content || '').replace(/"/g, '""')}"`,
      (entry.emotions || []).join('; '),
      (entry.triggers || []).join('; '),
      entry.ai_insights?.sentiment || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export default new JournalService();