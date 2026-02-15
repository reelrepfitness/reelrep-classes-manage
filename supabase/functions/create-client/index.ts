// ============================================
// CREATE CLIENT EDGE FUNCTION
// ============================================
// Creates user in Supabase Auth + Green Invoice
// + optionally assigns subscription or ticket plan
// Admin-only access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const API_BASE_URL = "https://api.greeninvoice.co.il/api/v1"

interface CreateClientRequest {
  fullName: string
  email: string
  phone: string
  password: string
  address?: string
  city?: string
  taxId?: string
  remarks?: string
  birthday?: string
  gender: 'male' | 'female'
  role: 'user' | 'coach' | 'admin'
  isAdmin: boolean
  isCoach: boolean
  // Plan assignment
  planType: 'none' | 'subscription' | 'ticket'
  planId?: string
  subscriptionStart?: string
  subscriptionEnd?: string
  ticketTotalSessions?: number
  ticketValidityDays?: number
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    console.log("[create-client] Starting client creation...")

    // 1. VERIFY ADMIN ACCESS
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Decode JWT to get user ID
    const jwtToken = authHeader.replace("Bearer ", "")
    let userId: string
    try {
      const parts = jwtToken.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      const payload = JSON.parse(atob(parts[1]))
      userId = payload.sub
      if (!userId) throw new Error('No user ID in token')
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      )
    }

    // 2. PARSE REQUEST
    const body: CreateClientRequest = await req.json()
    const {
      fullName,
      email,
      phone,
      password,
      address,
      city,
      taxId,
      remarks,
      birthday,
      gender,
      role,
      isAdmin,
      isCoach,
      planType,
      planId,
      subscriptionStart,
      subscriptionEnd,
      ticketTotalSessions,
      ticketValidityDays,
    } = body

    console.log("[create-client] Creating user:", email)

    // Validation
    if (!gender || !['male', 'female'].includes(gender)) {
      return new Response(
        JSON.stringify({ error: 'Gender is required and must be male or female' }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (!role || !['user', 'coach', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. CREATE SUPABASE AUTH USER
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: phone,
      },
    })

    if (authError || !authData.user) {
      console.error("[create-client] Auth error:", authError)
      throw new Error(`Failed to create user: ${authError?.message}`)
    }

    const newUserId = authData.user.id
    console.log("[create-client] User created:", newUserId)

    // 4. GET GREEN INVOICE AUTH TOKEN
    let greenInvoiceClientId: string | null = null
    try {
      const authResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/green-invoice-auth`,
        {
          method: "POST",
          headers: { Authorization: authHeader },
        }
      )

      if (authResponse.ok) {
        const { token } = await authResponse.json()

        // 5. CREATE CLIENT IN GREEN INVOICE
        const greenInvoicePayload = {
          name: fullName,
          emails: [email],
          mobile: phone,
          phone: phone,
          address: address || undefined,
          city: city || undefined,
          taxId: taxId || undefined,
          remarks: remarks || undefined,
          active: true,
          country: "IL",
        }

        console.log("[create-client] Creating Green Invoice client...")

        const createResponse = await fetch(`${API_BASE_URL}/clients`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(greenInvoicePayload),
        })

        if (createResponse.ok) {
          const greenInvoiceData = await createResponse.json()
          greenInvoiceClientId = greenInvoiceData.id
          console.log("[create-client] Green Invoice client created:", greenInvoiceClientId)
        } else {
          const errorText = await createResponse.text()
          console.error("[create-client] Green Invoice error (non-fatal):", errorText)
        }
      } else {
        console.error("[create-client] Green Invoice auth failed (non-fatal)")
      }
    } catch (giError) {
      console.error("[create-client] Green Invoice error (non-fatal):", giError)
    }

    // 6. UPDATE PROFILE WITH CORRECT COLUMNS
    const profileUpdate: Record<string, any> = {
      full_name: fullName,
      phone_number: phone,
      gender: gender,
      role: role,
      is_admin: isAdmin || false,
      is_coach: isCoach || false,
    }
    if (birthday) {
      profileUpdate.birthday = birthday
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", newUserId)

    if (updateError) {
      console.error("[create-client] Profile update error:", updateError)
    }

    // 7. SAVE GREEN INVOICE CLIENT MAPPING
    if (greenInvoiceClientId) {
      await supabase
        .from("green_invoice_clients")
        .upsert({
          user_id: newUserId,
          gi_client_id: greenInvoiceClientId,
          synced_at: new Date().toISOString(),
        })
    }

    // 8. ASSIGN PLAN IF SELECTED
    if (planType === 'subscription' && planId && subscriptionStart && subscriptionEnd) {
      console.log("[create-client] Assigning subscription plan:", planId)
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: newUserId,
          plan_id: planId,
          start_date: subscriptionStart,
          end_date: subscriptionEnd,
          is_active: true,
          plan_status: 'active',
        })

      if (subError) {
        console.error("[create-client] Subscription insert error:", subError)
      }
    } else if (planType === 'ticket' && planId) {
      console.log("[create-client] Assigning ticket plan:", planId)
      const totalSessions = ticketTotalSessions || 10
      const validityDays = ticketValidityDays || 30
      const now = new Date()
      const expiry = new Date(now)
      expiry.setDate(expiry.getDate() + validityDays)

      const { error: ticketError } = await supabase
        .from("user_tickets")
        .insert({
          user_id: newUserId,
          plan_id: planId,
          status: 'active',
          total_sessions: totalSessions,
          sessions_remaining: totalSessions,
          purchase_date: now.toISOString(),
          expiry_date: expiry.toISOString(),
        })

      if (ticketError) {
        console.error("[create-client] Ticket insert error:", ticketError)
      }
    }

    // 9. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        greenInvoiceClientId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[create-client] Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        details: error.stack,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
