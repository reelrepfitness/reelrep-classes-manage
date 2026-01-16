import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Animated,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClasses } from '@/contexts/ClassesContext';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import SwapIcon from '@/components/SwapIcon';
import CustomDialog, { DialogButton } from '@/components/ui/CustomDialog';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';

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
        return `מתחיל בעוד: ${hours}h ${minutes}m`;
    }
    return `מתחיל בעוד: ${minutes}m`;
};

// --- Interfaces ---
interface WorkoutExercise {
    id: string;
    name: string;
    repsOrTime: string;
}

interface WorkoutSection {
    id: string;
    title: string;
    exercises: WorkoutExercise[];
}

// --- Workout Viewer Component ---
const WorkoutViewer = ({ workoutData, description }: { workoutData?: WorkoutSection[] | null, description?: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasWorkoutData = workoutData && workoutData.length > 0;
    const hasDescription = !!description;

    if (!hasWorkoutData && !hasDescription) return null;

    return (
        <View style={workoutViewerStyles.card}>
            <TouchableOpacity
                style={workoutViewerStyles.header}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <Text style={workoutViewerStyles.title}>תוכן האימון</Text>
                <Icon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7280"
                    strokeWidth={2.5}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View style={workoutViewerStyles.content}>
                    {hasWorkoutData ? (
                        <View style={workoutViewerStyles.sectionsList}>
                            {workoutData.map((section) => (
                                <View key={section.id} style={workoutViewerStyles.section}>
                                    {!!section.title && (
                                        <Text style={workoutViewerStyles.sectionTitle}>{section.title}</Text>
                                    )}
                                    <View style={workoutViewerStyles.exercisesList}>
                                        {section.exercises.map((exercise, index) => (
                                            <View key={exercise.id}>
                                                <View style={workoutViewerStyles.exerciseRow}>
                                                    {/* Visual Order (LTR container): [Name] [Time] */}
                                                    {/* "Time/Reps FIRST (Rightmost)" means it appears on the Right side.
                                                        "Followed by Name" means Name is to its Left.
                                                        In a flex-row (LTR default), [Name, Time] puts Name Left, Time Right.
                                                        This matches the visual requirement.
                                                    */}
                                                    <Text style={workoutViewerStyles.exerciseName}>{exercise.name}</Text>
                                                    <Text style={workoutViewerStyles.exerciseTime}>{exercise.repsOrTime}</Text>
                                                </View>
                                                {index < section.exercises.length - 1 && (
                                                    <View style={workoutViewerStyles.separator} />
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={workoutViewerStyles.description}>
                            {description}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};

const workoutViewerStyles = StyleSheet.create({
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
    title: {
        fontSize: 15,
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

    // Workout Data Styles
    sectionsList: {
        gap: 20,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 20, // Large
        fontWeight: '800', // Heavy
        color: '#000000', // Black
        textAlign: 'right',
    },
    exercisesList: {
        gap: 8,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Puts Name left, Time right
        paddingVertical: 4,
    },
    exerciseName: {
        fontSize: 15, // Regular
        color: '#374151', // Dark Gray
        textAlign: 'right', // Just in case
        flex: 1,
        marginRight: 16,
    },
    exerciseTime: {
        fontSize: 15,
        fontWeight: '700', // Bold
        color: Colors.primary, // Brand Color
        textAlign: 'right',
        minWidth: 60,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
        borderStyle: 'dotted', // dotted doesn't work on View borderStyle directly on Android/iOS sometimes without borderWidth
        borderWidth: 1, // Need to use dashed for RN View usually
        borderColor: '#F3F4F6',
    }
});

export default function ClassDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { classes, bookClass, isClassBooked, getClassBooking, cancelBooking, getClassBookings, isLoading: classesLoading } = useClasses();

    const [classItem, setClassItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);
    const [workoutData, setWorkoutData] = useState<WorkoutSection[] | null>(null);

    // Dialog states
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogConfig, setDialogConfig] = useState<{
        type?: 'success' | 'warning' | 'error' | 'confirm';
        title?: string;
        message?: string;
        buttons?: DialogButton[];
        showSuccessGif?: boolean;
        showWarningGif?: boolean;
        showCancelGif?: boolean;
        autoCloseAfterGif?: boolean;
    }>({});

    const fetchParticipants = useCallback(async () => {
        if (!id) return;
        try {
            const bookings = await getClassBookings(id);
            setParticipants(bookings.filter((b: any) => ['confirmed', 'completed', 'no_show'].includes(b.status)));
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

    const handleRegister = async () => {
        if (!classItem || !user) return;

        // Immediately show success dialog and update UI (optimistic update)
        showDialog({
            type: 'success',
            title: 'נרשמת בהצלחה!',
            showSuccessGif: true,
            autoCloseAfterGif: true,
        });

        // Optimistically update the enrolled count
        setClassItem((prev: any) => prev ? { ...prev, enrolled: (prev.enrolled || 0) + 1 } : prev);

        // Optimistically add current user to participants
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

        // Perform actual booking in background
        try {
            await bookClass(classItem.id);
            // Refresh to get real data
            fetchParticipants();
        } catch (error) {
            // Revert optimistic updates on error
            setClassItem((prev: any) => prev ? { ...prev, enrolled: Math.max(0, (prev.enrolled || 1) - 1) } : prev);
            setParticipants((prev) => prev.filter((p) => p.id !== `temp-${Date.now()}`));
            fetchParticipants();

            // Hide success dialog and show error
            hideDialog();
            setTimeout(() => {
                showDialog({
                    type: 'error',
                    title: 'שגיאה',
                    message: (error as Error).message,
                    buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
                });
            }, 200);
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
                await cancelBooking(booking.id);
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
                showWarningGif: true,
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
                showCancelGif: true,
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

    const handleSwitch = () => {
        showDialog({
            type: 'confirm',
            title: 'החלף שיעור',
            message: 'אנא בטל את השיעור הנוכחי והירשם לשיעור אחר.',
            buttons: [{ text: 'הבנתי', onPress: hideDialog, style: 'default' }],
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
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{classItem.title}</Text>
                        {(isBooked || isOnWaitingList) && (
                            <View style={styles.headerBadge}>
                                <Text style={styles.headerBadgeText}>
                                    {isOnWaitingList ? 'בהמתנה' : 'רשום'}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 24,
                        paddingBottom: insets.bottom + 140,
                        paddingHorizontal: 20,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <View style={styles.heroDetails}>
                            <View style={styles.detailRow}>
                                <Icon name="calendar" size={18} color="#6B7280" strokeWidth={2} />
                                <Text style={styles.detailText}>{formattedDate}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Icon name="clock" size={18} color="#6B7280" strokeWidth={2} />
                                <Text style={styles.detailText}>{classItem.time}</Text>
                            </View>
                        </View>

                        {/* Subtle Countdown */}
                        <Text style={styles.countdown}>{countdown}</Text>
                    </View>

                    {/* Trainer Info */}
                    <View style={styles.trainerCard}>
                        <View style={styles.trainerRow}>
                            <View style={styles.trainerInfo}>
                                <Image
                                    source={require('@/assets/images/coach.png')}
                                    style={styles.trainerAvatarImage}
                                />
                                <View style={styles.trainerText}>
                                    <Text style={styles.trainerName}>{classItem.instructor || 'מאמן'}</Text>
                                    <Text style={styles.trainerRole}>מאמן</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Workout Content */}
                    <WorkoutViewer
                        workoutData={workoutData}
                        description={classItem.description}
                    />

                    {/* Slots Section */}
                    <View style={styles.slotsCard}>
                        <Text style={styles.sectionTitle}>בחר מקום בשיעור</Text>
                        <Text style={styles.slotsSubtitle}>
                            {classItem.enrolled} / {classItem.capacity} תפוסים
                        </Text>

                        <View style={styles.slotsGrid}>
                            {Array.from({ length: classItem.capacity }, (_, index) => {
                                const participant = participants[index];
                                const isTaken = !!participant;
                                const profile = participant?.profiles;
                                const fullName = profile?.full_name || profile?.name || '';
                                const nameParts = fullName.split(' ');
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '';
                                const avatarUrl = profile?.avatar_url;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.slotBox,
                                            isTaken && styles.slotTaken,
                                        ]}
                                        activeOpacity={isTaken ? 1 : 0.7}
                                        disabled={isTaken}
                                        onPress={isTaken ? undefined : handleRegister}
                                    >
                                        {isTaken ? (
                                            <LinearGradient
                                                colors={['#1F2937', '#111827']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.slotTakenGradient}
                                            >
                                                <View style={styles.slotTakenRow}>
                                                    {avatarUrl ? (
                                                        <Image source={{ uri: avatarUrl }} style={styles.slotAvatar} />
                                                    ) : (
                                                        <View style={styles.slotAvatarPlaceholder}>
                                                            <Icon name="user" size={14} color="#FFFFFF" strokeWidth={2} />
                                                        </View>
                                                    )}
                                                    <View style={styles.slotNameContainer}>
                                                        <Text style={styles.slotFirstName} numberOfLines={1}>
                                                            {firstName || 'משתתף'}
                                                        </Text>
                                                        {lastName ? (
                                                            <Text style={styles.slotLastName} numberOfLines={1}>
                                                                {lastName}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        ) : (
                                            <View style={styles.slotContent}>
                                                <Icon name="plus" size={28} color="#9CA3AF" strokeWidth={2.5} />
                                                <Text style={styles.slotAvailable}>פנוי</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {classItem.waitingListCount > 0 && (
                            <View style={styles.waitingListBadge}>
                                <Icon name="clock" size={12} color="#F59E0B" strokeWidth={2} />
                                <Text style={styles.waitingListText}>
                                    {classItem.waitingListCount} ברשימת המתנה
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Sticky Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    {isBooked ? (
                        <View style={styles.footerRow}>
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={handleSwitch}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#1F2937', '#111827']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradientButton}
                                >
                                    <SwapIcon size={20} color="#F59E0B" />
                                    <Text style={[styles.gradientButtonText, { color: '#FFFFFF' }]}>החלף שיעור</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={handleCancelClass}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#1F2937', '#111827']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradientButton}
                                >
                                    <Icon
                                        name={getIsLateCancellation() ? "alert-triangle" : "x-circle"}
                                        size={18}
                                        color="#EF4444"
                                        strokeWidth={2.5}
                                    />
                                    <Text style={[styles.gradientButtonText, { color: '#FFFFFF' }]}>
                                        {getIsLateCancellation() ? 'ביטול מאוחר' : 'ביטול שיעור'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.fullWidthButton, isFull && styles.disabledButton]}
                            onPress={handleRegister}
                            disabled={isFull}
                        >
                            <Text style={styles.fullWidthButtonText}>
                                {isFull ? 'השיעור מלא' : 'הרשם לשיעור'}
                            </Text>
                            <Icon
                                name={isFull ? 'lock' : 'check-circle'}
                                size={20}
                                color="#FFFFFF"
                                strokeWidth={2.5}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Custom Dialog */}
                <CustomDialog
                    visible={dialogVisible}
                    onClose={hideDialog}
                    type={dialogConfig.type}
                    title={dialogConfig.title}
                    message={dialogConfig.message}
                    buttons={dialogConfig.buttons}
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
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerBackButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
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
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
    },
    trainerRole: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
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
        fontSize: 13,
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
        fontSize: 9,
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
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
        fontSize: 15,
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
        fontSize: 15,
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
        fontSize: 15,
        fontWeight: '700',
    },
});
