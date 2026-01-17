import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, Alert, LayoutAnimation, Platform, UIManager } from "react-native";
import { Award, Target, ChevronRight, Lock, CheckCircle2, Star } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { Achievement } from '@/constants/types';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { cn } from '@/lib/utils';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// Helper to format numbers
const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('he-IL').format(value);
};

const getAchievementName = (achievement: Achievement) => achievement.name;

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    achievements,
    activeChallenge,
    challengeAchievements,
    hasActiveChallenge,
    acceptChallenge,
    calculateProgress,
  } = useAchievements();

  const [selectedTab, setSelectedTab] = useState<'achievements' | 'challenges'>('achievements');
  const [selectedChallenge, setSelectedChallenge] = useState<Achievement | null>(null);
  const params = useLocalSearchParams<{ tab?: string }>();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  useEffect(() => {
    if (params.tab === 'challenges') setSelectedTab('challenges');
  }, [params.tab]);

  // --- Logic: Attendance Achievements (Sorted) ---
  // Type for achievement with parsed requirement
  type AchievementWithParsedReq = Achievement & { parsedReq: number };

  const attendanceAchievements = useMemo<AchievementWithParsedReq[]>(() => {
    if (!achievements?.length) return [];
    return achievements
      .filter(a => a.task_type === 'classes_attended' || !a.task_type)
      .map(a => ({ ...a, parsedReq: parseInt(String(a.task_requirement), 10) || 0 }))
      .sort((a, b) => a.parsedReq - b.parsedReq);
  }, [achievements]);

  // --- Logic: Current Status & Next Goal ---
  const { currentBadge, nextBadge, progressToNext, totalProgress } = useMemo(() => {
    let current = null;
    let next = null;
    let total = 0;

    // Find the total workouts done (based on the first achievement progress usually)
    // Assuming calculateProgress returns the raw count for attendance types
    if (attendanceAchievements.length > 0) {
      total = calculateProgress(attendanceAchievements[0]);
    }

    // Find the highest unlocked badge
    for (let i = 0; i < attendanceAchievements.length; i++) {
      const ach = attendanceAchievements[i];
      if (total >= ach.parsedReq) {
        current = ach;
      } else {
        next = ach;
        break; // The first one we haven't met is the "Next"
      }
    }

    return {
      currentBadge: current,
      nextBadge: next,
      totalProgress: total,
      progressToNext: next ? (total / next.parsedReq) : 1
    };
  }, [attendanceAchievements, calculateProgress]);


  const handleChallengePress = (challenge: Achievement) => {
    setSelectedChallenge(challenge);
    bottomSheetRef.current?.expand();
  };

  const handleAcceptChallenge = () => {
    if (!selectedChallenge) return;
    acceptChallenge(selectedChallenge.id);
    bottomSheetRef.current?.close();
    Alert.alert('בהצלחה!', `האתגר ${getAchievementName(selectedChallenge)} יצא לדרך!`);
    setSelectedChallenge(null);
  };

  // --- Render: Hero Section (Current Status) ---
  const renderHeroSection = () => {
    if (!attendanceAchievements.length) return null;

    return (
      <Animated.View entering={FadeInDown.delay(100).duration(600)} className="mx-5 mt-2 mb-8">
        <View className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 items-center relative overflow-hidden">
          {/* Background Decor */}
          <View className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10" />
          <View className="absolute bottom-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-8 -mb-8" />

          {/* Icon */}
          <View className="w-28 h-28 mb-4 items-center justify-center">
            {nextBadge ? (
              <Image source={{ uri: nextBadge.icon }} style={{ width: 112, height: 112 }} resizeMode="contain" />
            ) : currentBadge ? (
              <Image source={{ uri: currentBadge.icon }} style={{ width: 112, height: 112 }} resizeMode="contain" />
            ) : (
              <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center">
                <Award size={48} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Texts */}
          <Text className="text-gray-500 font-bold text-sm mb-1">השלב הנוכחי</Text>
          <Text className="text-2xl font-extrabold text-[#09090B] mb-6 text-center">
            {nextBadge ? getAchievementName(nextBadge) : (currentBadge ? getAchievementName(currentBadge) : '50 אימונים')}
          </Text>

          {/* Progress Bar to Next */}
          {nextBadge ? (
            <View className="w-full">
              <View className="flex-row justify-between mb-2 px-1">
                <Text className="text-xs font-bold text-gray-400">
                  עוד {formatNumber(nextBadge.parsedReq - totalProgress)} ל-{getAchievementName(nextBadge)}
                </Text>
                <Text className="text-xs font-bold text-primary">
                  {formatNumber(totalProgress)} / {formatNumber(nextBadge.parsedReq)}
                </Text>
              </View>
              <View className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(progressToNext * 100, 100)}%` }}
                />
              </View>
            </View>
          ) : (
            <View className="bg-green-50 px-4 py-2 rounded-full flex-row items-center gap-2">
              <Star size={16} color={Colors.success} fill={Colors.success} />
              <Text className="text-green-700 font-bold text-sm">הגעת לפסגה! כל הכבוד!</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  // --- Render: Achievements Grid ---
  const renderAchievementsGrid = () => {
    return (
      <View className="px-5 pb-10">
        <Text className="text-lg font-bold text-[#09090B] mb-4 text-right">אוסף המדליות שלי</Text>

        <View className="flex-row flex-wrap justify-between">
          {attendanceAchievements.map((achievement, index) => {
            const isUnlocked = totalProgress >= achievement.parsedReq;
            const isNext = !isUnlocked && (!attendanceAchievements[index - 1] || totalProgress >= attendanceAchievements[index - 1].parsedReq);

            return (
              <Animated.View
                entering={ZoomIn.delay(index * 50).duration(400)}
                key={achievement.id}
                style={{ width: (width - 40 - 24) / 3 }} // 3 columns with gap
                className="mb-6 items-center"
              >
                <View className={cn(
                  "w-full aspect-square rounded-[24px] items-center justify-center mb-2 border relative shadow-sm",
                  isUnlocked ? "bg-white border-green-100 shadow-green-100" :
                    isNext ? "bg-white border-primary/30 shadow-pink-100" : "bg-gray-50 border-gray-100 opacity-60"
                )}>
                  <Image
                    source={{ uri: achievement.icon }}
                    style={{ width: 64, height: 64, opacity: isUnlocked || isNext ? 1 : 0.4 }}
                    resizeMode="contain"
                  />

                  {/* Status Icons */}
                  {isUnlocked && (
                    <View className="absolute -bottom-2 bg-green-100 rounded-full p-1 border-2 border-white">
                      <CheckCircle2 size={14} color={Colors.success} />
                    </View>
                  )}
                  {!isUnlocked && !isNext && (
                    <View className="absolute top-2 right-2">
                      <Lock size={14} color="#9CA3AF" />
                    </View>
                  )}
                </View>

                <Text className={cn(
                  "text-center text-xs font-bold leading-4",
                  isUnlocked || isNext ? "text-[#09090B]" : "text-gray-400"
                )}>
                  {getAchievementName(achievement)}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  // --- Render: Challenges List (Existing Logic Redesigned) ---
  const renderChallengesList = () => {
    if (challengeAchievements.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-20 opacity-50">
          <Target size={48} color="#D4D4D8" />
          <Text className="text-gray-400 mt-2 font-medium">אין אתגרים זמינים כרגע</Text>
        </View>
      );
    }

    return (
      <View className="px-5 pt-4">
        {challengeAchievements.map(challenge => (
          <TouchableOpacity
            key={challenge.id}
            onPress={() => handleChallengePress(challenge)}
            className="w-full mb-4 bg-white rounded-3xl p-4 flex-row items-center border border-gray-100 shadow-sm"
          >
            <Image source={{ uri: challenge.icon }} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F9FAFB' }} />
            <View className="flex-1 mr-4">
              <Text className="text-base font-bold text-[#09090B] text-right">{getAchievementName(challenge)}</Text>
              <Text className="text-gray-400 text-xs text-right mt-1">יעד: {formatNumber(challenge.task_requirement)}</Text>
            </View>
            <View className="bg-primary/10 px-3 py-1.5 rounded-full">
              <Text className="text-primary text-xs font-bold">הצג</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="bg-white pb-2 border-b border-gray-100 z-10">
        <View className="px-5 pt-2 mb-2 flex-row justify-between items-center">
          <Text className="text-2xl font-extrabold text-[#09090B]">ההישגים שלי</Text>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-gray-50 rounded-full">
            <ChevronRight size={22} color="#09090B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Tabs (Only show if challenges exist, otherwise minimal) */}
        {challengeAchievements.length > 0 && (
          <View className="mx-5 my-4 bg-gray-100 p-1 rounded-xl flex-row">
            <TouchableOpacity
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedTab('achievements'); }}
              className={cn("flex-1 py-2 rounded-lg items-center", selectedTab === 'achievements' ? "bg-white shadow-sm" : "")}
            >
              <Text className={cn("text-xs font-bold", selectedTab === 'achievements' ? "text-[#09090B]" : "text-gray-400")}>מדליות</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedTab('challenges'); }}
              className={cn("flex-1 py-2 rounded-lg items-center", selectedTab === 'challenges' ? "bg-white shadow-sm" : "")}
            >
              <Text className={cn("text-xs font-bold", selectedTab === 'challenges' ? "text-[#09090B]" : "text-gray-400")}>אתגרים</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedTab === 'achievements' ? (
          <>
            {renderHeroSection()}
            {renderAchievementsGrid()}
          </>
        ) : (
          renderChallengesList()
        )}
      </ScrollView>

      {/* Challenge Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderRadius: 32 }}
        handleIndicatorStyle={{ backgroundColor: '#E4E4E7' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 24 }}>
          {selectedChallenge && (
            <View className="items-center">
              <Image source={{ uri: selectedChallenge.icon }} style={{ width: 96, height: 96, marginBottom: 24 }} resizeMode="contain" />
              <Text className="text-2xl font-extrabold text-[#09090B] text-center mb-2">{getAchievementName(selectedChallenge)}</Text>
              <Text className="text-gray-500 text-center mb-8 px-4">
                האם אתה מוכן לקחת את האימונים שלך לשלב הבא? השלם את האתגר וזכה בתהילת עולם!
              </Text>

              <TouchableOpacity
                onPress={handleAcceptChallenge}
                disabled={hasActiveChallenge}
                className={cn(
                  "w-full py-4 rounded-2xl items-center justify-center shadow-lg shadow-pink-200",
                  hasActiveChallenge ? "bg-gray-300" : "bg-primary"
                )}
              >
                <Text className="text-white text-lg font-bold">
                  {hasActiveChallenge ? 'יש לך אתגר פעיל' : 'קבל אתגר'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
