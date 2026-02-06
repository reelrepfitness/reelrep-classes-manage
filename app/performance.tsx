import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    I18nManager,
    TextInput,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { ChevronLeft, Dumbbell, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Image as OptimizedImage } from '@/components/ui/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Types ---
interface Exercise {
    id: string;
    name: string;
    measurement_unit: string;
    category: string;
    is_active: boolean;
    measurement_type: string;
    equipment?: 'kettlebell' | 'barbell' | 'dumbbell' | 'landmine' | 'bodyweight' | null;
    instructions?: string | null; // GIF URL for exercise demonstration
}

// --- Equipment Tabs Configuration ---
const EQUIPMENT_TABS = [
    { id: 'kettlebell', label: 'Kettlebell', icon: require('@/assets/eqe-icons/kettlebell-icon.png') },
    { id: 'barbell', label: 'Barbell', icon: require('@/assets/eqe-icons/barbell-icon.png') },
    { id: 'dumbbell', label: 'Dumbbell', icon: require('@/assets/eqe-icons/dumbell-icon.png') },
    { id: 'landmine', label: 'Landmine', icon: require('@/assets/eqe-icons/landmine-icon.png') },
    { id: 'bodyweight', label: 'BW', icon: require('@/assets/eqe-icons/BW-icon.png') },
];

// --- Equipment Tab Component ---
interface EquipmentTabProps {
    tab: typeof EQUIPMENT_TABS[0];
    isSelected: boolean;
    onSelect: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EquipmentTab = ({ tab, isSelected, onSelect }: EquipmentTabProps) => {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(isSelected ? 1.15 : 1, {
                        damping: 15,
                        stiffness: 150,
                    }),
                },
            ],
        };
    });

    return (
        <AnimatedTouchable
            onPress={onSelect}
            activeOpacity={0.8}
            style={[
                styles.equipmentTab,
                isSelected && styles.equipmentTabActive,
                animatedStyle,
            ]}
        >
            <Image
                source={tab.icon}
                style={[
                    styles.equipmentIcon,
                    { opacity: isSelected ? 1 : 0.5 }
                ]}
                resizeMode="contain"
            />
            <Text style={[
                styles.equipmentLabel,
                { opacity: isSelected ? 1 : 0.5 }
            ]} numberOfLines={1}>
                {tab.label}
            </Text>
        </AnimatedTouchable>
    );
};

interface LogEntry {
    date: string;
    weight: number;
    reps: number;
    time: string; // "20:00"
    isPR?: boolean;
    workoutId: string;
}

// --- Helpers ---
const getOptimizedGifUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
        // Insert transformations before /upload/
        // f_auto = auto format, q_auto = auto quality, w_200 = width 200px
        return url.replace('/upload/', '/upload/f_auto,q_auto,w_200/');
    }
    return url;
};

