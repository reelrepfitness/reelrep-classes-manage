import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';
import { useRouter, Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { ChevronLeft, Scale, TrendingUp, Dumbbell, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LogProgressModal from '@/components/performance/LogProgressModal';

const { width } = Dimensions.get('window');

// --- Mock Data constants ---
const USER_BODYWEIGHT = 80; // kg

const EXERCISES = [
    { id: 'deadlift', label: 'Deadlift', currentPR: 180, lastDate: '10/01/2025', unit: 'kg' },
    { id: 'back_squat', label: 'Back Squat', currentPR: 140, lastDate: '05/01/2025', unit: 'kg' },
    { id: 'bench_press', label: 'Bench Press', currentPR: 100, lastDate: '28/12/2024', unit: 'kg' },
    { id: 'clean_jerk', label: 'Clean & Jerk', currentPR: 85, lastDate: '15/12/2024', unit: 'kg' },
    { id: '5k_run', label: 'Run 5k', currentPR: 0, lastDate: '01/01/2025', unit: 'min', isTime: true, timeStr: '21:30' },
];

const CHART_DATA_MOCK = {
    deadlift: [
        { value: 160, date: '01/12' },
        { value: 165, date: '08/12' },
        { value: 170, date: '15/12' },
        { value: 175, date: '22/12' },
        { value: 175, date: '30/12' },
        { value: 180, date: '10/01' },
    ],
    back_squat: [
        { value: 120, date: '01/12' },
        { value: 125, date: '10/12' },
        { value: 130, date: '20/12' },
        { value: 135, date: '30/12' },
        { value: 140, date: '05/01' },
    ],
    bench_press: [
        { value: 90, date: '01/12' },
        { value: 92.5, date: '10/12' },
        { value: 95, date: '20/12' },
        { value: 100, date: '28/12' },
    ],
    clean_jerk: [
        { value: 70, date: '01/12' },
        { value: 75, date: '15/12' },
        { value: 85, date: '15/12' },
    ],
    '5k_run': [
        { value: 24.10, date: '01/12' },
        { value: 23.40, date: '10/12' },
        { value: 23.00, date: '20/12' },
        { value: 22.30, date: '28/12' },
        { value: 21.30, date: '01/01' },
    ]
};

const HISTORY_MOCK = [
    { id: '1', date: 'מאי 15, 2026', weight: 140, reps: 1, isPR: true },
    { id: '2', date: 'אפר 28, 2026', weight: 135, reps: 2 },
    { id: '3', date: 'מרץ 10, 2026', weight: 130, reps: 3 },
    { id: '4', date: 'פבר 22, 2026', weight: 125, reps: 5 },
];

// --- Helpers ---

const calculateRatio = (weight: number, bodyWeight: number) => {
    if (!weight || !bodyWeight) return 0;
    return (weight / bodyWeight).toFixed(2);
};

const getRatioColor = (ratio: number) => {
    if (ratio >= 2.0) return { bg: '#FEF3C7', text: '#D97706', label: 'Elite', icon: '👑' }; // Gold
    if (ratio >= 1.5) return { bg: '#F1F5F9', text: '#475569', label: 'Pro', icon: '🥈' };  // Silver
    return { bg: '#FFF1F2', text: Colors.primary, label: 'Athlete', icon: '💪' };    // Brand
};

const calculatePercentages = (max: number) => {
    return [
        { pct: '50%', weight: Math.round(max * 0.5) },
        { pct: '70%', weight: Math.round(max * 0.7) },
        { pct: '80%', weight: Math.round(max * 0.8) },
        { pct: '90%', weight: Math.round(max * 0.9) },
    ];
};

export default function PerformanceScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
    const [bodyWeight, setBodyWeight] = useState(USER_BODYWEIGHT);
    const [modalVisible, setModalVisible] = useState(false);

    // Derived State
    const currentData = CHART_DATA_MOCK[selectedExercise.id as keyof typeof CHART_DATA_MOCK] || [];
    const isStrength = !selectedExercise.isTime;
    const ratio = isStrength ? calculateRatio(selectedExercise.currentPR, bodyWeight) : null;
    const ratioStyle = isStrength ? getRatioColor(Number(ratio)) : null;
    const percentages = isStrength ? calculatePercentages(selectedExercise.currentPR) : [];

    // Chart Data Formatting - Gifted Charts expects specific format
    const chartData = currentData.map(item => ({
        value: item.value,
        dataPointText: String(item.value),
        label: item.date,
        hideDataPoint: false,
    }));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={28} color="#09090B" />
                    </TouchableOpacity>

                    {/* Bodyweight Actions Only - Removed Title as requested */}
                    <View style={styles.bwContainer}>
                        <View style={styles.bwInfo}>
                            <Scale size={16} color="#64748B" />
                            <Text style={styles.bwText}>BW: <Text style={styles.bwValue}>{bodyWeight}kg</Text></Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => Alert.alert('עדכון משקל גוף', 'כאן יפתח מודל לעדכון משקל')}
                            style={styles.bwButton}
                        >
                            <Text style={styles.bwButtonText}>Update</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Placeholder to balance the back button */}
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. Exercise Selector (Styled as Tabs) */}
                <View style={styles.selectorContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[styles.selectorContent, { flexDirection: 'row-reverse' }]}
                    >
                        {EXERCISES.map((ex) => {
                            const isSelected = selectedExercise.id === ex.id;
                            return (
                                <TouchableOpacity
                                    key={ex.id}
                                    onPress={() => setSelectedExercise(ex)}
                                    style={[
                                        styles.tabItem,
                                        isSelected && styles.tabItemActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.tabText,
                                        isSelected && styles.tabTextActive
                                    ]}>
                                        {ex.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2. Hero Card - Current PR */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#1F2937', '#000000']} // Black Gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.heroIconContainer}>
                                <Dumbbell size={20} color="#fff" />
                            </View>
                            <Text style={styles.heroLabel}>שיא אישי (PR)</Text>
                        </View>

                        <View style={styles.heroMain}>
                            <Text style={styles.heroValue}>
                                {selectedExercise.isTime ? selectedExercise.timeStr : selectedExercise.currentPR}
                            </Text>
                            <Text style={styles.heroUnit}>
                                {selectedExercise.unit}
                            </Text>
                        </View>

                        {/* Smart Badge */}
                        {isStrength && ratioStyle && (
                            <View style={[styles.ratioBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <Text style={styles.ratioIcon}>{ratioStyle.icon}</Text>
                                <Text style={styles.ratioText}>
                                    {ratio}x משקל גוף
                                </Text>
                            </View>
                        )}
                    </LinearGradient>
                </View>

                {/* 3. Pro Tools - Load Table (Only for Strength) */}
                {isStrength && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>טבלת עומסים</Text>
                        <View style={styles.loadGrid}>
                            {percentages.map((p, index) => (
                                <View key={index} style={styles.loadBox}>
                                    <View style={styles.loadHeader}>
                                        <Text style={styles.loadPct}>{p.pct}</Text>
                                    </View>
                                    <Text style={styles.loadWeight}>{p.weight} kg</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 4. Progress Chart */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <TrendingUp size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>גרף התקדמות</Text>
                    </View>

                    <View style={styles.chartWrapper}>
                        {/* LTR wrapper to fix mirroring issues */}
                        <View style={{ direction: 'ltr' }}>
                            <LineChart
                                data={chartData}
                                height={220}
                                width={width - 64} // padding adjustments
                                thickness={3}
                                color={Colors.primary}
                                startFillColor={Colors.primary}
                                endFillColor={Colors.primary}
                                startOpacity={0.2}
                                endOpacity={0.0}
                                areaChart
                                curved
                                hideDataPoints={false}
                                dataPointsColor={Colors.primary}
                                dataPointsRadius={4}
                                textColor="#94A3B8"
                                textFontSize={10}
                                hideRules
                                xAxisColor="transparent"
                                yAxisColor="transparent"
                                yAxisTextStyle={{ color: '#94A3B8', fontSize: 10 }}
                                initialSpacing={20}
                                spacing={50}
                            />
                        </View>
                    </View>
                </View>

                {/* 5. Recent History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <History size={20} color="#64748B" />
                        <Text style={styles.sectionTitle}>היסטוריה</Text>
                    </View>

                    <View style={styles.historyList}>
                        {HISTORY_MOCK.map((item, index) => (
                            <View key={item.id} style={styles.historyRow}>
                                <View style={styles.historyLeft}>
                                    <Text style={styles.historyWeight}>{item.weight} kg</Text>
                                    {item.reps > 1 && <Text style={styles.historyReps}>{item.reps} reps</Text>}
                                </View>
                                <View style={styles.historyRight}>
                                    <Text style={styles.historyDate}>{item.date}</Text>
                                    {item.isPR && (
                                        <View style={styles.miniPrBadge}>
                                            <Text style={styles.miniPrText}>PR</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Button for Logging - Floating Bottom Left */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Dumbbell color="white" size={24} />
                <Text style={styles.fabText}>עדכון ביצועים</Text>
            </TouchableOpacity>

            <LogProgressModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                exercise={selectedExercise}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    // Header
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTopRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    bwContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    bwInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    bwText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    bwValue: {
        color: '#0F172A',
        fontWeight: '700',
    },
    bwButton: {
        // backgroundColor: '#fff',
        // padding: 4
    },
    bwButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
    },

    // Selector
    selectorContainer: {
        marginTop: 0,
        marginBottom: 20,
        backgroundColor: '#fff',
        paddingVertical: 12,
    },
    selectorContent: {
        paddingHorizontal: 20,
        gap: 24,
    },
    // New Tab Styles
    tabItem: {
        paddingVertical: 8,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#94A3B8',
    },
    tabTextActive: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },

    // Hero Section
    heroSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
        marginTop: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    heroHeader: {
        flexDirection: 'row-reverse', // Ensure icon is on correct side for RTL context if needed, currently centered
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    heroIconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 6,
        borderRadius: 12,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    heroMain: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
        marginBottom: 16,
    },
    heroValue: {
        fontSize: 56, // Huge
        fontWeight: '900',
        color: '#fff',
        lineHeight: 56,
        fontVariant: ['tabular-nums'],
    },
    heroUnit: {
        fontSize: 20,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    ratioBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    ratioIcon: {
        fontSize: 14,
    },
    ratioText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Section Common
    section: {
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'right',
        marginBottom: 12,
    },

    // Load Grid
    loadGrid: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 8,
    },
    loadBox: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    loadHeader: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: 6,
    },
    loadPct: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    loadWeight: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },

    // Chart Wrapper
    chartWrapper: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        paddingBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    // History
    historyList: {
        gap: 12,
    },
    historyRow: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row-reverse', // RTL: Date on right, Weight on left logic
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyDate: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    historyLeft: {
        alignItems: 'flex-start',
    },
    historyWeight: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    historyReps: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    miniPrBadge: {
        marginTop: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    miniPrText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#D97706',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 30,
        left: 20, // Hebrew often uses Left for primary actions if context is reversed, or Right. 
        // User asked for "action button", typically FAB is bottom-right in Material, but can be bottom-left in RTL optimization.
        // Let's stick to Right (default thumb) or Left (RTL flipped). With pure logic, 'left: 20' is visual Left.
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
        gap: 8,
    },
    fabText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
