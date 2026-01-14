import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Trophy, Clock, Dumbbell, Plus, ChevronLeft } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

// --- Mock Data ---

const PR_DATA = [
    { id: '1', exercise: 'Deadlift', value: '180 kg', date: '10/01/2025', isNew: true },
    { id: '2', exercise: 'Back Squat', value: '140 kg', date: '05/01/2025', isNew: false },
    { id: '3', exercise: '5k Run', value: '21:30 min', date: '01/01/2025', isNew: false },
    { id: '4', exercise: 'Clean & Jerk', value: '100 kg', date: '28/12/2024', isNew: false },
];

const EXERCISES = [
    { label: 'Deadlift', value: 'deadlift', type: 'strength' },
    { label: '5k Run', value: '5k_run', type: 'endurance' },
];

const CHART_DATA = {
    deadlift: [
        { value: 160, date: '01 Dec', label: '12/1' },
        { value: 165, date: '08 Dec', label: '12/8' },
        { value: 170, date: '15 Dec', label: '12/15' },
        { value: 175, date: '22 Dec', label: '12/22' },
        { value: 175, date: '30 Dec', label: '12/30' },
        { value: 180, date: '10 Jan', label: '1/10' },
    ],
    '5k_run': [
        { value: 1450, date: '01 Dec', label: '12/1', displayValue: '24:10' }, // values in seconds
        { value: 1420, date: '10 Dec', label: '12/10', displayValue: '23:40' },
        { value: 1380, date: '20 Dec', label: '12/20', displayValue: '23:00' },
        { value: 1350, date: '28 Dec', label: '12/28', displayValue: '22:30' },
        { value: 1320, date: '05 Jan', label: '1/5', displayValue: '22:00' },
        { value: 1290, date: '12 Jan', label: '1/12', displayValue: '21:30' },
    ]
};

const HISTORY_DATA = [
    { id: 'h1', exercise: 'Deadlift', result: '180 kg', date: '10/01/2025', isPR: true, type: 'strength' },
    { id: 'h2', exercise: '5k Run', result: '21:30 min', date: '12/01/2025', isPR: true, type: 'endurance' },
    { id: 'h3', exercise: 'Back Squat', result: '135 kg', date: '08/01/2025', isPR: false, type: 'strength' },
    { id: 'h4', exercise: 'Deadlift', result: '175 kg', date: '05/01/2025', isPR: false, type: 'strength' },
    { id: 'h5', exercise: 'Clean & Jerk', result: '95 kg', date: '03/01/2025', isPR: false, type: 'strength' },
];

