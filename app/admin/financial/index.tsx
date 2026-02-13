// app/admin/financial/index.tsx — KPI Financial Dashboard
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldCheck,
  Settings,
  Megaphone,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useKPIDashboard } from '@/hooks/admin/useKPIDashboard';
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  getKPIStatus,
} from '@/utils/kpi-calculations';
import type {
  KPIStatus,
  ExpenseFormData,
  MarketingFormData,
  StudioConfigFormData,
} from '@/types/kpi';
import { EXPENSE_CATEGORIES, MARKETING_CHANNELS } from '@/types/kpi';
import { PieChart } from 'react-native-gifted-charts';

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

// --- Status colors ---
const STATUS_COLORS: Record<KPIStatus, string> = {
  good: '#10B981',
  warning: '#F59E0B',
  bad: '#EF4444',
};

const STATUS_BG: Record<KPIStatus, string> = {
  good: '#D1FAE5',
  warning: '#FEF3C7',
  bad: '#FEE2E2',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  '1': 'מזומן',
  '2': 'אשראי',
  '4': 'העברה בנקאית',
  '6': 'Bit',
  '11': 'הוראת קבע',
};

const PIE_COLORS = ['#DA4477', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

// ======================= MAIN COMPONENT =======================

export default function KPIFinancialDashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<'expenses' | 'income'>('expenses');

  // Modal states
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [marketingModalVisible, setMarketingModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  const insets = useSafeAreaInsets();

  const {
    data,
    loading,
    error,
    syncing,
    lastSyncTime,
    refresh,
    triggerSync,
    addExpense,
    addMarketingSpend,
    updateConfig,
  } = useKPIDashboard(selectedMonth, selectedYear);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // --- Year navigation ---
  const handlePrevYear = () => setSelectedYear(y => y - 1);
  const handleNextYear = () => {
    if (selectedYear < now.getFullYear()) setSelectedYear(y => y + 1);
  };

  // --- Helpers ---
  const hasNoExpenses = data && data.financial.totalFixedCosts === 0 && data.financial.totalVariableCosts === 0;
  const hasNoMarketingSpend = data && data.retention.cac === 0 && data.retention.newMembersThisMonth === 0;
  const configNotSet = data && parseFloat(data.config['studio_area_sqm'] || '0') === 0;

  const handleSync = async () => {
    try {
      await triggerSync();
      Alert.alert('סנכרון הושלם', 'הנתונים עודכנו בהצלחה מ-Green Invoice');
    } catch (err: any) {
      Alert.alert('שגיאה בסנכרון', err.message || 'לא הצלחנו לסנכרן');
    }
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'לא סונכרן';
    const d = new Date(iso);
    const day = d.getDate();
    const monthName = MONTHS[d.getMonth()]?.label || '';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${monthName}, ${hours}:${mins}`;
  };

  // ======================= RENDER =======================

  // Loading skeleton
  if (loading && !data) {
    return (
      <View style={styles.container}>
        <AdminHeader title="דשבורד KPI פיננסי" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DA4477" />
          <Text style={styles.loadingText}>טוען מדדים פיננסיים...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <View style={styles.container}>
        <AdminHeader title="דשבורד KPI פיננסי" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <RefreshCw size={18} color="#fff" />
            <Text style={styles.retryButtonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fin = data?.financial;
  const ret = data?.retention;
  const be = data?.breakEven;
  const targets = data?.targets;

  return (
    <View style={styles.container}>
      <AdminHeader title="דשבורד KPI פיננסי" />

      {/* Year + Month Selector */}
      <View style={styles.selectorContainer}>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={handleNextYear} disabled={selectedYear >= now.getFullYear()}>
            <ChevronLeft size={20} color={selectedYear >= now.getFullYear() ? '#D1D5DB' : '#6B7280'} />
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity onPress={handlePrevYear}>
            <ChevronRight size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthSelectorContent}
        >
          {MONTHS.map((m) => {
            const isSelected = selectedMonth === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.monthPill, isSelected && styles.monthPillSelected]}
                onPress={() => setSelectedMonth(m.id)}
              >
                <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sync Status Bar */}
      <View style={styles.syncBar}>
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#DA4477" />
          ) : (
            <RefreshCw size={16} color="#DA4477" />
          )}
          <Text style={styles.syncButtonText}>{syncing ? 'מסנכרן...' : 'סנכרן'}</Text>
        </TouchableOpacity>
        <Text style={styles.syncTimeText}>עודכן: {formatSyncTime(lastSyncTime)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DA4477" />
        }
      >
        {/* Anomaly warnings */}
        {data?.anomalies?.map((msg, i) => (
          <View key={`anomaly-${i}`} style={styles.warningBanner}>
            <Text style={styles.warningText}>{msg}</Text>
          </View>
        ))}

        {/* Warning banners */}
        {fin?.activeMembers === 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>אין מנויים פעילים כרגע</Text>
          </View>
        )}
        {hasNoExpenses && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>לא הוזנו הוצאות לחודש {MONTHS[selectedMonth - 1]?.full}</Text>
          </View>
        )}
        {configNotSet && (
          <TouchableOpacity style={styles.infoBanner} onPress={() => setConfigModalVisible(true)}>
            <Text style={styles.infoText}>יש להגדיר הגדרות סטודיו (לחץ כאן)</Text>
          </TouchableOpacity>
        )}
        {fin && fin.totalIncome === 0 && (fin.activeMembers || 0) > 0 && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>ההכנסות יופיעו לאחר חיבור הסליקה למורנינג</Text>
          </View>
        )}

        {/* ==================== Income & Expenses Combined Section ==================== */}
        <Text style={styles.sectionTitle}>הכנסות והוצאות</Text>
        <View style={styles.incExpContainer}>
          {/* Toggle cards row */}
          <View style={styles.incExpCardsRow}>
            <TouchableOpacity
              style={[styles.incExpCard, activeBreakdownTab === 'income' && styles.incExpCardActiveIncome]}
              onPress={() => setActiveBreakdownTab('income')}
              activeOpacity={0.7}
            >
              <View style={styles.incExpCardHeader}>
                <View style={[styles.incExpIconWrap, { backgroundColor: activeBreakdownTab === 'income' ? '#D1FAE520' : '#D1FAE5' }]}>
                  <ArrowUpRight size={16} color={activeBreakdownTab === 'income' ? '#fff' : '#10B981'} />
                </View>
                {data?.monthOverMonth?.incomeChange !== undefined && data.monthOverMonth.incomeChange !== 0 && (
                  <Text style={[styles.incExpChange, { color: data.monthOverMonth.incomeChange > 0 ? (activeBreakdownTab === 'income' ? '#D1FAE5' : '#10B981') : (activeBreakdownTab === 'income' ? '#FCA5A5' : '#EF4444') }]}>
                    {data.monthOverMonth.incomeChange > 0 ? '+' : ''}{Math.round(data.monthOverMonth.incomeChange)}%
                  </Text>
                )}
              </View>
              <Text style={[styles.incExpValue, activeBreakdownTab === 'income' && styles.incExpValueActive]}>{formatCurrency(fin?.totalIncome || 0)}</Text>
              <Text style={[styles.incExpLabel, activeBreakdownTab === 'income' && styles.incExpLabelActive]}>הכנסות</Text>
              <Text style={[styles.incExpVat, activeBreakdownTab === 'income' && styles.incExpVatActive]}>לפני מע״מ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.incExpCard, activeBreakdownTab === 'expenses' && styles.incExpCardActiveExpenses]}
              onPress={() => setActiveBreakdownTab('expenses')}
              activeOpacity={0.7}
            >
              <View style={styles.incExpCardHeader}>
                <View style={[styles.incExpIconWrap, { backgroundColor: activeBreakdownTab === 'expenses' ? '#FEE2E220' : '#FEE2E2' }]}>
                  <ArrowDownRight size={16} color={activeBreakdownTab === 'expenses' ? '#fff' : '#EF4444'} />
                </View>
                {data?.monthOverMonth?.expenseChange !== undefined && data.monthOverMonth.expenseChange !== 0 && (
                  <Text style={[styles.incExpChange, { color: data.monthOverMonth.expenseChange < 0 ? (activeBreakdownTab === 'expenses' ? '#D1FAE5' : '#10B981') : (activeBreakdownTab === 'expenses' ? '#FCA5A5' : '#EF4444') }]}>
                    {data.monthOverMonth.expenseChange > 0 ? '+' : ''}{Math.round(data.monthOverMonth.expenseChange)}%
                  </Text>
                )}
              </View>
              <Text style={[styles.incExpValue, activeBreakdownTab === 'expenses' && styles.incExpValueActive]}>{formatCurrency(fin?.totalExpenses || 0)}</Text>
              <Text style={[styles.incExpLabel, activeBreakdownTab === 'expenses' && styles.incExpLabelActive]}>הוצאות</Text>
              <Text style={[styles.incExpVat, activeBreakdownTab === 'expenses' && styles.incExpVatActive]}>לפני מע״מ</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Pie Chart */}
          {(() => {
            const isExpenses = activeBreakdownTab === 'expenses';
            const rawData = isExpenses ? (data?.expensesByCategory || {}) : (data?.incomeByPaymentType || {});
            const sorted = Object.entries(rawData).sort(([, a], [, b]) => b - a);
            const total = sorted.reduce((s, [, v]) => s + v, 0);

            if (sorted.length === 0 || total === 0) {
              return (
                <View style={styles.pieEmptyWrap}>
                  <Text style={styles.pieEmptyText}>
                    {isExpenses ? 'אין נתוני הוצאות לחודש זה' : 'אין נתוני הכנסות לחודש זה'}
                  </Text>
                </View>
              );
            }

            const pieData = sorted.map(([, amt], i) => ({
              value: amt,
              color: PIE_COLORS[i % PIE_COLORS.length],
              text: total > 0 ? `${Math.round((amt / total) * 100)}%` : '',
            }));

            return (
              <View style={styles.breakdownCard}>
                <View style={styles.pieChartWrap}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={50}
                    centerLabelComponent={() => (
                      <View style={styles.pieCenterLabel}>
                        <Text style={styles.pieCenterValue}>{formatCurrency(total)}</Text>
                        <Text style={styles.pieCenterText}>סה״כ</Text>
                        <Text style={[styles.pieCenterText, { fontSize: 8 }]}>לפני מע״מ</Text>
                      </View>
                    )}
                  />
                </View>
                <View style={styles.pieLegend}>
                  {sorted.map(([key, amount], i) => (
                    <View key={key} style={styles.legendRow}>
                      <Text style={styles.breakdownAmount}>{formatCurrency(amount)}</Text>
                      <View style={styles.legendLabelWrap}>
                        <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }]} />
                        <Text style={styles.breakdownCategory}>
                          {isExpenses ? key : (PAYMENT_TYPE_LABELS[key] || `סוג ${key}`)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </View>

        {/* ==================== Net Profit ==================== */}
        <View style={styles.netProfitCard}>
          <Text style={styles.netProfitLabel}>רווח נקי</Text>
          <Text style={[styles.netProfitValue, { color: (fin?.netProfit || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
            {formatCurrency(fin?.netProfit || 0)}
          </Text>
          {data?.monthOverMonth?.profitChange !== undefined && data.monthOverMonth.profitChange !== 0 && (
            <Text style={[styles.netProfitChange, { color: data.monthOverMonth.profitChange > 0 ? '#10B981' : '#EF4444' }]}>
              {data.monthOverMonth.profitChange > 0 ? '+' : ''}{Math.round(data.monthOverMonth.profitChange)}% מחודש קודם
            </Text>
          )}
          <Text style={styles.incExpVat}>לפני מע״מ</Text>
        </View>

        {/* ==================== SECTION: Financial KPIs ==================== */}
        <View style={styles.finKpiContainer}>
          <Text style={styles.finKpiTitle}>מדדים פיננסיים</Text>
          <View style={styles.finKpiGrid}>
            {[
              { label: 'הכנסה חודשית חוזרת', sub: 'MRR', val: fin?.mrr, target: targets?.targetMRR, fmt: 'c' as const, status: getKPIStatus(fin?.mrr || 0, targets?.targetMRR || 0), empty: !(fin?.mrr) },
              { label: 'הכנסה ממוצעת למנוי', sub: 'ARPM', val: fin?.arpm, target: 600, fmt: 'c' as const, status: getKPIStatus(fin?.arpm || 0, 600), empty: !(fin?.arpm) },
              { label: 'עלות רכישת לקוח', sub: 'CAC', val: ret?.cac, target: 150, fmt: 'c' as const, status: hasNoMarketingSpend ? undefined : getKPIStatus(ret?.cac || 0, 150, true), empty: !!hasNoMarketingSpend },
              { label: 'ערך חיי לקוח', sub: 'LTV', val: ret?.ltv, target: 7200, fmt: 'c' as const, status: getKPIStatus(ret?.ltv || 0, 7200), empty: !(ret?.ltv) },
              { label: 'יחס ערך לעלות', sub: 'LTV:CAC', val: ret?.ltvCacRatio, target: 3, fmt: 'r' as const, status: hasNoMarketingSpend ? undefined : getKPIStatus(ret?.ltvCacRatio || 0, 3), empty: !!hasNoMarketingSpend || !(ret?.ltvCacRatio) },
              { label: 'תזרים מזומנים', sub: 'Cash Flow', val: fin?.netProfit, target: null as number | null, fmt: 'c' as const, status: ((fin?.netProfit || 0) > 0 ? 'good' : (fin?.netProfit || 0) < 0 ? 'bad' : 'warning') as KPIStatus, empty: !fin?.totalIncome && !fin?.totalExpenses, change: data?.monthOverMonth?.profitChange },
              { label: 'נטישה חודשית', sub: 'Churn', val: ret?.churnRate, target: 5, fmt: 'p' as const, status: getKPIStatus(ret?.churnRate || 0, 5, true), empty: false },
              { label: 'שימור', sub: 'Retention', val: ret?.retentionRate ?? 100, target: 95, fmt: 'p' as const, status: getKPIStatus(ret?.retentionRate ?? 100, 95), empty: false },
            ].map((c) => {
              const fmtVal = c.empty ? '—' : c.fmt === 'c' ? formatCurrency(c.val || 0) : c.fmt === 'p' ? formatPercent(c.val || 0) : formatRatio(c.val || 0);
              const fmtTarget = c.target ? (c.fmt === 'c' ? formatCurrency(c.target) : c.fmt === 'p' ? `${c.target}%` : `${c.target}`) : null;
              return (
                <View key={c.sub} style={styles.finKpiCard}>
                  {!c.empty && c.status && (
                    <View style={[styles.finKpiDot, { backgroundColor: STATUS_COLORS[c.status] }]} />
                  )}
                  <Text style={[styles.finKpiValue, c.empty && { color: '#4B5563' }]}>{fmtVal}</Text>
                  <Text style={styles.finKpiLabel}>{c.label}</Text>
                  <Text style={styles.finKpiSub}>{c.sub}</Text>
                  {!c.empty && fmtTarget && (
                    <Text style={styles.finKpiTarget}>יעד: {fmtTarget}</Text>
                  )}
                  {c.empty && (
                    <Text style={styles.finKpiEmptyText}>ממתין לנתונים</Text>
                  )}
                  {!c.empty && c.change !== undefined && c.change !== 0 && (
                    <View style={styles.finKpiChangeWrap}>
                      <Text style={[styles.finKpiChange, { color: (c.change || 0) > 0 ? '#34D399' : '#F87171' }]}>
                        {(c.change || 0) > 0 ? '▲' : '▼'} {Math.abs(Math.round(c.change || 0))}%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ==================== SECTION 2: Retention KPIs ==================== */}
        <Text style={styles.sectionTitle}>מדדי שימור</Text>
        <View style={styles.kpiGrid}>
          <KPICard
            label="נטישה חודשית"
            value={formatPercent(ret?.churnRate || 0)}
            status={getKPIStatus(ret?.churnRate || 0, 5, true)}
            icon={TrendingDown}
          />
          <KPICard
            label="שימור"
            value={formatPercent(ret?.retentionRate ?? 100)}
            status={getKPIStatus(ret?.retentionRate ?? 100, 95)}
            icon={ShieldCheck}
          />
          <KPICard
            label="עלות רכישת לקוח"
            sublabel="CAC"
            value={hasNoMarketingSpend ? 'לא זמין' : formatCurrency(ret?.cac || 0)}
            status={hasNoMarketingSpend ? undefined : getKPIStatus(ret?.cac || 0, 150, true)}
            icon={Megaphone}
            vatNote="inc"
          />
          <KPICard
            label="ערך חיי לקוח"
            sublabel="LTV"
            value={formatCurrency(ret?.ltv || 0)}
            status={getKPIStatus(ret?.ltv || 0, 7200)}
            icon={Users}
            vatNote="inc"
          />
          <KPICard
            label="יחס LTV:CAC"
            value={hasNoMarketingSpend ? 'לא זמין' : formatRatio(ret?.ltvCacRatio || 0)}
            status={hasNoMarketingSpend ? undefined : getKPIStatus(ret?.ltvCacRatio || 0, 3)}
            icon={Target}
          />
          <KPICard
            label="תקופה ממוצעת"
            value={`${ret?.avgTenureMonths || 0} חודשים`}
            status={getKPIStatus(ret?.avgTenureMonths || 0, 12)}
            icon={TrendingUp}
          />
        </View>

        {/* New / Churned mini-cards */}
        <View style={styles.miniCardsRow}>
          <View style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{ret?.newMembersThisMonth || 0}</Text>
            <Text style={styles.miniCardLabel}>חדשים החודש</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={[styles.miniCardValue, (ret?.churnedThisMonth || 0) > 0 && { color: '#EF4444' }]}>
              {ret?.churnedThisMonth || 0}
            </Text>
            <Text style={styles.miniCardLabel}>עזבו החודש</Text>
          </View>
          <View style={styles.miniCard}>
            <Text style={styles.miniCardValue}>{ret?.activeAtStartOfMonth || 0}</Text>
            <Text style={styles.miniCardLabel}>תחילת חודש</Text>
          </View>
        </View>

        {/* ==================== SECTION 3: Break Even ==================== */}
        <Text style={styles.sectionTitle}>נקודת איזון</Text>
        <View style={styles.breakEvenCard}>
          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(be?.progressPercent || 0, 100)}%`,
                    backgroundColor:
                      (be?.progressPercent || 0) >= 100
                        ? '#10B981'
                        : (be?.progressPercent || 0) >= 90
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {be?.currentMembers || 0} / {be?.breakEvenMembers || 0} מנויים ({formatPercent(be?.progressPercent || 0, 0)})
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.breakEvenStatsRow}>
            <View style={styles.breakEvenStat}>
              <Text style={styles.breakEvenStatValue}>{formatCurrency(be?.breakEvenRevenue || 0)}</Text>
              <Text style={styles.breakEvenStatLabel}>הוצאות קבועות</Text>
              <Text style={styles.breakEvenVatNote}>כולל מע״מ</Text>
            </View>
            <View style={styles.breakEvenDivider} />
            <View style={styles.breakEvenStat}>
              <Text style={styles.breakEvenStatValue}>{formatCurrency(be?.currentMRR || 0)}</Text>
              <Text style={styles.breakEvenStatLabel}>MRR נוכחי</Text>
              <Text style={styles.breakEvenVatNote}>כולל מע״מ</Text>
            </View>
            <View style={styles.breakEvenDivider} />
            <View style={styles.breakEvenStat}>
              <Text style={styles.breakEvenStatValue}>
                {be?.studioAreaSqm === 0 ? 'N/A' : formatCurrency(be?.revenuePerSqm || 0)}
              </Text>
              <Text style={styles.breakEvenStatLabel}>הכנסה/מ"ר</Text>
              <Text style={styles.breakEvenVatNote}>כולל מע״מ</Text>
            </View>
          </View>

          {(be?.currentMembers || 0) < (be?.breakEvenMembers || 0) && (be?.breakEvenMembers || 0) > 0 && (
            <Text style={styles.breakEvenNote}>
              חסרים עוד {(be?.breakEvenMembers || 0) - (be?.currentMembers || 0)} מנויים לנקודת איזון
            </Text>
          )}
          {(be?.currentMembers || 0) >= (be?.breakEvenMembers || 0) && (be?.breakEvenMembers || 0) > 0 && (
            <Text style={[styles.breakEvenNote, { color: '#10B981' }]}>
              עברתם את נקודת האיזון! עודף של {(be?.currentMembers || 0) - (be?.breakEvenMembers || 0)} מנויים
            </Text>
          )}
        </View>

        {/* ==================== Quick Actions ==================== */}
        <Text style={styles.sectionTitle}>פעולות מהירות</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setExpenseModalVisible(true)}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Receipt size={20} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>הוסף הוצאה</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setMarketingModalVisible(true)}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Megaphone size={20} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionLabel}>הוצאת שיווק</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={() => setConfigModalVisible(true)}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#E0E7FF' }]}>
              <Settings size={20} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>הגדרות</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} onPress={handleSync} disabled={syncing}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FDF2F8' }]}>
              {syncing ? (
                <ActivityIndicator size="small" color="#DA4477" />
              ) : (
                <RefreshCw size={20} color="#DA4477" />
              )}
            </View>
            <Text style={styles.quickActionLabel}>סנכרון GI</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ==================== MODALS ==================== */}
      <ExpenseModal
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={async (formData) => {
          try {
            await addExpense(formData, selectedMonth, selectedYear);
            setExpenseModalVisible(false);
            Alert.alert('נשמר', 'ההוצאה נוספה בהצלחה');
          } catch (err: any) {
            Alert.alert('שגיאה', err.message || 'לא הצלחנו לשמור');
          }
        }}
      />

      <MarketingModal
        visible={marketingModalVisible}
        onClose={() => setMarketingModalVisible(false)}
        onSubmit={async (formData) => {
          try {
            await addMarketingSpend(formData, selectedMonth, selectedYear);
            setMarketingModalVisible(false);
            Alert.alert('נשמר', 'הוצאת השיווק נוספה בהצלחה');
          } catch (err: any) {
            Alert.alert('שגיאה', err.message || 'לא הצלחנו לשמור');
          }
        }}
      />

      <ConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
        initialValues={data?.config || {}}
        onSubmit={async (formData) => {
          try {
            await updateConfig(formData);
            setConfigModalVisible(false);
            Alert.alert('נשמר', 'ההגדרות עודכנו בהצלחה');
          } catch (err: any) {
            Alert.alert('שגיאה', err.message || 'לא הצלחנו לשמור');
          }
        }}
      />
    </View>
  );
}

