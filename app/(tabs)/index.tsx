import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { UpcomingWorkoutsStack } from '@/components/home/UpcomingWorkoutsStack';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { Icon } from '@/components/ui/icon';

const { width } = Dimensions.get('window');

// --- Helper Functions ---
const getHebrewDate = () => {
  const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const date = new Date();
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${dayName}, ${day} ב${month}`;
};

// --- Components ---

const WorkoutsCard = ({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) => {
  const change = thisMonth - lastMonth;
  const isPositive = change >= 0;

  return (
    <View style={styles.workoutsCard}>
      <View style={styles.workoutsCardHeader}>
        <View style={styles.iconBadge}>
          <Icon name="dumbbell" size={20} color={Colors.primary} strokeWidth={2.5} />
        </View>
        <Text style={styles.workoutsCardTitle}>אימונים</Text>
      </View>

      <View style={styles.workoutsStats}>
        <View style={styles.workoutsStat}>
          <Text style={styles.workoutsMainValue}>{thisMonth}</Text>
          <Text style={styles.workoutsMainLabel}>החודש</Text>
        </View>

        <View style={styles.workoutsDivider} />

        <View style={styles.workoutsStat}>
          <Text style={styles.workoutsSecondaryValue}>{lastMonth}</Text>
          <Text style={styles.workoutsSecondaryLabel}>חודש שעבר</Text>
        </View>
      </View>

      {change !== 0 && (
        <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2' }]}>
          <Icon
            name="trending-up"
            size={12}
            color={isPositive ? '#10B981' : '#EF4444'}
            strokeWidth={2.5}
            style={{ transform: [{ rotate: isPositive ? '0deg' : '180deg' }] }}
          />
          <Text style={[styles.changeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
            {Math.abs(change)} {isPositive ? 'יותר' : 'פחות'}
          </Text>
        </View>
      )}
    </View>
  );
};

const StatusCard = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.statusCard}>
    <View style={styles.statusContent}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
    <View style={styles.statusAccent} />
  </View>
);

const ActionCard = ({ title, iconName, onPress }: { title: string; iconName: string; onPress: () => void }) => (
  <TouchableOpacity
    style={styles.actionCard}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.actionIconContainer}>
      <Icon name={iconName} size={24} color={Colors.primary} strokeWidth={2.5} />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [workoutsThisMonth, setWorkoutsThisMonth] = useState(0);
  const [workoutsLastMonth, setWorkoutsLastMonth] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAttendedWorkouts = async () => {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // This month
      const { count: thisMonthCount } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('attended_at', firstDayThisMonth.toISOString());

      // Last month
      const { count: lastMonthCount } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('attended_at', firstDayLastMonth.toISOString())
        .lte('attended_at', lastDayLastMonth.toISOString());

      // Total all time
      const { count: totalCount } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      setWorkoutsThisMonth(thisMonthCount || 0);
      setWorkoutsLastMonth(lastMonthCount || 0);
      setTotalWorkouts(totalCount || 0);
    };

    fetchAttendedWorkouts();
  }, [user?.id])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingTitle}>היי, {user?.name?.split(' ')[0] || 'אורח'}</Text>
            <Text style={styles.dateSubtitle}>{getHebrewDate()}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarContainer}>
            {(user as any)?.avatar_url ? (
              <Image source={{ uri: (user as any).avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{user?.name?.slice(0, 1).toUpperCase() || '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Upcoming Classes Stack */}
        <View style={styles.heroSection}>
          <UpcomingWorkoutsStack />
        </View>

        {/* Divider after upcoming classes */}
        <View style={styles.divider} />

        {/* 3. Stats Row */}
        <View style={styles.statsRow}>
          <WorkoutsCard thisMonth={workoutsThisMonth} lastMonth={workoutsLastMonth} />
          <StatusCard label="סה״כ אימונים" value={totalWorkouts} />
        </View>

        {/* 4. Quick Actions */}
        <View style={styles.actionsRow}>
          <ActionCard
            title="יומן ביצועים"
            iconName="calendar"
            onPress={() => router.push('/performance' as any)}
          />
          <ActionCard
            title="חנות והטבות"
            iconName="shopping-bag"
            onPress={() => router.push('/shop' as any)}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 6,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    textAlign: 'left',
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'left',
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: Colors.primary,
  },
  avatarInitials: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },

  // Hero
  heroSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginBottom: 24,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  // Workouts Card
  workoutsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  workoutsCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171717',
  },
  workoutsStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 12,
  },
  workoutsStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  workoutsMainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  workoutsMainLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  workoutsSecondaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  workoutsSecondaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  workoutsDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
  },
  changeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Status Card (Points)
  statusCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statusContent: {
    alignItems: 'center',
    gap: 4,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  // Actions Row
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 100,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
  },
});