export default function PerformanceScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // State
    const [selectedEquipment, setSelectedEquipment] = useState<string>('barbell');
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [inputWeight, setInputWeight] = useState('');
    const [inputReps, setInputReps] = useState('');

    // 1. Fetch Exercises
    const { data: exercises = [], isLoading: loadingExercises } = useQuery({
        queryKey: ['exercises'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .eq('is_active', true)
                .eq('PR_list', true)
                .order('name');
            if (error) throw error;
            return data as Exercise[];
        }
    });

    // Filter exercises by selected equipment
    const filteredExercises = useMemo(() => {
        return exercises.filter(e => e.equipment === selectedEquipment);
    }, [exercises, selectedEquipment]);

    // 2. Fetch PRs for all exercises in the selected equipment category
    const { data: exercisePRs = {}, isLoading: loadingPRs } = useQuery<Record<string, { weight: number; reps: number }>>({
        queryKey: ['exercise_prs', user?.id, selectedEquipment, filteredExercises.map(e => e.name).join(',')],
        enabled: !!user?.id && filteredExercises.length > 0,
        queryFn: async () => {
            if (!user?.id || filteredExercises.length === 0) return {};

            const exerciseNames = filteredExercises.map(e => e.name);

            const { data, error } = await supabase
                .from('workout_exercises')
                .select(`
                    exercise_name,
                    weight,
                    reps,
                    workouts!inner (
                        user_id
                    )
                `)
                .in('exercise_name', exerciseNames)
                .eq('workouts.user_id', user.id);

            if (error) throw error;

            // Calculate max weight (PR) for each exercise, storing weight and reps
            const prMap: Record<string, { weight: number; reps: number }> = {};
            data.forEach((item: any) => {
                const weight = Number(item.weight) || 0;
                const reps = Number(item.reps) || 0;
                const name = item.exercise_name;
                if (!prMap[name] || weight > prMap[name].weight) {
                    prMap[name] = { weight, reps };
                }
            });

            return prMap;
        }
    });

    // Get the expanded exercise
    const expandedExercise = useMemo(() =>
        filteredExercises.find(e => e.id === expandedExerciseId),
        [filteredExercises, expandedExerciseId]
    );

    // 3. Fetch logs for expanded exercise
    const { data: exerciseLogs = [], isLoading: loadingLogs } = useQuery({
        queryKey: ['exercise_logs', user?.id, expandedExercise?.name],
        enabled: !!user?.id && !!expandedExercise,
        queryFn: async () => {
            if (!user?.id || !expandedExercise) return [];

            const { data, error } = await supabase
                .from('workout_exercises')
                .select(`
                    weight,
                    reps,
                    created_at,
                    workouts!inner (
                        workout_date,
                        user_id
                    )
                `)
                .eq('exercise_name', expandedExercise.name)
                .eq('workouts.user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map((item: any) => ({
                date: item.workouts?.workout_date || item.created_at.split('T')[0],
                weight: Number(item.weight) || 0,
                reps: Number(item.reps) || 0,
            }));
        }
    });

    // Chart data for expanded exercise
    const chartData = useMemo(() => {
        if (exerciseLogs.length === 0) return [];

        // Group by date and take max weight
        const dateMap = new Map<string, number>();
        exerciseLogs.forEach(log => {
            const current = dateMap.get(log.date) || 0;
            if (log.weight > current) {
                dateMap.set(log.date, log.weight);
            }
        });

        return Array.from(dateMap.entries()).map(([date, weight]) => ({
            value: weight,
            label: date.substring(5).replace('-', '/'),
            // Remove dataPointText - we'll use custom component instead
        }));
    }, [exerciseLogs]);


    const handleToggleExpand = (exerciseId: string) => {
        // Trigger smooth layout animation
        LayoutAnimation.configureNext({
            duration: 300,
            create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
            update: {
                type: LayoutAnimation.Types.easeInEaseOut,
            },
            delete: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
        });

        if (expandedExerciseId === exerciseId) {
            setExpandedExerciseId(null);
            setInputWeight('');
            setInputReps('');
        } else {
            setExpandedExerciseId(exerciseId);
            setInputWeight('');
            setInputReps('');
        }
    };

    const handleSaveLog = async () => {
        if (!user?.id || !expandedExercise) return;
        if (!inputWeight && !inputReps) {
            Alert.alert('שגיאה', 'יש להזין משקל או חזרות');
            return;
        }

        try {
            const date = new Date().toISOString();

            // Insert Workout
            const { data: workout, error: wError } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    title: `${expandedExercise.name} Log`,
                    workout_date: date,
                    duration: 0,
                    workout_type: 'strength',
                    created_at: date
                })
                .select()
                .single();

            if (wError) throw wError;

            // Insert Exercise
            const { error: eError } = await supabase
                .from('workout_exercises')
                .insert({
                    workout_id: workout.id,
                    exercise_name: expandedExercise.name,
                    weight: inputWeight ? Number(inputWeight) : null,
                    reps: inputReps ? Number(inputReps) : null,
                    sets: 1,
                });

            if (eError) throw eError;

            // Clear inputs and refresh data
            setInputWeight('');
            setInputReps('');
            queryClient.invalidateQueries({ queryKey: ['exercise_prs'] });
            queryClient.invalidateQueries({ queryKey: ['exercise_logs'] });
            Alert.alert('הצלחה', 'הנתונים נשמרו בהצלחה');

        } catch (err: any) {
            Alert.alert('שגיאה', err.message);
        }
    };


    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronRight size={28} color="#09090B" />
                    </TouchableOpacity>

                    {/* Page Title */}
                    <Text style={styles.pageTitle}>יומן ביצועים</Text>

                    {/* Placeholder */}
                    <View style={{ width: 40 }} />
                </View>

                {/* Equipment Tabs */}
                <View style={styles.equipmentTabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.equipmentTabsContent}
                    >
                        {EQUIPMENT_TABS.map((tab) => (
                            <EquipmentTab
                                key={tab.id}
                                tab={tab}
                                isSelected={selectedEquipment === tab.id}
                                onSelect={() => setSelectedEquipment(tab.id)}
                            />
                        ))}
                    </ScrollView>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Exercise List */}
                {loadingExercises || loadingPRs ? (
                    <View style={{ height: 200, justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : filteredExercises.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>אין תרגילים לציוד זה</Text>
                    </View>
                ) : (
                    <View style={styles.exerciseListContainer}>
                        {filteredExercises.map((exercise) => {
                            const pr = exercisePRs[exercise.name];
                            const hasPR = pr && pr.weight > 0;
                            const gifUrl = getOptimizedGifUrl(exercise.instructions);
                            const isExpanded = expandedExerciseId === exercise.id;

                            return (
                                <View key={exercise.id} style={styles.exerciseCardWrapper}>
                                    <LinearGradient
                                        colors={isExpanded ? ['#000000', '#1F2937'] : ['#000000', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.exerciseCard}
                                    >
                                        {/* Header Row - Always visible */}
                                        <TouchableOpacity
                                            onPress={() => handleToggleExpand(exercise.id)}
                                            activeOpacity={0.8}
                                            style={styles.exerciseCardHeader}
                                        >
                                            {/* GIF Column */}
                                            <View style={styles.exerciseGifContainer}>
                                                {gifUrl ? (
                                                    <OptimizedImage
                                                        source={{ uri: gifUrl }}
                                                        width={100}
                                                        height={100}
                                                        variant="rounded"
                                                        cachePolicy="memory-disk"
                                                        priority="normal"
                                                        transition={200}
                                                        showLoadingIndicator={true}
                                                        showErrorFallback={false}
                                                        loadingIndicatorColor="rgba(255,255,255,0.5)"
                                                    />
                                                ) : (
                                                    <View style={styles.exerciseGifPlaceholder}>
                                                        <Dumbbell size={32} color="rgba(255,255,255,0.3)" />
                                                    </View>
                                                )}
                                            </View>

                                            {/* Content Column */}
                                            <View style={styles.exerciseContent}>
                                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                            </View>

                                            {/* PR Column - only show if has PR */}
                                            {hasPR && (
                                                <View style={styles.prColumn}>
                                                    <Image
                                                        source={require('@/assets/images/PR.png')}
                                                        style={{ width: 28, height: 28 }}
                                                        resizeMode="contain"
                                                    />
                                                    <Text style={styles.prWeight}>
                                                        {pr.weight}{exercise.measurement_unit}
                                                    </Text>
                                                    <Text style={styles.prReps}>
                                                        {pr.reps === 1 ? '1 Rep' : `${pr.reps} Reps`}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Arrow - rotates when expanded */}
                                            <Animated.View style={{
                                                transform: [{ rotate: isExpanded ? '-90deg' : '0deg' }],
                                            }}>
                                                <ChevronLeft size={20} color="rgba(255,255,255,0.5)" />
                                            </Animated.View>
                                        </TouchableOpacity>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <View style={styles.expandedContent}>
                                                {/* Chart */}
                                                {loadingLogs ? (
                                                    <ActivityIndicator color="white" style={{ marginVertical: 20 }} />
                                                ) : chartData.length > 0 ? (
                                                    <View style={styles.chartContainer}>
                                                        <Text style={styles.chartTitle}>התקדמות</Text>
                                                        {/* Clean line chart - flipped for RTL, no labels */}
                                                        <View style={[
                                                            styles.chartWrapper,
                                                            { transform: [{ scaleX: -1 }] }
                                                        ]}>
                                                            <LineChart
                                                                data={chartData}
                                                                height={100}
                                                                width={SCREEN_WIDTH - 80}
                                                                thickness={3}
                                                                color={Colors.primary}
                                                                startFillColor={Colors.primary}
                                                                endFillColor="transparent"
                                                                startOpacity={0.4}
                                                                endOpacity={0.0}
                                                                areaChart
                                                                curved
                                                                dataPointsColor={Colors.primary}
                                                                dataPointsRadius={5}
                                                                hideYAxisText
                                                                hideAxesAndRules
                                                                xAxisLabelsHeight={0}
                                                                initialSpacing={10}
                                                                endSpacing={10}
                                                                spacing={40}
                                                                isAnimated
                                                                animationDuration={500}
                                                            />
                                                        </View>

                                                        {/* Horizontal scroll with date/value cards */}
                                                        <ScrollView
                                                            horizontal
                                                            showsHorizontalScrollIndicator={false}
                                                            contentContainerStyle={styles.historyCardsContainer}
                                                        >
                                                            {chartData.map((item, index) => (
                                                                <View key={index} style={styles.historyCard}>
                                                                    <Text style={styles.historyCardValue}>
                                                                        {item.value}{expandedExercise?.measurement_unit}
                                                                    </Text>
                                                                    <Text style={styles.historyCardDate}>
                                                                        {item.label}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </ScrollView>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.noDataText}>אין היסטוריה עדיין</Text>
                                                )}

                                                {/* Input Form */}
                                                <View style={styles.inputForm}>
                                                    <View style={styles.inputRow}>
                                                        <View style={styles.inputGroup}>
                                                            <Text style={styles.inputLabel}>משקל ({exercise.measurement_unit})</Text>
                                                            <TextInput
                                                                style={styles.input}
                                                                value={inputWeight}
                                                                onChangeText={setInputWeight}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                            />
                                                        </View>
                                                        <View style={styles.inputGroup}>
                                                            <Text style={styles.inputLabel}>חזרות</Text>
                                                            <TextInput
                                                                style={styles.input}
                                                                value={inputReps}
                                                                onChangeText={setInputReps}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                            />
                                                        </View>
                                                    </View>

                                                    <TouchableOpacity
                                                        style={styles.saveButton}
                                                        onPress={handleSaveLog}
                                                    >
                                                        <Text style={styles.saveButtonText}>עדכן שיא אישי</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </View>
                            );
                        })}
                    </View>
                )
                }

                <View style={{ height: 40 }} />
            </ScrollView >

        </View >
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
    },
    // Equipment Tabs
    equipmentTabsContainer: {
        marginTop: 8,
        alignItems: 'center',
    },
    equipmentTabsContent: {
        flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
        paddingHorizontal: 4,
        gap: 8,
        justifyContent: 'center',
    },
    equipmentTab: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'transparent',
        minWidth: 60,
    },
    equipmentTabActive: {
    },
    equipmentIcon: {
        width: 36,
        height: 36,
        marginBottom: 4,
    },
    equipmentLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1c1c1c',
        textAlign: 'center',
    },

    // Selector
    selectorContainer: {
        marginTop: 0,
        marginBottom: 20,
        backgroundColor: '#fff',
        paddingVertical: 12,
        minHeight: 60,
    },
    noExercisesText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 14,
        paddingVertical: 20,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateText: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 16,
        lineHeight: 24,
    },
    selectorContent: {
        paddingHorizontal: 20,
        gap: 24,
    },
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
        marginTop: 10,
    },
    heroCard: {
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
        overflow: 'hidden',
    },
    heroColumns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    heroGifColumn: {
        width: 120,
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    heroGif: {
        width: '100%',
        height: '100%',
    },
    heroGifPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroPrColumn: {
        flex: 1,
        alignItems: 'center',
    },
    heroHeader: {
        flexDirection: 'row',
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
        gap: 4,
        marginBottom: 12,
    },
    heroValue: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        lineHeight: 42,
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
        flexDirection: 'column',
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

    // Chart Wrapper (for expanded card)
    chartWrapper: {
        alignItems: 'center',
    },

    // History
    historyList: {
        gap: 12,
    },
    historyRow: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row-reverse',
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

    // Exercise List
    exerciseListContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    exerciseCardWrapper: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    exerciseCard: {
        borderRadius: 20,
        padding: 14,
    },
    exerciseCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    exerciseGifContainer: {
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: 'hidden',
        margin: -10,
    },
    exerciseGifPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseContent: {
        flex: 1,
        gap: 8,
    },
    exerciseName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'left',
    },
    prColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingHorizontal: 8,
    },
    prWeight: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    prReps: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    prValueEmpty: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontStyle: 'italic',
        textAlign: 'center',
    },

    // Expanded Content
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    chartContainer: {
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 12,
    },
    noDataText: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginVertical: 25,
    },
    inputForm: {
        gap: 12,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
        gap: 6,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 1)',
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // History cards for chart
    historyCardsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        paddingTop: 12,
        gap: 10,
    },
    historyCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        minWidth: 80,
    },
    historyCardValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    historyCardDate: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
});
