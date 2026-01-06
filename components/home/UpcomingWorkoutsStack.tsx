import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Dimensions, ActivityIndicator, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, User, Users, Clock } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AvatarCircles } from '@/components/ui/AvatarCircles';
import { ClassRegistrationCard } from '@/components/ui/ClassRegistrationCard';
import { useClasses } from '@/contexts/ClassesContext';
import { Modal, Alert } from 'react-native';

// Gradient color schemes for cards (black + gentle accent)
const CARD_GRADIENTS = [
    ['#0f0f0f', '#1a2e1a'], // Black to dark emerald
    ['#0f0f0f', '#2e1a1a'], // Black to dark rose
    ['#0f0f0f', '#1a1a2e'], // Black to dark violet
    ['#0f0f0f', '#2e2a1a'], // Black to dark amber
    ['#0f0f0f', '#1a2e2e'], // Black to dark teal
];

// Types based on verified schema
type ClassData = {
    id: string;
    name_hebrew: string;
    coach_name: string;
    class_date: string;
    location_hebrew: string | null;
    max_participants?: number;
    current_participants?: number;
};

type Booking = {
    id: string;
    status: string;
    classes: ClassData;
    enrolledAvatars?: string[];
    enrolled?: number;
    capacity?: number;
};

const CARD_OFFSET = 10;
const SCALE_FACTOR = 0.06;
const SWIPE_THRESHOLD = 80;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const UpcomingWorkoutsStack = () => {
    const { user, updateUser } = useAuth();
    const { cancelBooking } = useClasses();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchBookings = useCallback(async () => {
        if (!user) return;

        try {
            // Use server-side NOW() for timezone consistency
            const { data, error } = await supabase
                .from('class_bookings')
                .select(`
          id,
          status,
          classes!inner (
            id,
            name_hebrew,
            coach_name,
            class_date,
            location_hebrew,
            max_participants,
            current_participants
          )
        `)
                .eq('user_id', user.id)
                .in('status', ['confirmed', 'completed', 'no_show', 'late']) // Include all active statuses
                .order('class_date', { foreignTable: 'classes', ascending: true });

            if (error) throw error;

            // Filter for future classes using local time
            const now = new Date();
            const futureBookings = (data || []).filter((booking: any) => {
                const classDate = new Date(booking.classes.class_date);
                return classDate > now;
            });

            // Fetch enrollment data for each class
            const bookingsWithEnrollment = await Promise.all(
                futureBookings.map(async (booking: any) => {
                    const { data: enrollmentData } = await supabase
                        .from('class_bookings')
                        .select('profiles:user_id(avatar_url)')
                        .eq('class_id', booking.classes.id)
                        .eq('status', 'confirmed');

                    const enrolledAvatars = (enrollmentData || [])
                        .map((e: any) => e.profiles?.avatar_url)
                        .filter((url: any): url is string => !!url);

                    return {
                        ...booking,
                        enrolledAvatars,
                        enrolled: enrollmentData?.length || booking.classes.current_participants || 0,
                        capacity: booking.classes.max_participants || 8,
                    };
                })
            );

            // Sort by class_date (closest date first)
            const sortedBookings = bookingsWithEnrollment.sort((a, b) => {
                const dateA = new Date(a.classes.class_date).getTime();
                const dateB = new Date(b.classes.class_date).getTime();
                return dateA - dateB;
            });

            setBookings(sortedBookings);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBookings();

        // Refresh every minute to auto-remove cards when class time arrives
        const interval = setInterval(fetchBookings, 60000);
        return () => clearInterval(interval);
    }, [fetchBookings]);

    const handleNextCard = useCallback(() => {
        // Cycle to next card, wrap around to start
        setCurrentIndex(prev => (prev + 1) % bookings.length);
    }, [bookings.length]);

    const handlePrevCard = useCallback(() => {
        // Cycle to previous card, wrap around to end
        setCurrentIndex(prev => (prev - 1 + bookings.length) % bookings.length);
    }, [bookings.length]);

    if (loading) {
        return (
            <View className="h-48 w-full items-center justify-center">
                <ActivityIndicator color="#D81B60" />
            </View>
        );
    }

    if (bookings.length === 0) {
        return (
            <View className="h-48 w-full items-center justify-center bg-gray-50 rounded-3xl border border-gray-200">
                <Calendar size={48} color="#D1D5DB" strokeWidth={1.5} />
                <Text className="text-gray-400 font-bold mt-4">אין אימונים עתידיים</Text>
            </View>
        );
    }

    const handleCardPress = (booking: Booking) => {
        setSelectedBooking(booking);
        setModalVisible(true);
    };

    const handleCancelPress = (booking: Booking) => {
        if (!booking) return;

        // Check if class is within 6 hours (Late Cancel)
        const classDate = new Date(booking.classes.class_date); // Note: assuming class_date includes time or logic needs both
        // Existing logic in classes.tsx uses item.date + item.time, but here we have ISO string
        const now = new Date();
        const diffHours = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const canCancel = diffHours >= 6;
        const lateCancellations = user?.lateCancellations || 0;

        // Logic copied/adapted from classes.tsx
        if (canCancel) {
            Alert.alert('ביטול שיעור', 'מבטלים בוודאות?', [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelBooking(booking.id);
                            setModalVisible(false);
                            fetchBookings(); // Refresh local list
                            Alert.alert('בוטל', 'השיעור בוטל בהצלחה.');
                        } catch (e) {
                            Alert.alert('שגיאה', 'אירעה שגיאה בביטול השיעור');
                        }
                    }
                }
            ]);
        } else {
            // Late Cancel
            Alert.alert(
                'ביטול מאוחר',
                user?.ticket ? 'האימון ינוקב מהכרטיסייה.' : `לא ניתן לבטל פחות מ-6 שעות לפני. ביטול יגרור חיוב. (${lateCancellations}/3)`,
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'אשר ביטול',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const newLate = lateCancellations + 1;
                                // We rely on context's cancelBooking or custom logic? 
                                // classes.tsx calls cancelBooking AND updateUser manually for late cancels if not ticket.
                                // But context's cancelBooking might handle just the DB delete.
                                // We should replicate the logic fully if we want consistent behavior.

                                await cancelBooking(booking.id);

                                if (!user?.ticket) {
                                    if (newLate >= 3) {
                                        const blockEnd = new Date();
                                        blockEnd.setDate(blockEnd.getDate() + 3);
                                        await updateUser({ lateCancellations: newLate, blockEndDate: blockEnd.toISOString() });
                                        Alert.alert('חשבון חסום', 'ביטלת 3 שיעורים באיחור. החשבון שלך חסום ל-3 ימים.');
                                    } else {
                                        await updateUser({ lateCancellations: newLate });
                                        Alert.alert('בוטל', `השיעור בוטל. חשבונך יחויב. ביטולים מאוחרים: ${newLate}/3`);
                                    }
                                } else {
                                    Alert.alert('בוטל', 'השיעור בוטל. האימון נוקב מהכרטיסייה שלך.');
                                }

                                setModalVisible(false);
                                fetchBookings();
                            } catch (e) {
                                Alert.alert('שגיאה', 'אירעה שגיאה בביטול השיעור');
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleSwitchPress = () => {
        // Simple alert for now as navigation logic is complex or needs tab switch
        Alert.alert('החלף שיעור', 'אנא בטל את השיעור הנוכחי והירשם לשיעור אחר.');
    };

    return (
        <>
            <View className="relative h-52 w-full items-center justify-center px-4">
                {bookings.map((booking, idx) => {
                    // Calculate relative position from current index (circular)
                    let relativeIndex = idx - currentIndex;
                    if (relativeIndex < 0) relativeIndex += bookings.length;

                    // Only render top 3 visible cards
                    const isVisible = relativeIndex < 3;
                    if (!isVisible && bookings.length > 3) return null;

                    return (
                        <Card
                            key={booking.id}
                            booking={booking}
                            index={relativeIndex}
                            total={bookings.length}
                            onSwipeLeft={handleNextCard}
                            onSwipeRight={handlePrevCard}
                            isFirst={relativeIndex === 0}
                            cardIndex={idx}
                            onPress={() => handleCardPress(booking)}
                        />
                    );
                })}

                {/* Page indicators */}
                {bookings.length > 1 && (
                    <View className="absolute bottom-0 flex-row gap-2 items-center">
                        {bookings.map((_, idx) => (
                            <View
                                key={idx}
                                className={cn(
                                    "w-5 h-5 rounded-full items-center justify-center",
                                    idx === currentIndex ? "bg-primary" : "bg-gray-200"
                                )}
                            >
                                <Text className={cn(
                                    "text-[10px] font-bold",
                                    idx === currentIndex ? "text-white" : "text-gray-500"
                                )}>
                                    {idx + 1}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Registration Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%]">
                        {selectedBooking && (
                            <ClassRegistrationCard
                                title={selectedBooking.classes.name_hebrew}
                                date={selectedBooking.classes.class_date.split('T')[0]}
                                time={new Date(selectedBooking.classes.class_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                instructor={selectedBooking.classes.coach_name}
                                enrolled={selectedBooking.enrolled || 0}
                                capacity={selectedBooking.capacity || 8}
                                enrolledAvatars={selectedBooking.enrolledAvatars}
                                isBooked={true}
                                onCancel={() => setModalVisible(false)} // Close button
                                onCancelClass={() => handleCancelPress(selectedBooking)} // Actual Cancel action
                                onSwitch={handleSwitchPress}
                                className="h-full shadow-none border-0"
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

const Card = ({
    booking,
    index,
    onSwipeLeft,
    onSwipeRight,
    isFirst,
    cardIndex,
    onPress,
}: {
    booking: Booking;
    index: number;
    total: number;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    isFirst: boolean;
    cardIndex: number;
    onPress: () => void;
}) => {
    // Shared transition values
    const translateX = useSharedValue(0);

    // Date Logic
    const dateObj = new Date(booking.classes.class_date);
    const dayStr = dateObj.toLocaleDateString('he-IL', { weekday: 'long' }).replace('יום ', '');
    const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // Calculate days difference for dynamic styling
    const now = new Date();
    dateObj.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dateObj.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Dynamic Label
    let dateLabel = dayStr;
    let isSpecialDate = false;
    if (daysDiff === 0) {
        dateLabel = "היום!";
        isSpecialDate = true;
    } else if (daysDiff === 1) {
        dateLabel = "מחר";
        isSpecialDate = true;
    }

    // Dynamic Gradient Logic
    // Today: Black to Brand Pink (40% Black, 60% Pink coverage)
    // Others: Black / Dark Gray
    const isToday = daysDiff === 0;

    const gradientColors = isToday
        ? ['#000000', '#D81B60'] as const
        : ['#18181b', '#000000'] as const;

    const gradientLocations = isToday
        ? [0.4, 1] as const
        : [0, 1] as const;


    const enrolled = booking.enrolled || 0;
    const capacity = booking.capacity || 8;
    const capacityPercent = Math.round((enrolled / capacity) * 100);

    const gesture = Gesture.Pan()
        .enabled(isFirst)
        .onUpdate((event) => {
            translateX.value = event.translationX * 0.8; // Dampen movement for smoother feel
        })
        .onEnd((event) => {
            const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD ||
                Math.abs(event.velocityX) > 500;

            if (shouldSwipe) {
                // Always go to next class regardless of swipe direction
                const direction = event.translationX < 0 ? -1 : 1;
                // Fast timing for immediate card exit
                translateX.value = withTiming(direction * SCREEN_WIDTH, {
                    duration: 150
                }, () => {
                    runOnJS(onSwipeLeft)(); // Always go to next class
                    translateX.value = 0;
                });
            } else {
                translateX.value = withSpring(0, {
                    damping: 20,
                    stiffness: 400,
                });
            }
        });

    // Create a Tap gesture
    const tap = Gesture.Tap()
        .enabled(isFirst) // Only clickable if it's the top card
        .onEnd(() => {
            runOnJS(onPress)();
        });

    // Combine gestures: Race allows both but pan wins if movement detected
    const composedGesture = Gesture.Race(gesture, tap);

    const animatedStyle = useAnimatedStyle(() => {
        const targetScale = 1 - index * SCALE_FACTOR;
        const targetTop = index * -CARD_OFFSET;
        const targetOpacity = index <= 2 ? 1 - index * 0.15 : 0;

        return {
            top: withSpring(targetTop, { damping: 20, stiffness: 200 }),
            transform: [
                { scale: withSpring(targetScale, { damping: 15, stiffness: 150 }) },
                { translateX: isFirst ? translateX.value : 0 },
            ],
            zIndex: 100 - index,
            opacity: withSpring(targetOpacity, { damping: 20, stiffness: 200 }),
        };
    });

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                className="absolute w-full h-44 rounded-3xl overflow-hidden shadow-xl shadow-black/20"
                style={[animatedStyle]}
            >
                <LinearGradient
                    colors={gradientColors}
                    locations={gradientLocations}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="flex-1 p-5 flex-col justify-between"
                >
                    {/* Header - Title on right, Time badge on left */}
                    <View className="flex-row-reverse justify-between items-start">
                        <View className="items-end">
                            <Text className="text-xl font-black text-right text-white">
                                {booking.classes.name_hebrew}
                            </Text>
                            <View className="flex-row items-center gap-1 mt-1 justify-end">
                                <Text className="text-white text-xs">{booking.classes.coach_name}</Text>
                                <Image
                                    source={require('@/assets/images/coach.webp')}
                                    style={{ width: 24, height: 24, tintColor: '#FFFFFF' }}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                        <View className="items-center">
                            <View className="bg-white/10 px-2.5 py-1 rounded mb-1">
                                <Text className="text-base font-bold text-white">{timeStr}</Text>
                            </View>
                            <Text className={cn(
                                "text-base font-bold",
                                isSpecialDate ? "text-white text-2xl" : "text-gray-300"
                            )}>
                                {dateLabel}
                            </Text>
                        </View>
                    </View>

                    {/* Attendance Section */}
                    <View className="mt-3">
                        {/* Capacity Count + Avatar Group */}
                        <View className="flex-row-reverse items-center justify-between mb-2">
                            <View className="flex-row-reverse items-center gap-2">
                                <Image
                                    source={require('@/assets/images/group-session.webp')}
                                    style={{ width: 24, height: 24, tintColor: '#FFFFFF' }}
                                    resizeMode="contain"
                                />
                                <Text className="text-sm font-bold text-white">
                                    {enrolled}/{capacity}
                                </Text>
                            </View>

                            {/* Avatar Group */}
                            {(booking.enrolledAvatars?.length || 0) > 0 && (
                                <AvatarCircles
                                    avatarUrls={(booking.enrolledAvatars || []).slice(0, 3)}
                                    numPeople={Math.max(0, enrolled - 3)}
                                    className="scale-75 origin-left"
                                />
                            )}
                        </View>

                        {/* Progress Bar */}
                        <View className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                            <View
                                className={cn(
                                    "h-full rounded-full",
                                    capacityPercent >= 90 ? "bg-red-400" :
                                        capacityPercent >= 70 ? "bg-orange-400" : "bg-emerald-400"
                                )}
                                style={{ width: `${capacityPercent}%` }}
                            />
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        </GestureDetector>
    );
};