export default function PerformanceScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);

    const currentChartData = CHART_DATA[selectedExercise.value as keyof typeof CHART_DATA];
    const isStrength = selectedExercise.type === 'strength';

    return (
        <View style={styles.container}>
            {/* 1. Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#09090B" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>יומן ביצועים</Text>
                    <Text style={styles.headerSubtitle}>ההתקדמות שלך</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* 2. PR Showcase Carousel */}
                <View style={styles.carouselContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.carouselContent}
                        flexDirection="row-reverse"
                    >
                        {PR_DATA.map((item) => (
                            <View key={item.id} style={styles.prCard}>
                                <View style={styles.prHeader}>
                                    <Text style={styles.prExercise}>{item.exercise}</Text>
                                    {item.isNew && (
                                        <View style={styles.newBadge}>
                                            <Text style={styles.newBadgeText}>New PR!</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.prValue}>{item.value}</Text>
                                <View style={styles.prFooter}>
                                    <Text style={styles.prDate}>{item.date}</Text>
                                    <Trophy size={16} color={item.isNew ? "#FFD700" : "#E5E7EB"} />
                                </View>
                                <View style={styles.cardAccent} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* 3. Progress Chart */}
                <View style={styles.chartSection}>
                    <View style={styles.filterContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterScroll}
                            flexDirection="row-reverse"
                        >
                            {EXERCISES.map((ex) => (
                                <TouchableOpacity
                                    key={ex.value}
                                    onPress={() => setSelectedExercise(ex)}
                                    style={[
                                        styles.filterChip,
                                        selectedExercise.value === ex.value && styles.activeFilterChip
                                    ]}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        selectedExercise.value === ex.value && styles.activeFilterChipText
                                    ]}>
                                        {ex.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.chartContainer}>
                        <LineChart
                            data={currentChartData}
                            width={width - 80}
                            height={220}
                            noOfSections={4}
                            spacing={50}
                            initialSpacing={20}
                            color={Colors.primary}
                            thickness={4}
                            startFillColor={Colors.primary}
                            endFillColor="rgba(218, 68, 119, 0.01)"
                            startOpacity={0.4}
                            endOpacity={0.1}
                            areaChart
                            curved
                            pointerConfig={{
                                pointerStrokeDashArray: [5, 5],
                                pointerColor: Colors.primary,
                                radius: 6,
                                pointerLabelComponent: (items: any) => {
                                    return (
                                        <View style={styles.tooltipContainer}>
                                            <Text style={styles.tooltipValue}>
                                                {isStrength ? `${items[0].value} kg` : items[0].displayValue}
                                            </Text>
                                            <Text style={styles.tooltipDate}>{items[0].date}</Text>
                                        </View>
                                    );
                                },
                            }}
                            yAxisTextStyle={styles.chartAxisText}
                            xAxisLabelTextStyle={styles.chartAxisText}
                            yAxisColor="#F3F4F6"
                            xAxisColor="#F3F4F6"
                            rulesColor="#F3F4F6"
                        />
                    </View>
                </View>

                {/* 4. Recent History List */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>היסטוריה אחרונה</Text>
                    <View style={styles.historyList}>
                        {HISTORY_DATA.map((item) => (
                            <View key={item.id} style={styles.historyRow}>
                                <View style={styles.historyIconContainer}>
                                    {item.type === 'strength' ? (
                                        <Dumbbell size={18} color={Colors.primary} />
                                    ) : (
                                        <Clock size={18} color="#3b82f6" />
                                    )}
                                </View>
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyExercise}>{item.exercise}</Text>
                                    <Text style={styles.historyDate}>{item.date}</Text>
                                </View>
                                <View style={styles.historyResultContainer}>
                                    {item.isPR && <Trophy size={14} color="#FFD700" style={{ marginRight: 6 }} />}
                                    <Text style={[styles.historyResult, item.isPR && styles.prResultText]}>
                                        {item.result}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    // Header
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 4,
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'flex-end',
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#09090B',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#71717A',
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    // Carousel
    carouselContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    carouselContent: {
        paddingHorizontal: 20,
        gap: 16,
    },
    prCard: {
        width: 160,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    prHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    prExercise: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textAlign: 'right',
        flex: 1,
    },
    newBadge: {
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#FEF3C7',
    },
    newBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#D97706',
    },
    prValue: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.primary,
        marginVertical: 4,
        textAlign: 'right',
    },
    prFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    prDate: {
        fontSize: 10,
        color: '#94A3B8',
    },
    cardAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: Colors.primary,
        opacity: 0.8,
    },

    // Chart Section
    chartSection: {
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    filterContainer: {
        marginBottom: 20,
    },
    filterScroll: {
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    activeFilterChip: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    activeFilterChipText: {
        color: '#fff',
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
    },
    chartAxisText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    tooltipContainer: {
        backgroundColor: '#0F172A',
        padding: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    tooltipValue: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    tooltipDate: {
        color: '#94A3B8',
        fontSize: 10,
        marginTop: 2,
    },

    // History Section
    historySection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#09090B',
        marginBottom: 16,
        textAlign: 'right',
    },
    historyList: {
        gap: 12,
    },
    historyRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    historyIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    historyExercise: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    historyDate: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    historyResultContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    historyResult: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    prResultText: {
        color: Colors.primary,
    },
});
