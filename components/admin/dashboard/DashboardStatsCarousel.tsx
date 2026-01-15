import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
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

  return (
    <View style={styles.wrapper}>
      {/* Row 1: Revenue Cards */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, styles.revenueCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/financial')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleWhite}>הכנסות היום</Text>
            <View style={styles.iconBadgeWhite}>
              <Icon name="trending-up" size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.bigAmountWhite}>₪{revenueTotal}</Text>
          <Text style={styles.subtextWhite}>לחץ לפרטים</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.trendCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/financial/monthly-comparison')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitleDark}>מגמת חודש</Text>
            <View style={styles.iconBadgeLight}>
              <Icon name="bar-chart" size={18} color={Colors.primary} strokeWidth={2.5} />
            </View>
          </View>
          <Text style={styles.bigAmountPrimary}>{trendText}</Text>
          <View style={styles.trendBadge}>
            <Icon
              name="trending-up"
              size={12}
              color={revenue?.trendUp ? '#10B981' : '#EF4444'}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: revenue?.trendUp ? '0deg' : '180deg' }] }}
            />
            <Text style={[styles.trendText, { color: revenue?.trendUp ? '#10B981' : '#EF4444' }]}>
              לעומת חודש שעבר
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Row 2: Urgent Tasks */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, styles.urgentCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/clients/needs-attention')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="alert-circle" size={24} color="#DC2626" strokeWidth={2.5} />
          </View>
          <Text style={styles.bigNumberRed}>{stats?.tasks || 0}</Text>
          <Text style={styles.labelRed}>לטיפול דחוף</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.debtCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/clients/debts')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="credit-card" size={24} color="#DC2626" strokeWidth={2.5} />
          </View>
          <Text style={styles.bigNumberRed}>{stats?.debts?.count || 0}</Text>
          <Text style={styles.debtAmount}>₪{stats?.debts?.total || 0}</Text>
          <Text style={styles.labelRed}>חייבים</Text>
        </TouchableOpacity>
      </View>

      {/* Row 3: Subscriptions */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, styles.activeCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/clients/active')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="user-check" size={24} color="#059669" strokeWidth={2.5} />
          </View>
          <Text style={styles.bigNumberGreen}>{stats?.active || 0}</Text>
          <Text style={styles.labelGreen}>מנויים פעילים</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.frozenCard]}
          activeOpacity={0.9}
          onPress={() => router.push('/admin/clients/frozen')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="snowflake" size={24} color="#2563EB" strokeWidth={2.5} />
          </View>
          <Text style={styles.bigNumberBlue}>{stats?.frozen || 0}</Text>
          <Text style={styles.labelBlue}>מנויים בהקפאה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#F8FAFC',
    gap: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 12,
    height: 150,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  // Revenue Cards
  revenueCard: {
    backgroundColor: Colors.primary,
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadgeWhite: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBadgeLight: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleWhite: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitleDark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bigAmountWhite: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  bigAmountPrimary: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'right',
  },
  subtextWhite: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'right',
  },
  trendBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  trendText: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Icon Circle
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },

  // Urgent & Debt Cards
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  debtCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  bigNumberRed: {
    fontSize: 34,
    fontWeight: '800',
    color: '#DC2626',
    textAlign: 'right',
  },
  debtAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'right',
    opacity: 0.85,
  },
  labelRed: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    textAlign: 'right',
  },

  // Active & Frozen Cards
  activeCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  frozenCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  bigNumberGreen: {
    fontSize: 34,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'right',
  },
  bigNumberBlue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2563EB',
    textAlign: 'right',
  },
  labelGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    textAlign: 'right',
  },
  labelBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: 'right',
  },
});
