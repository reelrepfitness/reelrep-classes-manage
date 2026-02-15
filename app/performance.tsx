import React, { useState, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
    I18nManager,
    TextInput,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
    Modal,
    Animated as RNAnimated,
    PanResponder,
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
import { ChevronLeft, Dumbbell, ChevronRight, Search, X, Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Image as OptimizedImage } from '@/components/ui/image';
import { Spinner } from '@/components/ui/spinner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Types ---
interface Exercise {
    id: string;
    name: string;
    measurement_unit: string;
    category: string;
    is_active: boolean;
    measurement_type: string;
    name_he?: string;
    equipment?: string[] | null;
    instructions?: string | null;
    equipment_gifs?: Record<string, string> | null;
}

// --- Equipment Tabs Configuration ---
const EQUIPMENT_TABS = [
    { id: 'all', label: 'All', icon: require('@/assets/images/icon.png'), color: '#94A3B8' },
    { id: 'landmine', label: 'Landmine', icon: require('@/assets/eqe-icons/landmine-icon.png'), color: '#c1ff72' },
    { id: 'kettlebell', label: 'Kettlebell', icon: require('@/assets/eqe-icons/kettlebell-icon.png'), color: '#e2a9f1' },
    { id: 'dumbbell', label: 'Dumbbell', icon: require('@/assets/eqe-icons/dumbell-icon.png'), color: '#0cc0df' },
    { id: 'barbell', label: 'Barbell', icon: require('@/assets/eqe-icons/barbell-icon.png'), color: '#f2ca4b' },
    { id: 'bodyweight', label: 'BW', icon: require('@/assets/eqe-icons/BW-icon.png'), color: '#8d6e63' },
    { id: 'cable', label: 'Cable', icon: require('@/assets/eqe-icons/cable-icon.png'), color: '#ff6b6b' },
    { id: 'medicine_ball', label: 'Medicine Ball', icon: require('@/assets/eqe-icons/medecine-ball.png'), color: '#FFA726' },
    { id: 'machine', label: 'Machine', icon: require('@/assets/eqe-icons/machine.png'), color: '#78909C' },
];

// --- Components ---

// Horizontal list of recent exercises
const RecentExercises = ({ onSelect }: { onSelect: (exerciseName: string) => void }) => {
    const { user } = useAuth();

    const { data: recentExercises = [] } = useQuery({
        queryKey: ['recent_exercises', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            if (!user?.id) return [];

            // Fetch distinct exercise names from workout logs, limited to last 10 unique
            const { data, error } = await supabase
                .from('workout_exercises')
                .select('exercise_name, created_at')
                .order('created_at', { ascending: false })
                .limit(50); // Fetch more to filter unique clientside if needed

            if (error) {
                console.error('Error fetching recent exercises:', error);
                return [];
            }

            // Manual distinct filter
            const seen = new Set();
            const unique: string[] = [];
            for (const item of data) {
                if (!seen.has(item.exercise_name)) {
                    seen.add(item.exercise_name);
                    unique.push(item.exercise_name);
                    if (unique.length >= 8) break;
                }
            }
            return unique;
        }
    });

    if (recentExercises.length === 0) return null;

    return (
        <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>אחרונים</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
                {recentExercises.map((name, index) => (
                    <TouchableOpacity
                        key={`${name}-${index}`}
                        style={styles.recentChip}
                        onPress={() => onSelect(name)}
                    >
                        <Text style={styles.recentChipText}>{name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// Search Bar Component
const SearchBar = ({ value, onChange, onClear }: { value: string, onChange: (text: string) => void, onClear: () => void }) => (
    <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
            <Search size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="חפש תרגיל..."
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChange}
                textAlign="right"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={onClear} style={styles.clearButton}>
                    <X size={16} color="#94A3B8" />
                </TouchableOpacity>
            )}
        </View>
    </View>
);

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

// Get GIF URL based on selected equipment
const getExerciseGif = (exercise: Exercise, selectedEquipment: string | null): string | null => {
    // If equipment_gifs exists and has a GIF for the selected equipment, use it
    if (exercise.equipment_gifs && selectedEquipment && exercise.equipment_gifs[selectedEquipment]) {
        return getOptimizedGifUrl(exercise.equipment_gifs[selectedEquipment]);
    }

    // If no GIF for selected equipment, try to find ANY available equipment GIF
    if (exercise.equipment_gifs) {
        const availableGifs = Object.values(exercise.equipment_gifs).filter(Boolean);
        if (availableGifs.length > 0) {
            return getOptimizedGifUrl(availableGifs[0]);
        }
    }

    // Fallback to default instructions field
    return getOptimizedGifUrl(exercise.instructions);
};

export default function PerformanceScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // State
    const [activeTab, setActiveTab] = useState<'library' | 'myPRs'>('library');
    const [searchText, setSearchText] = useState('');
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [selectedExpandedEquipment, setSelectedExpandedEquipment] = useState<string | null>(null);
    const [inputWeight, setInputWeight] = useState('');
    const [inputReps, setInputReps] = useState('');

    // Modal state for Exercise Library
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedModalExercise, setSelectedModalExercise] = useState<Exercise | null>(null);

    // Modal swipe-to-dismiss animation
    const modalTranslateY = useRef(new RNAnimated.Value(0)).current;
    const modalPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to downward swipes
                return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward movement
                if (gestureState.dy > 0) {
                    modalTranslateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    // Swipe down threshold reached - close modal
                    RNAnimated.timing(modalTranslateY, {
                        toValue: 600,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        setModalVisible(false);
                        modalTranslateY.setValue(0);
                    });
                } else {
                    // Snap back
                    RNAnimated.spring(modalTranslateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }).start();
                }
            },
        })
    ).current;

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

    // Filter exercises by search text (supports English and Hebrew)
    const filteredExercises = useMemo(() => {
        if (!searchText) return exercises;
        return exercises.filter(e =>
            e.name.toLowerCase().includes(searchText.toLowerCase()) ||
            e.name_he?.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [exercises, searchText]);

    // Helper to get equipment icon
    const getEquipmentIcon = (equipmentId: string) => {
        const tab = EQUIPMENT_TABS.find(t => t.id === equipmentId);
        return tab?.icon;
    };

    // Get the expanded exercise
    const expandedExercise = useMemo(() =>
        filteredExercises.find(e => e.id === expandedExerciseId),
        [filteredExercises, expandedExerciseId]
    );

    // Effect: Set default equipment when expanding
    React.useEffect(() => {
        if (expandedExerciseId && expandedExercise) {
            // Default to 'all' when expanding
            setSelectedExpandedEquipment('all');
        }
    }, [expandedExerciseId, expandedExercise]);

    // 2. Fetch PRs (max weight) 
    const { data: exercisePRs = {}, isLoading: loadingPRs } = useQuery<Record<string, { weight: number; reps: number }>>({
        queryKey: ['exercise_prs', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            if (!user?.id) return {};

            // Fetch max weight per exercise
            const { data, error } = await supabase
                .from('workout_exercises')
                .select('exercise_name, weight, reps, workouts!inner(user_id)')
                .eq('workouts.user_id', user.id); // Get all logs for user to calculate maxes

            if (error) throw error;

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

    // 4. Fetch user's exercises (exercises with logged data)
    const { data: userExerciseStats = [], isLoading: loadingUserStats } = useQuery({
        queryKey: ['user_exercise_stats', user?.id],
        enabled: !!user?.id && activeTab === 'myPRs',
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase
                .from('workout_exercises')
                .select('exercise_name, weight, reps, created_at, equipment, workouts!inner(user_id)')
                .eq('workouts.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by exercise and calculate stats
            const statsMap: Record<string, {
                exerciseName: string;
                workoutCount: number;
                currentPR: number;
                prReps: number;
                lastWorkout: string;
                equipment: string[]; // Track unique equipment used
            }> = {};

            data.forEach((item: any) => {
                const name = item.exercise_name;
                const weight = Number(item.weight) || 0;
                const reps = Number(item.reps) || 0;
                const date = item.created_at;
                const equipment = item.equipment;

                if (!statsMap[name]) {
                    statsMap[name] = {
                        exerciseName: name,
                        workoutCount: 0,
                        currentPR: weight,
                        prReps: reps,
                        lastWorkout: date,
                        equipment: [],
                    };
                }

                statsMap[name].workoutCount++;
                if (weight > statsMap[name].currentPR) {
                    statsMap[name].currentPR = weight;
                    statsMap[name].prReps = reps;
                }
                if (new Date(date) > new Date(statsMap[name].lastWorkout)) {
                    statsMap[name].lastWorkout = date;
                }
                // Track unique equipment
                if (equipment && !statsMap[name].equipment.includes(equipment)) {
                    statsMap[name].equipment.push(equipment);
                }
            });

            return Object.values(statsMap);
        }
    });

    // Filter for My PR's tab - only show exercises user has logged
    const displayedExercises = useMemo(() => {
        if (activeTab === 'myPRs') {
            // Filter to only exercises with user data
            const userExerciseNames = userExerciseStats.map((s: any) => s.exerciseName);
            return filteredExercises.filter(e => userExerciseNames.includes(e.name));
        }
        return filteredExercises;
    }, [activeTab, filteredExercises, userExerciseStats]);

    // 3. Fetch logs for expanded exercise AND selected equipment
    const { data: exerciseLogs = [], isLoading: loadingLogs } = useQuery({
        queryKey: ['exercise_logs', user?.id, expandedExercise?.name, selectedExpandedEquipment],
        enabled: !!user?.id && !!expandedExercise && !!selectedExpandedEquipment,
        queryFn: async () => {
            if (!user?.id || !expandedExercise || !selectedExpandedEquipment) return [];

            let query = supabase
                .from('workout_exercises')
                .select(`
                    weight,
                    reps,
                    created_at,
                    equipment,
                    workouts!inner (
                        workout_date,
                        user_id
                    )
                `)
                .eq('exercise_name', expandedExercise.name)
                .eq('workouts.user_id', user.id);

            // Filter by selected equipment (unless 'all' is selected)
            if (selectedExpandedEquipment && selectedExpandedEquipment !== 'all') {
                query = query.eq('equipment', selectedExpandedEquipment);
            }

            const { data, error } = await query.order('created_at', { ascending: true });

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

            // Insert Exercise with EQUIPMENT
            const { error: eError } = await supabase
                .from('workout_exercises')
                .insert({
                    workout_id: workout.id,
                    exercise_name: expandedExercise.name,
                    weight: inputWeight ? Number(inputWeight) : null,
                    reps: inputReps ? Number(inputReps) : null,
                    sets: 1,
                    equipment: selectedExpandedEquipment,
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

                {/* Search Bar */}
                <SearchBar
                    value={searchText}
                    onChange={setSearchText}
                    onClear={() => setSearchText('')}
                />

                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'library' && styles.tabActive]}
                        onPress={() => setActiveTab('library')}
                    >
                        <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
                            ספריית תרגילים
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'myPRs' && styles.tabActive]}
                        onPress={() => setActiveTab('myPRs')}
                    >
                        <Text style={[styles.tabText, activeTab === 'myPRs' && styles.tabTextActive]}>
                            My PRs
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Exercise List */}
                {loadingExercises || (activeTab === 'myPRs' && loadingUserStats) ? (
                    <View style={{ height: 200, justifyContent: 'center' }}>
                        <Spinner size="lg" />
                    </View>
                ) : displayedExercises.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <Text style={styles.emptyStateText}>
                            {activeTab === 'myPRs' ? 'עדיין לא רשמת תרגילים' : 'לא נמצאו תרגילים'}
                        </Text>
                    </View>
                ) : activeTab === 'myPRs' ? (
                    // My PR's Tab - Personalized View
                    <View style={styles.myPRsContainer}>
                        {displayedExercises.map((exercise) => {
                            const stats = userExerciseStats.find((s: any) => s.exerciseName === exercise.name);
                            if (!stats) return null;

                            const isExpanded = expandedExerciseId === exercise.id;
                            // Get GIF based on selected equipment when expanded, otherwise use first equipment
                            const currentEquipment = isExpanded && selectedExpandedEquipment
                                ? selectedExpandedEquipment
                                : exercise.equipment?.[0] || null;
                            const gifUrl = getExerciseGif(exercise, currentEquipment);
                            const lastWorkoutDate = new Date(stats.lastWorkout);
                            const daysAgo = Math.floor((Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));

                            // Determine chart color based on selected equipment
                            const selectedEqData = EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment);
                            const chartColor = selectedEqData?.color || Colors.primary;

                            return (
                                <View key={exercise.id} style={styles.myPRCard}>
                                    <LinearGradient
                                        colors={isExpanded ? ['#000000', '#1a1a1a', '#111827'] : ['#000000', '#1a1a1a']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.myPRCardGradient}
                                    >
                                        <TouchableOpacity
                                            onPress={() => {
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
                                                if (isExpanded) {
                                                    setExpandedExerciseId(null);
                                                } else {
                                                    setExpandedExerciseId(exercise.id);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            {/* Exercise Info */}
                                            <View style={styles.myPRCardHeader}>
                                                {gifUrl && (
                                                    <View style={styles.myPRGifContainer}>
                                                        <OptimizedImage
                                                            source={{ uri: gifUrl }}
                                                            style={styles.myPRGif}
                                                            contentFit="cover"
                                                        />
                                                    </View>
                                                )}
                                                <View style={styles.myPRCardInfo}>
                                                    <Text style={styles.myPRExerciseName}>{exercise.name}</Text>
                                                    <View style={styles.myPREquipmentRow}>
                                                        <Text style={styles.myPREquipmentLabel}>בוצע עם: </Text>
                                                        {stats.equipment?.map((eq: string, index: number) => {
                                                            const eqTab = EQUIPMENT_TABS.find(t => t.id === eq);
                                                            if (!eqTab) return null;
                                                            return (
                                                                <Image
                                                                    key={eq}
                                                                    source={eqTab.icon}
                                                                    style={[
                                                                        styles.myPREquipmentIcon,
                                                                        index > 0 && { marginLeft: -6 }
                                                                    ]}
                                                                    resizeMode="contain"
                                                                />
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            </View>

                                            {/* PR Badge */}
                                            <Image
                                                source={require('@/assets/images/PR.png')}
                                                style={styles.myPRBadge}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>

                                        {/* Expanded View with Equipment Selector & Input Form */}
                                        {isExpanded && (
                                            <View style={styles.expandedContent}>
                                                {/* Equipment Tabs - Show only exercise's equipment */}
                                                {exercise.equipment && exercise.equipment.length > 0 && (
                                                    <View style={styles.inCardEquipmentContainer}>
                                                        <View style={styles.equipmentTabsRow}>
                                                            {['all', ...exercise.equipment].map(eq => {
                                                                const tab = EQUIPMENT_TABS.find(t => t.id === eq);
                                                                if (!tab) return null;
                                                                const isSelected = selectedExpandedEquipment === eq;
                                                                return (
                                                                    <TouchableOpacity
                                                                        key={eq}
                                                                        onPress={() => setSelectedExpandedEquipment(eq)}
                                                                        style={[
                                                                            styles.navTab,
                                                                            isSelected && styles.navTabActive,
                                                                            isSelected && { backgroundColor: tab.color + '20', borderColor: tab.color }
                                                                        ]}
                                                                    >
                                                                        <Image
                                                                            source={tab.icon}
                                                                            style={styles.navTabIcon}
                                                                        />
                                                                        {isSelected && (
                                                                            <Text style={[styles.navTabText, { color: '#fff' }]}>
                                                                                {tab.label}
                                                                            </Text>
                                                                        )}
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Chart */}
                                                <View style={styles.chartWrapper}>
                                                    {loadingLogs ? (
                                                        <Spinner size="sm" />
                                                    ) : exerciseLogs.length > 0 ? (
                                                        <LineChart
                                                            data={exerciseLogs.map((log: any) => ({
                                                                value: Number(log.weight) || 0,
                                                                label: new Date(log.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
                                                            }))}
                                                            width={SCREEN_WIDTH - 64}
                                                            height={180}
                                                            color={chartColor}
                                                            thickness={3}
                                                            startFillColor={chartColor}
                                                            endFillColor={chartColor}
                                                            startOpacity={0.3}
                                                            endOpacity={0.1}
                                                            spacing={60}
                                                            initialSpacing={20}
                                                            noOfSections={4}
                                                            hideYAxisText
                                                            hideAxesAndRules
                                                            dataPointsColor={chartColor}
                                                            dataPointsRadius={5}
                                                            textColor="#FFFFFF"
                                                            textFontSize={12}
                                                            xAxisLabelTextStyle={{ color: '#FFFFFF', fontSize: 10 }}
                                                            curved
                                                            areaChart
                                                        />
                                                    ) : (
                                                        <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 20 }}>
                                                            אין נתונים לציוד זה
                                                        </Text>
                                                    )}
                                                </View>

                                                {/* Input Form - Update PR */}
                                                <View style={styles.inputForm}>
                                                    <Text style={styles.inputLabel}>עדכן שיא עם {EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment)?.label || ''}</Text>
                                                    <View style={styles.inputRow}>
                                                        {exercise.measurement_type !== 'time' && (
                                                            <View style={styles.inputWrapper}>
                                                                <TextInput
                                                                    style={styles.input}
                                                                    placeholder="חזרות"
                                                                    placeholderTextColor="#6B7280"
                                                                    keyboardType="numeric"
                                                                    value={inputReps}
                                                                    onChangeText={setInputReps}
                                                                    textAlign="center"
                                                                />
                                                            </View>
                                                        )}
                                                        <View style={styles.inputWrapper}>
                                                            <TextInput
                                                                style={styles.input}
                                                                placeholder={exercise.measurement_unit}
                                                                placeholderTextColor="#6B7280"
                                                                keyboardType="numeric"
                                                                value={inputWeight}
                                                                onChangeText={setInputWeight}
                                                                textAlign="center"
                                                            />
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.addButton, { backgroundColor: chartColor }]}
                                                            onPress={handleSaveLog}
                                                        >
                                                            <Text style={styles.addButtonText}>שמור</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View style={styles.exerciseListContainer}>
                        {displayedExercises.map((exercise) => {
                            const pr = exercisePRs[exercise.name];
                            const hasPR = pr && pr.weight > 0;
                            const isExpanded = expandedExerciseId === exercise.id;
                            // Get GIF based on selected equipment when expanded, otherwise use first equipment
                            const currentEquipment = isExpanded && selectedExpandedEquipment
                                ? selectedExpandedEquipment
                                : exercise.equipment?.[0] || null;
                            const gifUrl = getExerciseGif(exercise, currentEquipment);

                            // Determine chart color based on selected equipment
                            const selectedEqData = EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment);
                            const chartColor = selectedEqData?.color || Colors.primary;

                            return (
                                <View key={exercise.id} style={[
                                    styles.exerciseCardWrapper,
                                    isExpanded && styles.exerciseCardWrapperExpanded
                                ]}>
                                    <LinearGradient
                                        colors={isExpanded ? ['#000000', '#1F2937'] : ['#000000', '#000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.exerciseCard}
                                    >
                                        {/* PR Badge - top left of card */}
                                        {hasPR && !isExpanded && (
                                            <View style={styles.libraryPrBadge}>
                                                <Image
                                                    source={require('@/assets/images/PR.png')}
                                                    style={{ width: 28, height: 28 }}
                                                    resizeMode="contain"
                                                />
                                                <Text style={styles.libraryPrText}>
                                                    {pr.weight}{exercise.measurement_unit}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Card Content - Column Layout */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedModalExercise(exercise);
                                                setSelectedExpandedEquipment(exercise.equipment?.[0] || null);
                                                setModalVisible(true);
                                            }}
                                            activeOpacity={0.8}
                                            style={styles.libraryCardColumn}
                                        >
                                            {/* Row 1: GIF - smaller when expanded */}
                                            <View style={[
                                                styles.libraryGifContainer,
                                                isExpanded && styles.libraryGifContainerExpanded
                                            ]}>
                                                {gifUrl ? (
                                                    <OptimizedImage
                                                        source={{ uri: gifUrl }}
                                                        style={styles.libraryGif}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                        priority="normal"
                                                        transition={200}
                                                        showLoadingIndicator={true}
                                                        showErrorFallback={false}
                                                        loadingIndicatorColor="rgba(255,255,255,0.5)"
                                                    />
                                                ) : (
                                                    <View style={styles.libraryGifPlaceholder}>
                                                        <Dumbbell size={isExpanded ? 32 : 48} color="rgba(255,255,255,0.3)" />
                                                    </View>
                                                )}
                                            </View>

                                            {/* Row 2: Exercise Name */}
                                            <Text style={styles.libraryExerciseName}>{exercise.name}</Text>

                                            {/* Row 3: Equipment Icons */}
                                            {exercise.equipment && exercise.equipment.length > 0 && (
                                                <View style={styles.libraryEquipmentRow}>
                                                    {exercise.equipment.map((eq, index) => {
                                                        const icon = getEquipmentIcon(eq);
                                                        if (!icon) return null;
                                                        return (
                                                            <Image
                                                                key={eq}
                                                                source={icon}
                                                                style={styles.libraryEquipmentIcon}
                                                            />
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </LinearGradient>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Exercise Library Modal */}
                {selectedModalExercise && (
                    <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <TouchableOpacity
                            style={styles.modalOverlay}
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                        >
                            <RNAnimated.View
                                {...modalPanResponder.panHandlers}
                                style={[
                                    styles.modalContent,
                                    { transform: [{ translateY: modalTranslateY }] }
                                ]}
                            >
                                {/* Modal Header - Drawer Handle (swipe area) */}
                                <View style={styles.modalHeader}>
                                    <View style={styles.drawerHandle} />
                                </View>

                                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} bounces={false}>
                                    {/* 2-Column Layout: GIF + Name/Equipment */}
                                    <View style={styles.modalTopRow}>
                                        {/* Column 1: GIF */}
                                        {(() => {
                                            const currentEquipment = selectedExpandedEquipment || selectedModalExercise.equipment?.[0] || null;
                                            const gifUrl = getExerciseGif(selectedModalExercise, currentEquipment);
                                            return gifUrl ? (
                                                <View style={styles.modalGifContainer}>
                                                    <OptimizedImage
                                                        source={{ uri: gifUrl }}
                                                        style={styles.modalGif}
                                                        contentFit="contain"
                                                        cachePolicy="memory-disk"
                                                        priority="normal"
                                                        transition={200}
                                                    />
                                                </View>
                                            ) : (
                                                <View style={[styles.modalGifContainer, styles.modalGifPlaceholder]}>
                                                    <Dumbbell size={48} color="rgba(255,255,255,0.3)" />
                                                </View>
                                            );
                                        })()}

                                        {/* Column 2: Name */}
                                        <View style={styles.modalInfoColumn}>
                                            {/* Exercise Name */}
                                            <Text style={styles.modalTitle}>{selectedModalExercise.name}</Text>
                                        </View>
                                    </View>

                                    {/* Equipment Selector - Under GIF Row */}
                                    {selectedModalExercise.equipment && selectedModalExercise.equipment.length > 0 && (
                                        <View style={styles.modalEquipmentRow}>
                                            {selectedModalExercise.equipment.map(eq => {
                                                const tab = EQUIPMENT_TABS.find(t => t.id === eq);
                                                if (!tab) return null;
                                                const isSelected = selectedExpandedEquipment === eq;
                                                return (
                                                    <TouchableOpacity
                                                        key={eq}
                                                        onPress={() => setSelectedExpandedEquipment(eq)}
                                                        style={[
                                                            styles.modalEquipmentTab,
                                                            isSelected && { backgroundColor: tab.color + '20', borderColor: tab.color }
                                                        ]}
                                                    >
                                                        <Image
                                                            source={tab.icon}
                                                            style={styles.modalEquipmentIcon}
                                                        />
                                                        {isSelected && (
                                                            <Text style={styles.modalEquipmentLabel}>
                                                                {tab.label}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Chart */}
                                    {(() => {
                                        const selectedEqData = EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment);
                                        const chartColor = selectedEqData?.color || Colors.primary;

                                        return (
                                            <View style={styles.chartWrapper}>
                                                {loadingLogs ? (
                                                    <Spinner size="sm" />
                                                ) : (
                                                    <LineChart
                                                        data={chartData}
                                                        height={160}
                                                        width={SCREEN_WIDTH - 80}
                                                        spacing={60}
                                                        initialSpacing={20}
                                                        color={chartColor}
                                                        thickness={3}
                                                        startFillColor={chartColor}
                                                        endFillColor={chartColor}
                                                        startOpacity={0.2}
                                                        endOpacity={0.0}
                                                        areaChart
                                                        yAxisSide={require('react-native-gifted-charts').yAxisSides.LEFT}
                                                        yAxisColor="transparent"
                                                        xAxisColor="rgba(255,255,255,0.1)"
                                                        yAxisTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
                                                        xAxisLabelTextStyle={{ color: '#9CA3AF', fontSize: 10 }}
                                                        hideDataPoints={false}
                                                        dataPointsColor={chartColor}
                                                        dataPointsRadius={4}
                                                        textFontSize={12}
                                                        textColor="#FFFFFF"
                                                        hideRules
                                                        yAxisOffset={0}
                                                        curved
                                                        isAnimated
                                                    />
                                                )}
                                            </View>
                                        );
                                    })()}

                                    {/* Stats Row */}
                                    {(() => {
                                        const selectedEqData = EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment);
                                        return (
                                            <View style={styles.statsRow}>
                                                <View style={styles.statItem}>
                                                    <Text style={styles.statValue}>
                                                        {chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0}
                                                        <Text style={styles.statUnit}> {selectedModalExercise.measurement_unit}</Text>
                                                    </Text>
                                                    <Text style={styles.statLabel}>שיא {selectedEqData?.label || ''}</Text>
                                                </View>
                                            </View>
                                        );
                                    })()}

                                    {/* Input Form */}
                                    {(() => {
                                        const selectedEqData = EQUIPMENT_TABS.find(t => t.id === selectedExpandedEquipment);
                                        const chartColor = selectedEqData?.color || Colors.primary;

                                        return (
                                            <View style={styles.inputForm}>
                                                <Text style={styles.inputLabel}>הוסף שיא חדש</Text>
                                                <View style={styles.inputRow}>
                                                    {selectedModalExercise.measurement_type !== 'time' && (
                                                        <View style={styles.inputWrapper}>
                                                            <TextInput
                                                                style={styles.input}
                                                                placeholder="חזרות"
                                                                placeholderTextColor="#6B7280"
                                                                keyboardType="numeric"
                                                                value={inputReps}
                                                                onChangeText={setInputReps}
                                                                textAlign="center"
                                                            />
                                                        </View>
                                                    )}
                                                    <View style={styles.inputWrapper}>
                                                        <TextInput
                                                            style={styles.input}
                                                            placeholder={selectedModalExercise.measurement_unit}
                                                            placeholderTextColor="#6B7280"
                                                            keyboardType="numeric"
                                                            value={inputWeight}
                                                            onChangeText={setInputWeight}
                                                            textAlign="center"
                                                        />
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.addButton, { backgroundColor: chartColor }]}
                                                        onPress={handleSaveLog}
                                                    >
                                                        <Text style={styles.addButtonText}>שמור</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </ScrollView>
                            </RNAnimated.View>
                        </TouchableOpacity>
                    </Modal>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 16,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingHorizontal: 20,
            shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    searchContainer: {
        marginTop: 0,
        marginBottom: 16,
    },
    searchWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginLeft: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0F172A',
        textAlign: 'right',
        height: '100%',
    },
    clearButton: {
        padding: 4,
    },
    recentContainer: {
        marginTop: 0,
    },
    recentTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000ff',
        marginBottom: 8,
        textAlign: 'center',
    },
    recentList: {
        gap: 8,
        paddingRight: 4,
    },
    recentChip: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    recentChipText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '800',
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#FFFFFF',
        fontWeight: '900',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyStateContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#64748B',
    },
    exerciseListContainer: {
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    exerciseCardWrapper: {
        width: '48%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000000',
    },
    exerciseCardWrapperExpanded: {
        width: '100%',
    },
    exerciseCard: {
        width: '100%',
        flex: 1,
    },
    exerciseCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    // Library Tab - Column Layout Styles
    libraryCardColumn: {
        alignItems: 'center',
        padding: 16,
    },
    libraryGifContainer: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        position: 'relative',
    },
    libraryGifContainerExpanded: {
        height: 100,
        width: 100,
        alignSelf: 'center',
    },
    libraryGif: {
        width: '100%',
        height: '100%',
    },
    libraryGifPlaceholder: {
        flex: 1,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    libraryPrBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
    },
    libraryPrText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FBBF24',
    },
    libraryExerciseName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#F8FAFC',
        textAlign: 'center',
        marginBottom: 8,
    },
    libraryEquipmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    libraryEquipmentIcon: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
    },
    // Old styles kept for backwards compatibility
    exerciseGifContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
    },
    exerciseGifPlaceholder: {
        flex: 1,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exerciseContent: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: 60,
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#F8FAFC',
        marginBottom: 6,
        textAlign: 'right',
    },
    equipmentIconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    equipmentIconSmallNoTint: {
        width: 25,
        height: 25,
        resizeMode: 'contain',
    },
    prColumn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
        minWidth: 70,
    },
    prWeight: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FBBF24',
        marginTop: 2,
    },
    prReps: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    expandedContent: {
        padding: 16,
    },

    // In-Card Equipment Selector
    inCardEquipmentContainer: {
        marginBottom: 20,
        paddingHorizontal: 0,
    },
    equipmentTabsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    navTab: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    navTabActive: {
        paddingHorizontal: 12,
        // Background and border color set dynamically inline
    },
    navTabIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    navTabText: {
        marginRight: 6,
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    equipmentTabsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    equipmentTab: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    equipmentTabActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    equipmentTabIcon: {
        width: 28,
        height: 28,
    },

    chartWrapper: {
        marginVertical: 10,
        marginHorizontal: 10,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    statUnit: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    statLabel: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    inputForm: {
        backgroundColor: '#1F2937',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#E2E8F0',
        marginBottom: 12,
        textAlign: 'center',
    },
    inputRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
        height: 48,
        backgroundColor: '#374151',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4B5563',
        overflow: 'hidden',
    },
    input: {
        flex: 1,
        height: '100%',
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    addButton: {
        width: 60,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    },
    // My PR's Tab Styles
    myPRsContainer: {
        padding: 16,
        gap: 16,
    },
    myPRCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 0,
    },
    myPRCardGradient: {
        padding: 16,
        position: 'relative',
    },
    myPRCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    myPRGifContainer: {
        width: 100,
        height: 100,
        overflow: 'hidden',
    },
    myPRGif: {
        width: '100%',
        height: '100%',
    },
    myPRCardInfo: {
        flex: 1,
    },
    myPRExerciseName: {
        fontSize: 22,
        textAlign: 'left',
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    myPREquipmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    myPREquipmentLabel: {
        fontSize: 12,
        color: '#CBD5E1',
        marginRight: 6,
    },
    myPREquipmentIcon: {
        width: 24,
        height: 24,
    },
    myPRStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    myPRStatBox: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 12,
    },
    myPRStatLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    },
    myPRStatValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    myPRStatSubtext: {
        fontSize: 11,
        color: '#CBD5E1',
        marginTop: 2,
    },
    myPRBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#000000',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '92%',
        width: '100%',
        paddingLeft: 20,
        paddingRight: 20,
    },
    modalHeader: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    drawerHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
    },
    modalTitle: {
        fontSize: 25,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'right',
        marginBottom: 12,
    },
    modalBody: {
        paddingBottom: 20,
    },
    modalTopRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        marginTop: 15,
    },
    modalGifContainer: {
        width: 140,
        height: 140,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000000',
    },
    modalGif: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
    },
    modalGifPlaceholder: {
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalInfoColumn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    modalEquipmentRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    modalEquipmentTab: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        gap: 6,
    },
    modalEquipmentIcon: {
        width: 30,
        height: 30,
    },
    modalEquipmentLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    modalCloseArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },
});
