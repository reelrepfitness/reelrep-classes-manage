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
    activeSparkline: number[];
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
    const [stats, setStats] = useState<DashboardStats>({ active: 0, activeSparkline: [], debts: { count: 0, total: 0 }, frozen: 0, tasks: 0 });
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

        // Sparkline: weekly new-subscription counts for last 8 weeks
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        const { data: sparkRows } = await supabase
            .from('user_subscriptions')
            .select('created_at')
            .gte('created_at', eightWeeksAgo.toISOString())
            .eq('is_active', true);

        const buckets = new Array(8).fill(0);
        const now = Date.now();
        sparkRows?.forEach((r: any) => {
            const age = now - new Date(r.created_at).getTime();
            const week = Math.min(7, Math.floor(age / (7 * 24 * 60 * 60 * 1000)));
            buckets[7 - week]++;
        });

        setStats({
            active: active || 0,
            activeSparkline: buckets,
            frozen: frozen || 0,
            debts: { count: debtCount, total: debtTotal },
            tasks: tasks || 0
        });
    };

    // 4. Classes – generate from class_schedules (same pattern as ClassesContext)
    const fetchClasses = async () => {
        const now = new Date();
        // day_of_week in DB is 1-based (1=Sunday..7=Saturday), JS getDay() is 0-based
        const todayDow = now.getDay() + 1;

        const { data: schedules } = await supabase
            .from('class_schedules')
            .select('id, name, coach_name, start_time, max_participants')
            .eq('is_active', true)
            .eq('day_of_week', todayDow)
            .order('start_time');

        if (!schedules || schedules.length === 0) {
            setTodaysClasses([]);
            return;
        }

        // Get today's actual class records (from classes table) for these schedules
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const startOfDay = `${todayStr}T00:00:00`;
        const endOfDay = `${todayStr}T23:59:59`;
        const scheduleIds = schedules.map(s => s.id);

        const { data: todayClassRecords } = await supabase
            .from('classes')
            .select('id, schedule_id')
            .in('schedule_id', scheduleIds)
            .gte('class_date', startOfDay)
            .lte('class_date', endOfDay);

        // Fetch bookings for today's class records
        const countMap = new Map<string, number>();
        if (todayClassRecords && todayClassRecords.length > 0) {
            const classIds = todayClassRecords.map(c => c.id);
            const { data: bookings } = await supabase
                .from('class_bookings')
                .select('class_id')
                .in('class_id', classIds)
                .in('status', ['confirmed', 'completed', 'no_show', 'late']);

            // Map class_id back to schedule_id for counting
            const classToSchedule = new Map(todayClassRecords.map(c => [c.id, c.schedule_id]));
            bookings?.forEach((b: any) => {
                const sid = classToSchedule.get(b.class_id);
                if (sid) countMap.set(sid, (countMap.get(sid) || 0) + 1);
            });
        }

        const formatted: DailyClass[] = schedules.map(s => ({
            id: `virtual_${s.id}`,
            time: s.start_time?.substring(0, 5) || '',
            name: s.name,
            coach: s.coach_name || 'מאמן',
            current: countMap.get(s.id) || 0,
            max: s.max_participants || 12,
        }));

        setTodaysClasses(formatted);
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
