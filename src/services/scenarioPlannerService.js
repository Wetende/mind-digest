import { supabase } from '../config/supabase';

class ScenarioPlannerService {
  // Get available scenario templates
  async getScenarioTemplates(category = null) {
    try {
      let query = supabase
        .from('scenario_templates')
        .select('*')
        .eq('is_active', true)
        .order('difficulty_level', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create a personalized scenario plan
  async createScenarioPlan(userId, templateId, customizations = {}) {
    try {
      // Get the template
      const { data: template, error: templateError } = await supabase
        .from('scenario_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create personalized plan
      const plan = {
        user_id: userId,
        template_id: templateId,
        title: customizations.title || template.title,
        description: customizations.description || template.description,
        category: template.category,
        difficulty_level: template.difficulty_level,
        estimated_duration: template.estimated_duration,
        steps: this.personalizeSteps(template.steps, customizations),
        anxiety_level: customizations.anxietyLevel || 5,
        confidence_level: customizations.confidenceLevel || 5,
        custom_notes: customizations.notes || '',
        status: 'planned',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('scenario_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Personalize scenario steps based on user input
  personalizeSteps(templateSteps, customizations) {
    return templateSteps.map(step => ({
      ...step,
      // Add personalized elements based on anxiety level
      tips: this.getAnxietySpecificTips(step, customizations.anxietyLevel),
      alternatives: this.getAlternatives(step, customizations.anxietyLevel),
      // Add custom modifications if provided
      custom_modifications: customizations.stepModifications?.[step.id] || null
    }));
  }

  // Get anxiety-specific tips for each step
  getAnxietySpecificTips(step, anxietyLevel) {
    const baseTips = step.tips || [];
    
    if (anxietyLevel >= 7) {
      // High anxiety - add calming techniques
      return [
        ...baseTips,
        "Take 3 deep breaths before starting this step",
        "Remember: it's okay to take breaks if you feel overwhelmed",
        "Have a backup plan ready in case you need to step away"
      ];
    } else if (anxietyLevel >= 4) {
      // Moderate anxiety - add confidence boosters
      return [
        ...baseTips,
        "Remind yourself of past successes in similar situations",
        "Practice positive self-talk before and during this step"
      ];
    }
    
    return baseTips;
  }

  // Get alternative approaches for different anxiety levels
  getAlternatives(step, anxietyLevel) {
    const alternatives = [];
    
    if (anxietyLevel >= 7) {
      alternatives.push({
        type: 'low_pressure',
        description: 'Start with a shorter, less intense version of this step',
        modification: 'Reduce the duration or scope of this interaction'
      });
    }
    
    if (anxietyLevel >= 5) {
      alternatives.push({
        type: 'gradual_approach',
        description: 'Break this step into smaller, more manageable parts',
        modification: 'Practice each component separately before combining them'
      });
    }
    
    return alternatives;
  }

  // Get user's scenario plans
  async getUserScenarioPlans(userId, status = null) {
    try {
      let query = supabase
        .from('scenario_plans')
        .select(`
          *,
          template:scenario_templates(title, category, difficulty_level)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Start executing a scenario plan
  async startScenarioPlan(planId, userId) {
    try {
      const { data, error } = await supabase
        .from('scenario_plans')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          current_step: 0
        })
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Create initial progress entry
      await this.logStepProgress(planId, 0, 'started', {
        notes: 'Scenario plan started',
        confidence_before: data.confidence_level,
        anxiety_before: data.anxiety_level
      });

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Complete a step in the scenario plan
  async completeStep(planId, stepIndex, userId, progressData) {
    try {
      // Log step progress
      await this.logStepProgress(planId, stepIndex, 'completed', progressData);

      // Get the plan to check if this was the last step
      const { data: plan, error: planError } = await supabase
        .from('scenario_plans')
        .select('steps')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const isLastStep = stepIndex >= plan.steps.length - 1;
      const newStatus = isLastStep ? 'completed' : 'in_progress';
      const nextStep = isLastStep ? stepIndex : stepIndex + 1;

      // Update plan progress
      const { data, error } = await supabase
        .from('scenario_plans')
        .update({
          current_step: nextStep,
          status: newStatus,
          completed_at: isLastStep ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // If completed, calculate overall success metrics
      if (isLastStep) {
        await this.calculateScenarioSuccess(planId);
      }

      return { success: true, data, completed: isLastStep };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Log progress for a specific step
  async logStepProgress(planId, stepIndex, status, progressData) {
    try {
      const progress = {
        plan_id: planId,
        step_index: stepIndex,
        status,
        confidence_before: progressData.confidenceBefore,
        confidence_after: progressData.confidenceAfter,
        anxiety_before: progressData.anxietyBefore,
        anxiety_after: progressData.anxietyAfter,
        difficulty_experienced: progressData.difficultyExperienced,
        notes: progressData.notes || '',
        challenges_faced: progressData.challengesFaced || [],
        strategies_used: progressData.strategiesUsed || [],
        duration_minutes: progressData.durationMinutes,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('scenario_progress')
        .insert(progress)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Calculate overall scenario success metrics
  async calculateScenarioSuccess(planId) {
    try {
      // Get all progress entries for this plan
      const { data: progressEntries, error } = await supabase
        .from('scenario_progress')
        .select('*')
        .eq('plan_id', planId)
        .order('step_index', { ascending: true });

      if (error) throw error;

      if (progressEntries.length === 0) return;

      // Calculate metrics
      const firstEntry = progressEntries[0];
      const lastEntry = progressEntries[progressEntries.length - 1];

      const confidenceImprovement = (lastEntry.confidence_after || 0) - (firstEntry.confidence_before || 0);
      const anxietyReduction = (firstEntry.anxiety_before || 0) - (lastEntry.anxiety_after || 0);
      
      const avgDifficulty = progressEntries.reduce((sum, entry) => 
        sum + (entry.difficulty_experienced || 0), 0) / progressEntries.length;

      const totalDuration = progressEntries.reduce((sum, entry) => 
        sum + (entry.duration_minutes || 0), 0);

      // Determine success level
      let successLevel = 'completed';
      if (confidenceImprovement >= 2 && anxietyReduction >= 1) {
        successLevel = 'excellent';
      } else if (confidenceImprovement >= 1 || anxietyReduction >= 0) {
        successLevel = 'good';
      } else if (confidenceImprovement < 0 && anxietyReduction < -1) {
        successLevel = 'challenging';
      }

      // Update plan with success metrics
      await supabase
        .from('scenario_plans')
        .update({
          success_level: successLevel,
          confidence_improvement: confidenceImprovement,
          anxiety_reduction: anxietyReduction,
          avg_difficulty: Math.round(avgDifficulty * 10) / 10,
          total_duration: totalDuration
        })
        .eq('id', planId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get scenario progress analytics
  async getScenarioAnalytics(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: plans, error } = await supabase
        .from('scenario_plans')
        .select(`
          *,
          template:scenario_templates(category, difficulty_level),
          progress:scenario_progress(*)
        `)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Calculate analytics
      const analytics = {
        totalPlans: plans.length,
        completedPlans: plans.filter(p => p.status === 'completed').length,
        inProgressPlans: plans.filter(p => p.status === 'in_progress').length,
        avgConfidenceImprovement: 0,
        avgAnxietyReduction: 0,
        categoryBreakdown: {},
        difficultyBreakdown: {},
        successLevels: {
          excellent: 0,
          good: 0,
          completed: 0,
          challenging: 0
        }
      };

      const completedPlans = plans.filter(p => p.status === 'completed');
      
      if (completedPlans.length > 0) {
        analytics.avgConfidenceImprovement = completedPlans.reduce((sum, plan) => 
          sum + (plan.confidence_improvement || 0), 0) / completedPlans.length;
        
        analytics.avgAnxietyReduction = completedPlans.reduce((sum, plan) => 
          sum + (plan.anxiety_reduction || 0), 0) / completedPlans.length;

        // Success level breakdown
        completedPlans.forEach(plan => {
          if (plan.success_level && analytics.successLevels[plan.success_level] !== undefined) {
            analytics.successLevels[plan.success_level]++;
          }
        });
      }

      // Category and difficulty breakdown
      plans.forEach(plan => {
        const category = plan.template?.category || 'unknown';
        const difficulty = plan.template?.difficulty_level || 'unknown';
        
        analytics.categoryBreakdown[category] = (analytics.categoryBreakdown[category] || 0) + 1;
        analytics.difficultyBreakdown[difficulty] = (analytics.difficultyBreakdown[difficulty] || 0) + 1;
      });

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get recommended scenarios based on user progress
  async getRecommendedScenarios(userId) {
    try {
      // Get user's completed scenarios to understand their progress
      const { data: userPlans } = await supabase
        .from('scenario_plans')
        .select(`
          template_id,
          success_level,
          template:scenario_templates(category, difficulty_level)
        `)
        .eq('user_id', userId)
        .eq('status', 'completed');

      // Get user's current anxiety and confidence levels from latest mood entry
      const { data: latestMood } = await supabase
        .from('mood_entries')
        .select('anxiety_level, mood_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const currentAnxiety = latestMood?.anxiety_level || 5;
      const currentMood = latestMood?.mood_score || 5;

      // Determine appropriate difficulty level
      let recommendedDifficulty = 'beginner';
      if (userPlans && userPlans.length > 0) {
        const avgSuccess = userPlans.filter(p => ['excellent', 'good'].includes(p.success_level)).length / userPlans.length;
        if (avgSuccess > 0.7 && currentAnxiety < 6) {
          recommendedDifficulty = 'intermediate';
        }
        if (avgSuccess > 0.8 && currentAnxiety < 4) {
          recommendedDifficulty = 'advanced';
        }
      }

      // Get scenarios user hasn't completed
      const completedTemplateIds = userPlans ? userPlans.map(p => p.template_id) : [];
      
      let query = supabase
        .from('scenario_templates')
        .select('*')
        .eq('is_active', true)
        .eq('difficulty_level', recommendedDifficulty);

      if (completedTemplateIds.length > 0) {
        query = query.not('id', 'in', `(${completedTemplateIds.join(',')})`);
      }

      const { data: recommendations, error } = await query.limit(5);
      if (error) throw error;

      // Add recommendation reasons
      const reasonedRecommendations = recommendations.map(scenario => ({
        ...scenario,
        recommendationReason: this.getRecommendationReason(scenario, currentAnxiety, currentMood, userPlans),
        suitabilityScore: this.calculateSuitabilityScore(scenario, currentAnxiety, currentMood)
      }));

      // Sort by suitability score
      reasonedRecommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

      return { success: true, data: reasonedRecommendations };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get recommendation reason
  getRecommendationReason(scenario, anxietyLevel, moodScore, userPlans) {
    const reasons = [];

    if (scenario.difficulty_level === 'beginner' && anxietyLevel >= 6) {
      reasons.push('Good starting point for managing anxiety');
    }

    if (scenario.category === 'workplace' && moodScore < 6) {
      reasons.push('Can help improve confidence in professional settings');
    }

    if (scenario.category === 'social' && anxietyLevel >= 5) {
      reasons.push('Builds social confidence gradually');
    }

    if (userPlans && userPlans.length === 0) {
      reasons.push('Perfect for getting started with scenario planning');
    }

    return reasons.length > 0 ? reasons[0] : 'Matches your current skill level';
  }

  // Calculate suitability score
  calculateSuitabilityScore(scenario, anxietyLevel, moodScore) {
    let score = 0.5; // Base score

    // Adjust for anxiety level
    if (scenario.difficulty_level === 'beginner' && anxietyLevel >= 6) score += 0.3;
    if (scenario.difficulty_level === 'intermediate' && anxietyLevel >= 3 && anxietyLevel <= 6) score += 0.2;
    if (scenario.difficulty_level === 'advanced' && anxietyLevel <= 4) score += 0.1;

    // Adjust for mood
    if (moodScore >= 7) score += 0.2;
    if (moodScore <= 4) score -= 0.1;

    // Category-specific adjustments
    if (scenario.category === 'social' && anxietyLevel >= 5) score += 0.1;
    if (scenario.category === 'workplace' && moodScore < 6) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  // Pause a scenario plan
  async pauseScenarioPlan(planId, userId, reason = '') {
    try {
      const { data, error } = await supabase
        .from('scenario_plans')
        .update({
          status: 'paused',
          pause_reason: reason,
          paused_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Resume a paused scenario plan
  async resumeScenarioPlan(planId, userId) {
    try {
      const { data, error } = await supabase
        .from('scenario_plans')
        .update({
          status: 'in_progress',
          pause_reason: null,
          paused_at: null,
          resumed_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ScenarioPlannerService();