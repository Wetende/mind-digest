import { supabase } from '../config/supabase';

class MeditationService {
  constructor() {
    this.sessionTypes = {
      BREATHING: 'breathing',
      MEDITATION: 'meditation',
      MINDFULNESS: 'mindfulness',
      BODY_SCAN: 'body_scan',
      VISUALIZATION: 'visualization'
    };

    this.breathingExercises = {
      BOX: {
        id: 'box',
        name: 'Box Breathing',
        description: 'Inhale 4, Hold 4, Exhale 4, Hold 4',
        duration: 300, // 5 minutes default
        phases: [
          { name: 'inhale', duration: 4, instruction: 'Breathe In' },
          { name: 'hold', duration: 4, instruction: 'Hold' },
          { name: 'exhale', duration: 4, instruction: 'Breathe Out' },
          { name: 'hold', duration: 4, instruction: 'Hold' },
        ],
        benefits: ['Reduces anxiety', 'Improves focus', 'Calms nervous system'],
        difficulty: 'beginner'
      },
      FOUR_SEVEN_EIGHT: {
        id: '478',
        name: '4-7-8 Breathing',
        description: 'Inhale 4, Hold 7, Exhale 8',
        duration: 240, // 4 minutes default
        phases: [
          { name: 'inhale', duration: 4, instruction: 'Breathe In' },
          { name: 'hold', duration: 7, instruction: 'Hold' },
          { name: 'exhale', duration: 8, instruction: 'Breathe Out' },
        ],
        benefits: ['Promotes sleep', 'Reduces stress', 'Lowers heart rate'],
        difficulty: 'intermediate'
      },
      SIMPLE: {
        id: 'simple',
        name: 'Simple Breathing',
        description: 'Inhale 5, Exhale 5',
        duration: 300, // 5 minutes default
        phases: [
          { name: 'inhale', duration: 5, instruction: 'Breathe In' },
          { name: 'exhale', duration: 5, instruction: 'Breathe Out' },
        ],
        benefits: ['Easy to learn', 'Quick stress relief', 'Improves mood'],
        difficulty: 'beginner'
      }
    };

    this.guidedMeditations = {
      ANXIETY_RELIEF: {
        id: 'anxiety_relief',
        name: 'Anxiety Relief',
        description: 'Gentle meditation to calm anxious thoughts',
        duration: 600, // 10 minutes
        script: [
          { time: 0, text: "Find a comfortable position and close your eyes..." },
          { time: 30, text: "Notice your breath, without trying to change it..." },
          { time: 90, text: "If anxious thoughts arise, acknowledge them gently..." },
          { time: 180, text: "Imagine a peaceful place where you feel safe..." },
          { time: 300, text: "Feel the calm spreading through your body..." },
          { time: 480, text: "Take three deep breaths as we prepare to finish..." },
          { time: 570, text: "When you're ready, slowly open your eyes..." }
        ],
        benefits: ['Reduces anxiety', 'Promotes relaxation', 'Improves emotional regulation'],
        difficulty: 'beginner'
      },
      BODY_SCAN: {
        id: 'body_scan',
        name: 'Body Scan Relaxation',
        description: 'Progressive relaxation from head to toe',
        duration: 900, // 15 minutes
        script: [
          { time: 0, text: "Lie down comfortably and close your eyes..." },
          { time: 60, text: "Start by noticing the top of your head..." },
          { time: 120, text: "Move your attention to your forehead and eyes..." },
          { time: 240, text: "Notice your shoulders and let them drop..." },
          { time: 360, text: "Feel your arms and hands, letting them relax..." },
          { time: 480, text: "Bring attention to your chest and breathing..." },
          { time: 600, text: "Notice your stomach and lower back..." },
          { time: 720, text: "Feel your legs and feet, releasing all tension..." },
          { time: 840, text: "Take a moment to feel your whole body relaxed..." }
        ],
        benefits: ['Deep relaxation', 'Body awareness', 'Stress relief'],
        difficulty: 'beginner'
      }
    };
  }

  // Get all available breathing exercises
  getBreathingExercises() {
    return Object.values(this.breathingExercises);
  }

  // Get all available guided meditations
  getGuidedMeditations() {
    return Object.values(this.guidedMeditations);
  }

  // Get specific exercise by ID
  getExerciseById(id) {
    const exerciseMap = {
      'box': 'BOX',
      '478': 'FOUR_SEVEN_EIGHT',
      'simple': 'SIMPLE'
    };
    
    const key = exerciseMap[id] || id.toUpperCase();
    return this.breathingExercises[key] || null;
  }

  // Get specific meditation by ID
  getMeditationById(id) {
    return this.guidedMeditations[id.toUpperCase()] || null;
  }

