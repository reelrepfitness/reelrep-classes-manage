# 🚀 Green Invoice Integration - Complete Setup Guide

This guide will walk you through setting up the complete Green Invoice integration for Reel Rep Training.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Supabase Secrets Configuration](#supabase-secrets-configuration)
4. [Edge Functions Deployment](#edge-functions-deployment)
5. [Testing](#testing)
6. [Usage in App](#usage-in-app)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ Supabase project set up
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Green Invoice account (production or sandbox)
- ✅ Green Invoice API credentials (ID and Secret)
- ✅ Admin user in your app (with `role = 'admin'`)

---

## 1. Database Setup

### Step 1: Run the Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `sql-guieds (DO-NOT-TOUCH)/green-invoice-integration.sql`
5. Run the migration

This will create:
- `invoices` table
- `expenses` table
- `product_catalog` table
- `financial_stats_cache` table
- All RLS policies
- Helper functions
- Sample product data

### Step 2: Update Product Prices

The migration inserts products with `₪0` prices. Update them:

```sql
-- Update with your actual prices
UPDATE product_catalog SET base_price = 500 WHERE sku = 'SUB-MONTHLY';
UPDATE product_catalog SET base_price = 1350 WHERE sku = 'SUB-QUARTERLY';
UPDATE product_catalog SET base_price = 4800 WHERE sku = 'SUB-ANNUAL';
UPDATE product_catalog SET base_price = 800 WHERE sku = 'CARD-10';
UPDATE product_catalog SET base_price = 1500 WHERE sku = 'CARD-20';
UPDATE product_catalog SET base_price = 2500 WHERE sku = 'PREMIUM-PACKAGE';
UPDATE product_catalog SET base_price = 300 WHERE sku = 'PT-SINGLE';
```

### Step 3: Verify Tables

Run this query to verify everything was created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invoices', 'expenses', 'product_catalog', 'financial_stats_cache');
```

You should see all 4 tables.

---

## 2. Supabase Secrets Configuration

### Get Your Green Invoice Credentials

1. Log in to [Green Invoice](https://www.greeninvoice.co.il) (or sandbox)
2. Go to **Settings** → **API**
3. Copy your **API ID** and **Secret**

**IMPORTANT:** For testing, use the **sandbox environment**:
- Sandbox URL: https://lp.sandbox.d.greeninvoice.co.il/join/
- No real charges
- No need for credit card

### Set Secrets in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add these secrets:

```bash
# For Production
GREEN_INVOICE_ID=your_production_api_id
GREEN_INVOICE_SECRET=your_production_secret

# For Sandbox (Testing)
GREEN_INVOICE_ID=your_sandbox_api_id
GREEN_INVOICE_SECRET=your_sandbox_secret
```

**Note:** The edge functions are currently configured for **production** API (`https://api.greeninvoice.co.il`). If you want to use sandbox, update the `API_BASE_URL` in each edge function to:

```typescript
const API_BASE_URL = "https://sandbox.d.greeninvoice.co.il/api/v1"
```

---

## 3. Edge Functions Deployment

### Prerequisites

1. Link your local project to Supabase:

```bash
cd /Users/ivanzaits/Desktop/reel-rep-training-app-main
supabase link --project-ref YOUR_PROJECT_REF
```

2. Login to Supabase CLI:

```bash
supabase login
```

### Deploy Functions

Deploy each function in order:

```bash
# 1. Auth function (must be first)
supabase functions deploy green-invoice-auth

# 2. Create invoice function
supabase functions deploy create-invoice

# 3. Sync data function
supabase functions deploy sync-financial-data
```

### Verify Deployment

Check that all functions are live:

```bash
supabase functions list
```

You should see:
- ✅ `green-invoice-auth` - ACTIVE
- ✅ `create-invoice` - ACTIVE
- ✅ `sync-financial-data` - ACTIVE

---

## 4. Testing

### Test 1: Authentication

Test that the auth function can get a token:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/green-invoice-auth \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**If you get an error:**
- Check that `GREEN_INVOICE_ID` and `GREEN_INVOICE_SECRET` are set correctly
- Verify credentials are valid in Green Invoice dashboard
- Check function logs: `supabase functions logs green-invoice-auth`

### Test 2: Create Invoice (₪1 Test)

**IMPORTANT:** Always test with a small amount first!

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-invoice \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "USER_UUID_HERE",
    "items": [
      {
        "sku": "SUB-MONTHLY",
        "quantity": 1,
        "price": 1.00
      }
    ],
    "paymentType": 1,
    "remarks": "Test invoice - ₪1",
    "sendEmail": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "...",
    "total_amount": 1.00,
    ...
  },
  "pdfUrl": "https://www.greeninvoice.co.il/..."
}
```

**Verify:**
1. Check Green Invoice dashboard - invoice should be there
2. Check Supabase `invoices` table - invoice should be saved
3. Open the `pdfUrl` to see the PDF

### Test 3: Sync Data

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-financial-data \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "totalIncome": 1.00,
    "totalExpenses": 0,
    "netProfit": 1.00,
    "documentCount": 1,
    "expenseCount": 0,
    "newDocuments": 0,
    "newExpenses": 0
  }
}
```

---

## 5. Usage in App

### In Your React Native App

```typescript
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { PaymentType } from '@/types/green-invoice';

function CreateInvoiceScreen() {
  const { createInvoice, loading, error } = useGreenInvoice();

  const handleCreateInvoice = async () => {
    try {
      const result = await createInvoice({
        clientId: 'user-uuid-here',
        items: [
          {
            sku: 'SUB-MONTHLY',
            quantity: 1,
            price: 500,
            customDescription: 'מנוי חודשי - ינואר 2026'
          }
        ],
        paymentType: PaymentType.CREDIT_CARD,
        remarks: 'תודה על המנוי!',
        sendEmail: true // Green Invoice will send PDF to client
      });

      if (result.success) {
        Alert.alert('הצלחה!', 'החשבונית נוצרה ונשלחה ללקוח');
        console.log('PDF URL:', result.pdfUrl);
      }
    } catch (err) {
      Alert.alert('שגיאה', err.message);
    }
  };

  return (
    <Button
      title="צור חשבונית"
      onPress={handleCreateInvoice}
      loading={loading}
    />
  );
}
```

### Get Dashboard Data

```typescript
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';

function AdminDashboard() {
  const { getDashboardSummary, syncFinancialData } = useGreenInvoice();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const data = await getDashboardSummary();
    setSummary(data);
  };

  const handleRefresh = async () => {
    // Sync data from Green Invoice first
    await syncFinancialData();

    // Then reload dashboard
    await loadDashboard();
  };

  return (
    <View>
      <Text>הכנסות החודש: ₪{summary?.currentMonth.income}</Text>
      <Text>הוצאות החודש: ₪{summary?.currentMonth.expenses}</Text>
      <Text>רווח נקי: ₪{summary?.currentMonth.profit}</Text>

      <Button title="רענן נתונים" onPress={handleRefresh} />
    </View>
  );
}
```

---

## 6. Integrating with POS

Update your POS payment flow (`/app/admin/pos/payment.tsx`):

```typescript
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';
import { PaymentType } from '@/types/green-invoice';

// In your payment handler:
const handleFinish = async () => {
  try {
    setLoading(true);

    // Map your payment method to Green Invoice payment type
    const paymentTypeMap: Record<string, PaymentType> = {
      'credit_card': PaymentType.CREDIT_CARD,
      'cash': PaymentType.CASH,
      'bit': PaymentType.BIT,
      'debt': PaymentType.CASH, // or handle differently
    };

    // Create invoice via Green Invoice
    const result = await createInvoice({
      clientId: clientData.id,
      items: cartItems.map(item => ({
        sku: item.sku || 'MISC-001', // Make sure items have SKU
        quantity: item.quantity || 1,
        price: item.price,
        customDescription: item.name
      })),
      paymentType: paymentTypeMap[mainPayment.method],
      remarks: 'תודה שבחרת ב-Reel Rep Training! 💪',
      sendEmail: true
    });

    if (result.success) {
      Alert.alert("הצלחה", "העסקה הושלמה והחשבונית הופקה!", [
        {
          text: "הצג חשבונית",
          onPress: () => Linking.openURL(result.pdfUrl!)
        },
        {
          text: "סגור",
          onPress: () => router.dismissAll()
        }
      ]);
    }
  } catch (e: any) {
    Alert.alert("שגיאה", e.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 7. Troubleshooting

### Problem: "Missing GREEN_INVOICE credentials"

**Solution:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Make sure `GREEN_INVOICE_ID` and `GREEN_INVOICE_SECRET` are set
3. Redeploy the function: `supabase functions deploy green-invoice-auth`

### Problem: "Green Invoice authentication failed (401)"

**Solution:**
- Your API credentials are incorrect
- Check if you're using sandbox credentials with production URL (or vice versa)
- Verify credentials in Green Invoice dashboard

### Problem: "Admin access required"

**Solution:**
- Make sure your user has `role = 'admin'` in the `profiles` table
- Check: `SELECT id, role FROM profiles WHERE id = 'your-user-id';`
- Update if needed: `UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id';`

### Problem: "Product not found: SUB-MONTHLY"

**Solution:**
- The SKU doesn't exist in `product_catalog` table
- Check: `SELECT * FROM product_catalog;`
- Make sure the SKU in your request matches exactly

### Problem: "Failed to save invoice: Permission denied"

**Solution:**
- RLS policies are blocking the insert
- Edge functions should use `SUPABASE_SERVICE_ROLE_KEY` (not ANON_KEY)
- Check the function code uses `createClient` with `SERVICE_ROLE_KEY`

### Problem: Invoice created in Green Invoice but not saved to Supabase

**Solution:**
- Check function logs: `supabase functions logs create-invoice --limit 50`
- Verify RLS policies allow service role to insert
- Check for database constraint violations

### Viewing Function Logs

```bash
# View recent logs for a function
supabase functions logs green-invoice-auth --limit 20
supabase functions logs create-invoice --limit 20
supabase functions logs sync-financial-data --limit 20

# Stream live logs
supabase functions logs create-invoice --follow
```

---

## 8. Daily Data Sync (Optional)

To keep your dashboard updated, set up a daily sync:

### Option 1: Manual Sync Button

Add a "רענן נתונים" button in your admin dashboard that calls `syncFinancialData()`.

### Option 2: Automatic Daily Sync (Supabase Cron)

Create a scheduled function:

1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL:

```sql
-- Schedule sync to run daily at 2 AM
SELECT cron.schedule(
  'sync-green-invoice-daily',
  '0 2 * * *', -- 2 AM every day
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-financial-data',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
```

**Note:** Replace `YOUR_PROJECT_REF` and `YOUR_SERVICE_ROLE_KEY`.

---

## 9. Next Steps

Now that Green Invoice is integrated:

1. ✅ Test creating a real invoice (₪1 first!)
2. ✅ Integrate invoice creation into your POS workflow
3. ✅ Build admin dashboard screens to view analytics
4. ✅ Add invoice list screen for clients
5. ✅ Set up expense tracking (if needed)
6. ✅ Configure automatic daily sync

---

## 📚 Additional Resources

- [Green Invoice API Documentation](https://www.greeninvoice.co.il/api)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [TypeScript Types Reference](./types/green-invoice.ts)

---

## ⚠️ Important Security Notes

1. **NEVER commit API credentials** to git
2. **Always use Edge Functions** for API calls (not from mobile app)
3. **Test with small amounts** (₪1) before real invoices
4. **Use sandbox environment** for development
5. **RLS policies** ensure only admin can see financial data
6. **Service role key** should only be in Edge Functions, never in app code

---

## 🎯 Success Checklist

- [ ] Database migration completed
- [ ] Secrets configured in Supabase
- [ ] All 3 edge functions deployed
- [ ] Auth function tested successfully
- [ ] Created test invoice (₪1)
- [ ] Invoice appears in Green Invoice dashboard
- [ ] Invoice saved to Supabase
- [ ] Sync function tested
- [ ] Product prices updated
- [ ] Admin user has correct role
- [ ] Ready for production! 🚀

---

**Need help?** Check the function logs or review the error codes in the Green Invoice API documentation.

Good luck! 💪
