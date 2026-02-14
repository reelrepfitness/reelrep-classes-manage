import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/contexts/ClassesContext';
import Colors from '@/constants/colors';
import { Icon } from '@/components/ui/icon';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Helper Functions ---
const formatHebrewDate = (dateStr: string, timeStr: string): string => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    const date = new Date(`${dateStr}T${timeStr}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `היום, ${timeStr}`;
    if (diffDays === 1) return `מחר, ${timeStr}`;
    return `${days[date.getDay()]}, ${timeStr}`;
};

const getTimeUntilClass = (dateStr: string, timeStr: string): { text: string; isUrgent: boolean } | null => {
    const classDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diff = classDate.getTime() - now.getTime();

    if (diff < 0) return null;

    // Compare calendar days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const classDay = new Date(dateStr);
    classDay.setHours(0, 0, 0, 0);

    const daysDiff = Math.round((classDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return { text: 'היום', isUrgent: true };
    if (daysDiff === 1) return { text: 'מחר', isUrgent: false };

    return null; // Don't show badge for other days
};

// --- Skeleton Components ---
const SkeletonHeroCard = () => (
    <View style={styles.heroCard}>
        <View style={styles.skeletonShimmer}>
            <View style={[styles.skeletonLine, { width: '40%', height: 14, marginBottom: 16 }]} />
            <View style={[styles.skeletonLine, { width: '70%', height: 28, marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '50%', height: 18, marginBottom: 24 }]} />
            <View style={styles.skeletonRow}>
                <View style={[styles.skeletonCircle, { width: 40, height: 40 }]} />
                <View style={[styles.skeletonLine, { width: 100, height: 16, marginLeft: 12 }]} />
            </View>
        </View>
    </View>
);

const SkeletonScheduleCard = () => (
    <View style={styles.scheduleCard}>
        <View style={[styles.skeletonLine, { width: '60%', height: 20, marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 14, marginBottom: 16 }]} />
        <View style={[styles.skeletonLine, { width: '100%', height: 36, borderRadius: 8 }]} />
    </View>
);

// --- Hero Card (User is Booked) ---
const NextWorkoutHeroCard = ({
    classItem,
    onPress
}: {
    classItem: any;
    onPress: () => void;
}) => {
    const countdown = getTimeUntilClass(classItem.date, classItem.time);

    // Get day name only (no time)
    const getDayName = () => {
        const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
        const date = new Date(`${classItem.date}T${classItem.time}`);
        return days[date.getDay()];
    };

    return (
        <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
            <LinearGradient
                colors={['#2d2d2d', '#111111', '#000000']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.heroCard}
            >
                {/* Header Row - Label + Time Badge */}
                <View style={styles.heroHeader}>
                    <Text style={styles.heroLabel}>האימון הבא שלך</Text>
                    <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>{classItem.time}</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.heroContent}>
                    <Text style={styles.heroTitle} numberOfLines={1}>{classItem.title}</Text>
                    {/* Only show day name if no countdown badge (not today/tomorrow) */}
                    {!countdown && (
                        <Text style={styles.heroTime}>{getDayName()}</Text>
                    )}
                </View>

                {/* Countdown Badge - only show for today/tomorrow */}
                {countdown && (
                    <View style={[
                        styles.countdownBadge,
                        countdown.isUrgent && styles.countdownBadgeUrgent
                    ]}>
                        <Icon
                            name="clock"
                            size={14}
                            color={countdown.isUrgent ? '#FFFFFF' : '#10B981'}
                            strokeWidth={2.5}
                        />
                        <Text style={[
                            styles.countdownText,
                            countdown.isUrgent && styles.countdownTextUrgent
                        ]}>
                            {countdown.text}
                        </Text>
                    </View>
                )}

                {/* Trainer Section */}
                <View style={styles.trainerRow}>
                    <Image
                        source={require('@/assets/images/coach.png')}
                        style={styles.trainerAvatar}
                    />
                    <View style={styles.trainerInfo}>
                        <Text style={styles.trainerName}>{classItem.instructor}</Text>
                        <Text style={styles.trainerRole}>מאמן</Text>
                    </View>
                </View>

                {/* Decorative Elements */}
                <View style={styles.heroAccent} />
            </LinearGradient>
        </TouchableOpacity>
    );
};

// --- Schedule Card (Not Booked) ---
const ScheduleClassCard = ({
    classItem,
    onPress
}: {
    classItem: any;
    onPress: () => void;
}) => {
    const isFull = classItem.enrolled >= classItem.capacity;
    const capacityPercent = classItem.capacity > 0
        ? Math.min((classItem.enrolled / classItem.capacity) * 100, 100)
        : 0;

    // Color based on capacity: green (< 50%), orange (50-80%), red (> 80%)
    const getCapacityColor = () => {
        if (capacityPercent >= 80) return '#EF4444'; // Red
        if (capacityPercent >= 50) return '#F59E0B'; // Orange
        return '#10B981'; // Green
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={styles.scheduleCard}
        >
            {/* Time Badge */}
            <View style={styles.scheduleTimeBadge}>
                <Text style={styles.scheduleTime}>{classItem.time}</Text>
            </View>

            {/* Class Name */}
            <Text style={styles.scheduleName} numberOfLines={2}>{classItem.title}</Text>

            {/* Capacity Progress Bar */}
            <View style={styles.capacityContainer}>
                <View style={styles.capacityBarBg}>
                    <View style={[
                        styles.capacityBarFill,
                        { width: `${capacityPercent}%`, backgroundColor: getCapacityColor() }
                    ]} />
                </View>
                <Text style={styles.capacityText}>
                    {classItem.enrolled}/{classItem.capacity}
                </Text>
            </View>

            {/* Book Button */}
            <TouchableOpacity
                style={[styles.bookButton, isFull && styles.bookButtonDisabled]}
                onPress={onPress}
                disabled={isFull}
            >
                <Text style={[styles.bookButtonText, isFull && styles.bookButtonTextDisabled]}>
                    {isFull ? 'מלא' : 'הזמן עכשיו'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

// --- Today's Schedule (Not Booked) ---
const TodaySchedule = ({
    classes,
    onClassPress
}: {
    classes: any[];
    onClassPress: (id: string) => void;
}) => (
    <View style={styles.scheduleContainer}>
        <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>אימונים היום</Text>
            <Icon name="calendar" size={20} color="#6B7280" strokeWidth={2} />
        </View>

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scheduleScroll}
            style={{ transform: [{ scaleX: -1 }] }} // RTL flip
        >
            {classes.map((classItem, index) => (
                <View key={classItem.id} style={{ transform: [{ scaleX: -1 }] }}>
                    <ScheduleClassCard
                        classItem={classItem}
                        onPress={() => onClassPress(classItem.id)}
                    />
                </View>
            ))}
        </ScrollView>
    </View>
);

// --- Empty State Images ---
const EMPTY_STATE_IMAGES = [
    require('@/assets/empty-state-images/angry1.webp'),
    require('@/assets/empty-state-images/angry2.webp'),
    require('@/assets/empty-state-images/angry3.webp'),
    require('@/assets/empty-state-images/angry4.webp'),
    require('@/assets/empty-state-images/angry5.webp'),
];

// --- Empty State ---
const EmptyState = ({ onPress }: { onPress: () => void }) => {
    // Pick a random image once on mount
    const randomImage = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * EMPTY_STATE_IMAGES.length);
        return EMPTY_STATE_IMAGES[randomIndex];
    }, []);

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            <View style={styles.emptyCard}>
                {/* Background Image */}
                <Image
                    source={randomImage}
                    style={styles.emptyBackgroundImage}
                    resizeMode="cover"
                />

                {/* Content */}
                <View style={styles.emptyContent}>
                    <Text style={styles.emptyTitleBlack}>עוד לא קבעת אימונים להשבוע!</Text>

                    <View style={styles.emptyButtonBlack}>
                        <Text style={styles.emptyButtonTextBlack}>עכשיו לקבוע!</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// --- Mini Card for Additional Bookings (same layout as hero, without trainer) ---
const MiniBookingCard = ({
    classItem,
    onPress
}: {
    classItem: any;
    onPress: () => void;
}) => {
    const countdown = getTimeUntilClass(classItem.date, classItem.time);

    // Format date without time - only show day name for non-today/tomorrow
    const getDateOnly = () => {
        const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
        const date = new Date(`${classItem.date}T${classItem.time}`);
        return days[date.getDay()];
    };

    return (
        <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
            <View style={styles.miniCard}>
                {/* Accent Strip */}
                <View style={styles.miniCardAccent} />

                {/* Header Row - Label + Time Badge */}
                <View style={styles.miniCardHeader}>
                    <Text style={styles.miniCardLabel}>אימון נוסף</Text>
                    <LinearGradient
                        colors={['#1F2937', '#111827']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.miniTimeBadge}
                    >
                        <Text style={styles.miniTimeBadgeText}>{classItem.time}</Text>
                    </LinearGradient>
                </View>

                {/* Main Content */}
                <View style={styles.miniCardContent}>
                    <Text style={styles.miniCardTitle} numberOfLines={1}>{classItem.title}</Text>
                    {/* Only show date if no countdown badge */}
                    {!countdown && (
                        <Text style={styles.miniCardTime}>{getDateOnly()}</Text>
                    )}
                </View>

                {/* Countdown Badge - only show for today/tomorrow */}
                {countdown && (
                    <View style={[
                        styles.miniCountdownBadge,
                        countdown.isUrgent && styles.miniCountdownBadgeUrgent
                    ]}>
                        <Text style={[
                            styles.miniCountdownText,
                            countdown.isUrgent && styles.miniCountdownTextUrgent
                        ]}>
                            {countdown.text}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

// --- Main Widget Component ---
export const UpcomingWorkoutsWidget = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { classes, getMyClasses, isLoading } = useClasses();
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Get user's booked future classes
    const myBookedClasses = useMemo(() => {
        const myClasses = getMyClasses();
        const now = new Date();
        return myClasses
            .filter(c => new Date(`${c.date}T${c.time}`) > now)
            .sort((a, b) =>
                new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
            );
    }, [getMyClasses]);

    // Get today's schedule (not booked classes)
    const todaySchedule = useMemo(() => {
        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM

        return classes
            .filter(c => {
                // Today's classes that haven't started
                if (c.date !== today) return false;
                if (c.time <= currentTime) return false;
                // Exclude already booked classes
                const isBooked = myBookedClasses.some(b => b.id === c.id);
                return !isBooked;
            })
            .sort((a, b) => a.time.localeCompare(b.time))
            .slice(0, 5); // Max 5 cards
    }, [classes, myBookedClasses]);

    const handleClassPress = (classId: string) => {
        router.push(`/class/${classId}`);
    };

    const handleViewSchedule = () => {
        router.push('/(tabs)/classes');
    };

    const additionalClasses = myBookedClasses.slice(1);

    // Loading State
    if (isLoading && myBookedClasses.length === 0 && todaySchedule.length === 0) {
        return (
            <View style={styles.container}>
                <SkeletonHeroCard />
            </View>
        );
    }

    // User has booked classes - Show Hero Card
    if (myBookedClasses.length > 0) {
        const nextClass = myBookedClasses[0];
        return (
            <View style={styles.container}>
                <NextWorkoutHeroCard
                    classItem={nextClass}
                    onPress={() => handleClassPress(nextClass.id)}
                />

                {/* Additional bookings */}
                {additionalClasses.length > 0 && (
                    <>
                        {/* Expanded mini cards */}
                        {isExpanded && (
                            <View style={styles.miniCardsContainer}>
                                {additionalClasses.map((classItem) => (
                                    <MiniBookingCard
                                        key={classItem.id}
                                        classItem={classItem}
                                        onPress={() => handleClassPress(classItem.id)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Toggle button */}
                        <TouchableOpacity
                            style={styles.moreBookings}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsExpanded(!isExpanded);
                            }}
                        >
                            <Icon
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={Colors.primary}
                                strokeWidth={2.5}
                            />
                            <Text style={styles.moreBookingsText}>
                                {isExpanded ? 'הסתר' : `ועוד ${additionalClasses.length} השבוע`}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    }

    // User has no bookings but there are classes today - Show Schedule
    if (todaySchedule.length > 0) {
        return (
            <View style={styles.container}>
                <TodaySchedule
                    classes={todaySchedule}
                    onClassPress={handleClassPress}
                />
            </View>
        );
    }

    // No bookings, no classes today - Show Empty State
    return (
        <View style={styles.container}>
            <EmptyState onPress={handleViewSchedule} />
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },

    // Hero Card Styles
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    ticketNotchLeft: {
        position: 'absolute',
        left: -12,
        top: '50%',
        marginTop: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
    },
    ticketNotchRight: {
        position: 'absolute',
        right: -12,
        top: '50%',
        marginTop: -12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timeBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    timeBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    heroContent: {
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'left',
        marginBottom: 4,
    },
    heroTime: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'left',
    },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ECFDF5',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 6,
        marginBottom: 20,
    },
    countdownBadgeUrgent: {
        backgroundColor: Colors.primary,
    },
    countdownText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981',
    },
    countdownTextUrgent: {
        color: '#FFFFFF',
    },
    trainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    trainerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    trainerInfo: {
        alignItems: 'flex-start',
    },
    trainerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    trainerRole: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    heroAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 24,
        borderBottomLeftRadius: 24,
    },
    moreBookings: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 8,
    },
    moreBookingsText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },

    // Mini Cards for Additional Bookings
    miniCardsContainer: {
        marginTop: 12,
        gap: 10,
    },
    miniCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    miniCardAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
    },
    miniCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    miniCardLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    miniTimeBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    miniTimeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    miniCardContent: {
        marginBottom: 8,
    },
    miniCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
        marginBottom: 2,
    },
    miniCardTime: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'left',
    },
    miniCountdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#ECFDF5',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 14,
        gap: 4,
    },
    miniCountdownBadgeUrgent: {
        backgroundColor: Colors.primary,
    },
    miniCountdownText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    miniCountdownTextUrgent: {
        color: '#FFFFFF',
    },

    // Schedule Styles
    scheduleContainer: {
        gap: 16,
    },
    scheduleHeader: {
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    scheduleTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#111827',
    },
    scheduleScroll: {
        gap: 12,
        paddingRight: 4,
    },
    scheduleCard: {
        width: (SCREEN_WIDTH - 60) / 2.2,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        gap: 8,
    },
    scheduleTimeBadge: {
        backgroundColor: '#111827',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'center',
    },
    scheduleTime: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        color: '#FFFFFF',
    },
    scheduleName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'center',
        minHeight: 44,
    },
    scheduleTrainer: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'right',
    },
    capacityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    capacityBarBg: {
        flex: 1,
        height: 10,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    capacityBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    capacityText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#6B7280',
    },
    bookButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    bookButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    bookButtonText: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    bookButtonTextDisabled: {
        color: '#9CA3AF',
    },

    // Empty State Styles
    emptyCard: {
        backgroundColor: '#000',
        borderRadius: 24,
        padding: 32,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    emptyBackgroundGif: {
        ...StyleSheet.absoluteFillObject,
        width: undefined,
        height: undefined,
    },
    emptyOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    emptyBackgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: undefined,
        height: undefined,
        opacity: 1,
    },
    emptyContent: {
        alignItems: 'center',
        zIndex: 1,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    emptyTitleBlack: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 16,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 20,
    },
    emptyButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    emptyButtonBlack: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    emptyButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    emptyButtonTextBlack: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Skeleton Styles
    skeletonShimmer: {
        opacity: 0.5,
    },
    skeletonLine: {
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
    },
    skeletonCircle: {
        backgroundColor: '#E5E7EB',
        borderRadius: 20,
    },
    skeletonRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
});

export default UpcomingWorkoutsWidget;