  // Start a meditation session
  async startSession(userId, exerciseId, exerciseType = 'breathing') {
    try {
      const sessionData = {
        user_id: userId,
        exercise_id: exerciseId,
        exercise_type: exerciseType,
        started_at: new Date().toISOString(),
        status: 'active'
      };

      const { data, error } = await supabase
        .from('meditation_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) {
        console.error('Error starting meditation session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error starting meditation session:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete a meditation session
  async completeSession(sessionId, duration, cyclesCompleted = 0, effectiveness = null) {
    try {
      const updateData = {
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        cycles_completed: cyclesCompleted,
        effectiveness_rating: effectiveness,
        status: 'completed'
      };

      const { data, error } = await supabase
        .from('meditation_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error completing meditation session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error completing meditation session:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's meditation history
  async getUserSessions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('meditation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user sessions:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's meditation statistics
  async getUserStats(userId) {
    try {
      const { data, error } = await supabase
        .from('meditation_sessions')
        .select('duration_seconds, exercise_type, effectiveness_rating, started_at')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching user stats:', error);
        return { success: false, error: error.message };
      }

      const sessions = data || [];
      const totalSessions = sessions.length;
      const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) / 60);
      
      // Calculate streak (consecutive days with at least one session)
      const sessionDates = [...new Set(sessions.map(s => s.started_at.split('T')[0]))].sort().reverse();
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = new Date(today);
      
      for (let i = 0; i < sessionDates.length; i++) {
        const sessionDate = sessionDates[i];
        const checkDateStr = checkDate.toISOString().split('T')[0];
        
        if (sessionDate === checkDateStr) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0 && sessionDate !== today) {
          // No session today, but check if there was one yesterday
          checkDate.setDate(checkDate.getDate() - 1);
          if (sessionDate === checkDate.toISOString().split('T')[0]) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Average effectiveness rating
      const ratingsWithValues = sessions.filter(s => s.effectiveness_rating !== null);
      const averageEffectiveness = ratingsWithValues.length > 0 
        ? ratingsWithValues.reduce((sum, s) => sum + s.effectiveness_rating, 0) / ratingsWithValues.length
        : null;

      // Most used exercise type
      const exerciseTypeCounts = sessions.reduce((counts, session) => {
        counts[session.exercise_type] = (counts[session.exercise_type] || 0) + 1;
        return counts;
      }, {});
      
      const mostUsedType = Object.keys(exerciseTypeCounts).reduce((a, b) => 
        exerciseTypeCounts[a] > exerciseTypeCounts[b] ? a : b, 'breathing'
      );

      return {
        success: true,
        data: {
          totalSessions,
          totalMinutes,
          currentStreak,
          averageEffectiveness: averageEffectiveness ? Math.round(averageEffectiveness * 10) / 10 : null,
          mostUsedType,
          exerciseTypeCounts
        }
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Get personalized recommendations based on user history and mood
  async getPersonalizedRecommendations(userId, currentMood = null) {
    try {
      const statsResult = await this.getUserStats(userId);
      const stats = statsResult.success ? statsResult.data : null;

      let recommendations = [];

      // Base recommendations on mood
      if (currentMood) {
        if (currentMood <= 2) { // Low mood or anxious
          recommendations.push({
            type: 'breathing',
            exercise: this.breathingExercises.FOUR_SEVEN_EIGHT,
            reason: 'Great for calming anxiety and promoting relaxation'
          });
          recommendations.push({
            type: 'meditation',
            exercise: this.guidedMeditations.ANXIETY_RELIEF,
            reason: 'Specifically designed to help with anxious thoughts'
          });
        } else if (currentMood >= 4) { // Good mood
          recommendations.push({
            type: 'breathing',
            exercise: this.breathingExercises.BOX,
            reason: 'Maintain your positive state with focused breathing'
          });
          recommendations.push({
            type: 'meditation',
            exercise: this.guidedMeditations.BODY_SCAN,
            reason: 'Deepen your sense of well-being and body awareness'
          });
        } else { // Neutral mood
          recommendations.push({
            type: 'breathing',
            exercise: this.breathingExercises.SIMPLE,
            reason: 'A gentle way to center yourself'
          });
        }
      }

      // Add variety based on usage patterns
      if (stats && stats.mostUsedType === 'breathing') {
        recommendations.push({
          type: 'meditation',
          exercise: this.guidedMeditations.BODY_SCAN,
          reason: 'Try something new - guided meditation can complement your breathing practice'
        });
      } else if (stats && stats.mostUsedType === 'meditation') {
        recommendations.push({
          type: 'breathing',
          exercise: this.breathingExercises.BOX,
          reason: 'Mix it up with some focused breathing exercises'
        });
      }

      // Default recommendations if no specific data
      if (recommendations.length === 0) {
        recommendations = [
          {
            type: 'breathing',
            exercise: this.breathingExercises.SIMPLE,
            reason: 'Perfect for beginners - easy to learn and very effective'
          },
          {
            type: 'breathing',
            exercise: this.breathingExercises.BOX,
            reason: 'A classic technique used by professionals for stress management'
          }
        ];
      }

      return { success: true, data: recommendations.slice(0, 3) }; // Return top 3
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Rate session effectiveness (1-5 scale)
  async rateSessionEffectiveness(sessionId, rating) {
    try {
      const { data, error } = await supabase
        .from('meditation_sessions')
        .update({ effectiveness_rating: rating })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error rating session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error rating session:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new MeditationService();