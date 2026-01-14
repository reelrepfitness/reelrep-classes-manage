import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import RevenueWidget from '@/components/admin/dashboard/RevenueWidget';
import LeadFunnelWidget from '@/components/admin/dashboard/LeadFunnelWidget';
import DailyClassesWidget from '@/components/admin/dashboard/DailyClassesWidget';
import StatsGrid from '@/components/admin/dashboard/StatsGrid';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminDashboard() {
  const { revenue, funnel, stats, todaysClasses, loading, refresh } = useAdminDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Transform Stats for Grid
  const statsGridData = [
    { key: 'debts', label: `חייבים (₪${stats.debts.total})`, value: stats.debts.count, icon: 'card' as const, color: '#EF4444', route: '/admin/financial/debts' as any },
    { key: 'frozen', label: 'מנויים בהקפאה', value: stats.frozen, icon: 'snow' as const, color: '#3B82F6', route: '/admin/clients/frozen' as any },
    { key: 'active', label: 'מנויים פעילים', value: stats.active, icon: 'people' as const, color: '#10B981', route: '/admin/clients/active' as any },
    { key: 'tasks', label: 'לטיפול דחוף', value: stats.tasks, icon: 'alert-circle' as const, color: '#F97316', route: '/admin-alerts' as any },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader title="מסך ניהול" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Revenue Hero */}
        <RevenueWidget
          revenue={revenue.total}
          trend={revenue.trend}
          trendUp={revenue.trendUp}
          data={revenue.chartData}
        />

        {/* 2. Lead Funnel */}
        <LeadFunnelWidget
          newLeads={funnel.newLeads}
          trials={funnel.trials}
          conversionRate={funnel.conversionRate}
        />

        {/* 3. Daily Studio */}
        <DailyClassesWidget classes={todaysClasses} />

        {/* 4. Stats Grid */}
        <StatsGrid stats={statsGridData} />

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Light Background for Content
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 24,
  },
});
