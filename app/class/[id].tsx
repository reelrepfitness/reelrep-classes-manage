import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClasses } from '@/contexts/ClassesContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import Colors from '@/constants/colors';

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

// --- Collapsible Training Content Card ---
const TrainingContentCard = ({ description }: { description?: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <View style={trainingContentStyles.card}>
            <TouchableOpacity
                style={trainingContentStyles.header}
                onPress={() => setIsExpanded(!isExpanded)}
                activeOpacity={0.7}
            >
                <Text style={trainingContentStyles.title}>תוכן האימון</Text>
                <Icon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6B7280"
                    strokeWidth={2.5}
                />
            </TouchableOpacity>
            {isExpanded && (
                <View style={trainingContentStyles.content}>
                    <Text style={trainingContentStyles.description}>
                        {description || 'אין תיאור לאימון זה.'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const trainingContentStyles = StyleSheet.create({
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
        paddingTop: 12,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
        textAlign: 'right',
    },
});

export default function ClassDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { classes, bookClass, isClassBooked, getClassBooking, cancelBooking, getClassBookings } = useClasses();

    const [classItem, setClassItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<any[]>([]);

    const fetchParticipants = useCallback(async () => {
        if (!id) return;
        try {
            const bookings = await getClassBookings(id);
            setParticipants(bookings.filter((b: any) => ['confirmed', 'completed', 'no_show'].includes(b.status)));
        } catch (error) {
            console.error('Error fetching participants:', error);
        }
    }, [id, getClassBookings]);

    useEffect(() => {
        if (id) {
            const found = classes.find(c => c.id === id);
            setClassItem(found || null);
            setLoading(false);
            fetchParticipants();
        }
    }, [id, classes, fetchParticipants]);

    const isBooked = classItem ? isClassBooked(classItem) : false;
    const booking = classItem ? getClassBooking(classItem.id) : null;
    const isOnWaitingList = booking?.status === 'waiting_list';

    const handleRegister = async () => {
        if (!classItem) return;
        try {
            await bookClass(classItem.id);
            Alert.alert('הצלחה', 'נרשמת לשיעור בהצלחה!');
        } catch (error) {
            Alert.alert('שגיאה', (error as Error).message);
        }
    };

    const handleCancelClass = () => {
        if (!classItem || !booking) return;

        // Check if class starts in less than 6 hours
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const isLateCancellation = hoursUntilClass < 6 && hoursUntilClass > 0;

        if (isLateCancellation) {
            Alert.alert(
                '⚠️ ביטול מאוחר',
                'אתה מבטל פחות מ-6 שעות לפני תחילת השיעור.\n\nביטול מאוחר עלול לגרור לחיוב אימון מהכרטסייה.',
                [
                    { text: 'חזרה', style: 'cancel' },
                    {
                        text: 'בטל בכל זאת',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await cancelBooking(booking.id);
                                fetchParticipants();
                                Alert.alert('בוטל', 'השיעור בוטל בהצלחה.');
                            } catch (error) {
                                Alert.alert('שגיאה', 'לא ניתן לבטל את השיעור');
                            }
                        }
                    }
                ]
            );
        } else {
            Alert.alert('ביטול שיעור', 'האם לבטל את ההרשמה?', [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelBooking(booking.id);
                            fetchParticipants();
                            Alert.alert('בוטל', 'השיעור בוטל בהצלחה.');
                        } catch (error) {
                            Alert.alert('שגיאה', 'לא ניתן לבטל את השיעור');
                        }
                    }
                }
            ]);
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
        Alert.alert('החלף שיעור', 'אנא בטל את השיעור הנוכחי והירשם לשיעור אחר.');
    };

    if (loading) {
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
                {/* Header Notch */}
                <LinearGradient
                    colors={isOnWaitingList ? ['#F59E0B', '#D97706'] : isBooked ? ['#10B981', '#059669'] : ['#1F2937', '#111827']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerNotch, { paddingTop: insets.top }]}
                >
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
                </LinearGradient>

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

                    {/* Training Content Collapsible */}
                    <TrainingContentCard description={classItem.description} />

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
                                style={styles.primaryButton}
                                onPress={handleSwitch}
                            >
                                <Icon name="repeat" size={18} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.primaryButtonText}>החלף שיעור</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.secondaryButton, getIsLateCancellation() && styles.warningButton]}
                                onPress={handleCancelClass}
                            >
                                <Icon
                                    name={getIsLateCancellation() ? "alert-triangle" : "x-circle"}
                                    size={18}
                                    color={getIsLateCancellation() ? "#F59E0B" : "#374151"}
                                    strokeWidth={2.5}
                                />
                                <Text style={[styles.secondaryButtonText, getIsLateCancellation() && styles.warningButtonText]}>
                                    {getIsLateCancellation() ? 'ביטול מאוחר' : 'ביטול שיעור'}
                                </Text>
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
});
