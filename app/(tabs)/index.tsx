import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Animated, Alert, Dimensions } from "react-native";
import { TrendingUp, Clock, Users, Plus, Award, Target, ChevronLeft, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { useClasses } from '@/contexts/ClassesContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import { cn } from '@/lib/utils';
import Colors from '@/constants/colors'; // רק בשביל לשלוף את ה-Hex של הצבעים לאייקונים
import { LinearGradient } from 'expo-linear-gradient';
import { UpcomingWorkoutsStack } from '@/components/home/UpcomingWorkoutsStack';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function HomeScreen() {
  const router = useRouter();
  const { user, isAdmin, updateUser } = useAuth();
  const { getWeekStats } = useWorkouts();
  const { getUpcomingClasses, getMyClasses, cancelBooking, getClassBooking, classes } = useClasses();
  const { activeAchievements, completedAchievements, activeChallenge, hasActiveChallenge } = useAchievements();

  const lateCancellations = user?.lateCancellations || 0;
  const blockEndDate = user?.blockEndDate || null;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // --- Logic Filtering (Kept Intact) ---

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  const upcomingClasses = getUpcomingClasses()
    .filter(classItem => {
      if (classItem.date !== todayString) return false;
      return classItem.enrolled < classItem.capacity;
    })
    .slice(0, 3);

  const myBookedClasses = getMyClasses()
    .filter(classItem => {
      try {
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        return classDateTime > now;
      } catch (error) {
        return false;
      }
    })
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  // --- Countdown Logic ---
  useEffect(() => {
    const updateCountdown = () => {
      if (myBookedClasses.length === 0) {
        setCountdown('');
        return;
      }
      const nextClass = myBookedClasses[0];
      try {
        const classDateTime = new Date(`${nextClass.date}T${nextClass.time}`);
        const now = new Date();
        const diff = classDateTime.getTime() - now.getTime();

        if (diff <= 0) {
          setCountdown('מתחיל בקרוב!');
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) setCountdown(`${days} ימים ${hours} שעות`);
        else if (hours > 0) setCountdown(`${hours} שעות ${minutes} דקות`);
        else setCountdown(`${minutes} דקות`);
      } catch (error) {
        setCountdown('');
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 30000);
    return () => clearInterval(timer);
  }, [myBookedClasses]);

  // --- Helper Functions (Logic) ---

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 15) return 'צהריים טובים';
    if (hour >= 15 && hour < 18) return 'אחר הצהריים טובים';
    if (hour >= 18 && hour <= 23) return 'ערב טוב';
    return 'מי ער בשעות האלה';
  };

  // --- Subscription Card Helpers ---
  const getSubscriptionProgress = () => {
    if (!user?.subscription) return 0;

    const { type, startDate, endDate, classesUsed, classesPerMonth } = user.subscription;
    const isTicket = type.includes('class') || type.includes('-');

    if (isTicket) {
      return (classesUsed / classesPerMonth) * 100;
    } else {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const elapsed = now - start;
      const total = end - start;
      return Math.min(100, (elapsed / total) * 100);
    }
  };

  const formatSubscriptionDates = () => {
    if (!user?.subscription) return '';

    const { type, startDate, endDate } = user.subscription;
    const isTicket = type.includes('class') || type.includes('-');

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    };

    if (isTicket) {
      return `תוקף עד ${formatDate(endDate)}`;
    } else {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
  };

  const getSubscriptionTitle = () => {
    if (!user?.subscription) return 'אין מנוי פעיל';

    const { type } = user.subscription;
    const typeMap: Record<string, string> = {
      'unlimited': 'מנוי ללא הגבלה',
      'premium': 'מנוי פרימיום',
      '10-class': 'כרטיסייה 10 אימונים',
      '20-class': 'כרטיסייה 20 אימונים',
    };

    return typeMap[type] || type;
  };

  // --- UI Components ---

  return (

    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right', 'bottom']}>
      {/* Header: Notch Style (Sticky) */}
      <View className="w-full z-50 bg-transparent">
        <LinearGradient
          colors={['#18181b', '#000000']}
          className="rounded-b-[32px] px-6 pt-2 pb-6 items-center w-full"
        >
          <SafeAreaView edges={['top']} className="w-full">
            {/* User Greeting */}
            <View className="items-center mb-4 mt-2">
              <Text className="text-gray-400 text-sm font-medium mb-1">{getGreeting()}</Text>
              <Text className="text-3xl font-extrabold text-white">
                {user?.name?.split(' ')[0] || "אורח"}
              </Text>
            </View>

            {/* Subscription Info (Inside Notch) */}
            {user?.subscription ? (
              <View className="w-full max-w-[340px] bg-white/5 p-4 rounded-3xl self-center items-center">

                {/* Row 1: Title */}
                <Text className="text-lg font-black text-white mb-1 tracking-tight text-center">
                  {getSubscriptionTitle()}
                </Text>

                {/* Row 2: Date Range */}
                <View className="flex-row items-center gap-1.5 mb-3">
                  <Calendar size={12} color="#a1a1aa" />
                  <Text className="text-xs text-gray-300 font-medium">
                    {new Date(user.subscription.startDate).toLocaleDateString('en-GB')} - {new Date(user.subscription.endDate).toLocaleDateString('en-GB')}
                  </Text>
                </View>

                {/* Row 3: Progress Bar + Session Count */}
                <View className="w-full">
                  <View className="h-2.5 w-full bg-surface-darker/50 bg-black/20 rounded-full overflow-hidden border border-white/5">
                    <View
                      className="h-full bg-primary rounded-full shadow-sm"
                      style={{ width: `${Math.min(100, Math.max(0, getSubscriptionProgress()))}%` }}
                    />
                  </View>

                  {/* Session Count - Below Progress Bar, Centered */}
                  {(user.subscription.type.includes('class') || user.subscription.type.includes('-')) && (
                    <Text className="text-white font-bold text-lg text-center mt-3">
                      {user.subscription.classesPerMonth - user.subscription.classesUsed}/{user.subscription.classesPerMonth}
                    </Text>
                  )}
                </View>

              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push('/shop' as any)} className="bg-primary/20 px-4 py-2 rounded-full self-center">
                <Text className="text-primary font-bold text-sm">אין מנוי פעיל - רכוש עכשיו</Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </LinearGradient>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero Section: Upcoming Workouts Stack */}
        <View className="px-6 mb-6">
          <UpcomingWorkoutsStack />
        </View>

        {/* Quick Action: Workout Log */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => router.push('/workout-log' as any)}
            className="bg-surface p-5 rounded-2xl border border-gray-100 flex-row-reverse items-center active:bg-gray-100"
          >
            <View className="bg-white p-3 rounded-full shadow-sm ml-4">
              <TrendingUp size={24} color={Colors.primary} />
            </View>
            <Text className="font-bold text-[#09090B] text-lg">יומן ביצועים</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements Section */}
        <View className="px-6 mb-6">
          <View className="flex-row-reverse justify-between items-center mb-4">
            <Text className="text-lg font-bold text-[#09090B]">ההישגים שלי</Text>
            <TouchableOpacity onPress={() => router.push('/achievements' as any)}>
              <Text className="text-sm font-medium text-primary">הכל</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-gray-100 flex-row-reverse items-center">
            {/* Left side (Challenge Info) */}
            <TouchableOpacity
              className="flex-1 items-end pl-4"
              onPress={() => router.push({ pathname: '/achievements', params: { tab: 'challenges' } })}
            >
              {activeChallenge ? (
                <>
                  <Text className="text-xs text-primary font-bold mb-1">אתגר פעיל 🔥</Text>
                  <Text className="text-sm font-bold text-[#09090B] text-right" numberOfLines={1}>
                    {activeChallenge.achievement.name_hebrew || activeChallenge.achievement.name}
                  </Text>
                </>
              ) : (
                <View className="items-end">
                  <Text className="text-sm font-bold text-gray-400">אין אתגר פעיל</Text>
                  <Text className="text-xs text-primary mt-1">לחץ לבחירה</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="w-[1px] h-10 bg-gray-200 mx-2" />

            {/* Right side (Icons) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ flexDirection: 'row-reverse' }}>
              {(activeAchievements.length > 0 || completedAchievements.length > 0) ? (
                [...completedAchievements, ...activeAchievements].slice(0, 3).map((ach, i) => (
                  <Image
                    key={i}
                    source={{ uri: ach.achievement.icon }}
                    className="w-10 h-10 ml-2"
                  />
                ))
              ) : (
                <View className="flex-row-reverse items-center">
                  <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center ml-2">
                    <Award size={18} color="#999" />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Today's Available Classes List */}
        {upcomingClasses.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-[#09090B] text-right mb-4">פנוי היום</Text>
            {upcomingClasses.map((classItem: any) => (
              <TouchableOpacity
                key={classItem.id}
                onPress={() => router.push('/classes' as any)}
                className="bg-surface mb-3 p-4 rounded-2xl flex-row-reverse justify-between items-center border border-gray-100 active:scale-[0.99]"
              >
                <View className="items-end">
                  <Text className="font-bold text-[#09090B] text-base">{classItem.title}</Text>
                  <View className="flex-row-reverse items-center mt-1">
                    <Clock size={12} color="#71717A" />
                    <Text className="text-muted text-xs mr-1">{classItem.time}</Text>
                  </View>
                </View>

                <View className="flex-row-reverse items-center gap-2">
                  <View className="bg-white px-2 py-1 rounded-md border border-gray-100">
                    <Text className="text-xs font-bold text-gray-500">
                      {classItem.enrolled}/{classItem.capacity}
                    </Text>
                  </View>
                  <ChevronLeft size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}