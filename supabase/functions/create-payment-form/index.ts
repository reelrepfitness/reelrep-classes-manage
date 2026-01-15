// ============================================
// CREATE PAYMENT FORM EDGE FUNCTION
// ============================================
// Generates Green Invoice payment form URL
// Available to ALL authenticated users (not just admins)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const API_BASE_URL = "https://api.greeninvoice.co.il/api/v1"

interface CartItem {
  plan_id: string
  plan_type: 'subscription' | 'ticket'
  name: string
  quantity: number
  price: number
  duration_months?: number
  total_sessions?: number
  validity_days?: number
}

interface CreatePaymentFormRequest {
  invoiceId: string
  amount: number
  description: string
  clientName?: string
  clientEmail?: string
  cartItems: CartItem[]
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
    console.log("[create-payment-form] Starting payment form generation...")

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

    // Decode JWT
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

    // No admin check - all authenticated users can create payment forms

    // 2. PARSE REQUEST
    const body: CreatePaymentFormRequest = await req.json()
    const { invoiceId, amount, description, clientName, clientEmail, cartItems } = body

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Cart items required" }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log("[create-payment-form] Creating payment form for invoice:", invoiceId)

    // 3. CREATE INVOICE RECORD IN DATABASE (PENDING)
    const { data: invoiceRecord, error: insertError } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        user_id: userId,
        client_id: userId,
        green_invoice_id: `pending-${invoiceId}`,
        green_document_type: 320,
        amount: amount,
        vat_amount: amount * 0.17,
        total_amount: amount * 1.17,
        payment_type: 2, // Credit card
        payment_status: 'pending',
        cart_items: cartItems,
        items: cartItems.map(item => ({
          sku: item.plan_id,
          quantity: item.quantity,
          price: item.price,
          description: item.name
        })),
        description: description
      })
      .select()
      .single()

    if (insertError) {
      console.error('[create-payment-form] DB insert error:', insertError)
      throw new Error(`Failed to create invoice record: ${insertError.message}`)
    }

    console.log('[create-payment-form] Invoice record created:', invoiceRecord.id)

    // 3. GET GREEN INVOICE AUTH TOKEN
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

    // 4. CREATE PAYMENT FORM
    // Use a production-friendly URL - Green Invoice requires valid HTTPS URLs
    const appUrl = Deno.env.get("APP_URL") || `${Deno.env.get("SUPABASE_URL")}/functions/v1`

    const paymentFormPayload = {
      description: description,
      type: 320, // Invoice/Receipt
      lang: "he",
      currency: "ILS",
      vatType: 0,
      amount: amount,
      maxPayments: 12,
      client: clientName ? {
        name: clientName,
        emails: clientEmail ? [clientEmail] : [],
        add: false
      } : undefined,
      income: cartItems.map(item => ({
        description: item.name,
        quantity: item.quantity,
        price: item.price,
        currency: "ILS",
        vatType: 1,
        catalogNum: item.plan_id
      })),
      // Use HTTPS URLs for success/failure callbacks
      successUrl: `${appUrl}/payment-success?invoiceId=${invoiceId}`,
      failureUrl: `${appUrl}/payment-failure?invoiceId=${invoiceId}`,
      notifyUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      custom: invoiceId
    }

    console.log("[create-payment-form] Payment URLs - Success:", paymentFormPayload.successUrl)
    console.log("[create-payment-form] Calling Green Invoice payment API...")

    const paymentResponse = await fetch(`${API_BASE_URL}/payments/form`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentFormPayload),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error("[create-payment-form] Green Invoice error:", errorText)
      throw new Error(`Green Invoice API error: ${errorText}`)
    }

    const paymentData = await paymentResponse.json()
    console.log("[create-payment-form] Payment form created successfully")

    // 5. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        success: true,
        formUrl: paymentData.url || paymentData.formUrl,
        paymentId: paymentData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[create-payment-form] Error:", error)
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
