import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, AlertCircle, DollarSign, Pause, LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminActionTabs } from '@/components/admin/AdminActionTabs';
import { useClasses } from '@/contexts/ClassesContext';
import { Calendar, Clock, ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import AdminClassModal from '@/components/admin/AdminClassModal';

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { classes } = useClasses();

  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter Today's Classes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toLocaleDateString('en-CA'); // Matches YYYY-MM-DD format used in context

  const todaysClasses = classes
    .filter(c => c.date === todayString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return Colors.error; // Red
    if (percentage < 80) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const handleClassPress = (classItem: any) => {
    setSelectedClass(classItem);
    setModalVisible(true);
  };

  // Fetch active subscriptions count
  const { data: activeSubscriptions = 0 } = useQuery({
    queryKey: ['admin-active-subscriptions'],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    },
  });

  // Fetch clients needing attention (expiring soon or last workout)
  const { data: needsAttention = 0 } = useQuery({
    queryKey: ['admin-needs-attention'],
    queryFn: async () => {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { count } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('end_date', threeDaysFromNow.toISOString());

      return count || 0;
    },
  });

  // Fetch debts (clients who owe money)
  const { data: debtsData } = useQuery({
    queryKey: ['admin-debts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('outstanding_balance')
        .gt('outstanding_balance', 0);

      const totalDebt = data?.reduce((sum, item) => sum + (item.outstanding_balance || 0), 0) || 0;
      const count = data?.length || 0;
      return { count, totalDebt };
    },
  });

  // Fetch frozen plans count
  const { data: frozenPlans = 0 } = useQuery({
    queryKey: ['admin-frozen-plans'],
    queryFn: async () => {
      const { count } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan_status', 'frozen');

      return count || 0;
    },
  });



  // ... inside component
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');

  // ... 

  // Handle Trend Logic
  React.useEffect(() => {
    const checkTrend = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const storedDate = await AsyncStorage.getItem('admin_trend_date');
        const storedBaseline = await AsyncStorage.getItem('admin_trend_baseline');

        if (storedDate !== todayStr || storedBaseline === null) {
          // New day or first run: set baseline
          await AsyncStorage.setItem('admin_trend_date', todayStr);
          await AsyncStorage.setItem('admin_trend_baseline', needsAttention.toString());
          setTrend('neutral');
        } else {
          // Same day: compare
          const baseline = parseInt(storedBaseline, 10);
          if (needsAttention > baseline) {
            setTrend('up');
          } else if (needsAttention < baseline) {
            setTrend('down');
          } else {
            setTrend('neutral');
          }
        }
      } catch (e) {
        console.error('Failed to update trend', e);
      }
    };
    checkTrend();
  }, [needsAttention]);

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  const actionCards = [
    {
      label: 'מנויים פעילים',
      value: activeSubscriptions.toString(),
      icon: Users,
      color: Colors.primary,
      route: '/admin/clients/active',
    },
    {
      label: 'דורשים טיפול',
      value: needsAttention.toString(),
      icon: AlertCircle,
      color: '#f59e0b',
      route: '/admin/clients/needs-attention',
      borderColor: trend === 'up' ? Colors.error : trend === 'down' ? '#22c55e' : undefined,
    },
    {
      label: 'חייבים',
      value: (debtsData?.count || 0).toString(),
      subtitle: debtsData?.totalDebt ? `₪${debtsData.totalDebt.toFixed(0)}` : undefined,
      icon: DollarSign,
      color: '#ef4444',
      route: '/admin/clients/debts',
    },
    {
      label: 'הקפאות',
      value: frozenPlans.toString(),
      icon: Pause,
      color: '#06b6d4',
      route: '/admin/clients/frozen',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >


        // ...

        {/* Income/Actions Tabs */}
        <View style={styles.chartSection}>
          <AdminActionTabs />
        </View>

        {/* Action Cards Grid */}
        <View style={styles.cardsGrid}>
          {actionCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionCard,
                (card as any).borderColor && { borderColor: (card as any).borderColor, borderWidth: 2 }
              ]}
              onPress={() => router.push(card.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
                <card.icon size={24} color={card.color} />
              </View>
              <Text style={styles.cardValue}>{card.value}</Text>
              {card.subtitle && (
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              )}
              <Text style={styles.cardLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Classes Section */}
        {todaysClasses.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>שיעורים היום</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {todaysClasses.map((classItem) => {
                const percentage = Math.min(100, (classItem.enrolled / classItem.capacity) * 100);
                const progressColor = getProgressColor(percentage);

                return (
                  <TouchableOpacity
                    key={classItem.id}
                    style={styles.classCard}
                    onPress={() => handleClassPress(classItem)}
                    activeOpacity={0.7}
                  >
                    {/* Top: Info */}
                    <View style={{ alignItems: 'flex-end', width: '100%' }}>
                      <Text style={styles.className} numberOfLines={2}>{classItem.title}</Text>
                      <View style={styles.classTimeRow}>
                        <Clock size={12} color={Colors.textSecondary} />
                        <Text style={styles.classTime}>{classItem.time}</Text>
                      </View>
                    </View>

                    {/* Bottom: Stats */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
                      {/* Stats Text */}
                      <Text style={styles.capacityText}>
                        {classItem.enrolled}/{classItem.capacity}
                      </Text>

                      {/* Vertical Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              height: `${percentage}%`,
                              backgroundColor: progressColor
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AdminClassModal
        visible={modalVisible}
        classItem={selectedClass}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logoutButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  chartSection: {
    marginBottom: 24,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 20, // Slightly rounder
    padding: 24, // More breathing room
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  sectionContainer: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 16,
    writingDirection: 'rtl',
  },
  classCard: {
    width: 150,
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  classTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  capacityText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  progressBarContainer: {
    width: 6,
    height: 35,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressBarFill: {
    width: '100%',
    borderRadius: 10,
  },
});
