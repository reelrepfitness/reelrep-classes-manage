import React, { useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Animated,
    Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClasses } from '@/contexts/ClassesContext';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';

import CustomDialog, { DialogButton } from '@/components/ui/CustomDialog';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { Image as ExpoImage } from 'expo-image';
import { EQUIPMENT_TABS } from '@/constants/equipment';

// --- Helper Functions ---
const formatDate = (dateStr: string) => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const date = new Date(dateStr);
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
};

const getTimeUntilClass = (dateStr: string, timeStr: string) => {
    const classDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diff = classDate.getTime() - now.getTime();

    if (diff < 0) return 'השיעור התחיל';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `מתחיל בעוד: ${hours} שעות ו${minutes} דקות`;
    }
    return `מתחיל בעוד: ${minutes} דקות`;
};

// --- Interfaces ---
interface WorkoutExercise {
    id: string;
    name: string;
    repsOrTime: string;
    exerciseDbId?: string;
    equipment?: string[] | null;
    equipmentGifs?: Record<string, string> | null;
    selectedEquipment?: string[];
    assignedGifUrl?: string | null;
}

interface WorkoutSection {
    id: string;
    title: string;
    workoutMethodName?: string;
    workoutMethodDescription?: string;
    exercises: WorkoutExercise[];
}

// --- GIF Helpers ---
const getOptimizedGifUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.includes('cloudinary.com')) {
        return url.replace('/upload/', '/upload/q_auto,w_400/');
    }
    return url;
};

const getWodExerciseGif = (exercise: WorkoutExercise): string | null => {
    // New data: use pre-resolved URL from admin save
    if (exercise.assignedGifUrl) return getOptimizedGifUrl(exercise.assignedGifUrl);

    // Old data fallback: resolve from equipmentGifs
    if (!exercise.equipmentGifs) return null;
    if (exercise.selectedEquipment?.length) {
        // Try each selected equipment (handles old multi-select)
        for (const eq of exercise.selectedEquipment) {
            const gif = exercise.equipmentGifs[eq];
            if (gif) return getOptimizedGifUrl(gif);
        }
    }
    // No match or no selection: show any available GIF
    const firstGif = Object.values(exercise.equipmentGifs).find(Boolean);
    return firstGif ? getOptimizedGifUrl(firstGif) : null;
};

// Resolve the assigned equipment ID — ensures icon matches the GIF
const getAssignedEquipment = (exercise: WorkoutExercise): string | null => {
    // New data: single-select
    if (exercise.selectedEquipment?.length === 1) return exercise.selectedEquipment[0];

    // Old data: find first selected equipment that has a GIF
    if (exercise.selectedEquipment?.length && exercise.equipmentGifs) {
        const match = exercise.selectedEquipment.find(eq => exercise.equipmentGifs![eq]);
        if (match) return match;
    }

    // No selection: infer from first GIF key
    if (exercise.equipmentGifs) {
        return Object.keys(exercise.equipmentGifs).find(k => exercise.equipmentGifs![k]) || null;
    }
    return null;
};

// --- Helper: Get highest completed achievement badge ---
const getHighestBadge = (participant: any) => {
    const userAchievements = participant?.profiles?.user_achievements;
    if (!userAchievements || userAchievements.length === 0) return null;

    // Sort by task_requirement descending and return the highest
    const sortedAchievements = userAchievements
        .filter((ua: any) => ua.achievements)
        .map((ua: any) => ua.achievements)
        .sort((a: any, b: any) => (b.task_requirement || 0) - (a.task_requirement || 0));

    return sortedAchievements[0] || null;
};

