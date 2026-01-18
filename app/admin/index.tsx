import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DashboardStatsCarousel from '@/components/admin/dashboard/DashboardStatsCarousel';
import LeadFunnelWidget from '@/components/admin/dashboard/LeadFunnelWidget';
import DailyClassesWidget from '@/components/admin/dashboard/DailyClassesWidget';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { funnel, stats, todaysClasses, refresh } = useAdminDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>התנתק מהמערכת</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
