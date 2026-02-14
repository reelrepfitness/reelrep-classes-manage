// ============================================
// MANUAL PAYMENT APPROVAL EDGE FUNCTION
// ============================================
// Allows admins to approve/reject manual payments (Bit, Cash, Bank Transfer, Debt)
// On approval: Creates subscription/ticket and activates it
// Requires admin authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

interface ApprovalRequest {
  approvalId: string
  action: 'approve' | 'reject'
  adminNotes?: string
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
    console.log("[manual-payment-approval] Processing approval request")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Get authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verify admin authentication
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error("[manual-payment-approval] Auth error:", authError)
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin, role")
      .eq("id", user.id)
      .single()

    if (profileError || (!profile?.is_admin && profile?.role !== 'admin')) {
      console.error("[manual-payment-approval] User is not admin:", user.id)
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Parse request body
    const body: ApprovalRequest = await req.json()
    const { approvalId, action, adminNotes } = body

    if (!approvalId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`[manual-payment-approval] Action: ${action} for approval: ${approvalId}`)

    // Fetch pending approval with invoice
    const { data: approval, error: approvalError } = await supabase
      .from("pending_payment_approvals")
      .select("*, invoices(id, user_id, cart_items, payment_status)")
      .eq("id", approvalId)
      .single()

    if (approvalError || !approval) {
      console.error("[manual-payment-approval] Approval not found:", approvalError)
      return new Response(
        JSON.stringify({ error: "Approval not found" }),
        { status: 404, headers: corsHeaders }
      )
    }

    if (approval.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Approval already processed" }),
        { status: 400, headers: corsHeaders }
      )
    }

    const invoice = approval.invoices
    if (!invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: corsHeaders }
      )
    }

    // ==========================================
    // HANDLE APPROVAL
    // ==========================================
    if (action === "approve") {
      console.log("[manual-payment-approval] Approving payment")

      // Update approval status
      await supabase
        .from("pending_payment_approvals")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalId)

      // Update invoice to paid
      await supabase
        .from("invoices")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)

      // Create subscriptions/tickets from cart items
      const cartItems = approval.cart_items as any[]
      const createdSubscriptions: string[] = []
      const createdTickets: string[] = []

      // All manual payment methods (cash, bit, debt) create debt until payment is collected
      const amount = approval.amount

      for (const item of cartItems) {
        try {
          if (item.plan_type === 'ticket') {
            // Create Ticket
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + (item.validity_days || 90))

            const { data: ticket, error: ticketError } = await supabase
              .from('user_tickets')
              .insert({
                user_id: invoice.user_id,
                plan_id: item.plan_id,
                total_sessions: item.total_sessions || 0,
                sessions_remaining: item.total_sessions || 0,
                status: 'active',
                purchase_date: new Date().toISOString(),
                expiry_date: expiryDate.toISOString(),
                payment_method: approval.payment_method,
                payment_reference: `MANUAL-${approvalId}`,
                invoice_id: invoice.id,
                has_debt: true,
                debt_amount: amount,
              })
              .select()
              .single()

            if (ticketError) {
              console.error('[manual-payment-approval] Error creating ticket:', ticketError)
              throw ticketError
            }

            console.log('[manual-payment-approval] Ticket created:', ticket.id)
            createdTickets.push(ticket.id)

            // Link ticket to invoice
            await supabase
              .from('invoices')
              .update({ ticket_id: ticket.id })
              .eq('id', invoice.id)

          } else if (item.plan_type === 'subscription') {
            // Create Subscription
            const startDate = new Date()
            const endDate = new Date()
            endDate.setMonth(endDate.getMonth() + (item.duration_months || 1))

            const { data: subscription, error: subError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: invoice.user_id,
                subscription_id: item.plan_id,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                is_active: true,
                plan_status: 'active',
                payment_method: approval.payment_method,
                payment_reference: `MANUAL-${approvalId}`,
                invoice_id: invoice.id,
                has_debt: true,
                debt_amount: amount,
                outstanding_balance: amount,
              })
              .select()
              .single()

            if (subError) {
              console.error('[manual-payment-approval] Error creating subscription:', subError)
              throw subError
            }

            console.log('[manual-payment-approval] Subscription created:', subscription.id)
            createdSubscriptions.push(subscription.id)

            // Link subscription to invoice
            await supabase
              .from('invoices')
              .update({ subscription_id: subscription.id })
              .eq('id', invoice.id)
          }
        } catch (itemError) {
          console.error('[manual-payment-approval] Error processing item:', item, itemError)
          // Continue with other items even if one fails
        }
      }

      // Send success notification to user
      await supabase.from('purchase_notifications').insert({
        user_id: invoice.user_id,
        invoice_id: invoice.id,
        notification_type: 'debt_activated',
        title: 'מנוי הופעל',
        message: `המנוי/כרטיסייה שלך הופעל/ה. יתרת חוב: ₪${amount}.`,
        is_read: false,
        push_sent: false,
        email_sent: false,
      }).then(({ error }) => {
        if (error) console.error('[manual-payment-approval] Error creating notification:', error)
      })

      console.log('[manual-payment-approval] Created subscriptions:', createdSubscriptions)
      console.log('[manual-payment-approval] Created tickets:', createdTickets)

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment approved",
          subscriptions: createdSubscriptions,
          tickets: createdTickets,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ==========================================
    // HANDLE REJECTION
    // ==========================================
    if (action === "reject") {
      console.log("[manual-payment-approval] Rejecting payment")

      // Update approval status
      await supabase
        .from("pending_payment_approvals")
        .update({
          status: "rejected",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approvalId)

      // Update invoice to cancelled
      await supabase
        .from("invoices")
        .update({
          payment_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id)

      // Send rejection notification to user
      await supabase.from('purchase_notifications').insert({
        user_id: invoice.user_id,
        invoice_id: invoice.id,
        notification_type: 'purchase_failed',
        title: 'תשלום נדחה',
        message: adminNotes
          ? `מצטערים, התשלום שלך נדחה. סיבה: ${adminNotes}`
          : 'מצטערים, התשלום שלך נדחה. אנא פנה לתמיכה למידע נוסף.',
        is_read: false,
      }).then(({ error }) => {
        if (error) console.error('[manual-payment-approval] Error creating notification:', error)
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment rejected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: corsHeaders }
    )

  } catch (error) {
    console.error("[manual-payment-approval] Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
