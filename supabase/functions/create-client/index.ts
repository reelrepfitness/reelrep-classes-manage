// ============================================
// CREATE CLIENT EDGE FUNCTION
// ============================================
// Creates user in Supabase Auth + Green Invoice
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
  // NEW FIELDS
  gender: 'male' | 'female'
  role: 'user' | 'coach' | 'admin'
  isAdmin: boolean
  isCoach: boolean
  subscriptionType: 'basic' | 'premium' | 'vip' | 'unlimited' | 'cancelled'
  subscriptionStatus: 'active' | 'cancelled'
  subscriptionStart?: string
  subscriptionEnd?: string
  classesPerMonth: number
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
      // NEW FIELDS
      gender,
      role,
      isAdmin,
      isCoach,
      subscriptionType,
      subscriptionStatus,
      subscriptionStart,
      subscriptionEnd,
      classesPerMonth,
    } = body

    console.log("[create-client] Creating user:", email)

    // NEW: Validation
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
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        phone_number: phone,
      },
    })

    if (authError || !authData.user) {
      console.error("[create-client] Auth error:", authError)
      throw new Error(`Failed to create user: ${authError?.message}`)
    }

    console.log("[create-client] User created:", authData.user.id)

    // 4. GET GREEN INVOICE AUTH TOKEN
    const authResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/green-invoice-auth`,
      {
        method: "POST",
        headers: { Authorization: authHeader },
      }
    )

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with Green Invoice")
    }

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

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("[create-client] Green Invoice error:", errorText)
      
      // Rollback: Delete the Supabase user
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      throw new Error(`Green Invoice API error: ${errorText}`)
    }

    const greenInvoiceData = await createResponse.json()
    console.log("[create-client] Green Invoice client created:", greenInvoiceData.id)

    // 6. UPDATE PROFILE WITH ALL FIELDS
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
        gender: gender,
        role: role,
        is_admin: isAdmin || false,
        is_coach: isCoach || false,
        subscription_type: subscriptionType || 'cancelled',
        subscription_status: subscriptionStatus || 'cancelled',
        subscription_start: subscriptionStart || null,
        subscription_end: subscriptionEnd || null,
        classes_per_month: classesPerMonth || 0,
        classes_used: 0,
        green_invoice_client_id: greenInvoiceData.id,
      })
      .eq("id", authData.user.id)

    if (updateError) {
      console.error("[create-client] Profile update error:", updateError)
    }

    // 7. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        greenInvoiceClientId: greenInvoiceData.id,
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
