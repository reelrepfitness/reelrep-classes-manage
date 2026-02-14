import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAdminDashboardData, DailyClass } from '@/hooks/admin/useAdminDashboardData';
import DailyClassesWidget from './DailyClassesWidget';

const Sparkline = ({ data, color, width, height }: { data: number[]; color: string; width: number; height: number }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const d = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </Svg>
  );
};

type Props = {
  todaysClasses: DailyClass[];
  onPressClass?: (id: string) => void;
};

export default function DashboardStatsCarousel({ todaysClasses, onPressClass }: Props) {
  const router = useRouter();
  const { revenue, stats, loading } = useAdminDashboardData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size="lg" />
      </View>
    );
  }

  const revenueTotal = revenue?.total?.replace('₪', '') || '0';
  const thisMonthTotal = revenue?.total?.replace('₪', '') || '0';
  const lastMonthTotal = revenue?.lastMonthTotal || '0';

  return (
    <View style={styles.wrapper}>
      {/* Hero Card: Today + This Month + Last Month */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/admin/financial')}
      >
        <LinearGradient
          colors={['#0F172A', '#334155']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>הכנסות היום</Text>
              <Text style={styles.heroValue}>₪{revenueTotal}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>החודש</Text>
              <Text style={styles.heroValue}>₪{thisMonthTotal}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>חודש קודם</Text>
              <Text style={styles.heroValueSmall}>₪{lastMonthTotal}</Text>
            </View>
          </View>
          <Text style={styles.heroSubtextCenter}>לחץ לפרטים</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Today's Classes */}
      <DailyClassesWidget classes={todaysClasses} onPressClass={onPressClass} />

      {/* Stats Grid: 2×2 */}
      <View style={styles.statsGrid}>
        {/* Row 1: Urgent Tasks + Active Subscriptions */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/needs-attention')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle,]}>
                <Icon name="alert-circle" size={30} color="#ff6f00ff" strokeWidth={2.5} />
                {(stats?.tasks || 0) > 0 && <View style={styles.notificationDot} />}
              </View>
              <Text style={styles.cardLabel}>לטיפול דחוף</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#ff6f00ff' }]}>
              {stats?.tasks || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/active')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle,]}>
                <Icon name="users" size={30} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>מנויים פעילים</Text>
            </View>
            <View style={styles.cardValueRow}>
              <Sparkline data={stats?.activeSparkline || []} color="#10B981" width={60} height={28} />
              <Text style={[styles.cardValue, { color: '#10B981' }]}>
                {stats?.active || 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Row 2: Debtors + Frozen */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/debts')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle,]}>
                <Icon name="credit-card" size={30} color="#DC2626" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>חייבים</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#DC2626' }]}>
              ₪{stats?.debts?.total || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/frozen')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle,]}>
                <Icon name="snowflake" size={30} color="#2563EB" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>בהקפאה</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#2563EB' }]}>
              {stats?.frozen || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.sectionDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  // Hero Card
  heroCard: {
    borderRadius: 16,
    padding: 18,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  heroValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroValueSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  heroSubtextCenter: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },

  // Stats Grid
  statsGrid: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },

  // Stat Cards
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    minHeight: 100,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'left',
    marginVertical: 4,
  },
  cardValueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});
