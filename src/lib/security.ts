import { NextRequest } from 'next/server'

// Add your IP addresses here (you can add multiple IPs)
const ALLOWED_IPS = [
  // Your current IP
  '64.180.232.166',

  // Localhost for development
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'localhost'
]

export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const flyClientIP = request.headers.get('fly-client-ip')

  // Priority order: Fly > Cloudflare > X-Real-IP > X-Forwarded-For > connection IP
  let clientIP = flyClientIP || cfConnectingIP || realIP

  if (!clientIP && forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    clientIP = forwarded.split(',')[0].trim()
  }

  // Fallback to connection IP
  if (!clientIP) {
    clientIP = request.ip || 'unknown'
  }

  console.log('Client IP detected:', clientIP)
  return clientIP
}

export function isIPAllowed(ip: string): boolean {
  // Remove any IPv4-mapped IPv6 prefix
  const cleanIP = ip.replace(/^::ffff:/, '')

  const allowed = ALLOWED_IPS.some(allowedIP => {
    // Exact match
    if (cleanIP === allowedIP) return true

    // Check if it's a CIDR range (basic implementation)
    if (allowedIP.includes('/')) {
      // For now, just exact match - you can implement CIDR matching if needed
      return false
    }

    return false
  })

  console.log(`IP ${cleanIP} allowed: ${allowed}`)
  return allowed
}

export function createIPProtectionResponse() {
  return new Response(
    JSON.stringify({
      error: 'Access denied. Receipt creation is restricted to authorized IP addresses.',
      code: 'IP_RESTRICTED'
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Token-based security for shared receipts
export function generateAccessToken(): string {
  // Generate UUID v4 for maximum entropy (122 bits)
  return crypto.randomUUID()
}

export function isValidAccessToken(token: string): boolean {
  // Validate UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(token)
}

// Security headers to prevent indexing and referrer leaks
export function getSecurityHeaders() {
  return {
    // Prevent search engine indexing
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',

    // Prevent referrer leaks to external sites
    'Referrer-Policy': 'no-referrer',

    // Additional security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',

    // Cache control for shared links
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}