import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DashboardStatsCarousel from '@/components/admin/dashboard/DashboardStatsCarousel';
import LeadFunnelWidget from '@/components/admin/dashboard/LeadFunnelWidget';
import DailyClassesWidget from '@/components/admin/dashboard/DailyClassesWidget';
import StatsGrid from '@/components/admin/dashboard/StatsGrid';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AdminDashboard() {
  const { funnel, stats, todaysClasses, refresh } = useAdminDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Transform Stats for Grid
  const statsGridData = [
    { key: 'exercises', label: 'ניהול תרגילים', value: '', icon: 'barbell' as const, color: '#8B5CF6', route: '/admin/exercises' as any },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AdminHeader title="מסך ניהול" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. New Horizontal Stats Carousel (Revenue, Urgent, Subscriptions) */}
        <DashboardStatsCarousel />

        {/* 2. Lead Funnel */}
        <LeadFunnelWidget
          newLeads={funnel.newLeads}
          trials={funnel.trials}
          conversionRate={funnel.conversionRate}
        />

        {/* 3. Daily Studio */}
        <DailyClassesWidget classes={todaysClasses} />

        {/* 4. Stats Grid (Remaining Items) */}
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