// ======================= SUB-COMPONENTS =======================

// --- KPI Card ---
function KPICard({
  label,
  sublabel,
  value,
  status,
  icon: Icon,
  iconColor,
  change,
  vatNote,
  invertChange,
  cardStyle,
}: {
  label: string;
  sublabel?: string;
  value: string;
  status?: KPIStatus;
  icon?: any;
  iconColor?: string;
  change?: number;
  vatNote?: 'ex' | 'inc';
  invertChange?: boolean;
  cardStyle?: any;
}) {
  const color = status ? STATUS_COLORS[status] : iconColor || '#DA4477';
  const bgColor = status ? STATUS_BG[status] : (iconColor ? iconColor + '18' : '#DA447718');

  return (
    <View style={[cardStyle || styles.kpiCard, status && { borderRightColor: color, borderRightWidth: 4 }]}>
      {Icon && (
        <View style={[styles.kpiIconWrap, { backgroundColor: bgColor }]}>
          <Icon size={18} color={color} />
        </View>
      )}
      <View style={styles.kpiValueRow}>
        <Text style={styles.kpiCardValue}>{value}</Text>
        {change !== undefined && change !== 0 && (
          <Text style={[
            styles.kpiChangeText,
            { color: (invertChange ? change < 0 : change > 0) ? '#10B981' : '#EF4444' },
          ]}>
            {change > 0 ? '+' : ''}{Math.round(change)}%
          </Text>
        )}
      </View>
      <Text style={styles.kpiCardLabel}>{label}</Text>
      {sublabel && <Text style={styles.kpiCardSublabel}>{sublabel}</Text>}
      {vatNote && (
        <Text style={styles.kpiVatNote}>
          {vatNote === 'ex' ? 'לפני מע״מ' : 'כולל מע״מ'}
        </Text>
      )}
    </View>
  );
}

