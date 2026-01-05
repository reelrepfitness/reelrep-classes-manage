import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    useDerivedValue,
} from 'react-native-reanimated';
import { Calendar, MapPin, User, ArrowRightLeft, X, Clock } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LinearGradient } from 'expo-linear-gradient';

// Types based on verified schema
type ClassData = {
    id: string;
    name_hebrew: string;
    coach_name: string;
    class_date: string;
    location_hebrew: string | null;
    start_time_str?: string; // Derived for display
};

type Booking = {
    id: string;
    status: string;
    classes: ClassData;
};

const CARD_OFFSET = 10;
const SCALE_FACTOR = 0.06;
const SWIPE_THRESHOLD = 120;

export const UpcomingWorkoutsStack = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Animation values
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
            location_hebrew
          )
        `)
                .eq('user_id', user.id)
                .eq('status', 'confirmed') // Only confirmed bookings
                .gt('classes.class_date', now) // Future classes only
                .order('class_date', { foreignTable: 'classes', ascending: true });

            if (error) throw error;

            setBookings(data as any[] || []);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleCancel = (bookingId: string, className: string) => {
        Alert.alert(
            'ביטול אימון',
            `האם אתה בטוח שברצונך לבטל את הרישום ל-${className}?`,
            [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('class_bookings')
                                .update({ status: 'cancelled' })
                                .eq('id', bookingId);

                            if (error) throw error;

                            // Remove locally
                            setBookings(prev => prev.filter(b => b.id !== bookingId));
                            Alert.alert('בוטל', 'האימון בוטל בהצלחה');
                        } catch (err) {
                            Alert.alert('שגיאה', 'לא ניתן היה לבטל את האימון');
                            console.error(err);
                        }
                    }
                }
            ]
        );
    };

    const handleSwitch = (workoutId: string) => {
        console.log('Switch clicked for workout:', workoutId);
        Alert.alert('החלפה', 'פונקציונליות החלפה תגיע בקרוב (Workout ID: ' + workoutId + ')');
    };

    if (loading) {
        return (
            <View className="h-60 w-full items-center justify-center">
                <ActivityIndicator color="#D81B60" />
            </View>
        );
    }

    if (bookings.length === 0) {
        return (
            <View className="h-60 w-full items-center justify-center bg-gray-50 rounded-3xl border border-gray-200">
                <Calendar size={48} color="#D1D5DB" strokeWidth={1.5} />
                <Text className="text-gray-400 font-bold mt-4">אין אימונים עתידיים</Text>
            </View>
        );
    }

    // We only show up to 3 cards in the stack for performance/visuals
    const visibleBookings = bookings.slice(0, 3);

    return (
        <View className="relative h-60 w-full items-center justify-center px-4">
            {visibleBookings.map((booking, index) => {
                return (
                    <Card
                        key={booking.id}
                        booking={booking}
                        index={index}
                        total={visibleBookings.length}
                        onCancel={() => handleCancel(booking.id, booking.classes.name_hebrew)}
                        onSwitch={() => handleSwitch(booking.classes.id)}
                    />
                );
            })}
        </View>
    );
};

const Card = ({
    booking,
    index,
    onCancel,
    onSwitch
}: {
    booking: Booking;
    index: number;
    total: number;
    onCancel: () => void;
    onSwitch: () => void;
}) => {
    // Format date
    const dateObj = new Date(booking.classes.class_date);
    const dateStr = dateObj.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            top: index * -CARD_OFFSET,
            transform: [
                { scale: 1 - index * SCALE_FACTOR },
            ],
            zIndex: 100 - index,
        };
    });

    return (
        <Animated.View
            className={cn(
                "absolute w-full h-56 rounded-3xl p-5 flex-col justify-between shadow-xl shadow-black/10 border",
                "bg-white border-gray-100 dark:bg-zinc-900 dark:border-zinc-800"
            )}
            style={[
                {
                    transformOrigin: 'top center', // Adjust for React Native reanimated if needed, usually default origin works well for center aligned
                },
                animatedStyle
            ]}
        >
            {/* Header */}
            <View className="flex-row-reverse justify-between items-start">
                <View>
                    <Text className="text-2xl font-black text-right text-gray-900 dark:text-white">
                        {booking.classes.name_hebrew}
                    </Text>
                    <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded self-end mt-1">
                        <Text className="text-xs font-bold text-green-700 dark:text-green-400">רשום ✅</Text>
                    </View>
                </View>
                {/* Icon or decorative element could go here */}
            </View>

            {/* Details */}
            <View className="gap-2 mt-2">
                <View className="flex-row-reverse items-center gap-2">
                    <Calendar size={16} className="text-gray-500" color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                        {dateStr}, {timeStr}
                    </Text>
                </View>

                <View className="flex-row-reverse items-center gap-2">
                    <User size={16} className="text-gray-500" color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                        {booking.classes.coach_name}
                    </Text>
                </View>

                {booking.classes.location_hebrew && (
                    <View className="flex-row-reverse items-center gap-2">
                        <MapPin size={16} className="text-gray-500" color="#6B7280" />
                        <Text className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                            {booking.classes.location_hebrew}
                        </Text>
                    </View>
                )}
            </View>

            {/* Actions - Only visible for the top card if desired, or all. 
          Usually stacked cards hide actions of cards behind, but since we scale down, 
          it might be cleaner to only enable interaction on index 0. 
      */}
            <View className="flex-row-reverse gap-3 mt-auto pt-2">
                <TouchableOpacity
                    onPress={onSwitch}
                    disabled={index !== 0}
                    className={cn(
                        "flex-1 bg-black dark:bg-white py-3 rounded-xl flex-row-reverse justify-center items-center gap-2",
                        index !== 0 && "opacity-0" // Hide actions for cards behind
                    )}
                >
                    <ArrowRightLeft size={16} color={index === 0 ? "white" : "black"} className="dark:text-black text-white" />
                    <Text className="text-white dark:text-black font-bold text-sm">החלפה</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onCancel}
                    disabled={index !== 0}
                    className={cn(
                        "flex-1 bg-red-50 border border-red-100 py-3 rounded-xl flex-row-reverse justify-center items-center gap-2",
                        index !== 0 && "opacity-0"
                    )}
                >
                    <X size={16} color="#DC2626" />
                    <Text className="text-red-600 font-bold text-sm">ביטול</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};
