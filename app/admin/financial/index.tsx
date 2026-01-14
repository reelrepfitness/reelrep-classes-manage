// app/admin/financial/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, RefreshCw } from 'lucide-react-native';
import { useGreenInvoice } from '@/app/hooks/useGreenInvoice';

const { width } = Dimensions.get('window');

// --- Month Definitions ---
const MONTHS = [
  { id: 1, label: 'ינו׳', full: 'ינואר' },
  { id: 2, label: 'פבר׳', full: 'פברואר' },
  { id: 3, label: 'מרץ', full: 'מרץ' },
  { id: 4, label: 'אפר׳', full: 'אפריל' },
  { id: 5, label: 'מאי', full: 'מאי' },
  { id: 6, label: 'יוני', full: 'יוני' },
  { id: 7, label: 'יולי', full: 'יולי' },
  { id: 8, label: 'אוג׳', full: 'אוגוסט' },
  { id: 9, label: 'ספט׳', full: 'ספטמבר' },
  { id: 10, label: 'אוק׳', full: 'אוקטובר' },
  { id: 11, label: 'נוב׳', full: 'נובמבר' },
  { id: 12, label: 'דצמ׳', full: 'דצמבר' },
];

export default function FinancialAnalyticsScreen() {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    syncFinancialData,
    getDashboardSummary,
    loading,
    error,
  } = useGreenInvoice();

  const [dashboardData, setDashboardData] = useState<any>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      const data = await getDashboardSummary(selectedMonth);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את הנתונים');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Sync with Green Invoice
      await syncFinancialData();
      // Reload dashboard
      await loadData();
      Alert.alert('הצלחה', 'הנתונים עודכנו מ-Green Invoice');
    } catch (err) {
      Alert.alert('שגיאה', 'לא הצלחנו לסנכרן את הנתונים');
    } finally {
      setIsRefreshing(false);
    }
  };

  const insets = useSafeAreaInsets();

  // --- Calculate Real Data ---
  const income = dashboardData?.currentMonth?.income || 0;
  const expenses = dashboardData?.currentMonth?.expenses || 0;
  const netProfit = dashboardData?.currentMonth?.profit || 0;
  const mrr = 0; // TODO: Calculate MRR from subscription data
  const arpu = 0; // TODO: Calculate ARPU
  const churn = '0%'; // TODO: Calculate churn rate

  // --- Bar Chart Data (Current vs Last Month) ---
  const barData = [
    {
      value: dashboardData?.lastMonth?.income || 0,
      frontColor: '#34D399',
      spacing: 10,
      label: 'חודש קודם',
    },
    {
      value: dashboardData?.lastMonth?.expenses || 0,
      frontColor: '#F87171',
    },
    {
      value: dashboardData?.currentMonth?.income || 0,
      frontColor: '#10B981',
      spacing: 10,
      label: 'חודש נוכחי',
    },
    {
      value: dashboardData?.currentMonth?.expenses || 0,
      frontColor: '#EF4444',
    },
  ];

  // --- Pie Chart Data (Payment Breakdown) ---
  const paymentBreakdown = dashboardData?.paymentBreakdown || [];
  const totalPayments = paymentBreakdown.reduce((sum, item) => sum + item.amount, 0) || 1;

  const getPaymentColor = (type: number) => {
    const colors: Record<number, string> = {
      1: '#10B981', // Cash - Green
      2: '#3B82F6', // Credit Card - Blue
      4: '#8B5CF6', // Bank Transfer - Purple
      6: '#F59E0B', // Bit - Orange
      11: '#EC4899', // Standing Order - Pink
    };
    return colors[type] || '#6B7280';
  };

  const pieData = paymentBreakdown.slice(0, 5).map((item) => ({
    value: Math.round((item.amount / totalPayments) * 100),
    color: getPaymentColor(item.type),
    text: `${Math.round((item.amount / totalPayments) * 100)}%`,
  }));

  const legendData = paymentBreakdown.slice(0, 5).map((item) => ({
    label: item.label,
    color: getPaymentColor(item.type),
    percentage: `${Math.round((item.amount / totalPayments) * 100)}%`,
  }));

  // --- Render Functions ---

  const renderMonthSelector = () => (
    <View style={styles.monthSelectorContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthSelectorContent}
      >
        {MONTHS.map((month) => {
          const isSelected = selectedMonth === month.id;
          return (
            <TouchableOpacity
              key={month.id}
              style={[styles.monthPill, isSelected && styles.monthPillSelected]}
              onPress={() => setSelectedMonth(month.id)}
            >
              <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                {month.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderNetProfitCard = () => (
    <View style={styles.heroCard}>
      <View style={styles.heroRowTop}>
        <View style={styles.heroItem}>
          <Text style={styles.heroLabel}>הוצאות</Text>
          <View style={styles.heroValueContainer}>
            <ArrowDownRight size={16} color="#EF4444" />
            <Text style={[styles.heroSubValue, { color: '#EF4444' }]}>
              ₪{expenses.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.heroItem}>
          <Text style={styles.heroLabel}>הכנסות</Text>
          <View style={styles.heroValueContainer}>
            <ArrowUpRight size={16} color="#10B981" />
            <Text style={[styles.heroSubValue, { color: '#10B981' }]}>
              ₪{income.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.driverHorizontal} />

      <View style={styles.heroMain}>
        <Text style={styles.heroMainLabel}>
          רווח נקי ({MONTHS.find(m => m.id === selectedMonth)?.full})
        </Text>
        <Text style={styles.heroMainValue}>₪{netProfit.toLocaleString()}</Text>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <>
            <RefreshCw size={16} color="#6B7280" />
            <Text style={styles.refreshText}>רענן נתונים</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTrendChart = () => {
    if (!barData.length || !dashboardData) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>השוואה לחודש הקודם</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין מספיק נתונים להצגת גרף</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>השוואה לחודש הקודם</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={barData}
            barWidth={18}
            height={220}
            width={width - 80}
            minHeight={3}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            frontColor={'#333'}
            yAxisTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
            xAxisLabelTextStyle={{
              color: '#6B7280',
              fontSize: 10,
              fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
            }}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            backgroundColor="transparent"
            initialSpacing={10}
          />
        </View>
      </View>
    );
  };

  const renderDistributionChart = () => {
    if (!pieData.length || !dashboardData) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>התפלגות תשלומים</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>אין נתונים על תשלומים</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>התפלגות תשלומים</Text>
        <View style={styles.pieContainer}>
        {/* Legend */}
        <View style={styles.legendContainer}>
          {legendData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendPercent}>{item.percentage}</Text>
            </View>
          ))}
        </View>

        {/* Chart */}
        {pieData.length > 0 && (
          <PieChart
            data={pieData}
            donut
            sectionAutoFocus
            radius={70}
            innerRadius={50}
            innerCircleColor={'#fff'}
            centerLabelComponent={() => {
              const topCategory = pieData.reduce((max, item) =>
                item.value > max.value ? item : max
              );
              const topIndex = pieData.indexOf(topCategory);
              return (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, color: '#111', fontWeight: 'bold' }}>
                    {topCategory.text || '0%'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#888' }}>
                    {legendData[topIndex]?.label || ''}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
    );
  };

  const renderKPIRow = () => (
    <View style={styles.kpiRow}>
      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#DBEAFE' }]}>
          <TrendingUp size={18} color="#2563EB" />
        </View>
        <Text style={styles.kpiLabel}>סה"כ שנתי (הכנסות)</Text>
        <Text style={styles.kpiValue}>₪{(dashboardData?.ytd?.income || 0).toLocaleString()}</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
          <ArrowDownRight size={18} color="#DC2626" />
        </View>
        <Text style={styles.kpiLabel}>סה"כ שנתי (הוצאות)</Text>
        <Text style={styles.kpiValue}>₪{(dashboardData?.ytd?.expenses || 0).toLocaleString()}</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#D1FAE5' }]}>
          <Users size={18} color="#059669" />
        </View>
        <Text style={styles.kpiLabel}>סה"כ שנתי (רווח)</Text>
        <Text style={styles.kpiValue}>₪{(dashboardData?.ytd?.profit || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  // --- Loading State ---
  if (loading && !dashboardData) {
    return (
      <View style={styles.container}>
        <AdminHeader title="דוחות ואנליטיקה" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DA4477" />
          <Text style={styles.loadingText}>טוען נתונים פיננסיים...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="דוחות ואנליטיקה" />

      {/* Month Selector Strip */}
      {renderMonthSelector()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderNetProfitCard()}
        {renderTrendChart()}
        {renderDistributionChart()}
        {renderKPIRow()}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Month Selector
  monthSelectorContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthSelectorContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  monthPillSelected: {
    backgroundColor: '#DA4477', // Reel Rep pink
  },
  monthText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  monthTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  // Hero Profit Card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRowTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  heroValueContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  heroSubValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: '#F3F4F6',
  },
  driverHorizontal: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  heroMain: {
    alignItems: 'center',
  },
  heroMainLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  heroMainValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  refreshButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refreshText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  // Chart Cards
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 20,
    textAlign: 'right',
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Pie Chart Layout
  pieContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendContainer: {
    flex: 1,
    gap: 12,
    paddingRight: 10,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    textAlign: 'right',
  },
  legendPercent: {
    fontSize: 14,
    color: '#111',
    fontWeight: '600',
  },
  // KPI Row
  kpiRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
});