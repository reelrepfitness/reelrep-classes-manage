import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, Clock, Users, MapPin, Trophy, XCircle, ArrowLeftRight } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import Colors from '@/constants/colors';
import { AvatarCircles } from '@/components/ui/AvatarCircles';
import { ClassAttendeesSheet } from './ClassAttendeesSheet';

interface ClassRegistrationCardProps {
    title: string;
    date: string; // YYYY-MM-DD format
    time: string; // HH:MM format
    instructor: string;
    enrolled: number;
    capacity: number;
    waitingListCount?: number;
    enrolledAvatars?: string[];
    isBooked?: boolean;
    isAdmin?: boolean;
    onRegister?: () => void;
    onCancel?: () => void;
    onCancelClass?: () => void;
    onSwitch?: () => void;
    onOpenAttendees?: () => void;
    className?: string;
}

export function ClassRegistrationCard({
    title,
    date,
    time,
    instructor,
    enrolled,
    capacity,
    waitingListCount = 0,
    enrolledAvatars = [],
    isBooked = false,
    isAdmin = false,
    onRegister,
    onCancel,
    onCancelClass,
    onSwitch,
    onOpenAttendees,
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
                <View className="flex-row items-start justify-between mb-2">
                    <View className="items-end flex-1">
                        <Text className="text-2xl font-extrabold text-[#09090B] text-right">{title}</Text>
                        <Text className="text-sm text-gray-500 mt-1">
                            {formatDate(date)} • {time}
                        </Text>
                    </View>
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
                    <View className="bg-orange-100 px-3 py-1 rounded-full self-end">
                        <Text className="text-orange-600 text-xs font-bold">מתחיל בקרוב!</Text>
                    </View>
                )}
            </View>

            {/* Info Cards */}
            <View className="px-6 pb-4">

                {/* Instructor & Capacity */}
                <View className="flex-row gap-3 mb-4">
                    {/* Coach Card */}
                    <View className="flex-1 bg-gray-50 rounded-xl py-3 items-center justify-center gap-2 border border-gray-100">
                        <Image source={require('@/assets/images/coach.webp')} style={{ width: 40, height: 40, tintColor: '#09090B' }} resizeMode="contain" />
                        <Text className="text-sm font-bold text-[#09090B] text-center" numberOfLines={1}>{instructor}</Text>
                    </View>

                    {/* Capacity Card */}
                    <View className="flex-1 bg-gray-50 rounded-xl py-3 items-center justify-center gap-2 border border-gray-100">
                        <Image source={require('@/assets/images/group-session.webp')} style={{ width: 40, height: 40, tintColor: '#3b82f6' }} resizeMode="contain" />
                        <Text className="text-sm font-bold text-[#09090B] text-center">
                            {enrolled}/{capacity}
                        </Text>
                    </View>
                </View>

                {/* Waiting List & Avatars Area */}
                <View className="mt-3 flex-row items-center justify-between">
                    {/* LEFTSIDE (in RTL this is visually LEFT) */}
                    {isFull && !isBooked && waitingListCount > 0 && (
                        <View className="bg-[#FFF7ED] px-3 py-1.5 rounded-full flex-row items-center gap-1.5 border border-[#FFEDD5]">
                            <Ionicons name="hourglass-outline" size={14} color="#C2410C" />
                            <Text className="text-[#C2410C] text-xs font-extrabold">{waitingListCount} ממתינים</Text>
                        </View>
                    )}
                    <View className="flex-1" />

                    {/* RIGHTSIDE (Avatars) */}
                    {enrolledAvatars.length > 0 && (
                        <TouchableOpacity onPress={onOpenAttendees} activeOpacity={0.7}>
                            <AvatarCircles
                                avatarUrls={enrolledAvatars.slice(0, 4)}
                                numPeople={Math.max(0, enrolled - 4)}
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Progress Bar */}
                <View className="mt-4">
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
                        {capacityPercent}% רשומים
                    </Text>
                </View>
            </View>

            {/* Countdown Display */}
            {timeLeft > 0 && (
                <View className="px-6 pb-4">
                    <View className="flex-row items-center gap-1 mb-3">
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
            {isBooked ? (
                // Already registered - show cancel/switch options
                <View className="p-6 pt-4 border-t border-gray-100">
                    <View className="flex-row gap-3 mb-3">
                        <TouchableOpacity
                            onPress={onCancelClass}
                            className="flex-1 flex-row py-3.5 rounded-xl items-center justify-center gap-2 border border-red-200 bg-red-50 active:bg-red-100"
                        >
                            <Image source={require('@/assets/images/cancel.webp')} style={{ width: 20, height: 20, tintColor: '#dc2626' }} resizeMode="contain" />
                            <Text className="text-red-600 text-base font-bold">ביטול שיעור</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onSwitch}
                            className="flex-1 flex-row py-3.5 rounded-xl items-center justify-center gap-2 border border-gray-200 bg-gray-50 active:bg-gray-100"
                        >
                            <Image source={require('@/assets/images/replace.webp')} style={{ width: 20, height: 20, tintColor: '#374151' }} resizeMode="contain" />
                            <Text className="text-gray-700 text-base font-bold">החלפה</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={onCancel}
                        className="w-full py-3.5 rounded-xl items-center bg-[#09090B] active:bg-gray-800"
                    >
                        <Text className="text-white text-base font-bold">סגור</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // Not registered - show register/cancel options
                <View className="flex-row gap-3 p-6 pt-4 border-t border-gray-100">
                    <TouchableOpacity
                        onPress={onCancel}
                        className="flex-1 py-3.5 rounded-xl items-center border border-gray-200 bg-gray-50 active:bg-gray-100"
                    >
                        <Text className="text-gray-700 text-base font-bold">ביטול</Text>
                    </TouchableOpacity>

                    {/* Register / Join Waitlist Button */}
                    <TouchableOpacity
                        onPress={onRegister}
                        className={cn(
                            "flex-1 py-3.5 rounded-xl items-center border",
                            isFull && !isAdmin
                                ? "bg-white border-primary" // Outlined for waitlist
                                : "bg-primary border-primary" // Solid for regular
                        )}
                        style={!isFull || isAdmin ? {
                            shadowColor: Colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        } : {}}
                    >
                        <Text className={cn(
                            "text-base font-bold",
                            isFull && !isAdmin ? "text-primary" : "text-white"
                        )}>
                            {isFull && !isAdmin ? 'הכנס להמתנה' : 'הירשם'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
    );
}

export default ClassRegistrationCard;
