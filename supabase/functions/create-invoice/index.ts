// ============================================
// CREATE INVOICE EDGE FUNCTION
// ============================================
// Creates invoice in Green Invoice and saves to Supabase
// Admin-only access with full error handling

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const API_BASE_URL = "https://api.greeninvoice.co.il/api/v1"

interface InvoiceItem {
  sku: string
  quantity: number
  price: number
  customDescription?: string
}

interface CreateInvoiceRequest {
  clientId: string
  items: InvoiceItem[]
  paymentType: 1 | 2 | 4 | 6 | 11 // מזומן | אשראי | העברה | Bit | הוראת קבע
  remarks?: string
  sendEmail?: boolean
}

interface CreateInvoiceResponse {
  success: boolean
  invoice?: any
  pdfUrl?: string
  error?: string
  details?: string
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    console.log("[create-invoice] Starting invoice creation...")

    // 1. VERIFY ADMIN ACCESS
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Extract and decode the JWT token to get user ID
    const jwtToken = authHeader.replace("Bearer ", "")
    
    // Decode JWT to get user ID (without verification since we'll verify via database)
    let userId: string
    try {
      const parts = jwtToken.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }
      const payload = JSON.parse(atob(parts[1]))
      userId = payload.sub
      
      if (!userId) {
        throw new Error('No user ID in token')
      }
      
