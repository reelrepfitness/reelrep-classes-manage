import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
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
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const fetchBookings = useCallback(async () => {
        if (!user) return;

        try {
            const now = new global.Date().toISOString();

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
                .eq('status', 'confirmed')
                .gt('classes.class_date', now)
                .order('class_date', { foreignTable: 'classes', ascending: true });

            if (error) throw error;

            // Fetch enrollment data for each class
            const bookingsWithEnrollment = await Promise.all(
                (data || []).map(async (booking: any) => {
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

            setBookings(bookingsWithEnrollment);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBookings();
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

    return (
        <View className="relative h-48 w-full items-center justify-center px-4">
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
                    />
                );
            })}

            {/* Page indicators */}
            {bookings.length > 1 && (
                <View className="absolute bottom-0 flex-row gap-1.5 items-center">
                    {bookings.map((_, idx) => (
                        <View
                            key={idx}
                            className={cn(
                                "w-2 h-2 rounded-full",
                                idx === currentIndex ? "bg-primary" : "bg-gray-300"
                            )}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const Card = ({
    booking,
    index,
    onSwipeLeft,
    onSwipeRight,
    isFirst,
    cardIndex,
}: {
    booking: Booking;
    index: number;
    total: number;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    isFirst: boolean;
    cardIndex: number;
}) => {
    // Get gradient colors based on card position
    const gradientColors = CARD_GRADIENTS[cardIndex % CARD_GRADIENTS.length] as [string, string];
    const translateX = useSharedValue(0);

    // Format date
    const dateObj = new Date(booking.classes.class_date);
    const dayStr = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
    const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

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
        <GestureDetector gesture={gesture}>
            <Animated.View
                className="absolute w-full h-44 rounded-3xl overflow-hidden shadow-xl shadow-black/20"
                style={[animatedStyle]}
            >
                <LinearGradient
                    colors={gradientColors}
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
                            <Text className="text-gray-400 text-xs mt-1">{booking.classes.coach_name}</Text>
                        </View>
                        <View className="bg-white/10 px-2.5 py-1 rounded">
                            <Text className="text-base font-bold text-white">{timeStr}</Text>
                        </View>
                    </View>

                    {/* Day Row */}
                    <View className="flex-row-reverse items-center gap-2 mt-1">
                        <Calendar size={14} color="#9CA3AF" />
                        <Text className="text-gray-300 font-medium text-xs">
                            {dayStr}
                        </Text>
                    </View>

                    {/* Attendance Section */}
                    <View className="mt-3">
                        {/* Capacity Count + Avatar Group */}
                        <View className="flex-row-reverse items-center justify-between mb-2">
                            <View className="flex-row-reverse items-center gap-2">
                                <Users size={14} color="#9CA3AF" />
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
