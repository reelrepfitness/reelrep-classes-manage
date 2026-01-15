// ============================================
// PAYMENT WEBHOOK EDGE FUNCTION
// ============================================
// Receives payment status updates from Green Invoice
// Automatically creates subscriptions/tickets on successful payment
// No auth required (webhook from Green Invoice)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    console.log("[payment-webhook] Received payment notification")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Parse webhook data
    const webhookData = await req.json()
    console.log("[payment-webhook] Webhook data:", JSON.stringify(webhookData, null, 2))

    // Extract invoice ID from custom field
    const invoiceId = webhookData.custom || webhookData.invoiceId
    const paymentStatus = webhookData.status
    const transactionId = webhookData.transactionId || webhookData.id
    const greenInvoiceId = webhookData.documentId || webhookData.id

    if (!invoiceId) {
      console.error("[payment-webhook] No invoice ID in webhook data")
      return new Response(
        JSON.stringify({ error: "Missing invoice ID" }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Fetch invoice with cart items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, user_id, cart_items, payment_status')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('[payment-webhook] Invoice not found:', invoiceId, invoiceError)
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Determine new status
    let newStatus = "pending"
    if (paymentStatus === "success" || paymentStatus === "approved") {
      newStatus = "paid"
    } else if (paymentStatus === "failed" || paymentStatus === "declined") {
      newStatus = "failed"
    }

    console.log("[payment-webhook] Updating invoice:", invoiceId, "to status:", newStatus)

    // Update invoice in database
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        payment_status: newStatus,
        green_invoice_id: greenInvoiceId,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    if (updateError) {
      console.error("[payment-webhook] Error updating invoice:", updateError)
      throw updateError
    }

    // Log payment transaction
    await supabase.from("payment_transactions").insert({
      invoice_id: invoiceId,
      user_id: invoice.user_id,
      transaction_id: transactionId,
      payment_method: 'credit_card',
      payment_status: newStatus,
      amount: webhookData.amount || 0,
      webhook_data: webhookData,
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error("[payment-webhook] Error logging transaction:", error)
    })

    // ==========================================
    // CRITICAL: CREATE SUBSCRIPTIONS/TICKETS
    // ==========================================
    if (newStatus === "paid" && invoice.cart_items) {
      console.log('[payment-webhook] Payment successful - creating subscriptions/tickets')

      const cartItems = invoice.cart_items as any[]
      const createdSubscriptions: string[] = []
      const createdTickets: string[] = []

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
                payment_method: 'credit_card',
                payment_reference: greenInvoiceId,
                invoice_id: invoiceId,
                has_debt: false,
              })
              .select()
              .single()

            if (ticketError) {
              console.error('[payment-webhook] Error creating ticket:', ticketError)
              throw ticketError
            }

            console.log('[payment-webhook] Ticket created:', ticket.id)
            createdTickets.push(ticket.id)

            // Link ticket to invoice
            await supabase
              .from('invoices')
              .update({ ticket_id: ticket.id })
              .eq('id', invoiceId)

          } else if (item.plan_type === 'subscription') {
            // Create Subscription
            const endDate = new Date()
            endDate.setMonth(endDate.getMonth() + (item.duration_months || 1))

            const { data: subscription, error: subError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: invoice.user_id,
                plan_id: item.plan_id,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: endDate.toISOString(),
                payment_method: 'credit_card',
                payment_reference: greenInvoiceId,
                sessions_used_this_week: 0,
                invoice_id: invoiceId,
                has_debt: false,
              })
              .select()
              .single()

            if (subError) {
              console.error('[payment-webhook] Error creating subscription:', subError)
              throw subError
            }

            console.log('[payment-webhook] Subscription created:', subscription.id)
            createdSubscriptions.push(subscription.id)

            // Link subscription to invoice
            await supabase
              .from('invoices')
              .update({ subscription_id: subscription.id })
              .eq('id', invoiceId)
          }
        } catch (itemError) {
          console.error('[payment-webhook] Error processing item:', item, itemError)
          // Continue with other items even if one fails
        }
      }

      // ==========================================
      // SEND USER NOTIFICATION
      // ==========================================
      await supabase.from('purchase_notifications').insert({
        user_id: invoice.user_id,
        invoice_id: invoiceId,
        notification_type: 'purchase_success',
        title: 'רכישה בוצעה בהצלחה!',
        message: 'המנוי/כרטיסייה שלך הופעל/ה. תוכל להתחיל להזמין אימונים.',
        is_read: false,
        push_sent: false,
        email_sent: false,
      }).then(({ error }) => {
        if (error) console.error('[payment-webhook] Error creating notification:', error)
      })

      console.log('[payment-webhook] Created subscriptions:', createdSubscriptions)
      console.log('[payment-webhook] Created tickets:', createdTickets)
    }

    // ==========================================
    // HANDLE FAILED PAYMENT
    // ==========================================
    if (newStatus === "failed") {
      // Notify admin
      await supabase.from('admin_notifications').insert({
        user_id: invoice.user_id,
        type: 'other',
        title: 'תשלום נכשל',
        message: `תשלום של משתמש ${invoice.user_id} נכשל. סכום: ${webhookData.amount || 0}`,
        payload: { invoiceId, transactionId, webhookData },
        is_read: false,
        status: 'pending',
      }).then(({ error }) => {
        if (error) console.error('[payment-webhook] Error creating admin notification:', error)
      })

      // Notify user
      await supabase.from('purchase_notifications').insert({
        user_id: invoice.user_id,
        invoice_id: invoiceId,
        notification_type: 'purchase_failed',
        title: 'התשלום נכשל',
        message: 'מצטערים, התשלום לא עבר. אנא נסה שוב או פנה לתמיכה.',
        is_read: false,
      }).then(({ error }) => {
        if (error) console.error('[payment-webhook] Error creating user notification:', error)
      })
    }

    console.log("[payment-webhook] Webhook processed successfully")

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[payment-webhook] Error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
