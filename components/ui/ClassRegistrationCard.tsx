import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Calendar, Clock, Users, MapPin, Trophy } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import Colors from '@/constants/colors';

interface ClassRegistrationCardProps {
    title: string;
    date: string; // YYYY-MM-DD format
    time: string; // HH:MM format
    instructor: string;
    enrolled: number;
    capacity: number;
    isBooked?: boolean;
    isAdmin?: boolean;
    onRegister?: () => void;
    onCancel?: () => void;
    className?: string;
}

export function ClassRegistrationCard({
    title,
    date,
    time,
    instructor,
    enrolled,
    capacity,
    isBooked = false,
    isAdmin = false,
    onRegister,
    onCancel,
    className,
}: ClassRegistrationCardProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Calculate time until class starts
    useEffect(() => {
        const calculateTimeLeft = () => {
            const classDateTime = new Date(`${date}T${time}`);
            const now = new Date();
            const diff = Math.max(0, Math.floor((classDateTime.getTime() - now.getTime()) / 1000));
            setTimeLeft(diff);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(interval);
    }, [date, time]);

    // Fade in animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    // Pulse animation for seconds (when < 1 hour)
    useEffect(() => {
        if (timeLeft > 0 && timeLeft < 3600) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [timeLeft < 3600]);

    const getTimeUnits = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return { days, hours, minutes, seconds: secs };
    };

    const { days, hours, minutes, seconds } = getTimeUnits(timeLeft);

    const isFull = enrolled >= capacity;
    const isUrgent = timeLeft > 0 && timeLeft < 86400; // Less than 24 hours
    const capacityPercent = Math.round((enrolled / capacity) * 100);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('he-IL', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    return (
        <Animated.View
            style={{ opacity: fadeAnim, width: '100%' }}
            className={cn("bg-white rounded-3xl overflow-hidden", className)}
        >
            {/* Header with Title */}
            <View className="p-6 pb-4">
                <View className="flex-row-reverse items-center justify-between mb-2">
                    <Text className="text-2xl font-extrabold text-[#09090B]">{title}</Text>
                    {isBooked && (
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-600 text-xs font-bold">רשום ✓</Text>
                        </View>
                    )}
                    {!isBooked && isFull && (
                        <View className="bg-red-100 px-3 py-1 rounded-full">
                            <Text className="text-red-600 text-xs font-bold">מלא</Text>
                        </View>
                    )}
                </View>

                {/* Urgency Badge */}
                {isUrgent && !isBooked && !isFull && (
                    <View className="bg-orange-100 px-3 py-1 rounded-full self-end mb-2">
                        <Text className="text-orange-600 text-xs font-bold">מתחיל בקרוב!</Text>
                    </View>
                )}
            </View>

            {/* Info Cards */}
            <View className="px-6 pb-4">
                {/* Date & Time - Single Card */}
                <View className="flex-row-reverse items-center gap-3 mb-3">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                        <Clock size={18} color={Colors.primary} />
                    </View>
                    <View className="flex-1 flex-row-reverse items-center justify-end gap-4">
                        <View className="items-end">
                            <Text className="text-xs text-gray-400 font-medium">שעה</Text>
                            <Text className="text-base font-bold text-[#09090B]">{time}</Text>
                        </View>
                        <View className="w-[1px] h-8 bg-gray-200" />
                        <View className="items-end">
                            <Text className="text-xs text-gray-400 font-medium">תאריך</Text>
                            <Text className="text-base font-bold text-[#09090B]">{formatDate(date)}</Text>
                        </View>
                    </View>
                </View>

                {/* Instructor */}
                <View className="flex-row-reverse items-center gap-3 mb-3">
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                        <Users size={18} color="#f97316" />
                    </View>
                    <View className="flex-1 items-end">
                        <Text className="text-xs text-gray-400 font-medium">מאמן</Text>
                        <Text className="text-base font-bold text-[#09090B]">{instructor}</Text>
                    </View>
                </View>

                {/* Capacity with Progress Bar */}
                <View className="flex-row-reverse items-center gap-3">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                        <Trophy size={18} color="#3b82f6" />
                    </View>
                    <View className="flex-1 items-end">
                        <Text className="text-xs text-gray-400 font-medium">תפוסה</Text>
                        <Text className="text-base font-bold text-[#09090B]">
                            {enrolled}/{capacity}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-3">
                    <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <View
                            className={cn(
                                "h-full rounded-full",
                                capacityPercent >= 90 ? "bg-red-500" :
                                    capacityPercent >= 70 ? "bg-orange-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${capacityPercent}%` }}
                        />
                    </View>
                    <Text className="text-[10px] text-gray-400 text-center mt-1">
                        {capacityPercent}% תפוסה
                    </Text>
                </View>
            </View>

            {/* Countdown Display */}
            {timeLeft > 0 && (
                <View className="px-6 pb-4">
                    <View className="flex-row-reverse items-center gap-1 mb-3">
                        <Clock size={14} color="#71717A" />
                        <Text className="text-sm font-medium text-gray-500">מתחיל בעוד:</Text>
                    </View>

                    <View className="flex-row justify-between gap-2">
                        {[
                            { value: days, label: 'ימים' },
                            { value: hours, label: 'שעות' },
                            { value: minutes, label: 'דקות' },
                            { value: seconds, label: 'שניות' },
                        ].map((unit, index) => (
                            <Animated.View
                                key={unit.label}
                                style={index === 3 && timeLeft < 3600 ? { transform: [{ scale: pulseAnim }] } : {}}
                                className="flex-1 bg-gray-50 rounded-xl p-3 items-center border border-gray-100"
                            >
                                <Text className="text-lg font-bold text-[#09090B] tabular-nums">
                                    {unit.value.toString().padStart(2, '0')}
                                </Text>
                                <Text className="text-[10px] text-gray-400 font-medium">{unit.label}</Text>
                            </Animated.View>
                        ))}
                    </View>
                </View>
            )}

            {/* Event Started Message */}
            {timeLeft === 0 && (
                <View className="px-6 pb-4 items-center">
                    <Text className="text-lg font-bold text-green-600">השיעור התחיל!</Text>
                    <Text className="text-sm text-gray-400">הצטרף עכשיו</Text>
                </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row-reverse gap-3 p-6 pt-4 border-t border-gray-100">
                {/* Cancel/Close Button */}
                <TouchableOpacity
                    onPress={onCancel}
                    className="flex-1 py-3.5 rounded-xl items-center border border-gray-200 bg-gray-50 active:bg-gray-100"
                >
                    <Text className="text-gray-700 text-base font-bold">ביטול</Text>
                </TouchableOpacity>

                {/* Register Button */}
                <TouchableOpacity
                    onPress={onRegister}
                    disabled={isBooked || (isFull && !isAdmin)}
                    className={cn(
                        "flex-1 py-3.5 rounded-xl items-center",
                        isBooked ? "bg-green-600" :
                            isFull && !isAdmin ? "bg-gray-300" : "bg-primary"
                    )}
                    style={!isBooked && !isFull ? {
                        shadowColor: Colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                    } : {}}
                >
                    <Text className="text-white text-base font-bold">
                        {isBooked ? 'רשום ✓' : isFull && !isAdmin ? 'מלא' : 'הירשם'}
                    </Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

export default ClassRegistrationCard;
