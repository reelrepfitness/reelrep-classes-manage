import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import { TrendingUp, Clock, Users, Plus, Award, Target, ChevronLeft, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { useClasses } from '@/contexts/ClassesContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import { cn } from '@/lib/utils';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { UpcomingWorkoutsStack } from '@/components/home/UpcomingWorkoutsStack';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Logic constants matches user desire
const MIN_HEADER_HEIGHT = 60; // Collapsed height (Perfect tight fit)
const MAX_HEADER_HEIGHT = 290; // Expanded height (Increased to fit extra margin)
const SCROLL_DISTANCE = 150; // Distance to collapse

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, updateUser } = useAuth();
  const { getWeekStats } = useWorkouts();
  const { getUpcomingClasses, getMyClasses, cancelBooking, getClassBooking, classes } = useClasses();
  const { activeAchievements, completedAchievements, activeChallenge, hasActiveChallenge } = useAchievements();

  const [countdown, setCountdown] = useState('');

  // 1. Animation State (Reanimated)
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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

  // --- Helper Functions ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 15) return 'צהריים טובים';
    if (hour >= 15 && hour < 18) return 'אחר הצהריים טובים';
    if (hour >= 18 && hour <= 23) return 'ערב טוב';
    return 'מי ער בשעות האלה';
  };

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

  const getSubscriptionTitle = () => {
    if (!user?.subscription) return 'אין מנוי פעיל';
    const { type } = user.subscription;
    const typeMap: Record<string, string> = {
      'unlimited': 'מנוי ללא הגבלה',
      'premium': 'מנוי פרימיום',
      '10-class': '10 אימונים',
      '20-class': '20 אימונים',
    };
    return typeMap[type] || type;
  };

  // --- Animated Styles ---

  // Header container height animation (Direct sync for tightness)
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [MAX_HEADER_HEIGHT, MIN_HEADER_HEIGHT + insets.top], // Shrink to min height + safe/status bar
      Extrapolation.CLAMP
    );
    return { height }; // Removed withSpring directly for 1:1 sync
  });

  // Subscription card fade and scale (fades out, greeting/name stay)
  const contentOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE * 0.5],
      [1, 0.9],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, -20],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }, { translateY }]
    };
  });

  // Greeting stays visible, just moves up slightly
  const greetingAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [0, -5], // Slightly reduced movement
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  // Name stays visible, shrinks slightly with bounce
  const nameAnimatedStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [30, 24],
      Extrapolation.CLAMP
    );
    // Control Spacing: Large margin in expanded, tiny margin in collapsed
    const marginBottom = interpolate(
      scrollY.value,
      [0, SCROLL_DISTANCE],
      [30, 0], // Increased expanded space, Removed collapsed space
      Extrapolation.CLAMP
    );
    return { fontSize, marginBottom };
  });

  // --- UI Components ---

  return (
    <View className="flex-1 bg-background">

      {/* 2. THE TOP NOTCH (Fixed Absolute) */}
      <View style={styles.topNotch}>
        <Animated.View style={[styles.notchGradient, headerAnimatedStyle]}>
          <LinearGradient
            colors={['#18181b', '#000000']}
            style={{ flex: 1, paddingTop: insets.top + 10, paddingHorizontal: 24, paddingBottom: 10 }}
          >
            {/* HEADER CONTENT */}
            <View style={{ width: '100%', alignItems: 'center' }}>
              {/* Greeting & Name - ALWAYS VISIBLE */}
              <Animated.View style={[{ alignItems: 'center' }, greetingAnimatedStyle]}>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Animated.Text style={[styles.nameText, nameAnimatedStyle]}>
                  {user?.name?.split(' ')[0] || "אורח"}
                </Animated.Text>
              </Animated.View>

              {/* Collapsing Content (Subscription) */}
              <Animated.View style={[{ width: '100%', alignItems: 'center' }, contentOpacityStyle]}>
                {user?.subscription ? (
                  <View style={styles.subscriptionCard}>
                    <Text style={styles.subscriptionTitle}>{getSubscriptionTitle()}</Text>
                    <View style={styles.subscriptionDateRow}>
                      <Text style={styles.subscriptionDate}>
                        {`פג תוקף בעוד ${Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ימים`}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, getSubscriptionProgress()))}%` }]}
                        />
                      </View>
                      {(user.subscription.type.includes('class') || user.subscription.type.includes('-')) && (
                        <Text style={styles.sessionCount}>
                          {user.subscription.classesPerMonth - user.subscription.classesUsed}/{user.subscription.classesPerMonth}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => router.push('/shop' as any)} style={styles.noSubscriptionBtn}>
                    <Text style={styles.noSubscriptionText}>אין מנוי פעיל - רכוש עכשיו</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* 3. SCROLL VIEW (Drives Animation) */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: MAX_HEADER_HEIGHT + 30, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Helper spacer if we need more scroll distance to verify effect */}

        {/* Hero Section: Upcoming Workouts Stack */}
        <View className="px-6 mb-6">
          <UpcomingWorkoutsStack />
        </View>

        <View className="px-6 mb-6 flex-row gap-3">
          {/* Workout Log Card */}
          <TouchableOpacity
            onPress={() => router.push('/workout-log' as any)}
            className="flex-1 aspect-square bg-surface rounded-2xl border border-gray-100 items-center justify-center active:bg-gray-100 relative"
          >
            <Image
              source={require('@/assets/images/checklist.webp')}
              className="w-[50%] h-[50%] -mt-4"
              contentFit="contain"
            />
            <View className="absolute bottom-0 w-full h-[25%] items-center justify-center">
              <Text className="font-bold text-[#09090B] text-base text-center">יומן ביצועים</Text>
            </View>
          </TouchableOpacity>

          {/* Empty Placeholder Card */}
          <View className="flex-1 aspect-square bg-surface rounded-2xl border border-gray-100 items-center justify-center relative">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center -mt-4">
              <Plus size={24} color="#9CA3AF" />
            </View>
            <View className="absolute bottom-0 w-full h-[25%] items-center justify-center">
              <Text className="font-bold text-gray-400 text-base text-center">בקרוב</Text>
            </View>
          </View>
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
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerStyle={{ flexDirection: 'row-reverse' }}>
              {(activeAchievements.length > 0 || completedAchievements.length > 0) ? (
                [...completedAchievements, ...activeAchievements].slice(0, 3).map((ach, i) => (
                  <Image
                    key={i}
                    source={{ uri: ach.achievement.icon }}
                    className="w-10 h-10 ml-2"
                    contentFit="contain"
                  />
                ))
              ) : (
                <View className="flex-row-reverse items-center">
                  <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center ml-2">
                    <Award size={18} color="#999" />
                  </View>
                </View>
              )}
            </Animated.ScrollView>
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

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Notch Styles
  topNotch: {
    position: "absolute",
    top: -5,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  notchGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  greetingText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },

  // Subscription Card Styles
  subscriptionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 4,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subscriptionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  subscriptionDate: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 10,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  sessionCount: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  noSubscriptionBtn: {
    backgroundColor: 'rgba(216, 27, 96, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 10,
  },
  noSubscriptionText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});