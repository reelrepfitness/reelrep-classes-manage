import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';

export default function DashboardStatsCarousel() {
  const router = useRouter();
  const { revenue, stats, loading } = useAdminDashboardData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const revenueTotal = revenue?.total?.replace('₪', '') || '0';
  const trendText = revenue?.trend || '0% עלייה';
  const isTrendUp = revenue?.trendUp ?? true;

  // Calculate this month's total and last month's total from revenue data
  const thisMonthTotal = revenue?.total?.replace('₪', '') || '0';
  const lastMonthTotal = revenue?.lastMonthTotal || '0';

  return (
    <View style={styles.wrapper}>
      {/* Hero Card: Today's Income + Quick Stats */}
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
              <View style={styles.heroHeader}>
                <View style={styles.heroIconCircle}>
                  <Icon name="trending-up" size={20} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.heroLabel}>הכנסות היום</Text>
              </View>
              <Text style={styles.heroValue}>₪{revenueTotal}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroSection}>
              <View style={styles.heroHeaderLeft}>
                <Text style={styles.heroLabelLeft}>הכנסות החודש</Text>
              </View>
              <Text style={styles.heroValue}>₪{thisMonthTotal}</Text>
            </View>
          </View>
          <Text style={styles.heroSubtextCenter}>לחץ לפרטים</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Stats Grid: 2 Columns × 2.5 Rows (5 Cards) */}
      <View style={styles.statsGrid}>
        {/* Row 1: Monthly Trend + Urgent Tasks */}
        <View style={styles.statsRow}>
          {/* Last Month Income (Right in RTL) */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/financial/monthly-comparison')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Icon name="bar-chart" size={20} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>חודש שעבר</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#10B981' }]}>
              ₪{lastMonthTotal}
            </Text>
          </TouchableOpacity>

          {/* Urgent Tasks (Left in RTL) */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/needs-attention')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                <Icon name="alert-circle" size={20} color="#DC2626" strokeWidth={2.5} />
                {(stats?.tasks || 0) > 0 && <View style={styles.notificationDot} />}
              </View>
              <Text style={styles.cardLabel}>לטיפול דחוף</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#DC2626' }]}>
              {stats?.tasks || 0}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Debtors + Active Subscriptions */}
        <View style={styles.statsRow}>
          {/* Debtors (Right in RTL) */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/debts')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(220, 38, 38, 0.1)' }]}>
                <Icon name="credit-card" size={20} color="#DC2626" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>חייבים</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#DC2626' }]}>
              ₪{stats?.debts?.total || 0}
            </Text>
          </TouchableOpacity>

          {/* Active Subscriptions (Left in RTL) */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.9}
            onPress={() => router.push('/admin/clients/active')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Icon name="user-check" size={20} color="#10B981" strokeWidth={2.5} />
              </View>
              <Text style={styles.cardLabel}>מנויים פעילים</Text>
            </View>
            <Text style={[styles.cardValue, { color: '#10B981' }]}>
              {stats?.active || 0}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 3: Frozen Subscriptions (Single Card) */}
        <TouchableOpacity
          style={[styles.statCard, styles.fullWidthCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/clients/frozen')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <Icon name="snowflake" size={20} color="#2563EB" strokeWidth={2.5} />
            </View>
            <Text style={styles.cardLabel}>מנויים בהקפאה</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#2563EB' }]}>
            {stats?.frozen || 0}
          </Text>
        </TouchableOpacity>
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

  // Hero Card (Today's Income - Black Gradient)
  heroCard: {
    borderRadius: 16,
    padding: 18,
    minHeight: 110,
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
    gap: 16,
    marginBottom: 8,
  },
  heroSection: {
    flex: 1,
    gap: 8,
  },
  heroDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroHeaderLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 4,
    minHeight: 40,
  },
  heroIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  heroLabelLeft: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'left',
    marginVertical: 4,
  },
  heroSubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  heroSubtextCenter: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
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

  // Stat Cards (White, Minimal)
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
  fullWidthCard: {
    flex: undefined,
    width: '100%',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'left',
    marginVertical: 4,
  },
  cardSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'right',
  },
  trendBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  trendBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