      console.log("[create-invoice] User ID from token:", userId)
    } catch (e) {
      console.error("[create-invoice] Token decode error:", e)
      return new Response(
        JSON.stringify({
          error: "Invalid authentication token",
          details: e.message
        }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify user exists and is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      console.error("[create-invoice] User not found:", userId)
      return new Response(
        JSON.stringify({
          error: "User not found",
          details: profileError?.message
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    if (profile.role !== "admin") {
      console.error("[create-invoice] User is not admin:", userId, "role:", profile.role)
      return new Response(
        JSON.stringify({
          error: "Admin access required",
          details: `User role: ${profile.role}`
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    console.log("[create-invoice] Admin verified:", userId)

    // 2. PARSE REQUEST
    const body: CreateInvoiceRequest = await req.json()
    const {
      clientId,
      items,
      paymentType,
      remarks,
      sendEmail = true,
    } = body

    console.log("[create-invoice] Request:", {
      clientId,
      itemCount: items.length,
      paymentType,
      sendEmail,
    })

    // Validate request
    if (!clientId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: clientId and items are required",
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // 3. GET CLIENT DETAILS
    console.log("[create-invoice] Fetching client details...")
    const { data: clientData, error: clientError } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number")
      .eq("id", clientId)
      .single()

    if (clientError || !clientData) {
      console.error("[create-invoice] Client not found:", clientId)
      return new Response(
        JSON.stringify({ error: `Client not found: ${clientId}` }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log("[create-invoice] Client found:", clientData.full_name)

    // 4. GET PRODUCT DETAILS AND CALCULATE TOTALS
    console.log("[create-invoice] Fetching product details...")
    const { data: products, error: productsError } = await supabase
      .from("product_catalog")
      .select("*")
      .in(
        "sku",
        items.map((i) => i.sku)
      )

    if (productsError) {
      console.warn("[create-invoice] Error fetching products (will use custom descriptions):", productsError)
    }

    let subtotal = 0
    const incomeItems = items.map((item) => {
      const product = products?.find((p) => p.sku === item.sku)
      
      // Use product catalog if available, otherwise use custom description
      const description = item.customDescription || product?.description || product?.name || item.sku
      
      const lineTotal = item.price * item.quantity
      subtotal += lineTotal

      console.log(`[create-invoice] Item: ${description}, Price: ${item.price}, Qty: ${item.quantity}, Total: ${lineTotal}`)

      return {
        description,
        quantity: item.quantity,
        price: item.price,
        currency: "ILS",
      }
    })

    // Calculate VAT (18% included in price)
    // Formula: VAT = (subtotal / 1.18) * 0.18
    const amountBeforeVat = subtotal / 1.18
    const vatAmount = subtotal - amountBeforeVat
    const totalAmount = subtotal

    console.log("[create-invoice] Calculations:", {
      subtotal,
      amountBeforeVat: amountBeforeVat.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount,
    })

    // 5. GET GREEN INVOICE AUTH TOKEN
    console.log("[create-invoice] Getting auth token...")
    const authResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/green-invoice-auth`,
      {
        method: "POST",
        headers: { Authorization: authHeader },
      }
    )

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error("[create-invoice] Auth failed:", errorText)
      throw new Error(`Failed to authenticate: ${errorText}`)
    }

    const { token } = await authResponse.json()
    console.log("[create-invoice] Got auth token")

    // 6. CREATE INVOICE IN GREEN INVOICE
    const invoicePayload = {
      description: `חשבונית - Reel Rep Training`,
      type: 305, // חשבונית מס (Tax Invoice) - simpler than 320
      lang: "he",
      currency: "ILS",
      client: {
        name: clientData.full_name,
        emails: [clientData.email].filter(Boolean),
        phone: clientData.phone_number || undefined,
        mobile: clientData.phone_number || undefined,
        add: true, // Auto-create client if doesn't exist
      },
      income: incomeItems,
      payment: [
        {
          paymentType,
          price: totalAmount,
          currency: "ILS",
        },
      ],
      signed: sendEmail, // If true, Green Invoice sends email with PDF
      rounding: false,
      remarks: remarks || "תודה שבחרת ב-Reel Rep Training! 💪",
    }

    console.log("[create-invoice] Creating invoice in Green Invoice...")
    console.log("[create-invoice] Items received:", JSON.stringify(items, null, 2))
    console.log("[create-invoice] Income items built:", JSON.stringify(incomeItems, null, 2))
    console.log("[create-invoice] Full payload:", JSON.stringify(invoicePayload, null, 2))

    const createResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoicePayload),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error("[create-invoice] Green Invoice API error:", errorText)

      let errorMessage = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = `Code ${errorJson.errorCode}: ${errorJson.errorMessage}`
      } catch {
        // Not JSON
      }

      throw new Error(`Green Invoice API error: ${errorMessage}`)
    }

    const greenInvoiceData = await createResponse.json()
    console.log("[create-invoice] Invoice created in Green Invoice:", greenInvoiceData.id)

    // 7. SAVE TO SUPABASE DATABASE
    console.log("[create-invoice] Saving to Supabase...")
    const { data: savedInvoice, error: saveError } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        green_invoice_id: greenInvoiceData.id,
        green_invoice_number: greenInvoiceData.number,
        green_document_type: 305,
        amount: amountBeforeVat,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        payment_type: paymentType,
        payment_status: "pending",
        items: items,
        description: invoicePayload.description,
        remarks: invoicePayload.remarks,
        pdf_url: greenInvoiceData.url?.he || greenInvoiceData.url?.origin,
        sent_at: sendEmail ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (saveError) {
      console.error("[create-invoice] Error saving to database:", saveError)
      // Invoice was created in Green Invoice but not saved to our DB
      // This is a critical error but at least the invoice exists
      throw new Error(`Invoice created in Green Invoice (${greenInvoiceData.id}) but failed to save to database: ${saveError.message}`)
    }

    console.log("[create-invoice] Invoice saved to database:", savedInvoice.id)

    // 8. SUCCESS RESPONSE
    const response: CreateInvoiceResponse = {
      success: true,
      invoice: savedInvoice,
      pdfUrl: greenInvoiceData.url?.he || greenInvoiceData.url?.origin,
    }

    console.log("[create-invoice] Success! Invoice ID:", savedInvoice.id)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[create-invoice] Error:", error)

    const errorResponse: CreateInvoiceResponse = {
      success: false,
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
 * 1. Ensure green-invoice-auth function is deployed first
 *
 * 2. Deploy this function:
 *    supabase functions deploy create-invoice
 *
 * 3. Test with curl:
 *    curl -X POST https://your-project.supabase.co/functions/v1/create-invoice \
 *      -H "Authorization: Bearer YOUR_ANON_KEY" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "clientId": "USER_UUID",
 *        "items": [
 *          {
 *            "sku": "SUB-MONTHLY",
 *            "quantity": 1,
 *            "price": 500
 *          }
 *        ],
 *        "paymentType": 1,
 *        "remarks": "Test invoice",
 *        "sendEmail": false
 *      }'
 */
