import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hugging Face API Configuration
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models'
const HF_SENTIMENT_MODEL = 'cardiffnlp/twitter-roberta-base-sentiment-latest'
const HF_EMOTION_MODEL = 'j-hartmann/emotion-english-distilroberta-base'
const HF_ZERO_SHOT_MODEL = 'facebook/bart-large-mnli'

// Rate limiting (simple in-memory store for demo - use Redis in production)
const rateLimit = new Map()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per user

interface JournalEntry {
  id: string
  user_id: string
  content: string
  timestamp: string
  mood_rating?: number
}

interface AnalysisResult {
  sentiment: {
    score: number // -1 to 1 (negative to positive)
    label: string
    confidence: number
  }
  emotion: {
    primary: string
    secondary?: string
    confidence: number
    all: { [key: string]: number }
  }
  mood: {
    predicted: number // 1-10 scale
    confidence: number
  }
  emotions: string[]
  keyThemes: string[]
  recommendations: {
    type: string
    text: string
    urgency: 'low' | 'medium' | 'high'
  }[]
  triggers?: string[]
  crisis_signals?: {
    risk_level: 'none' | 'low' | 'medium' | 'high'
    signals: string[]
  }
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = rateLimit.get(userId) || []

  // Remove old requests outside the window
  const activeRequests = userRequests.filter((timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW)

  if (activeRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false // Rate limited
  }

  // Add current request
  activeRequests.push(now)
  rateLimit.set(userId, activeRequests)

  return true
}

async function analyzeSentiment(text: string): Promise<{ score: number; label: string; confidence: number }> {
  const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
  if (!HF_TOKEN) throw new Error('Hugging Face token not configured')

  const response = await fetch(`${HUGGING_FACE_API_URL}/${HF_SENTIMENT_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  })

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`)
  }

  const result = await response.json()

  // Parse HuggingFace response
  const sentiments = result[0]
  const maxSentiment = sentiments.reduce((max: any, current: any) =>
    current.score > max.score ? current : max
  )

  // Convert to -1 to 1 scale
  const sentimentMap: { [key: string]: number } = {
    'LABEL_0': -1, // negative
    'LABEL_1': 0,  // neutral
    'LABEL_2': 1   // positive
  }

  return {
    score: sentimentMap[maxSentiment.label] || 0,
    label: maxSentiment.label,
    confidence: maxSentiment.score,
  }
}

async function analyzeEmotions(text: string): Promise<{
  primary: string
  secondary?: string
  confidence: number
  all: { [key: string]: number }
}> {
  const HF_TOKEN = Deno.env.get('HUGGINGFACE_TOKEN')
  if (!HF_TOKEN) throw new Error('Hugging Face token not configured')

  const response = await fetch(`${HUGGING_FACE_API_URL}/${HF_EMOTION_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  })

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`)
  }

  const result = await response.json()
  const emotions = result[0]

  // Sort emotions by score
  const sortedEmotions = emotions
    .reduce((acc: any[], emotion: any) => {
      acc.push({
        label: emotion.label,
        score: emotion.score,
      })
      return acc
    }, [])
    .sort((a: any, b: any) => b.score - a.score)

  const emotionsMap = emotions.reduce((acc: any, emotion: any) => {
    acc[emotion.label] = emotion.score
    return acc
  }, {})

  return {
    primary: sortedEmotions[0]?.label || 'neutral',
    secondary: sortedEmotions[1]?.label,
    confidence: sortedEmotions[0]?.score || 0,
    all: emotionsMap,
  }
}

function predictMoodFromSentiment(sentimentScore: number, emotion: string): { predicted: number; confidence: number } {
  // Convert sentiment score (-1 to 1) to mood scale (1 to 10)
  const baseMood = Math.round(((sentimentScore + 1) / 2) * 9) + 1

  // Adjust based on emotion
  const emotionAdjustments: { [key: string]: number } = {
    'joy': 2,
    'sadness': -2,
    'anger': -3,
    'fear': -3,
    'surprise': 1,
    'disgust': -2,
    'neutral': 0,
  }

  const adjustment = emotionAdjustments[emotion] || 0
  const predictedMood = Math.max(1, Math.min(10, baseMood + adjustment))

  return {
    predicted: predictedMood,
    confidence: 0.7, // Moderate confidence from AI prediction
  }
}

