import { ENV } from '../config/env';

class AIService {
  constructor() {
    this.provider = this.detectProvider();
  }

  detectProvider() {
    if (ENV.HUGGINGFACE_API_KEY && ENV.HUGGINGFACE_API_KEY !== 'your_huggingface_token') {
      return 'huggingface';
    }
    if (ENV.GOOGLE_AI_API_KEY && ENV.GOOGLE_AI_API_KEY !== 'your_google_ai_key') {
      return 'google';
    }
    if (ENV.OPENAI_API_KEY && ENV.OPENAI_API_KEY !== 'your_openai_api_key') {
      return 'openai';
    }
    return 'mock'; // Fallback for development
  }

  // Analyze journal entry for mood and insights
  async analyzeJournalEntry(text) {
    try {
      switch (this.provider) {
        case 'huggingface':
          return await this.analyzeWithHuggingFace(text);
        case 'google':
          return await this.analyzeWithGoogle(text);
        case 'openai':
          return await this.analyzeWithOpenAI(text);
        default:
          return this.getMockAnalysis(text);
      }
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return this.getMockAnalysis(text);
    }
  }

  // Hugging Face implementation
  async analyzeWithHuggingFace(text) {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    const result = await response.json();
    return this.processHuggingFaceResult(result, text);
  }

  processHuggingFaceResult(result, originalText) {
    const sentiment = result[0];
    const positiveScore = sentiment.find(s => s.label === 'LABEL_2')?.score || 0;
    const negativeScore = sentiment.find(s => s.label === 'LABEL_0')?.score || 0;
    
    return {
      sentiment: positiveScore > negativeScore ? positiveScore : -negativeScore,
      mood: Math.round((positiveScore * 5) + 1),
      keyThemes: this.extractKeywords(originalText),
      recommendations: this.generateRecommendations(positiveScore > negativeScore),
    };
  }

  // Mock analysis for development
  getMockAnalysis(text) {
    const words = text.toLowerCase();
    let sentiment = 0;
    
    // Simple keyword-based sentiment
    const positiveWords = ['good', 'great', 'happy', 'better', 'calm', 'peaceful'];
    const negativeWords = ['bad', 'sad', 'anxious', 'worried', 'stressed', 'difficult'];
    
    positiveWords.forEach(word => {
      if (words.includes(word)) sentiment += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (words.includes(word)) sentiment -= 0.2;
    });

    return {
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      mood: Math.round(((sentiment + 1) * 2.5) + 1),
      keyThemes: this.extractKeywords(text),
      recommendations: this.generateRecommendations(sentiment > 0),
    };
  }

  extractKeywords(text) {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'you', 'he', 'she', 'it', 'we', 'they'];
    
    return words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5);
  }

  generateRecommendations(isPositive) {
    if (isPositive) {
      return [
        'Keep up the positive momentum!',
        'Consider sharing your good mood with the community',
        'Try a gratitude exercise to maintain this feeling'
      ];
    } else {
      return [
        'Consider trying a breathing exercise',
        'Reach out to peer support if you need to talk',
        'Remember that difficult feelings are temporary'
      ];
    }
  }

  // Generate wellness plan insights based on user data
  async generateWellnessInsights(context) {
    try {
      switch (this.provider) {
        case 'huggingface':
        case 'google':
        case 'openai':
          // For now, use rule-based insights until AI integration is fully configured
          return this.generateRuleBasedWellnessInsights(context);
        default:
          return this.generateRuleBasedWellnessInsights(context);
      }
    } catch (error) {
      console.error('AI Wellness Insights failed:', error);
      return this.generateRuleBasedWellnessInsights(context);
    }
  }

  // Generate rule-based wellness insights
  generateRuleBasedWellnessInsights(context) {
    const { goals, moodTrend, averageMood, commonEmotions, frequentTriggers } = context;
    
    const insights = {
      recommendations: [],
      riskFactors: [],
      strengths: [],
      focusAreas: [],
      adaptationSuggestions: []
    };

    // Analyze goals
    const goalText = goals.join(' ').toLowerCase();
    
    // Generate recommendations based on goals
    if (goalText.includes('anxiety')) {
      insights.recommendations.push(
        'Practice daily breathing exercises to manage anxiety symptoms',
        'Use the Social Ease Toolkit to build confidence in social situations',
        'Keep an anxiety journal to identify patterns and triggers'
      );
      insights.focusAreas.push('Anxiety management', 'Stress reduction');
    }

    if (goalText.includes('mood') || goalText.includes('depression')) {
      insights.recommendations.push(
        'Engage in daily gratitude practice to improve mood',
        'Include physical activity in your routine for natural mood boosting',
        'Connect with peer support when feeling low'
      );
      insights.focusAreas.push('Mood regulation', 'Emotional wellness');
    }

    if (goalText.includes('social')) {
      insights.recommendations.push(
        'Practice conversation starters daily',
        'Use role-play scenarios to build social confidence',
        'Set small social interaction goals each week'
      );
      insights.focusAreas.push('Social skills', 'Confidence building');
    }

    // Analyze mood trends
    if (moodTrend === 'declining') {
      insights.riskFactors.push('Recent declining mood trend');
      insights.recommendations.push('Consider increasing support activities and monitoring mood more closely');
      insights.adaptationSuggestions.push('Reduce task difficulty temporarily', 'Add more mood-boosting activities');
    } else if (moodTrend === 'improving') {
      insights.strengths.push('Positive mood trend showing improvement');
      insights.adaptationSuggestions.push('Gradually increase challenge level', 'Build on current momentum');
    }

    // Analyze average mood
    if (averageMood < 3) {
      insights.riskFactors.push('Low average mood levels');
      insights.recommendations.push('Focus on mood-lifting activities and consider professional support');
    } else if (averageMood > 4) {
      insights.strengths.push('Generally positive mood levels');
    }

    // Analyze common emotions
    if (commonEmotions?.length > 0) {
      const negativeEmotions = ['anxious', 'sad', 'worried', 'stressed', 'overwhelmed'];
      const hasNegativeEmotions = commonEmotions.some(emotion => 
        negativeEmotions.some(neg => emotion.emotion?.toLowerCase().includes(neg))
      );
      
      if (hasNegativeEmotions) {
        insights.focusAreas.push('Emotional regulation');
        insights.recommendations.push('Practice mindfulness to better manage difficult emotions');
      }
    }

    // Analyze frequent triggers
    if (frequentTriggers?.length > 0) {
      insights.focusAreas.push('Trigger management');
      insights.recommendations.push('Develop coping strategies for identified triggers');
      insights.adaptationSuggestions.push('Include trigger-specific exercises in your plan');
    }

    // Default strengths and recommendations
    if (insights.strengths.length === 0) {
      insights.strengths.push('Commitment to personal growth', 'Proactive approach to mental health');
    }

    if (insights.recommendations.length === 0) {
      insights.recommendations.push(
        'Start with small, consistent daily practices',
        'Focus on building sustainable habits',
        'Celebrate small victories along the way'
      );
    }

    if (insights.focusAreas.length === 0) {
      insights.focusAreas.push('Habit formation', 'Self-awareness');
    }

    if (insights.adaptationSuggestions.length === 0) {
      insights.adaptationSuggestions.push(
        'Adjust task difficulty based on daily mood',
        'Add variety to prevent routine boredom',
        'Increase social activities if feeling isolated'
      );
    }

    return insights;
  }
}

export default new AIService();