// --- Expense Modal ---
function ExpenseModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
}) {
  const [form, setForm] = useState<ExpenseFormData>({
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    is_fixed: true,
    vendor_name: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('שגיאה', 'יש להזין סכום');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      setForm({ category: EXPENSE_CATEGORIES[0], description: '', amount: '', is_fixed: true, vendor_name: '', notes: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>הוסף הוצאה</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category picker */}
              <Text style={styles.fieldLabel}>קטגוריה</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={styles.pickerButtonText}>{form.category}</Text>
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.pickerOptions}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.pickerOption, form.category === cat && styles.pickerOptionSelected]}
                      onPress={() => {
                        setForm(f => ({ ...f, category: cat }));
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, form.category === cat && styles.pickerOptionTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>סכום (₪)</Text>
              <TextInput
                style={styles.textInput}
                value={form.amount}
                onChangeText={(t) => setForm(f => ({ ...f, amount: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>תיאור</Text>
              <TextInput
                style={styles.textInput}
                value={form.description}
                onChangeText={(t) => setForm(f => ({ ...f, description: t }))}
                placeholder="תיאור ההוצאה"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>ספק</Text>
              <TextInput
                style={styles.textInput}
                value={form.vendor_name}
                onChangeText={(t) => setForm(f => ({ ...f, vendor_name: t }))}
                placeholder="שם הספק"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <View style={styles.switchRow}>
                <Switch
                  value={form.is_fixed}
                  onValueChange={(v) => setForm(f => ({ ...f, is_fixed: v }))}
                  trackColor={{ false: '#E5E7EB', true: '#DA4477' }}
                  thumbColor="#fff"
                />
                <Text style={styles.switchLabel}>הוצאה קבועה (חודשית)</Text>
              </View>

              <Text style={styles.fieldLabel}>הערות</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={form.notes}
                onChangeText={(t) => setForm(f => ({ ...f, notes: t }))}
                placeholder="הערות נוספות"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>שמור הוצאה</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// --- Marketing Modal ---
function MarketingModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: MarketingFormData) => void;
}) {
  const [form, setForm] = useState<MarketingFormData>({
    channel: MARKETING_CHANNELS[0],
    amount: '',
    leads_generated: '',
    trials_booked: '',
    conversions: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('שגיאה', 'יש להזין סכום');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      setForm({ channel: MARKETING_CHANNELS[0], amount: '', leads_generated: '', trials_booked: '', conversions: '', notes: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>הוצאת שיווק</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>ערוץ</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowChannelPicker(!showChannelPicker)}
              >
                <Text style={styles.pickerButtonText}>{form.channel}</Text>
              </TouchableOpacity>
              {showChannelPicker && (
                <View style={styles.pickerOptions}>
                  {MARKETING_CHANNELS.map((ch) => (
                    <TouchableOpacity
                      key={ch}
                      style={[styles.pickerOption, form.channel === ch && styles.pickerOptionSelected]}
                      onPress={() => {
                        setForm(f => ({ ...f, channel: ch }));
                        setShowChannelPicker(false);
                      }}
                    >
                      <Text style={[styles.pickerOptionText, form.channel === ch && styles.pickerOptionTextSelected]}>
                        {ch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>סכום (₪)</Text>
              <TextInput
                style={styles.textInput}
                value={form.amount}
                onChangeText={(t) => setForm(f => ({ ...f, amount: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>לידים שנוצרו</Text>
              <TextInput
                style={styles.textInput}
                value={form.leads_generated}
                onChangeText={(t) => setForm(f => ({ ...f, leads_generated: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>אימוני ניסיון</Text>
              <TextInput
                style={styles.textInput}
                value={form.trials_booked}
                onChangeText={(t) => setForm(f => ({ ...f, trials_booked: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>הצטרפו (שילמו)</Text>
              <TextInput
                style={styles.textInput}
                value={form.conversions}
                onChangeText={(t) => setForm(f => ({ ...f, conversions: t }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>הערות</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={form.notes}
                onChangeText={(t) => setForm(f => ({ ...f, notes: t }))}
                placeholder="הערות נוספות"
                placeholderTextColor="#D1D5DB"
                textAlign="right"
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>שמור</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// --- Config Modal ---
function ConfigModal({
  visible,
  onClose,
  initialValues,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  initialValues: Record<string, string>;
  onSubmit: (data: StudioConfigFormData) => void;
}) {
  const [form, setForm] = useState<StudioConfigFormData>({
    studio_area_sqm: initialValues['studio_area_sqm'] || '0',
    target_mrr: initialValues['target_mrr'] || '0',
    target_members: initialValues['target_members'] || '0',
    current_rent: initialValues['current_rent'] || '0',
  });
  const [saving, setSaving] = useState(false);

  // Sync with initialValues when modal opens
  React.useEffect(() => {
    if (visible) {
      setForm({
        studio_area_sqm: initialValues['studio_area_sqm'] || '0',
        target_mrr: initialValues['target_mrr'] || '0',
        target_members: initialValues['target_members'] || '0',
        current_rent: initialValues['current_rent'] || '0',
      });
    }
  }, [visible, initialValues]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>הגדרות סטודיו</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>שטח הסטודיו (מ"ר)</Text>
              <TextInput
                style={styles.textInput}
                value={form.studio_area_sqm}
                onChangeText={(t) => setForm(f => ({ ...f, studio_area_sqm: t }))}
                keyboardType="numeric"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>יעד MRR חודשי (₪)</Text>
              <TextInput
                style={styles.textInput}
                value={form.target_mrr}
                onChangeText={(t) => setForm(f => ({ ...f, target_mrr: t }))}
                keyboardType="numeric"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>יעד מספר מנויים</Text>
              <TextInput
                style={styles.textInput}
                value={form.target_members}
                onChangeText={(t) => setForm(f => ({ ...f, target_members: t }))}
                keyboardType="numeric"
                textAlign="right"
              />

              <Text style={styles.fieldLabel}>שכירות חודשית (₪)</Text>
              <TextInput
                style={styles.textInput}
                value={form.current_rent}
                onChangeText={(t) => setForm(f => ({ ...f, current_rent: t }))}
                keyboardType="numeric"
                textAlign="right"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>שמור הגדרות</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ======================= STYLES =======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DA4477',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Selector ---
  selectorContainer: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  yearRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 13,
  },
  yearText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  monthSelectorContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  monthPillSelected: {
    backgroundColor: '#000000ff',
  },
  monthText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  monthTextSelected: {
    color: '#fff',
    fontWeight: '900',
  },

  // --- Warning / Info Banners ---
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'left',
    fontWeight: '800',
  },
  infoBanner: {
    backgroundColor: '#daeaffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    textAlign: 'left',
    fontWeight: '900',
  },

  // --- Sync Bar ---
  syncBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  syncButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DA4477',
  },
  syncTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // --- Section Title ---
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginTop: 10,
  },

  incExpContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  incExpCardsRow: { flexDirection: 'row', gap: 10 },
  incExpCard: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14 },
  incExpCardActiveIncome: { backgroundColor: '#10B981' },
  incExpCardActiveExpenses: { backgroundColor: '#EF4444' },
  incExpCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  incExpIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  incExpChange: { fontSize: 12, fontWeight: '700' },
  incExpValue: { fontSize: 20, fontWeight: '900', color: '#111827', textAlign: 'left' },
  incExpValueActive: { color: '#fff' },
  incExpLabel: { fontSize: 13, fontWeight: '800', color: '#6B7280', textAlign: 'left', marginTop: 2 },
  incExpLabelActive: { color: 'rgba(255,255,255,0.85)' },
  incExpVat: { fontSize: 10, color: '#B0B0B0', textAlign: 'left', marginTop: 3 },
  incExpVatActive: { color: 'rgba(255,255,255,0.6)' },
  pieEmptyWrap: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 24, paddingBottom: 8, alignItems: 'center' },
  pieEmptyText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  netProfitCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  netProfitLabel: { fontSize: 13, fontWeight: '800', color: '#6B7280', marginBottom: 4 },
  netProfitValue: { fontSize: 26, fontWeight: '900' },
  netProfitChange: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  sparklineWrap: { marginTop: 8, overflow: 'hidden' },
  finKpiContainer: { backgroundColor: '#111827', borderRadius: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  finKpiTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  finKpiGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  finKpiCard: { width: (width - 82) / 2, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14, height: 140, justifyContent: 'center', alignItems: 'center' } as any,
  finKpiDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4 } as any,
  finKpiValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
  finKpiLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },
  finKpiSub: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 1 },
  finKpiTarget: { fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 4 },
  finKpiEmptyText: { fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 4 },
  finKpiChangeWrap: { position: 'absolute', bottom: 10, left: 12 } as any,
  finKpiChange: { fontSize: 11, fontWeight: '700' },
  kpiGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'flex-start',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValueRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  kpiCardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 4,
  },
  kpiChangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#848484ff',
    textAlign: 'right',
  },
  kpiCardSublabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },
  kpiVatNote: {
    fontSize: 9,
    color: '#B0B0B0',
    textAlign: 'right',
    marginTop: 3,
  },

  // --- Breakdown Card (Pie Chart) ---
  breakdownCard: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  pieChartWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  pieCenterText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  pieLegend: {
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legendLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  // --- Mini Cards ---
  miniCardsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  miniCardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  miniCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textAlign: 'center',
  },

  // --- Break Even ---
  breakEvenCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 7,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#374151',
    textAlign: 'center',
  },
  breakEvenStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakEvenStat: {
    flex: 1,
    alignItems: 'center',
  },
  breakEvenDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F3F4F6',
  },
  breakEvenStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  breakEvenStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  breakEvenVatNote: {
    fontSize: 8,
    color: '#B0B0B0',
    marginTop: 2,
  },
  breakEvenNote: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },

  // --- Quick Actions ---
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#374151',
    textAlign: 'center',
  },

  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal:20,
    maxHeight: '85%',
    alignItems: 'stretch',
    paddingBottom: Platform.OS === 'ios' ? 34 : 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#374151',
    textAlign: 'left',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 16,
    color: '#111827',
    textAlign: 'right',
  },
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'right',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionSelected: {
    backgroundColor: '#FDF2F8',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'right',
  },
  pickerOptionTextSelected: {
    color: '#DA4477',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#DA4477',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
});
