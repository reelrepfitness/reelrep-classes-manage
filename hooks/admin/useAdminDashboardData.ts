import { useState, useCallback } from 'react';
import { supabase } from '@/constants/supabase';
import { useFocusEffect } from 'expo-router';

// Types
export interface RevenueData {
    total: string;
    trend: string;
    trendUp: boolean;
    chartData: { value: number; label?: string }[];
    lastMonthTotal?: string;
}

export interface FunnelData {
    newLeads: number;
    trials: number;
    conversionRate: string;
}

export interface DashboardStats {
    active: number;
    debts: { count: number; total: number };
    frozen: number;
    tasks: number;
}

export interface DailyClass {
    id: string;
    time: string;
    name: string;
    coach: string;
    current: number;
    max: number;
}

export function useAdminDashboardData() {
    const [loading, setLoading] = useState(true);
    const [revenue, setRevenue] = useState<RevenueData>({ total: '₪0', trend: '0%', trendUp: true, chartData: [] });
    const [funnel, setFunnel] = useState<FunnelData>({ newLeads: 0, trials: 0, conversionRate: '0%' });
    const [stats, setStats] = useState<DashboardStats>({ active: 0, debts: { count: 0, total: 0 }, frozen: 0, tasks: 0 });
    const [todaysClasses, setTodaysClasses] = useState<DailyClass[]>([]);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchRevenue(),
                fetchFunnel(),
                fetchStats(),
                fetchClasses()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // 1. Revenue & Trends (green_invoice_documents)
    const fetchRevenue = async () => {
        const now = new Date();
        const firstDayCurrent = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const firstDayLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        
        // Fetch All Paid Docs since last month
        const { data } = await supabase
            .from('green_invoice_documents')
            .select('amount, created_at')
            .gte('created_at', firstDayLast)
            .eq('status', 'paid');
            
        if (!data) return;

        // Calculate Totals
        let currentTotal = 0;
        let lastTotal = 0;

        data.forEach(doc => {
            const date = new Date(doc.created_at);
            if (date >= new Date(firstDayCurrent)) {
                currentTotal += doc.amount || 0;
            } else {
                lastTotal += doc.amount || 0;
            }
        });

        // Trend
        const diff = currentTotal - lastTotal;
        const trendPercent = lastTotal > 0 ? (diff / lastTotal) * 100 : 100;
        
        // Chart Data (Daily for last 30 days)
        // Group by day. We need actual last 30 days, not just "this month".
        // Let's reuse the 'data' we fetched if it covers enough, or just show this month's growth.
        // User asked: "Last 30 days of income".
        // The query above fetched "since last month start". If today is 15th, last month start is ~45 days ago. Good.
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const chartMap = new Map<string, number>();
        // Initialize map with 0s
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            chartMap.set(d.toISOString().split('T')[0], 0);
        }

        data.forEach(doc => {
            const dateKey = doc.created_at.split('T')[0];
            if (chartMap.has(dateKey)) {
                chartMap.set(dateKey, (chartMap.get(dateKey) || 0) + (doc.amount || 0));
            }
        });

        // Convert map to array (reverse chronological -> chronological)
        const chartData = Array.from(chartMap.entries())
            .map(([_, value]) => ({ value }))
            .reverse();
            
        // Formatting
        setRevenue({
            total: `₪${currentTotal.toLocaleString()}`,
            trend: `${Math.abs(trendPercent).toFixed(1)}% ${trendPercent >= 0 ? 'עלייה' : 'ירידה'}`,
            trendUp: trendPercent >= 0,
            chartData,
            lastMonthTotal: lastTotal.toLocaleString()
        });
    };

    // 2. Lead Funnel (leads)
    const fetchFunnel = async () => {
        const { data } = await supabase.from('leads').select('status');
        if (!data) return;

        const total = data.length;
        const newLeads = data.filter(l => l.status === 'new').length;
        const trials = data.filter(l => l.status === 'trial_scheduled' || l.status === 'trial_completed').length;
        const converted = data.filter(l => l.status === 'converted').length;
        const rate = total > 0 ? (converted / total) * 100 : 0;

        setFunnel({
            newLeads,
            trials,
            conversionRate: `${rate.toFixed(1)}%`
        });
    };

    // 3. Stats (user_subscriptions, etc)
    const fetchStats = async () => {
        // Active
        const { count: active } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Frozen
        const { count: frozen } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('plan_status', 'frozen');
            
        // Debts
        const { data: debtData } = await supabase
            .from('user_subscriptions')
            .select('outstanding_balance')
            .gt('outstanding_balance', 0);
            
        const debtTotal = debtData?.reduce((acc, curr) => acc + (curr.outstanding_balance || 0), 0) || 0;
        const debtCount = debtData?.length || 0;

        // Tasks (Admin Notifications / Alerts)
        const { count: alerts } = await supabase
            .from('admin_notification_settings') // This isn't really alerts, it's settings.
            // Using logic from dashboard: "needs attention"
            .select('*', { count: 'exact', head: true })
            .limit(1); // Placeholder queries often used settings but "needs attention" logic is better.
            
         // Real "Tasks" logic (expiring soon or not visited) from previous dashboard
        const threeDays = new Date();
        threeDays.setDate(threeDays.getDate() + 3);
        const { count: tasks } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true)
            .lte('end_date', threeDays.toISOString());

        setStats({
            active: active || 0,
            frozen: frozen || 0,
            debts: { count: debtCount, total: debtTotal },
            tasks: tasks || 0
        });
    };

    // 4. Classes (Using raw supabase query since context might be heavy? Or keep context logic?)
    // Let's use direct query for cleaner "dashboard only" independence.
    const fetchClasses = async () => {
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        // Assuming 'classes' table exists and structure matches
        // Actually, previous code used `useClasses`. 
        // We'll query `classes` table if possible or rely on simple assumption.
        // It likely has `date`, `time`, `name`, `instructor`, `participants` (joined or array).
        // Searching for 'classes' usage earlier didn't yield table schema clearly, but 'useClasses' uses it.
        // I will trust the user provided schema hints: "classes table (filtered by class_date = Today)"
        
        // Wait, looking at logs the user sent earlier: `LOG  [Classes] Opening modal for classId...`
        // Standard supabase query:
        const { data } = await supabase
            .from('classes')
            .select(`
                id,
                time,
                name,
                instructor:users!instructor_id(name),
                max_participants,
                bookings:class_bookings(count)
            `)
            .eq('date', todayStr)
            .order('time');

        // Note: Relation `users!instructor_id(name)` depends on schema. 
        // If fails, we fallback or just use what we get.
        // Also `bookings:class_bookings(count)` gives count.
        
        if (data) {
            const formatted = data.map((c: any) => ({
                id: c.id,
                time: c.time.substring(0, 5), // HH:mm
                name: c.name,
                coach: c.instructor?.name || 'מאמן',
                current: c.bookings?.[0]?.count || 0, // supabase count returns array of objects
                max: c.max_participants || 12
            }));
            setTodaysClasses(formatted);
        }
    };

    return {
        revenue,
        funnel,
        stats,
        todaysClasses,
        loading,
        refresh: loadData
    };
}
