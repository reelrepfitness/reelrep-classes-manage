// ============================================
// SYNC FINANCIAL DATA EDGE FUNCTION
// ============================================
// Fetches all invoices and expenses from Green Invoice
// Syncs to Supabase and calculates analytics
// Admin-only access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const API_BASE_URL = "https://api.greeninvoice.co.il/api/v1"

interface SyncResponse {
  success: boolean
  summary: {
    totalIncome: number
    totalExpenses: number
    netProfit: number
    documentCount: number
    expenseCount: number
    newDocuments: number
    newExpenses: number
  }
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
    console.log("[sync-financial-data] Starting sync...")

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
    } catch (e) {
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
      return new Response(
        JSON.stringify({
          error: "User not found",
          details: profileError?.message
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({
          error: "Admin access required",
          details: `User role: ${profile.role}`
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    console.log("[sync-financial-data] Admin verified (Service Role or Admin User)")

    // 2. GET AUTH TOKEN
    console.log("[sync-financial-data] Getting auth token...")
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
    console.log("[sync-financial-data] Got auth token")

    // 3. FETCH ALL DOCUMENTS FROM GREEN INVOICE
    console.log("[sync-financial-data] Fetching documents from Green Invoice...")
    let allDocuments: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await fetch(
        `${API_BASE_URL}/documents/search?page=${page}&pageSize=100`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) {
        console.error("[sync-financial-data] Error fetching documents:", await response.text())
        break
      }

      const data = await response.json()
      allDocuments = [...allDocuments, ...data.items]

      console.log(`[sync-financial-data] Fetched page ${page}, got ${data.items.length} documents`)

      hasMore = data.items.length === 100
      page++

      // Safety limit
      if (page > 50) {
        console.warn("[sync-financial-data] Reached page limit of 50")
        break
      }
    }

    console.log(`[sync-financial-data] Total documents fetched: ${allDocuments.length}`)

    // 4. FETCH ALL EXPENSES FROM GREEN INVOICE
    console.log("[sync-financial-data] Fetching expenses from Green Invoice...")
    let allExpenses: any[] = []
    page = 1
    hasMore = true

    while (hasMore) {
      const response = await fetch(
        `${API_BASE_URL}/expenses/search`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            page: page,
            pageSize: 100
          })
        }
      )

      if (!response.ok) {
        console.error("[sync-financial-data] Error fetching expenses:", await response.text())
        break
      }

      const data = await response.json()
      allExpenses = [...allExpenses, ...data.items]

      console.log(`[sync-financial-data] Fetched page ${page}, got ${data.items.length} expenses`)

      hasMore = data.items.length === 100
      page++

      if (page > 50) {
        console.warn("[sync-financial-data] Reached page limit of 50")
        break
      }
    }

    console.log(`[sync-financial-data] Total expenses fetched: ${allExpenses.length}`)

    // 5. SYNC DOCUMENTS TO SUPABASE (Only new ones)
    console.log("[sync-financial-data] Syncing documents to Supabase...")
    let newDocumentsCount = 0

    for (const doc of allDocuments) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("green_invoice_id", doc.id)
        .single()

      if (existing) {
        continue // Already synced
      }

      // Parse amounts
      const totalAmount = parseFloat(doc.amount || 0)
      const amountBeforeVat = totalAmount / 1.18
      const vatAmount = totalAmount - amountBeforeVat

      // Insert new document
      const { error } = await supabase.from("invoices").insert({
        green_invoice_id: doc.id,
        green_invoice_number: doc.number,
        green_document_type: doc.type,
        amount: amountBeforeVat,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        payment_type: doc.payment?.[0]?.paymentType || 1,
        payment_status: doc.amountPaid >= totalAmount ? "paid" : "pending",
        items: doc.income || [],
        description: doc.description,
        remarks: doc.remarks,
        pdf_url: doc.url?.he || doc.url?.origin,
        created_at: doc.created,
        sent_at: doc.created,
        paid_at: doc.amountPaid >= totalAmount ? doc.created : null,
      })

      if (!error) {
        newDocumentsCount++
      } else {
        console.error("[sync-financial-data] Error inserting document:", doc.id, error)
      }
    }

    console.log(`[sync-financial-data] Synced ${newDocumentsCount} new documents`)

    // 6. SYNC EXPENSES TO SUPABASE (Only new ones)
    console.log("[sync-financial-data] Syncing expenses to Supabase...")
    let newExpensesCount = 0

    for (const expense of allExpenses) {
      console.log("[sync-financial-data] Processing expense:", JSON.stringify(expense, null, 2))
      
      // Check if already exists
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("green_expense_id", expense.id)
        .single()

      if (existing) {
        console.log("[sync-financial-data] Expense already exists, skipping:", expense.id)
        continue
      }

      // Parse amounts - Green Invoice returns amount as total with VAT
      const totalAmount = parseFloat(expense.amount || 0)
      const amountBeforeVat = parseFloat(expense.amountExcludeVat || 0)
      const vatAmount = parseFloat(expense.vat || 0)

      console.log("[sync-financial-data] Expense amounts:", {
        total: totalAmount,
        beforeVat: amountBeforeVat,
        vat: vatAmount
      })

      // Get category from accountingClassification
      const category = expense.accountingClassification?.title || 
                      expense.description || 
                      "אחר"

      // Convert UNIX timestamp to ISO string
      const createdAt = expense.creationDate 
        ? new Date(expense.creationDate * 1000).toISOString()
        : new Date().toISOString()

      // Insert new expense
      const { error } = await supabase.from("expenses").insert({
        green_expense_id: expense.id,
        amount: amountBeforeVat,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        category: category,
        vendor_name: expense.supplier?.name,
        description: expense.description || expense.remarks || "הוצאה",
        receipt_url: expense.url,
        status: expense.status === 10 ? "approved" : "pending", // Status 10 = approved in Green Invoice
        expense_date: expense.date || new Date().toISOString().split("T")[0],
        created_at: createdAt,
      })

      if (!error) {
        newExpensesCount++
        console.log("[sync-financial-data] Expense inserted successfully:", expense.id)
      } else {
        console.error("[sync-financial-data] Error inserting expense:", expense.id, error)
      }
    }

    console.log(`[sync-financial-data] Synced ${newExpensesCount} new expenses`)

    // 7. CALCULATE TOTALS
    const totalIncome = allDocuments.reduce((sum, doc) => {
      return sum + parseFloat(doc.amount || 0)
    }, 0)

    const totalExpenses = allExpenses.reduce((sum, exp) => {
      return sum + parseFloat(exp.amount || 0)
    }, 0)

    const netProfit = totalIncome - totalExpenses

    console.log("[sync-financial-data] Summary:", {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
    })

    // 8. UPDATE STATS CACHE FOR CURRENT MONTH
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    console.log("[sync-financial-data] Refreshing stats cache...")

    // Call the refresh_financial_stats function
    await supabase.rpc("refresh_financial_stats", {
      p_year: currentYear,
      p_month: currentMonth,
    })

    console.log("[sync-financial-data] Stats cache refreshed")

    // 9. SUCCESS RESPONSE
    const response: SyncResponse = {
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        documentCount: allDocuments.length,
        expenseCount: allExpenses.length,
        newDocuments: newDocumentsCount,
        newExpenses: newExpensesCount,
      },
    }

    console.log("[sync-financial-data] Sync complete!")

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[sync-financial-data] Error:", error)

    const errorResponse: SyncResponse = {
      success: false,
      summary: {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        documentCount: 0,
        expenseCount: 0,
        newDocuments: 0,
        newExpenses: 0,
      },
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
 * 1. Ensure database schema is created with all tables
 *
 * 2. Deploy this function:
 *    supabase functions deploy sync-financial-data
 *
 * 3. Test:
 *    curl -X POST https://your-project.supabase.co/functions/v1/sync-financial-data \
 *      -H "Authorization: Bearer YOUR_ANON_KEY"
 *
 * 4. Set up a cron job to run this daily:
 *    In Supabase Dashboard > Database > Functions > Create Trigger
 *    Schedule: 0 2 * * * (2 AM daily)
 */
