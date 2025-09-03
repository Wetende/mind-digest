export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const rateLimit = new Map()
export const RATE_LIMIT_WINDOW = 60000 // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute per user

export function checkRateLimit(userId: string): boolean {
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
