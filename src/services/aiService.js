import { ENV } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AIService {
  constructor() {
    this.provider = this.detectProvider();
    this.localModels = new Map();
    this.cache = new Map();
    this.initializeLocalInference();
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

  async initializeLocalInference() {
    try {
      // Initialize TensorFlow.js for local inference
      if (typeof require !== 'undefined') {
        const tf = require('@tensorflow/tfjs');
        await tf.ready();
        console.log('TensorFlow.js initialized for local inference');
      }
    } catch (error) {
      console.warn('Local inference not available:', error);
    }
  }

  // Analyze journal entry for mood and insights
  async analyzeJournalEntry(text, useLocal = false) {
    try {
      // Check cache first
      const cacheKey = `journal_${this.hashText(text)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        return cached.data;
      }

      let result;
      if (useLocal) {
        result = await this.analyzeLocalSentiment(text);
      } else {
        switch (this.provider) {
          case 'huggingface':
            result = await this.analyzeWithHuggingFace(text);
            break;
          case 'google':
            result = await this.analyzeWithGoogle(text);
            break;
          case 'openai':
            result = await this.analyzeWithOpenAI(text);
            break;
          default:
            result = this.getMockAnalysis(text);
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return this.getMockAnalysis(text);
    }
  }

  // Hugging Face implementation for sentiment analysis
  async analyzeWithHuggingFace(text) {
    const sentimentResponse = await fetch(
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

    const sentimentResult = await sentimentResponse.json();
    
    // Also analyze for mental health specific insights
    const emotionResponse = await fetch(
      'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    const emotionResult = await emotionResponse.json();
    
    return this.processHuggingFaceResult(sentimentResult, emotionResult, text);
  }

  processHuggingFaceResult(sentimentResult, emotionResult, originalText) {
    const sentiment = sentimentResult[0] || [];
    const emotions = emotionResult[0] || [];
    
    const positiveScore = sentiment.find(s => s.label === 'LABEL_2')?.score || 0;
    const negativeScore = sentiment.find(s => s.label === 'LABEL_0')?.score || 0;
    const neutralScore = sentiment.find(s => s.label === 'LABEL_1')?.score || 0;
    
    // Get dominant emotions
    const dominantEmotions = emotions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(e => ({ emotion: e.label, confidence: e.score }));
    
    const sentimentScore = positiveScore > negativeScore ? positiveScore : -negativeScore;
    
    return {
      sentiment: sentimentScore,
      mood: Math.round(((sentimentScore + 1) * 2.5) + 1), // Convert to 1-10 scale
      emotions: dominantEmotions,
      keyThemes: this.extractKeywords(originalText),
      recommendations: this.generateContextualRecommendations(sentimentScore, dominantEmotions),
      triggers: this.identifyTriggers(originalText, dominantEmotions),
      riskLevel: this.assessRiskLevel(sentimentScore, dominantEmotions, originalText)
    };
  }

  // Content moderation using Hugging Face
  async moderateContent(text, contentType = 'chat') {
    try {
      if (this.provider === 'huggingface') {
        return await this.moderateWithHuggingFace(text, contentType);
      } else {
        return this.getMockModeration(text);
      }
    } catch (error) {
      console.error('Content moderation failed:', error);
      return this.getMockModeration(text);
    }
  }

  async moderateWithHuggingFace(text, contentType) {
    // Use toxicity detection model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/unitary/toxic-bert',
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
    const toxicScore = result[0]?.find(r => r.label === 'TOXIC')?.score || 0;
    
    return {
      isAppropriate: toxicScore < 0.7,
      toxicityScore: toxicScore,
      flags: this.identifyContentFlags(text, toxicScore),
      action: this.determineContentAction(toxicScore, contentType),
      reason: toxicScore > 0.7 ? 'Content flagged as potentially harmful' : null
    };
  }

  getMockModeration(text) {
    const inappropriateWords = [
      'hate', 'kill', 'die', 'suicide', 'harm', 'hurt', 'violence',
      'abuse', 'threat', 'dangerous', 'weapon'
    ];
    
    const lowerText = text.toLowerCase();
    const hasInappropriate = inappropriateWords.some(word => lowerText.includes(word));
    
    return {
      isAppropriate: !hasInappropriate,
      toxicityScore: hasInappropriate ? 0.8 : 0.1,
      flags: hasInappropriate ? ['inappropriate_language'] : [],
      action: hasInappropriate ? 'flag_for_review' : 'approve',
      reason: hasInappropriate ? 'Content contains potentially harmful language' : null
    };
  }

  // Crisis detection using mental health-specific models
  async detectCrisis(text, userContext = {}) {
    try {
      const crisisKeywords = [
        'suicide', 'kill myself', 'end it all', 'not worth living',
        'want to die', 'better off dead', 'can\'t go on', 'hopeless',
        'self harm', 'hurt myself', 'cut myself', 'overdose'
      ];
      
      const lowerText = text.toLowerCase();
      const hasCrisisKeywords = crisisKeywords.some(keyword => 
        lowerText.includes(keyword)
      );
      
      let riskLevel = 'low';
      let confidence = 0.1;
      
      if (hasCrisisKeywords) {
        riskLevel = 'high';
        confidence = 0.9;
      } else if (this.provider === 'huggingface') {
        // Use emotion analysis to detect distress
        const emotionAnalysis = await this.analyzeEmotions(text);
        const distressEmotions = ['sadness', 'fear', 'anger'];
        const distressScore = emotionAnalysis
          .filter(e => distressEmotions.includes(e.emotion.toLowerCase()))
          .reduce((sum, e) => sum + e.confidence, 0);
        
        if (distressScore > 0.7) {
          riskLevel = 'medium';
          confidence = distressScore;
        }
      }
      
      return {
        riskLevel,
        confidence,
        triggers: this.identifyTriggers(text),
        recommendations: this.getCrisisRecommendations(riskLevel),
        requiresIntervention: riskLevel === 'high',
        emergencyContacts: riskLevel === 'high' ? this.getEmergencyContacts() : null
      };
    } catch (error) {
      console.error('Crisis detection failed:', error);
      return {
        riskLevel: 'unknown',
        confidence: 0,
        triggers: [],
        recommendations: ['Consider reaching out to a mental health professional'],
        requiresIntervention: false,
        emergencyContacts: null
      };
    }
  }

  async analyzeEmotions(text) {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
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
      return result[0]?.map(e => ({
        emotion: e.label,
        confidence: e.score
      })) || [];
    } catch (error) {
      console.error('Emotion analysis failed:', error);
      return [];
    }
  }

  // Local inference for privacy-sensitive analysis
  async analyzeLocalSentiment(text) {
    try {
      // Simple rule-based analysis for local inference
      const words = text.toLowerCase().split(/\W+/);
      
      const positiveWords = [
        'good', 'great', 'happy', 'better', 'calm', 'peaceful', 'joy',
        'love', 'hope', 'grateful', 'blessed', 'amazing', 'wonderful'
      ];
      
      const negativeWords = [
        'bad', 'sad', 'anxious', 'worried', 'stressed', 'difficult',
        'depressed', 'hopeless', 'angry', 'frustrated', 'overwhelmed'
      ];
      
      let positiveScore = 0;
      let negativeScore = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });
      
      const totalWords = words.length;
      const sentiment = (positiveScore - negativeScore) / Math.max(totalWords, 1);
      
      return {
        sentiment: Math.max(-1, Math.min(1, sentiment)),
        mood: Math.round(((sentiment + 1) * 2.5) + 1),
        keyThemes: this.extractKeywords(text),
        recommendations: this.generateContextualRecommendations(sentiment, []),
        isLocal: true
      };
    } catch (error) {
      console.error('Local sentiment analysis failed:', error);
      return this.getMockAnalysis(text);
    }
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

  // Connect AI analysis to mood tracking and pattern recognition
  async analyzeMoodPatterns(moodHistory, journalEntries = []) {
    try {
      const patterns = {
        trends: this.identifyMoodTrends(moodHistory),
        triggers: this.identifyCommonTriggers(journalEntries),
        cycles: this.detectMoodCycles(moodHistory),
        correlations: this.findMoodCorrelations(moodHistory, journalEntries),
        predictions: this.predictMoodTrends(moodHistory)
      };
      
      return {
        patterns,
        insights: this.generatePatternInsights(patterns),
        recommendations: this.generatePatternRecommendations(patterns),
        riskAssessment: this.assessMoodRisk(patterns)
      };
    } catch (error) {
      console.error('Mood pattern analysis failed:', error);
      return {
        patterns: {},
        insights: ['Unable to analyze patterns at this time'],
        recommendations: ['Continue tracking your mood daily'],
        riskAssessment: { level: 'unknown', factors: [] }
      };
    }
  }

  identifyMoodTrends(moodHistory) {
    if (moodHistory.length < 7) return { trend: 'insufficient_data' };
    
    const recent = moodHistory.slice(-7);
    const older = moodHistory.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, m) => sum + m.mood, 0) / recent.length;
    const olderAvg = older.length > 0 ? 
      older.reduce((sum, m) => sum + m.mood, 0) / older.length : recentAvg;
    
    const change = recentAvg - olderAvg;
    
    return {
      trend: change > 0.5 ? 'improving' : change < -0.5 ? 'declining' : 'stable',
      change: change,
      recentAverage: recentAvg,
      previousAverage: olderAvg
    };
  }

  identifyCommonTriggers(journalEntries) {
    const triggerWords = [
      'work', 'stress', 'family', 'relationship', 'money', 'health',
      'social', 'anxiety', 'pressure', 'deadline', 'conflict', 'change'
    ];
    
    const triggerCounts = {};
    
    journalEntries.forEach(entry => {
      if (entry.mood < 4) { // Low mood entries
        const text = entry.content.toLowerCase();
        triggerWords.forEach(trigger => {
          if (text.includes(trigger)) {
            triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, frequency: count }));
  }

  detectMoodCycles(moodHistory) {
    // Simple weekly pattern detection
    if (moodHistory.length < 14) return { hasPattern: false };
    
    const dayOfWeekMoods = {};
    
    moodHistory.forEach(entry => {
      const day = new Date(entry.timestamp).getDay();
      if (!dayOfWeekMoods[day]) dayOfWeekMoods[day] = [];
      dayOfWeekMoods[day].push(entry.mood);
    });
    
    const dayAverages = {};
    Object.keys(dayOfWeekMoods).forEach(day => {
      const moods = dayOfWeekMoods[day];
      dayAverages[day] = moods.reduce((sum, m) => sum + m, 0) / moods.length;
    });
    
    return {
      hasPattern: true,
      weeklyPattern: dayAverages,
      bestDay: Object.keys(dayAverages).reduce((a, b) => 
        dayAverages[a] > dayAverages[b] ? a : b
      ),
      worstDay: Object.keys(dayAverages).reduce((a, b) => 
        dayAverages[a] < dayAverages[b] ? a : b
      )
    };
  }

  extractKeywords(text) {
    // Enhanced keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do',
      'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
    ];
    
    const mentalHealthKeywords = [
      'anxiety', 'depression', 'stress', 'mood', 'therapy', 'counseling',
      'medication', 'panic', 'worry', 'fear', 'sad', 'happy', 'angry',
      'frustrated', 'overwhelmed', 'calm', 'peaceful', 'hopeful'
    ];
    
    const keywords = words
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
    
    // Prioritize mental health related keywords
    const sortedKeywords = Object.entries(keywords)
      .sort(([a, countA], [b, countB]) => {
        const aIsMH = mentalHealthKeywords.includes(a);
        const bIsMH = mentalHealthKeywords.includes(b);
        if (aIsMH && !bIsMH) return -1;
        if (!aIsMH && bIsMH) return 1;
        return countB - countA;
      })
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedKeywords;
  }

  generateContextualRecommendations(sentiment, emotions) {
    const recommendations = [];
    
    if (sentiment < -0.5) {
      recommendations.push('Consider trying a breathing exercise to help manage difficult feelings');
      recommendations.push('Reach out to peer support if you need someone to talk to');
      recommendations.push('Remember that difficult feelings are temporary and will pass');
    } else if (sentiment > 0.5) {
      recommendations.push('Great to see you\'re feeling positive! Keep up the good momentum');
      recommendations.push('Consider sharing your positive energy with the community');
      recommendations.push('Try a gratitude exercise to maintain this feeling');
    } else {
      recommendations.push('Consider engaging in a mindfulness exercise');
      recommendations.push('Check in with your wellness plan for today\'s activities');
    }
    
    // Add emotion-specific recommendations
    emotions.forEach(emotion => {
      if (emotion.confidence > 0.6) {
        switch (emotion.emotion.toLowerCase()) {
          case 'anxiety':
          case 'fear':
            recommendations.push('Try the breathing exercises in your toolkit');
            break;
          case 'sadness':
            recommendations.push('Consider connecting with supportive peers');
            break;
          case 'anger':
            recommendations.push('Take some time for self-care and reflection');
            break;
          case 'joy':
          case 'happiness':
            recommendations.push('Celebrate this positive moment!');
            break;
        }
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  generateRecommendations(isPositive) {
    return this.generateContextualRecommendations(isPositive ? 0.7 : -0.7, []);
  }

  identifyTriggers(text, emotions = []) {
    const triggerKeywords = {
      'work_stress': ['work', 'job', 'boss', 'deadline', 'meeting', 'project'],
      'social_anxiety': ['social', 'people', 'crowd', 'party', 'presentation'],
      'relationship': ['relationship', 'partner', 'family', 'friend', 'conflict'],
      'health': ['health', 'sick', 'pain', 'doctor', 'medical'],
      'financial': ['money', 'financial', 'bills', 'debt', 'expensive'],
      'change': ['change', 'new', 'different', 'unknown', 'uncertain']
    };
    
    const lowerText = text.toLowerCase();
    const triggers = [];
    
    Object.entries(triggerKeywords).forEach(([trigger, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        triggers.push(trigger);
      }
    });
    
    return triggers;
  }

  identifyContentFlags(text, toxicityScore) {
    const flags = [];
    
    if (toxicityScore > 0.7) flags.push('high_toxicity');
    if (toxicityScore > 0.5) flags.push('moderate_toxicity');
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('suicide') || lowerText.includes('kill myself')) {
      flags.push('self_harm_risk');
    }
    
    if (lowerText.includes('hate') || lowerText.includes('violence')) {
      flags.push('hate_speech');
    }
    
    return flags;
  }

  determineContentAction(toxicityScore, contentType) {
    if (toxicityScore > 0.8) return 'block';
    if (toxicityScore > 0.6) return 'flag_for_review';
    if (toxicityScore > 0.4) return 'warn_user';
    return 'approve';
  }

  getCrisisRecommendations(riskLevel) {
    switch (riskLevel) {
      case 'high':
        return [
          'Please reach out to a crisis hotline immediately',
          'Contact emergency services if you are in immediate danger',
          'Reach out to a trusted friend or family member',
          'Consider going to your nearest emergency room'
        ];
      case 'medium':
        return [
          'Consider talking to a mental health professional',
          'Reach out to peer support in the app',
          'Use the crisis resources in your toolkit',
          'Practice grounding techniques'
        ];
      default:
        return [
          'Continue monitoring your mood',
          'Use the wellness tools available in the app',
          'Consider professional support if feelings persist'
        ];
    }
  }

  getEmergencyContacts() {
    return {
      crisis_hotline: ENV.CRISIS_HOTLINE || '988',
      emergency: ENV.EMERGENCY_NUMBER || '911',
      text_line: '741741'
    };
  }

  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  findMoodCorrelations(moodHistory, journalEntries) {
    // Find correlations between activities and mood
    const correlations = {};
    
    journalEntries.forEach(entry => {
      const activities = this.extractActivities(entry.content);
      activities.forEach(activity => {
        if (!correlations[activity]) {
          correlations[activity] = { moods: [], count: 0 };
        }
        correlations[activity].moods.push(entry.mood);
        correlations[activity].count++;
      });
    });
    
    // Calculate average mood for each activity
    const activityMoodAverages = {};
    Object.entries(correlations).forEach(([activity, data]) => {
      if (data.count >= 3) { // Only include activities with sufficient data
        activityMoodAverages[activity] = {
          averageMood: data.moods.reduce((sum, m) => sum + m, 0) / data.moods.length,
          frequency: data.count
        };
      }
    });
    
    return activityMoodAverages;
  }

  extractActivities(text) {
    const activityKeywords = [
      'exercise', 'workout', 'walk', 'run', 'yoga', 'meditation',
      'sleep', 'eat', 'cook', 'read', 'music', 'friends', 'family',
      'work', 'study', 'hobby', 'game', 'movie', 'nature', 'outside'
    ];
    
    const lowerText = text.toLowerCase();
    return activityKeywords.filter(activity => lowerText.includes(activity));
  }

  predictMoodTrends(moodHistory) {
    if (moodHistory.length < 14) {
      return { prediction: 'insufficient_data' };
    }
    
    // Simple linear regression for mood prediction
    const recent = moodHistory.slice(-14);
    const x = recent.map((_, i) => i);
    const y = recent.map(entry => entry.mood);
    
    const n = recent.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextMoodPrediction = slope * n + intercept;
    
    return {
      prediction: 'calculated',
      trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      nextMoodEstimate: Math.max(1, Math.min(10, Math.round(nextMoodPrediction))),
      confidence: Math.min(0.8, Math.abs(slope) * 2) // Simple confidence measure
    };
  }

  generatePatternInsights(patterns) {
 = [];
    
    if (patterns.trends?.trend === 'improv {
      insights.push('Your mood has been trendi');
    } else if (patterns.trends?.trend === 'declining') {
    .');
    }
    
    if (patterns.cycle) {
      const bestDay ];
      const worstDay Day];
      insights.push(`You tend t
    }
 
    if (patterns.tri
      const topTrigger = patterns.triggers[0];
    );
    }
    
    if (patterns.predictions?.trend ing') {
      insights.push('Based on recent patterns, your mood is likely to co');
    }
    
    retu
  }

s) {
    const recommendations = [];
    
    if (patterns.trends?.trend === 'declining') {
      recommendations.push('Consider increasing your use of wellness tools');
      recommendations.push('Reach out to peer suppor');
    }
    
    i) {

      recommendations.push(`Plan extra;
    }
    
    if (patterns.triggers?.length > 0) {
      recommendations.push('Develop coping strategies 
      reapist');
    }
    
ations
    Object.entries(pattern> {
      if (data.averageMood > 6) {
        recommendations.push(`${activity} seems to boost your m`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : [
      'Continue tracking your mood daily',
     ularly',
le'
    ];
  }

  assessMoodRisk(patterns) {
    let riskLevel = 'low';
    const riskFactors = [];
    
 -1) {
      riskLevel = 'medium';
      riskFactors.push('Significant m);
    }
    
    if (patterns.trends?.recentAverage < 3) {
      ri;
      e');
    }
    
    if (patterns.predictions?.trend === 'declining' && patterns.predictions?.confidence > 0.6) {
      i
     );
 }
    
    return { level: riskLevel, factors:rs };
  }

  // Generate wellness plan insights based on user data
  asyntext) {

      // Enhanced insights using AI analysis
      const moodPatterns = await this.analns(
        context.moodHistory || [],
      []
);
      
      const baseInsights = this.genet);
      
      // Combine AI patterns with rule-based ints
      return {
        
     ns,
ights,
        riskAssessment: moodPatterns.riskAsnt,
        aiRecommendations: moodPatterns.recommendations
     
 (error) {
      console.error('AI Wellness Insights failed:', er
      return this.generateRuleBasedWellnes
    }
  }ntext);coInsights(sror);    } catch };sessmetterns.ins moodPasights:ernIn   patt     atteratterns.pmoodPpatterns:    sights,...baseInsighs(contexsInsightlneseBasedWelrateRul      Entries ||nalurext.jo   conterttyzeMoodPay {   tr ights(coInsrateWellnessnc genetokFac ris    decline'uedted continpush('PredickFactors. ris'; = 'mediumvelriskLeow') == 'lvel =iskLef (rd averag recent mooVery lowsh('actors.pukFisrvel = 'high'skLecline'od deohange <s.trends?.cern& patteclining' &end === 'dtrends?.trrns.   if (patte ive peop supportithonnected w    'Stay c  regss tools nethe well'Use   oftenmorey to do it ood - try, data]) =ivitorEach(([act || {}).felationss.corrcommendy-based redd activit    // Aher ters with ang triggussiiscer dpush('Considendations.mmcotriggers');ntified for your idestDay}s`) for ${worvitiescare acti self-ay];worstDes.tterns.cycl[parday']turiday', 'Sasday', 'FThur 'sday','Wednesday',  'Tue'Monday',day', ay = ['Sunconst worstD      == undefined?.worstDay !rns.cyclesf (pattesional helpest or profns(patternioRecommendatrnPatteteenera g ']; over time.sightse inld morking to buiontinue trac : ['Cinsights ? ength > 0hts.linsigrn g.inprovntinue im'improv=== s.`ow moodrigger for l t a common bepears to apgger}ger.tri${topTrigights.push(` ins ength > 0) {?.lersgg   y}s.`);on ${worstDaggle more and struDay}s n ${bestest ofeel bo stworerns.cycles.[pattday'], 'SaturFriday'ay', 'ursd', 'Th, 'Wednesdayday'', 'Tuesondayday', 'M ['Sun=les.bestDays.cycrntte[paSaturday'] 'day',day', 'Frihursnesday', 'T, 'Wed 'Tuesday' 'Monday',ay',['Sund= hasPatterns?.for supporting out ch reay. Considerng latelinideclas been ood hpush('Your mights. ins rogress! - great pentlyg upward recning')ts t insighons   c

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

export default new AIService();  findMoo
dCorrelations(moodHistory, journalEntries) {
    // Find correlations between activities and mood
    const correlations = {};
    
    journalEntries.forEach(entry => {
      const activities = this.extractActivities(entry.content);
      activities.forEach(activity => {
        if (!correlations[activity]) {
          correlations[activity] = { moods: [], count: 0 };
        }
        correlations[activity].moods.push(entry.mood);
        correlations[activity].count++;
      });
    });
    
    // Calculate average mood for each activity
    const activityMoodAverages = {};
    Object.entries(correlations).forEach(([activity, data]) => {
      if (data.count >= 3) { // Only include activities with sufficient data
        activityMoodAverages[activity] = {
          averageMood: data.moods.reduce((sum, m) => sum + m, 0) / data.moods.length,
          frequency: data.count
        };
      }
    });
    
    return activityMoodAverages;
  }

  extractActivities(text) {
    const activityKeywords = [
      'exercise', 'workout', 'walk', 'run', 'yoga', 'meditation',
      'sleep', 'eat', 'cook', 'read', 'music', 'friends', 'family',
      'work', 'study', 'hobby', 'game', 'movie', 'nature', 'outside'
    ];
    
    const lowerText = text.toLowerCase();
    return activityKeywords.filter(activity => lowerText.includes(activity));
  }

  predictMoodTrends(moodHistory) {
    if (moodHistory.length < 14) {
      return { prediction: 'insufficient_data' };
    }
    
    // Simple linear regression for mood prediction
    const recent = moodHistory.slice(-14);
    const x = recent.map((_, i) => i);
    const y = recent.map(entry => entry.mood);
    
    const n = recent.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const nextMoodPrediction = slope * n + intercept;
    
    return {
      prediction: 'calculated',
      trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      nextMoodEstimate: Math.max(1, Math.min(10, Math.round(nextMoodPrediction))),
      confidence: Math.min(0.8, Math.abs(slope) * 2) // Simple confidence measure
    };
  }

  generatePatternInsights(patterns) {
    const insights = [];
    
    if (patterns.trends?.trend === 'improving') {
      insights.push('Your mood has been trending upward recently - great progress!');
    } else if (patterns.trends?.trend === 'declining') {
      insights.push('Your mood has been declining lately. Consider reaching out for support.');
    }
    
    if (patterns.cycles?.hasPattern) {
      const bestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][patterns.cycles.bestDay];
      const worstDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][patterns.cycles.worstDay];
      insights.push(`You tend to feel best on ${bestDay}s and struggle more on ${worstDay}s.`);
    }
    
    if (patterns.triggers?.length > 0) {
      const topTrigger = patterns.triggers[0];
      insights.push(`${topTrigger.trigger} appears to be a common trigger for low moods.`);
    }
    
    if (patterns.predictions?.trend === 'improving') {
      insights.push('Based on recent patterns, your mood is likely to continue improving.');
    }
    
    return insights.length > 0 ? insights : ['Continue tracking to build more insights over time.'];
  }

  generatePatternRecommendations(patterns) {
    const recommendations = [];
    
    if (patterns.trends?.trend === 'declining') {
      recommendations.push('Consider increasing your use of wellness tools');
      recommendations.push('Reach out to peer support or professional help');
    }
    
    if (patterns.cycles?.worstDay !== undefined) {
      const worstDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][patterns.cycles.worstDay];
      recommendations.push(`Plan extra self-care activities for ${worstDay}s`);
    }
    
    if (patterns.triggers?.length > 0) {
      recommendations.push('Develop coping strategies for your identified triggers');
      recommendations.push('Consider discussing triggers with a therapist');
    }
    
    // Add activity-based recommendations
    Object.entries(patterns.correlations || {}).forEach(([activity, data]) => {
      if (data.averageMood > 6) {
        recommendations.push(`${activity} seems to boost your mood - try to do it more often`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : [
      'Continue tracking your mood daily',
      'Use the wellness tools regularly',
      'Stay connected with supportive people'
    ];
  }

  assessMoodRisk(patterns) {
    let riskLevel = 'low';
    const riskFactors = [];
    
    if (patterns.trends?.trend === 'declining' && patterns.trends?.change < -1) {
      riskLevel = 'medium';
      riskFactors.push('Significant mood decline');
    }
    
    if (patterns.trends?.recentAverage < 3) {
      riskLevel = 'high';
      riskFactors.push('Very low recent mood average');
    }
    
    if (patterns.predictions?.trend === 'declining' && patterns.predictions?.confidence > 0.6) {
      if (riskLevel === 'low') riskLevel = 'medium';
      riskFactors.push('Predicted continued decline');
    }
    
    return { level: riskLevel, factors: riskFactors };
  }

  // Enhanced wellness insights with AI analysis
  async generateWellnessInsights(context) {
    try {
      // Enhanced insights using AI analysis
      const moodPatterns = await this.analyzeMoodPatterns(
        context.moodHistory || [],
        context.journalEntries || []
      );
      
      const baseInsights = this.generateRuleBasedWellnessInsights(context);
      
      // Combine AI patterns with rule-based insights
      return {
        ...baseInsights,
        patterns: moodPatterns.patterns,
        patternInsights: moodPatterns.insights,
        riskAssessment: moodPatterns.riskAssessment,
        aiRecommendations: moodPatterns.recommendations
      };
    } catch (error) {
      console.error('AI Wellness Insights failed:', error);
      return this.generateRuleBasedWellnessInsights(context);
    }
  }
}

export default new AIService();