function extractKeyThemes(content: string): string[] {
  // Simple keyword-based theme extraction for demo
  // In production, you'd use more sophisticated NLP models
  const themes = []
  const lowerContent = content.toLowerCase()

  const themeKeywords = {
    'anxiety': ['anxious', 'worry', 'stress', 'tense', 'panic', 'nervous'],
    'depression': ['sad', 'down', 'hopeless', 'worthless', 'upset', 'depressed', 'blue'],
    'relationships': ['partner', 'friend', 'family', 'relationship', 'social', 'alone', 'connect', 'support'],
    'work': ['job', 'work', 'career', 'boss', 'colleague', 'office', 'deadline', 'meeting'],
    'health': ['sick', 'pain', 'doctor', 'medication', 'therapy', 'exercise', 'diet', 'sleep'],
    'self-esteem': ['confident', 'insecure', 'self-worth', 'validation', 'approval'],
  }

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      themes.push(theme)
    }
  }

  return themes.slice(0, 5) // Return top 5 themes
}

function detectCrisisSignals(content: string): { risk_level: string; signals: string[] } {
  const signals = []
  const lowerContent = content.toLowerCase()

  // Crisis keywords to detect
  const crisisKeywords = {
    'suicide': ['suicide', 'die', 'kill myself', 'end it', 'not worth living'],
    'self-harm': ['cut', 'hurt myself', 'self-harm', 'scratch', 'burn'],
    'hopelessness': ['no hope', 'hopeless', 'future is bleak', 'nothing matters'],
    'isolation': ['completely alone', 'nobody cares', 'unwanted', 'abandoned'],
  }

  for (const [category, keywords] of Object.entries(crisisKeywords)) {
    const detected = keywords.filter(keyword => lowerContent.includes(keyword))
    if (detected.length > 0) {
      signals.push(...detected.map(word => `${category}: ${word}`))
    }
  }

  let risk_level = 'none'
  if (signals.length >= 3) risk_level = 'high'
  else if (signals.length >= 1) risk_level = 'medium'

  return { risk_level, signals }
}

function generateRecommendations(sentiment: any, emotion: any, themes: string[]): any[] {
  const recommendations = []

  // Sentiment-based recommendations
  if (sentiment.score < -0.5) {
    recommendations.push({
      type: 'grounding',
      text: 'Try the 5-4-3-2-1 grounding technique: 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
      urgency: 'high',
    })
  }

  // Emotion-based recommendations
  if (emotion.primary === 'anger') {
    recommendations.push({
      type: 'breathing',
      text: 'Practice deep breathing: inhale for 4 counts, hold for 4, exhale for 6.',
      urgency: 'medium',
    })
  }

  if (emotion.primary === 'sadness') {
    recommendations.push({
      type: 'connection',
      text: 'Reach out to a trusted friend or accountability partner. Connection can help during difficult times.',
      urgency: 'medium',
    })
  }

  // Theme-based recommendations
  if (themes.includes('anxiety')) {
    recommendations.push({
      type: 'anxiety-management',
      text: 'Try progressive muscle relaxation or listen to a guided meditation.',
      urgency: 'medium',
    })
  }

  if (themes.includes('relationships')) {
    recommendations.push({
      type: 'social-support',
      text: 'Consider joining a peer support group or connecting with others who understand what you\'re going through.',
      urgency: 'low',
    })
  }

  return recommendations.slice(0, 3) // Return top 3 recommendations
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract user ID from request (would come from Supabase JWT in production)
    const { journalEntry, userId }: { journalEntry: JournalEntry; userId: string } = await req.json()

    // Basic validation
    if (!journalEntry?.content || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Rate limiting check
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const content = journalEntry.content

    // Run AI analyses in parallel for better performance
    const [sentimentResult, emotionResult] = await Promise.all([
      analyzeSentiment(content),
      analyzeEmotions(content),
    ])

    const moodPrediction = predictMoodFromSentiment(sentimentResult.score, emotionResult.primary)
    const keyThemes = extractKeyThemes(content)
    const crisisSignals = detectCrisisSignals(content)
    const recommendations = generateRecommendations(sentimentResult, emotionResult, keyThemes)

    // Detect trigger words/emotions
    const triggers = []
    if (emotionResult.primary === 'anger' && keyThemes.includes('relationships')) {
      triggers.push('relationship stress')
    }
    if (emotionResult.primary === 'fear' && keyThemes.includes('work')) {
      triggers.push('work pressure')
    }

    const analysis: AnalysisResult = {
      sentiment: sentimentResult,
      emotion: emotionResult,
      mood: moodPrediction,
      emotions: [emotionResult.primary, ...(emotionResult.secondary ? [emotionResult.secondary] : [])],
      keyThemes,
      recommendations,
      triggers,
      crisis_signals: crisisSignals.signals.length > 0 ? crisisSignals : undefined,
    }

    // Store analysis result in database (optional - for analytics)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      await supabase
        .from('journal_analyses')
        .insert({
          journal_id: journalEntry.id,
          user_id: userId,
          analysis_result: analysis,
          created_at: new Date().toISOString(),
        })
    } catch (error) {
      console.error('Failed to store analysis result:', error)
      // Don't fail the request if database update fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('AI Analysis Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to analyze journal entry',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
