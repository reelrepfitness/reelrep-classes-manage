// ============================================
// GREEN INVOICE AUTH EDGE FUNCTION
// ============================================
// Authenticates with Green Invoice API and caches JWT token
// Prevents exposing API credentials in the mobile app

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CACHE_DURATION = 3600000 // 1 hour in milliseconds
const API_BASE_URL = "https://api.greeninvoice.co.il/api/v1"

// In-memory cache for token
// Note: This resets when function cold-starts (Supabase restarts it periodically)
let cachedToken: {
  token: string
  expiresAt: number
} | null = null

interface AuthResponse {
  token: string
}

interface ErrorResponse {
  error: string
  details?: string
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    console.log("[green-invoice-auth] Checking for cached token...")

    // Check if we have a valid cached token
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      console.log("[green-invoice-auth] Returning cached token")
      return new Response(
        JSON.stringify({ token: cachedToken.token } as AuthResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log("[green-invoice-auth] Cache miss or expired, fetching new token...")

    // Get credentials from environment
    const apiId = Deno.env.get("GREEN_INVOICE_ID")
    const apiSecret = Deno.env.get("GREEN_INVOICE_SECRET")

    if (!apiId || !apiSecret) {
      console.error("[green-invoice-auth] Missing credentials in environment")
      throw new Error("Missing GREEN_INVOICE credentials. Please set GREEN_INVOICE_ID and GREEN_INVOICE_SECRET in Supabase secrets.")
    }

    console.log("[green-invoice-auth] Authenticating with Green Invoice API...")

    // Authenticate with Green Invoice
    const response = await fetch(`${API_BASE_URL}/account/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: apiId,
        secret: apiSecret,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[green-invoice-auth] Auth failed:", response.status, errorText)

      // Try to parse error
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = `Code ${errorJson.errorCode}: ${errorJson.errorMessage}`
      } catch {
        // Not JSON, use as is
      }

      throw new Error(`Green Invoice authentication failed (${response.status}): ${errorDetails}`)
    }

    const data = await response.json()
    const token = data.token

    if (!token) {
      console.error("[green-invoice-auth] No token in response:", data)
      throw new Error("No token received from Green Invoice")
    }

    console.log("[green-invoice-auth] Successfully authenticated, caching token")

    // Cache the token
    cachedToken = {
      token,
      expiresAt: Date.now() + CACHE_DURATION,
    }

    return new Response(
      JSON.stringify({ token } as AuthResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("[green-invoice-auth] Error:", error)

    const errorResponse: ErrorResponse = {
      error: error.message || "Internal server error",
      details: error.stack,
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

/*
 * DEPLOYMENT INSTRUCTIONS:
 *
 * 1. Set secrets in Supabase Dashboard:
 *    - GREEN_INVOICE_ID: Your Green Invoice API ID
 *    - GREEN_INVOICE_SECRET: Your Green Invoice API secret
 *
 * 2. Deploy this function:
 *    supabase functions deploy green-invoice-auth
 *
 * 3. Test the function:
 *    curl -X POST https://your-project.supabase.co/functions/v1/green-invoice-auth \
 *      -H "Authorization: Bearer YOUR_ANON_KEY"
 *
 * Expected response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
