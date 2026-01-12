// app/admin/financial/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- Mock Data ---

const MONTHS = [
  { id: '1', label: 'ינו׳', full: 'ינואר' },
  { id: '2', label: 'פבר׳', full: 'פברואר' },
  { id: '3', label: 'מרץ', full: 'מרץ' },
  { id: '4', label: 'אפר׳', full: 'אפריל' },
  { id: '5', label: 'מאי', full: 'מאי' },
  { id: '6', label: 'יוני', full: 'יוני' },
];

const MOCK_FINANCIALS = {
  income: 48250,
  expenses: 15800,
  netProfit: 32450,
  mrr: 42000,
  arpu: 350,
  churn: '2.4%',
};

const BAR_DATA = [
  { value: 12000, frontColor: '#34D399', spacing: 10, label: 'ינו׳' },
  { value: 8000, frontColor: '#F87171' },

  { value: 15000, frontColor: '#34D399', spacing: 10, label: 'פבר׳' },
  { value: 9500, frontColor: '#F87171' },

  { value: 20000, frontColor: '#34D399', spacing: 10, label: 'מרץ' },
  { value: 12000, frontColor: '#F87171' },

  { value: 28000, frontColor: '#34D399', spacing: 10, label: 'אפר׳' },
  { value: 14000, frontColor: '#F87171' },

  { value: 32000, frontColor: '#34D399', spacing: 10, label: 'מאי' },
  { value: 11000, frontColor: '#F87171' },

  { value: 48250, frontColor: '#34D399', spacing: 10, label: 'יוני' },
  { value: 15800, frontColor: '#F87171' },
];

const PIE_DATA = [
  { value: 65, color: '#3B82F6', text: '65%', focused: true }, // Memberships
  { value: 25, color: '#8B5CF6', text: '25%' }, // Punch Cards
  { value: 10, color: '#F59E0B', text: '10%' }, // Products
];

const LEGEND_DATA = [
  { label: 'מנויים', color: '#3B82F6', percentage: '65%' },
  { label: 'כרטיסיות', color: '#8B5CF6', percentage: '25%' },
  { label: 'מוצרים', color: '#F59E0B', percentage: '10%' },
];

export default function FinancialAnalyticsScreen() {
  const [selectedMonth, setSelectedMonth] = useState('6'); // Default to June
  const insets = useSafeAreaInsets();

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
              ₪{MOCK_FINANCIALS.expenses.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.heroItem}>
          <Text style={styles.heroLabel}>הכנסות</Text>
          <View style={styles.heroValueContainer}>
            <ArrowUpRight size={16} color="#10B981" />
            <Text style={[styles.heroSubValue, { color: '#10B981' }]}>
              ₪{MOCK_FINANCIALS.income.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.driverHorizontal} />

      <View style={styles.heroMain}>
        <Text style={styles.heroMainLabel}>רווח נקי (יוני)</Text>
        <Text style={styles.heroMainValue}>₪{MOCK_FINANCIALS.netProfit.toLocaleString()}</Text>
      </View>
    </View>
  );

  const renderTrendChart = () => (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>מגמה חצי שנתית</Text>
      <View style={styles.chartContainer}>
        <BarChart
          data={BAR_DATA}
          barWidth={18}
          height={220}
          width={width - 80}
          minHeight={3}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          frontColor={'#333'} // Fallback
          yAxisTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10, fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }) }}
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

  const renderDistributionChart = () => (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>התפלגות הכנסות</Text>
      <View style={styles.pieContainer}>
        {/* Legend */}
        <View style={styles.legendContainer}>
          {LEGEND_DATA.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendPercent}>{item.percentage}</Text>
            </View>
          ))}
        </View>

        {/* Chart */}
        <PieChart
          data={PIE_DATA}
          donut
          sectionAutoFocus
          radius={70}
          innerRadius={50}
          innerCircleColor={'#fff'} // Match card background
          centerLabelComponent={() => (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, color: '#111', fontWeight: 'bold' }}>65%</Text>
              <Text style={{ fontSize: 10, color: '#888' }}>מנויים</Text>
            </View>
          )}
        />
      </View>
    </View>
  );

  const renderKPIRow = () => (
    <View style={styles.kpiRow}>
      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#DBEAFE' }]}>
          <TrendingUp size={18} color="#2563EB" />
        </View>
        <Text style={styles.kpiLabel}>MRR</Text>
        <Text style={styles.kpiValue}>₪{MOCK_FINANCIALS.mrr.toLocaleString()}</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#D1FAE5' }]}>
          <Users size={18} color="#059669" />
        </View>
        <Text style={styles.kpiLabel}>ARPU</Text>
        <Text style={styles.kpiValue}>₪{MOCK_FINANCIALS.arpu}</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={[styles.kpiIcon, { backgroundColor: '#FEE2E2' }]}>
          <RefreshCw size={18} color="#DC2626" />
        </View>
        <Text style={styles.kpiLabel}>נטו</Text>
        <Text style={styles.kpiValue}>{MOCK_FINANCIALS.churn}</Text>
      </View>
    </View>
  );

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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Light gray background
  },
  scrollContent: {
    padding: 20,
    gap: 20,
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
    backgroundColor: '#111827', // Black
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
    textAlign: 'right', // RTL
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -20, // Offset for y-axis labels space
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