// --- Animated Slot Component ---
const AnimatedSlot = ({
    index,
    participant,
    onRegister,
}: {
    index: number;
    participant: any;
    onRegister: () => void;
}) => {
    const fadeAnim = useRef(new Animated.Value(participant ? 0 : 1)).current;
    const scaleAnim = useRef(new Animated.Value(participant ? 0.8 : 1)).current;

    useEffect(() => {
        if (participant) {
            // Staggered fade-in animation for taken slots
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 100, // Stagger by 100ms per slot
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    delay: index * 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [participant, index]);

    const isTaken = !!participant;
    const profile = participant?.profiles;
    const fullName = profile?.full_name || profile?.name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const avatarUrl = profile?.avatar_url;
    const highestBadge = getHighestBadge(participant);

    if (isTaken) {
        return (
            <Animated.View
                style={[
                    slotStyles.slotBox,
                    slotStyles.slotTaken,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <View style={slotStyles.slotTakenRow}>
                    <View style={slotStyles.slotAvatarContainer}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={slotStyles.slotAvatar} />
                        ) : (
                            <View style={slotStyles.slotAvatarPlaceholder}>
                                <Icon name="user" size={28} color="#FFFFFF" strokeWidth={2} />
                            </View>
                        )}
                        {highestBadge?.icon && (
                            <Image
                                source={{ uri: highestBadge.icon }}
                                style={slotStyles.achievementBadge}
                            />
                        )}
                    </View>
                    <View style={slotStyles.slotNameColumn}>
                        <Text style={slotStyles.slotFirstName} numberOfLines={1}>
                            {firstName || 'משתתף'}
                        </Text>
                        {lastName ? (
                            <Text style={slotStyles.slotLastName} numberOfLines={1}>
                                {lastName}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </Animated.View>
        );
    }

    return (
        <TouchableOpacity
            style={slotStyles.slotBox}
            activeOpacity={0.7}
            onPress={onRegister}
        >
            <View style={slotStyles.slotContent}>
                <Icon name="plus" size={28} color="#9CA3AF" strokeWidth={2.5} />
                <Text style={slotStyles.slotAvailable}>פנוי</Text>
            </View>
        </TouchableOpacity>
    );
};

const slotStyles = StyleSheet.create({
    slotBox: {
        width: '48%',
        height: 90,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
    },
    slotTaken: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        overflow: 'visible',
        padding: 10,
    },
    slotTakenRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    slotAvatarContainer: {
        position: 'relative',
    },
    slotAvatar: {
        width: 62,
        height: 62,
        borderRadius: 31,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    slotAvatarPlaceholder: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    achievementBadge: {
        position: 'absolute',
        right: -6,
        bottom: -4,
        width: 32,
        height: 32,
        resizeMode: 'contain',
        zIndex: 10,
    },
    slotNameColumn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap:0,
    },
    slotFirstName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 0,
        textAlign: 'right',
    },
    slotLastName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#4B5563',
        textAlign: 'right',
    },
    slotContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    slotAvailable: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
        textAlign: 'center',
    },
});

