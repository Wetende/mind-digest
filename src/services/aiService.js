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
}

export default new AIService();