// --- Workout Viewer Component ---
const WorkoutViewer = ({
    workoutData,
    description,
    exercisePRs,
    exerciseEnglishNames,
}: {
    workoutData?: WorkoutSection[] | null;
    description?: string;
    exercisePRs?: Record<string, { weight: number; reps: number; equipment?: string }>;
    exerciseEnglishNames?: Record<string, string>;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasWorkoutData = workoutData && workoutData.length > 0;
    const hasDescription = !!description;

    if (!hasWorkoutData && !hasDescription) return null;

    return (
        <View style={wodStyles.card}>
            <TouchableOpacity
                style={wodStyles.header}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <Text style={wodStyles.headerTitle}>תוכן האימון</Text>
                <Icon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7280"
                    strokeWidth={2.5}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View style={wodStyles.content}>
                    {hasWorkoutData ? (
                        <View style={wodStyles.sectionsList}>
                            {workoutData.map((section) => (
                                <View key={section.id} style={wodStyles.section}>
                                    {/* Section Header: Title + Method Badge + Description (centered column) */}
                                    {(!!section.title || !!section.workoutMethodName || !!section.workoutMethodDescription) && (
                                        <View style={wodStyles.sectionHeader}>
                                            {!!section.title && (
                                                <Text style={wodStyles.sectionTitle}>{section.title}</Text>
                                            )}
                                            {!!section.workoutMethodName && (
                                                <View style={wodStyles.methodBadge}>
                                                    <Text style={wodStyles.methodBadgeText}>{section.workoutMethodName}</Text>
                                                </View>
                                            )}
                                            {!!section.workoutMethodDescription && (
                                                <Text style={wodStyles.methodDescription}>{section.workoutMethodDescription}</Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Exercises */}
                                    <View style={wodStyles.exercisesList}>
                                        {section.exercises.map((exercise) => {
                                            const gifUrl = getWodExerciseGif(exercise);
                                            const pr = exercise.exerciseDbId && exercisePRs
                                                ? exercisePRs[exercise.exerciseDbId]
                                                : null;
                                            const assignedEquipmentId = getAssignedEquipment(exercise);
                                            const assignedEquipmentTab = assignedEquipmentId
                                                ? EQUIPMENT_TABS.find(t => t.id === assignedEquipmentId)
                                                : null;

                                            return (
                                                <View key={exercise.id} style={wodStyles.exerciseCard}>
                                                    {/* GIF background */}
                                                    {gifUrl ? (
                                                        <ExpoImage
                                                            source={{ uri: gifUrl }}
                                                            style={wodStyles.exerciseGifBg}
                                                            contentFit="cover"
                                                            transition={300}
                                                        />
                                                    ) : null}

                                                    {/* Gradient: black on left, transparent on right to reveal GIF */}
                                                    <LinearGradient
                                                        colors={['#000000', 'transparent']}
                                                        locations={[0.45, 1]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={wodStyles.exerciseGradient}
                                                    />

                                                    {/* Exercise Content */}
                                                    <View style={wodStyles.exerciseContent}>
                                                        {/* Top: Reps + Name in one row */}
                                                        <View style={wodStyles.exerciseTopRow}>
                                                            <Text style={wodStyles.exerciseName}>{(exercise.exerciseDbId && exerciseEnglishNames?.[exercise.exerciseDbId]) || exercise.name}</Text>
                                                            {!!exercise.repsOrTime && (
                                                                <Text style={wodStyles.exerciseReps}>{exercise.repsOrTime}</Text>
                                                            )}
                                                        </View>

                                                        {/* Bottom: PR + Equipment icon together */}
                                                        {(assignedEquipmentTab || (pr && pr.weight > 0)) && (
                                                            <View style={wodStyles.exerciseBottomRow}>
                                                                <View />
                                                                <View style={wodStyles.prEquipmentGroup}>
                                                                    {pr && pr.weight > 0 && (
                                                                        <View style={wodStyles.prBadge}>
                                                                            <Image
                                                                                source={require('@/assets/images/PR.png')}
                                                                                style={wodStyles.prIcon}
                                                                                resizeMode="contain"
                                                                            />
                                                                            <Text style={wodStyles.prText}>
                                                                                {pr.weight} kg
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                    {assignedEquipmentTab && (
                                                                        <Image
                                                                            source={assignedEquipmentTab.icon}
                                                                            style={wodStyles.equipmentIcon}
                                                                            resizeMode="contain"
                                                                        />
                                                                    )}
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={wodStyles.description}>{description}</Text>
                    )}
                </View>
            )}
        </View>
    );
};

const wodStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
        textAlign: 'right',
    },
    sectionsList: {
        gap: 24,
    },
    section: {
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000000',
        textAlign: 'center',
    },
    methodBadge: {
        backgroundColor: '#111827',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    methodBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    methodDescription: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
    },
    exercisesList: {
        gap: 8,
    },
    exerciseCard: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#000000',
        height: 80,
        position: 'relative' as const,
    },
    exerciseGifBg: {
        position: 'absolute' as const,
        top: 8,
        bottom: 8,
        left: -10,
        width: '30%',
    },
    exerciseGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    exerciseContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 14,
        position: 'relative' as const,
        zIndex: 1,
        gap: 4,
    },
    exerciseTopRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
        gap: 7,
    },
    exerciseReps: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.primary,
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    exerciseBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    prEquipmentGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    equipmentIcon: {
        width: 28,
        height: 28,
    },
    prBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    prIcon: {
        width: 23,
        height: 23,
    },
    prText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FACC15',
    },
});

export default function ClassDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { classes, bookClass, isClassBooked, getClassBooking, cancelBooking, getClassBookings, isLoading: classesLoading } = useClasses();

    const [classItem, setClassItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [waitlistParticipants, setWaitlistParticipants] = useState<any[]>([]);
    const [workoutData, setWorkoutData] = useState<WorkoutSection[] | null>(null);
    const [exercisePRs, setExercisePRs] = useState<Record<string, { weight: number; reps: number; equipment?: string }>>({});
    const [exerciseEnglishNames, setExerciseEnglishNames] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'booked' | 'waitlist'>('booked');

    // Dialog states
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogConfig, setDialogConfig] = useState<{
        type?: 'success' | 'warning' | 'error' | 'confirm';
        title?: string;
        message?: string;
        buttons?: DialogButton[];
        lottieSource?: any;
        customContent?: ReactNode;
        showSuccessGif?: boolean;
        showWarningGif?: boolean;
        showCancelGif?: boolean;
        autoCloseAfterGif?: boolean;
    }>({});

    const fetchParticipants = useCallback(async () => {
        if (!id) return;
        try {
            const bookings = await getClassBookings(id);
            const booked = bookings.filter((b: any) => ['confirmed', 'completed', 'no_show', 'late'].includes(b.status));
            const waitlist = bookings.filter((b: any) => b.status === 'waiting_list');

            setParticipants(booked);
            setWaitlistParticipants(waitlist);
        } catch (error) {
            console.error('Error fetching participants:', error);
        }
    }, [id, getClassBookings]);

    const fetchWorkoutData = useCallback(async () => {
        if (!id) return;

        try {
            let targetClassId = id;

            // Handle Virtual ID: resolve to UUID from table
            if (id.includes('_') && !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                let scheduleId = '';
                let dateStr = '';

                if (id.startsWith('virtual_')) {
                    scheduleId = id.replace('virtual_', '');
                    // Warning: ClassDetailsScreen usually receives scheduleId_date. 
                    // If it receives virtual_scheduleId, it might lack date.
                    // But if this is Client side, it likely comes from Calendar which is scheduleId_date.
                    dateStr = new Date().toISOString().split('T')[0];
                } else {
                    const parts = id.split('_');
                    dateStr = parts.pop() || '';
                    scheduleId = parts.join('_');
                }

                if (scheduleId && dateStr) {
                    // We need to match the start_time from schedule to find the precise class_date timestamp
                    const { data: schedule } = await supabase
                        .from('class_schedules')
                        .select('start_time')
                        .eq('id', scheduleId)
                        .single();

                    if (schedule) {
                        const classDateTime = new Date(`${dateStr}T${schedule.start_time}`);
                        const { data: realClass } = await supabase
                            .from('classes')
                            .select('id, workout_data')
                            .eq('schedule_id', scheduleId)
                            .eq('class_date', classDateTime.toISOString())
                            .single();

                        if (realClass?.workout_data) {
                            setWorkoutData(realClass.workout_data as WorkoutSection[]);
                            return; // Success
                        }
                        // If no real class exists, we can't have workout data anyway.
                        return;
                    }
                }
            }

            // Normal UUID fetch
            const { data, error } = await supabase
                .from('classes')
                .select('workout_data')
                .eq('id', targetClassId)
                .single();

            if (data?.workout_data) {
                setWorkoutData(data.workout_data as WorkoutSection[]);
            }
        } catch (error) {
            console.error('Error fetching workout data:', error);
        }
    }, [id]);

    useEffect(() => {
        if (id && !classesLoading) {
            const found = classes.find(c => c.id === id);
            setClassItem(found || null);
            setLoading(false);
            if (found) {
                fetchParticipants();
                fetchWorkoutData();
            }
        }
    }, [id, classes, classesLoading, fetchParticipants, fetchWorkoutData]);

    const { user } = useAuth();

    // Fetch user's PRs for exercises in this WOD
    useEffect(() => {
        if (!workoutData || !user?.id) return;

        const fetchPRs = async () => {
            const dbIds = workoutData
                .flatMap(s => s.exercises)
                .map(e => e.exerciseDbId)
                .filter(Boolean) as string[];

            if (dbIds.length === 0) return;

            const { data: exercises } = await supabase
                .from('exercises')
                .select('id, name')
                .in('id', dbIds);

            if (!exercises?.length) return;

            // Build English name map (exerciseDbId -> English name)
            const englishNames: Record<string, string> = {};
            const nameToIdMap: Record<string, string> = {};
            exercises.forEach((ex: any) => {
                nameToIdMap[ex.name] = ex.id;
                englishNames[ex.id] = ex.name;
            });
            setExerciseEnglishNames(englishNames);

            const { data: logs } = await supabase
                .from('workout_exercises')
                .select('exercise_name, weight, reps, equipment, workouts!inner(user_id)')
                .eq('workouts.user_id', user.id)
                .in('exercise_name', exercises.map((e: any) => e.name));

            if (!logs?.length) return;

            const prMap: Record<string, { weight: number; reps: number; equipment?: string }> = {};
            logs.forEach((log: any) => {
                const dbId = nameToIdMap[log.exercise_name];
                if (!dbId) return;
                const weight = Number(log.weight) || 0;
                if (!prMap[dbId] || weight > prMap[dbId].weight) {
                    prMap[dbId] = { weight, reps: Number(log.reps) || 0, equipment: log.equipment };
                }
            });

            setExercisePRs(prMap);
        };

        fetchPRs();
    }, [workoutData, user?.id]);

    const isUserInParticipants = participants.some(p => p.profiles?.id === user?.id && ['confirmed', 'completed', 'late', 'no_show'].includes(p.status));
    const isBooked = (classItem ? isClassBooked(classItem) : false) || isUserInParticipants;

    // Attempt to find booking from context OR from participants list
    const contextBooking = classItem ? getClassBooking(classItem.id) : null;
    const participantBooking = participants.find(p => p.profiles?.id === user?.id);

    // Prefer context booking if available (has more metadata?), otherwise construct minimal booking object
    const booking = contextBooking || (participantBooking ? {
        id: participantBooking.id,
        status: participantBooking.status,
        classId: classItem?.id, // This might be virtual ID but that's what we have
    } : null);
    const isOnWaitingList = booking?.status === 'waiting_list';

    // Animation values
    const bookedOpacity = useRef(new Animated.Value(isBooked ? 1 : 0)).current;
    const waitlistOpacity = useRef(new Animated.Value(isOnWaitingList ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(bookedOpacity, {
            toValue: isBooked ? 1 : 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isBooked]);

    useEffect(() => {
        Animated.timing(waitlistOpacity, {
            toValue: isOnWaitingList ? 1 : 0,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [isOnWaitingList]);

    const showDialog = (config: typeof dialogConfig) => {
        setDialogConfig(config);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
    };

    const showPlanErrorDialog = (reason: string) => {
        const messages: Record<string, string> = {
            subscription_expired: 'אוי, נראה שהמנוי כבר לא יהיה בתוקף ביום הזה',
            ticket_expired: 'אוי, נראה שהכרטיסייה כבר לא תהיה בתוקף ביום הזה',
            ticket_depleted: 'ניצלת את כל האימונם בכרטיסייה שלך',
            no_plan: 'נדרש מנוי או כרטיסייה פעילה כדי להירשם לשיעור',
        };

        showDialog({
            type: 'warning',
            message: messages[reason] || messages.no_plan,
            lottieSource: require('@/assets/animations/No data found.json'),
            buttons: [
                {
                    text: 'לדבר עם איוון',
                    onPress: () => {
                        hideDialog();
                        Linking.openURL('https://wa.me/972528406273');
                    },
                    style: 'cancel',
                },
                {
                    text: 'לרכישה',
                    onPress: () => {
                        hideDialog();
                        router.push('/shop');
                    },
                    style: 'default',
                },
            ],
        });
    };

    const handleRegister = async () => {
        if (!classItem || !user) return;

        try {
            await bookClass(classItem.id);

            // Show success dialog after booking succeeds
            showDialog({
                type: 'success',
                title: 'נרשמת בהצלחה!',
                showSuccessGif: true,
                autoCloseAfterGif: true,
            });

            // Update enrolled count
            setClassItem((prev: any) => prev ? { ...prev, enrolled: (prev.enrolled || 0) + 1 } : prev);

            // Add current user to participants
            setParticipants((prev) => [
                ...prev,
                {
                    id: `temp-${Date.now()}`,
                    status: 'confirmed',
                    profiles: {
                        id: user.id,
                        full_name: user.name,
                        avatar_url: user.profileImage,
                    },
                },
            ]);

            // Refresh to get real data
            fetchParticipants();
        } catch (error) {
            const err = error as Error;

            // Check if this is a plan validation error
            if (err.name === 'BookingValidationError') {
                showPlanErrorDialog(err.message);
            } else {
                showDialog({
                    type: 'error',
                    title: 'שגיאה',
                    message: err.message,
                    buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
                });
            }
        }
    };

    const handleCancelClass = () => {
        if (!classItem || !booking) return;

        // Check if class starts in less than 6 hours
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isLateCancellation = hoursUntilClass < 6 && hoursUntilClass > 0;

        const performCancellation = async () => {
            try {
                await cancelBooking(booking.id, isLateCancellation);
                fetchParticipants();
                // No success dialog needed - user will see they're no longer in the slot
            } catch (error) {
                showDialog({
                    type: 'error',
                    title: 'שגיאה',
                    message: 'לא ניתן לבטל את השיעור',
                    buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
                });
            }
        };

        if (isLateCancellation) {
            showDialog({
                type: 'warning',
                title: 'ביטול מאוחר',
                message: 'אתה מבטל פחות מ-6 שעות לפני תחילת השיעור.\n\nביטול מאוחר עלול לגרור לחיוב אימון מהכרטסייה.',
                lottieSource: require('@/assets/animations/Warning Status.json'),
                buttons: [
                    { text: 'חזרה', onPress: hideDialog, style: 'cancel' },
                    {
                        text: 'בטל בכל זאת',
                        onPress: () => {
                            hideDialog();
                            performCancellation();
                        },
                        style: 'destructive',
                    },
                ],
            });
        } else {
            showDialog({
                type: 'confirm',
                title: 'ביטול שיעור',
                message: 'האם לבטל את ההרשמה?',
                lottieSource: require('@/assets/animations/Cross, Close, Cancel Icon Animation.json'),
                buttons: [
                    { text: 'לא', onPress: hideDialog, style: 'cancel' },
                    {
                        text: 'כן, בטל',
                        onPress: () => {
                            hideDialog();
                            performCancellation();
                        },
                        style: 'destructive',
                    },
                ],
            });
        }
    };

    // Calculate if this is a late cancellation for button display
    const getIsLateCancellation = () => {
        if (!classItem) return false;
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilClass < 6 && hoursUntilClass > 0;
    };

    const performSwitch = async (toClassId: string) => {
        if (!classItem) return;
        const booking = getClassBooking(classItem.id);
        if (!booking) return;
        try {
            hideDialog();
            await cancelBooking(booking.id, false);
            await bookClass(toClassId);
            showDialog({
                type: 'success',
                title: 'השיעור הוחלף בהצלחה!',
                showSuccessGif: true,
                autoCloseAfterGif: true,
            });
        } catch (error) {
            showDialog({
                type: 'error',
                title: 'שגיאה',
                message: error instanceof Error ? error.message : 'לא ניתן להחליף את השיעור',
                buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
            });
        }
    };

    const handleSwitch = () => {
        if (!classItem) return;
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const hoursUntilClass = (classDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilClass < 1) {
            showDialog({
                type: 'warning',
                title: 'זמן החלפה עבר',
                message: 'לא ניתן להחליף שיעור פחות משעה לפני תחילתו.',
                lottieSource: require('@/assets/animations/Warning Status.json'),
                buttons: [{ text: 'הבנתי', onPress: hideDialog, style: 'default' }],
            });
            return;
        }

        const now = new Date();
        const sameDayClasses = classes.filter(c => {
            if (c.id === classItem.id) return false;
            if (c.date !== classItem.date) return false;
            const classTime = new Date(c.date + ' ' + c.time);
            return classTime > now;
        });

        if (sameDayClasses.length === 0) {
            showDialog({
                type: 'warning',
                title: 'אין שיעורים זמינים',
                message: 'אין שיעורים נוספים באותו יום להחלפה.',
                lottieSource: require('@/assets/animations/Warning Status.json'),
                buttons: [{ text: 'הבנתי', onPress: hideDialog, style: 'default' }],
            });
            return;
        }

        const classOptions = (
            <View style={{ gap: 8 }}>
                {sameDayClasses.map(c => {
                    const isFull = c.enrolled >= c.capacity;
                    const alreadyBooked = isClassBooked(c.id);
                    const disabled = isFull || alreadyBooked;
                    return (
                        <TouchableOpacity
                            key={c.id}
                            disabled={disabled}
                            onPress={() => performSwitch(c.id)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
                                borderRadius: 12,
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                borderWidth: 1,
                                borderColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
                                opacity: disabled ? 0.5 : 1,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {isFull && (
                                    <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>מלא</Text>
                                    </View>
                                )}
                                {alreadyBooked && (
                                    <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>רשום</Text>
                                    </View>
                                )}
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' }}>
                                    {c.enrolled}/{c.capacity}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{c.time}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' }}>{c.title}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );

        showDialog({
            type: 'confirm',
            title: 'החלף שיעור',
            message: 'בחר שיעור להחלפה:',
            lottieSource: require('@/assets/animations/Refresh-A-001.json'),
            customContent: classOptions,
            buttons: [{ text: 'ביטול', onPress: hideDialog, style: 'cancel' }],
        });
    };

    if (loading || classesLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>טוען...</Text>
            </View>
        );
    }

    if (!classItem) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>שיעור לא נמצא</Text>
            </View>
        );
    }

    const formattedDate = formatDate(classItem.date);
    const countdown = getTimeUntilClass(classItem.date, classItem.time);
    const isFull = classItem.enrolled >= classItem.capacity;
    const statusText = isBooked ? 'רשום' : isFull ? 'מלא' : 'פנוי';
    const statusColor = isBooked ? '#10B981' : isFull ? '#EF4444' : '#6B7280';

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>

                {/* Header Notch with Smooth Transitions */}
                <View style={[styles.headerNotch, { paddingTop: insets.top }]}>
                    {/* 1. Base Gradient (Dark/Default) - Always visible */}
                    <LinearGradient
                        colors={['#1F2937', '#111827']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* 2. Waitlist Gradient (Orange) - Cross-fade */}
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: waitlistOpacity }]}>
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* 3. Booked Gradient (Green) - Cross-fade */}
                    <Animated.View style={[StyleSheet.absoluteFill, { opacity: bookedOpacity }]}>
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* Content Overlay */}
                    <View style={styles.headerContent}>
                        {/* Top row: back arrow + title */}
                        <View style={styles.headerTopRow}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                                <Icon name="chevron-right" size={24} color="#FFFFFF" strokeWidth={2.5} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle} numberOfLines={1}>{classItem.title}</Text>
                            <View style={styles.headerSpacer} />
                        </View>
                        {isOnWaitingList && (
                            <View style={styles.headerBadge}>
                                <Text style={styles.headerBadgeText}>בהמתנה</Text>
                            </View>
                        )}
                        <View style={styles.headerDateTimeRow}>
                            <Text style={styles.headerDateTime}>{formattedDate}</Text>
                            <Text style={styles.headerDateTimeSeparator}>•</Text>
                            <Text style={styles.headerDateTime}>{classItem.time}</Text>
                        </View>
                        <Text style={styles.headerCountdown}>{countdown}</Text>
                        <View style={styles.headerDivider} />
                        <View style={styles.headerInstructorRow}>
                            <Image
                                source={require('@/assets/images/coach.png')}
                                style={styles.headerInstructorAvatar}
                            />
                            <View style={styles.headerInstructorText}>
                                <Text style={styles.headerInstructorName}>{classItem.instructor || 'מאמן'}</Text>
                                <Text style={styles.headerInstructorRole}>מאמן</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 24,
                        paddingBottom: insets.bottom + 140,
                        paddingHorizontal: 20,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Workout Content */}
                    <WorkoutViewer
                        workoutData={workoutData}
                        description={classItem.description}
                        exercisePRs={exercisePRs}
                        exerciseEnglishNames={exerciseEnglishNames}
                    />

                    {/* Slots Section with Tabs */}
                    <View style={styles.slotsCard}>
                        {/* Tabs Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 24 }}>
                            {/* REGISTERED Tab */}
                            <TouchableOpacity
                                onPress={() => setActiveTab('booked')}
                                activeOpacity={0.7}
                                style={{
                                    borderBottomWidth: activeTab === 'booked' ? 2 : 0,
                                    borderBottomColor: '#111827',
                                    paddingBottom: 4,
                                }}
                            >
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: activeTab === 'booked' ? '800' : '400',
                                    color: activeTab === 'booked' ? '#111827' : '#6B7280',
                                }}>
                                    רשומים ({participants.length}/{classItem.capacity})
                                </Text>
                            </TouchableOpacity>

                            {/* WAITLIST Tab */}
                            <TouchableOpacity
                                onPress={() => setActiveTab('waitlist')}
                                activeOpacity={0.7}
                                style={{
                                    borderBottomWidth: activeTab === 'waitlist' ? 2 : 0,
                                    borderBottomColor: '#111827',
                                    paddingBottom: 4,
                                }}
                            >
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: activeTab === 'waitlist' ? '800' : '400',
                                    color: activeTab === 'waitlist' ? '#111827' : '#6B7280',
                                }}>
                                    ממתינים ({classItem.waitingListCount || 0})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Content Body */}
                        {activeTab === 'booked' ? (
                            <View style={styles.slotsGrid}>
                                {Array.from({ length: classItem.capacity }, (_, index) => (
                                    <AnimatedSlot
                                        key={index}
                                        index={index}
                                        participant={participants[index]}
                                        onRegister={handleRegister}
                                    />
                                ))}
                            </View>
                        ) : (
                            // Waitlist View
                            <View>
                                {waitlistParticipants.length === 0 ? (
                                    <View style={{ alignItems: 'center', padding: 20 }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>אין ממתינים לשיעור זה</Text>
                                    </View>
                                ) : (
                                    <View style={styles.slotsGrid}>
                                        {waitlistParticipants.map((user, index) => {
                                            const profile = user.profiles;
                                            return (
                                                <View key={user.id} style={{
                                                    width: '100%',
                                                    backgroundColor: '#F9FAFB',
                                                    borderRadius: 12,
                                                    padding: 12,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    marginBottom: 8,
                                                    borderWidth: 1,
                                                    borderColor: '#E5E7EB'
                                                }}>
                                                    <View>
                                                        {profile?.avatar_url ? (
                                                            <Image source={{ uri: profile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                                        ) : (
                                                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Icon name="user" size={16} color="#9CA3AF" />
                                                            </View>
                                                        )}
                                                        {/* Badge for position? */}
                                                        <View style={{
                                                            position: 'absolute',
                                                            bottom: -4,
                                                            right: -4,
                                                            backgroundColor: '#F59E0B',
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: 10,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderWidth: 2,
                                                            borderColor: '#FFFFFF'
                                                        }}>
                                                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>{index + 1}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                                                        {profile?.full_name || 'משתתף'}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Sticky Footer with Black Gradient */}
                <LinearGradient
                    colors={['#ffffffff', '#ffffffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 0 }}
                    style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
                >
                    {isBooked ? (
                        <View style={styles.footerRow}>
                            {/* Switch Button - Yellow Icon */}
                            <TouchableOpacity
                                style={styles.whiteButton}
                                onPress={handleSwitch}
                                activeOpacity={0.8}
                            >
                                <Image source={require('@/assets/images/replace.webp')} style={{ width: 18, height: 18, tintColor: '#F59E0B' }} resizeMode="contain" />
                                <Text style={styles.whiteButtonText}>החלף שיעור</Text>
                            </TouchableOpacity>

                            {/* Cancel Button - Red Icon / Red Gradient for Late */}
                            {getIsLateCancellation() ? (
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={handleCancelClass}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#EF4444', '#DC2626']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.redGradientButton}
                                    >
                                        <Icon
                                            name="alert-circle"
                                            size={18}
                                            color="#FFFFFF"
                                            strokeWidth={2.5}
                                        />
                                        <Text style={styles.redGradientButtonText}>ביטול מאוחר</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.whiteButton}
                                    onPress={handleCancelClass}
                                    activeOpacity={0.8}
                                >
                                    <Image source={require('@/assets/images/cancel.webp')} style={{ width: 18, height: 18, tintColor: '#EF4444' }} resizeMode="contain" />
                                    <Text style={styles.whiteButtonText}>ביטול שיעור</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.whiteButtonFull, isFull && styles.disabledButtonWhite]}
                            onPress={handleRegister}
                            disabled={isFull}
                        >
                            <Text style={[styles.whiteButtonTextFull, isFull && styles.disabledButtonTextWhite]}>
                                {isFull ? 'השיעור מלא' : 'הרשם לשיעור'}
                            </Text>
                            <Icon
                                name={isFull ? 'lock' : 'check-circle'}
                                size={20}
                                color={isFull ? '#6B7280' : '#111827'}
                                strokeWidth={2.5}
                            />
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                {/* Custom Dialog */}
                <CustomDialog
                    visible={dialogVisible}
                    onClose={hideDialog}
                    type={dialogConfig.type}
                    title={dialogConfig.title}
                    message={dialogConfig.message}
                    buttons={dialogConfig.buttons}
                    lottieSource={dialogConfig.lottieSource}
                    customContent={dialogConfig.customContent}
                    showSuccessGif={dialogConfig.showSuccessGif}
                    showWarningGif={dialogConfig.showWarningGif}
                    showCancelGif={dialogConfig.showCancelGif}
                    autoCloseAfterGif={dialogConfig.autoCloseAfterGif}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Header Notch
    headerNotch: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    headerBackButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 30,
        fontWeight: '800',
        color: '#ffffffff',
        textAlign: 'center',
    },
    headerBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
    },
    headerBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerDateTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -1,
        gap: 8,
    },
    headerDateTime: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 1)',
    },
    headerDateTimeSeparator: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    headerCountdown: {
        fontSize: 16,
        fontWeight: '400',
        color: 'rgba(250, 250, 250, 0.83)',
        marginTop: 0,
    },
    headerDivider: {
        height: 1,
        backgroundColor: 'rgba(238, 238, 238, 0.2)',
        alignSelf: 'stretch',
        marginTop: 12,
        marginBottom: 10,
    },
    headerInstructorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerInstructorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerInstructorText: {
        alignItems: 'flex-start',
    },
    headerInstructorName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerInstructorRole: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.6)',
    },
    headerSpacer: {
        width: 44,
    },

    // Hero Section
    heroSection: {
        marginBottom: 24,
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    heroTitle: {
        flex: 1,
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'left',
        lineHeight: 38,
    },
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    heroDetails: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    countdown: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
        textAlign: 'left',
        marginTop: 8,
    },

    // Trainer Card
    trainerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    trainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    trainerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trainerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${Colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trainerAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    trainerText: {
        alignItems: 'flex-start',
    },
    trainerName: {
        fontSize: 17,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'left',
    },
    trainerRole: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '800',
        textAlign: 'left',
    },

    // Slots Card
    slotsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
        marginBottom: 6,
    },
    slotsSubtitle: {
        fontSize: 20,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'left',
        marginBottom: 16,
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    slotBox: {
        width: '48%',
        height: 80,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    slotTaken: {
        borderColor: '#374151',
        overflow: 'hidden',
        padding: 0,
    },
    slotTakenGradient: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingHorizontal: 8,
    },
    slotTakenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    slotAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    slotAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotNameContainer: {
        flex: 1,
        gap: 0,
    },
    slotContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    slotFirstName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'left',
    },
    slotLastName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#9CA3AF',
        textAlign: 'left',
    },
    slotAvailable: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        textAlign: 'center',
    },
    waitingListBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        justifyContent: 'flex-end',
    },
    waitingListText: {
        fontSize: 13,
        color: '#F59E0B',
        fontWeight: '600',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    footerRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#374151',
    },
    warningButton: {
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    warningButtonText: {
        color: '#B45309',
    },
    primaryButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    fullWidthButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    fullWidthButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    disabledButton: {
        backgroundColor: '#D1D5DB',
    },
    gradientButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    gradientButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    // White button styles for black gradient footer
    whiteButton: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    whiteButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    whiteButtonFull: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    whiteButtonTextFull: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    disabledButtonWhite: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    disabledButtonTextWhite: {
        color: '#6B7280',
    },
    warningButtonWhite: {
        backgroundColor: '#FEF3C7',
    },
    warningButtonTextWhite: {
        color: '#B45309',
    },
    // Red gradient button for late cancellation
    redGradientButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    redGradientButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
