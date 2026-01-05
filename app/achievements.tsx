import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Image, Alert } from "react-native";
import { Award, TrendingUp, Target, ChevronRight, Lock, ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { Achievement } from '@/constants/types';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Svg, { Circle } from 'react-native-svg';
import { cn } from '@/lib/utils';

// --- Constants & Helpers (Kept Intact) ---

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const CATEGORY_CONFIG = [
  { key: 'פזמ', label: 'פז״מ' },
  { key: 'התמדה', label: 'התמדה' },
  { key: 'משמעת', label: 'משמעת' },
] as const;

const CATEGORY_LOOKUP = CATEGORY_CONFIG.reduce<Record<string, string>>((acc, category) => {
  acc[category.key] = category.label;
  return acc;
}, {});

const normalizeCategory = (value?: string | null) => value ? value.replace(/["״]/g, '').trim() : '';
const getAchievementName = (achievement: Achievement) => achievement.name_hebrew || achievement.name;
const getAchievementDescription = (achievement: Achievement) => achievement.description_hebrew || achievement.description || '';
const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('he-IL').format(value);
};

const PLATE_ICON_URI = 'https://res.cloudinary.com/diwe4xzro/image/upload/v1762853881/%D7%98%D7%A7%D7%A1%D7%98_%D7%94%D7%A4%D7%A1%D7%A7%D7%94_%D7%A9%D7%9C%D7%9A.png_i0ydun.png';

const ICON_RING_SIZE = 112;
const ICON_RING_STROKE = 6;

// --- Components ---

const ProgressRing = ({
  progress,
  iconUri,
  isCompleted,
  isLocked,
  size = ICON_RING_SIZE,
  strokeWidth = ICON_RING_STROKE,
}: any) => {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedProgress * circumference;

  // Colors adapted for Light Mode
  const progressColor = isCompleted ? Colors.success : isLocked ? '#E4E4E7' : Colors.primary;
  const trackColor = '#F4F4F5'; // Light Gray for the empty part

  const innerSize = Math.max(size - strokeWidth * 4, 0);
  const iconSize = Math.max(innerSize - 24, 32);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          stroke={trackColor}
          fill="none"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <Circle
          stroke={progressColor}
          fill="none"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {innerSize > 0 && (
        <View className="absolute bg-background items-center justify-center shadow-sm" style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2 }}>
          <Image
            source={{ uri: iconUri }}
            style={{ width: iconSize, height: iconSize, resizeMode: 'contain', opacity: isLocked ? 0.5 : 1 }}
          />
        </View>
      )}
    </View>
  );
};

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    achievements,
    activeAchievements,
    completedAchievements,
    availableAchievements,
    challengeAchievements,
    activeChallenge,
    hasActiveChallenge,
    acceptChallenge,
    calculateProgress,
  } = useAchievements();

  const [selectedTab, setSelectedTab] = useState<'achievements' | 'challenges'>('achievements');
  const [selectedChallenge, setSelectedChallenge] = useState<Achievement | null>(null);
  const params = useLocalSearchParams<{ tab?: string }>();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  useEffect(() => {
    if (params.tab === 'challenges') {
      setSelectedTab('challenges');
    }
  }, [params.tab]);

  const categorizedAchievements = useMemo<Record<string, Achievement[]>>(() => {
    if (!achievements?.length) return {};
    const grouped = achievements.reduce((acc, achievement) => {
      const normalizedKey = normalizeCategory(achievement.catagory);
      if (!normalizedKey || !CATEGORY_LOOKUP[normalizedKey]) return acc;
      if (!acc[normalizedKey]) acc[normalizedKey] = [];
      acc[normalizedKey].push(achievement);
      return acc;
    }, {} as Record<string, Achievement[]>);

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.task_requirement - b.task_requirement);
    });
    return grouped;
  }, [achievements]);

  const handleChallengePress = (challenge: Achievement) => {
    setSelectedChallenge(challenge);
    bottomSheetRef.current?.expand();
  };

  const handleAcceptChallenge = () => {
    if (!selectedChallenge) return;
    acceptChallenge(selectedChallenge.id);
    bottomSheetRef.current?.close();
    Alert.alert('אתגר התקבל', `התחלת את האתגר: ${getAchievementName(selectedChallenge)}`);
    setSelectedChallenge(null);
  };

  // --- Render Functions ---

  const renderChallengeGrid = () => {
    if (challengeAchievements.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <Target size={64} color="#D4D4D8" />
          <Text className="text-xl font-bold text-[#09090B] mt-4">אין אתגרים זמינים</Text>
          <Text className="text-gray-500 mt-2">אתגרים חדשים יתווספו בקרוב!</Text>
        </View>
      );
    }

    const orderedChallenges = activeChallenge
      ? [activeChallenge.achievement, ...challengeAchievements.filter(ch => ch.id !== activeChallenge.achievement.id)]
      : challengeAchievements;

    return (
      <View className="px-4 pt-4 pb-2">
        {orderedChallenges.map((challenge) => {
          const isActive = activeChallenge?.achievement.id === challenge.id;
          return (
            <TouchableOpacity
              key={challenge.id}
              onPress={() => handleChallengePress(challenge)}
              className={cn(
                "w-full mb-4 bg-surface rounded-3xl p-5 items-center justify-center border shadow-sm active:scale-[0.98] transition-all",
                isActive ? "border-primary bg-primary/5" : "border-gray-200"
              )}
            >
              <View className="absolute top-4 left-4 bg-black px-3 py-1.5 rounded-full flex-row items-center gap-2 border border-yellow-500/30">
                <Image source={{ uri: PLATE_ICON_URI }} className="w-4 h-4" />
                <Text className="text-[#FFD700] text-xs font-bold">{formatNumber(Number(challenge.points))}</Text>
              </View>

              <Image source={{ uri: challenge.icon }} className="w-24 h-24 rounded-full my-3" />

              <Text className="text-lg font-bold text-[#09090B] text-center mb-1">
                {getAchievementName(challenge)}
              </Text>
              <Text className="text-gray-500 text-xs text-center px-4 mb-4 line-clamp-2">
                {getAchievementDescription(challenge)}
              </Text>

              {isActive ? (
                <View className="bg-primary px-4 py-2 rounded-full shadow-sm shadow-pink-200">
                  <Text className="text-white text-xs font-bold">אני על זה!</Text>
                </View>
              ) : (
                <View className="bg-white border border-gray-200 px-4 py-2 rounded-full">
                  <Text className="text-primary text-xs font-bold">צפה בפרטים</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderContent = () => {
    if (selectedTab === 'challenges') return renderChallengeGrid();

    const hasAchievementsToShow = CATEGORY_CONFIG.some(({ key }) => categorizedAchievements[key]?.length);

    if (!hasAchievementsToShow) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <Award size={64} color="#D4D4D8" />
          <Text className="text-xl font-bold text-[#09090B] mt-4">עדיין אין הישגים</Text>
          <Text className="text-gray-500 mt-2 text-center px-8">התחל להתאמן וההישגים יגיעו מעצמם!</Text>
          <TouchableOpacity onPress={() => setSelectedTab('challenges')} className="mt-6 bg-primary px-6 py-3 rounded-2xl">
            <Text className="text-white font-bold">עבור לאתגרים</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="gap-8 px-5">
        {CATEGORY_CONFIG.map(({ key, label }) => {
          const categoryAchievements = categorizedAchievements[key];
          if (!categoryAchievements?.length) return null;

          return (
            <View key={key}>
              <View className="flex-row-reverse justify-between items-center mb-4 px-1">
                <Text className="text-xl font-bold text-[#09090B]">{label}</Text>
                <Text className="text-gray-400 font-bold">{categoryAchievements.length}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {categoryAchievements.map((achievement: Achievement, index: number) => {
                  const normalizedPoints = Number(achievement.points) || 0;
                  const requirement = Number(achievement.task_requirement) || 0;
                  const isAttendanceAchievement = key === 'פזמ' && achievement.task_type === 'classes_attended';
                  const progressValue = isAttendanceAchievement ? calculateProgress(achievement) : 0;
                  const normalizedProgress = requirement > 0 ? Math.min(progressValue / requirement, 1) : 0;

                  // Logic for Lock State
                  const previousRequirement = index > 0 ? Number(categoryAchievements[index - 1].task_requirement) || 0 : 0;
                  const hasUnlockedPrevious = !isAttendanceAchievement || progressValue >= previousRequirement;
                  const isCompleted = isAttendanceAchievement ? progressValue >= requirement : false;
                  const isCurrent = isAttendanceAchievement ? !isCompleted && hasUnlockedPrevious : false;
                  const isLocked = isAttendanceAchievement ? !isCompleted && !isCurrent : false;

                  const ringProgress = isCompleted ? 1 : isLocked ? 0 : normalizedProgress;

                  return (
                    <View
                      key={achievement.id}
                      className={cn(
                        "w-[200px] bg-surface rounded-3xl p-4 items-center border shadow-sm relative",
                        isLocked ? "border-gray-100 opacity-80 bg-gray-50" : "border-gray-200",
                        isCompleted && "border-green-500/20 bg-green-50/50"
                      )}
                    >
                      {/* Points Badge */}
                      <View className="absolute top-3 left-3 bg-black px-2 py-1 rounded-full flex-row items-center gap-1 z-10 border border-yellow-500/30">
                        <Image source={{ uri: PLATE_ICON_URI }} className="w-3 h-3" />
                        <Text className="text-[#FFD700] text-[10px] font-bold">{formatNumber(normalizedPoints)}</Text>
                      </View>

                      {isAttendanceAchievement ? (
                        <View className="my-4">
                          <ProgressRing
                            progress={ringProgress}
                            iconUri={achievement.icon}
                            isCompleted={isCompleted}
                            isLocked={isLocked}
                            size={90}
                            strokeWidth={5}
                          />
                        </View>
                      ) : (
                        <Image source={{ uri: achievement.icon }} className="w-24 h-24 rounded-full my-4" resizeMode="contain" />
                      )}

                      <Text className="text-sm font-bold text-[#09090B] text-center mb-1 h-10" numberOfLines={2}>
                        {getAchievementName(achievement)}
                      </Text>

                      {(!isAttendanceAchievement || !isLocked) && (
                        <Text className="text-xs text-gray-500 text-center line-clamp-2 h-8">
                          {getAchievementDescription(achievement)}
                        </Text>
                      )}

                      {/* Locked State Overlay Logic */}
                      {isAttendanceAchievement && isLocked && (
                        <View className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-3xl items-center justify-center z-20">
                          <View className="bg-gray-100 p-3 rounded-full mb-2">
                            <Lock size={20} color="#71717A" />
                          </View>
                          <Text className="text-xs font-bold text-gray-500 text-center px-4">
                            {`עוד ${formatNumber(requirement - progressValue)} אימונים`}
                          </Text>
                        </View>
                      )}

                      {/* Progress Bar (Only for Unlocked) */}
                      {isAttendanceAchievement && !isLocked && !isCompleted && (
                        <View className="w-full mt-3">
                          <Text className="text-[10px] text-gray-400 text-center mb-1">
                            {formatNumber(progressValue)} / {formatNumber(requirement)}
                          </Text>
                          <View className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <View className="h-full bg-primary rounded-full" style={{ width: `${ringProgress * 100}%` }} />
                          </View>
                        </View>
                      )}

                      {isCompleted && (
                        <View className="mt-3 bg-green-100 px-3 py-1 rounded-full">
                          <Text className="text-green-700 text-[10px] font-bold">הושלם</Text>
                        </View>
                      )}

                    </View>
                  );
                })}
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };

  const totalPoints = completedAchievements.reduce((sum: number, ua: any) => sum + ua.achievement.points, 0);

  return (
    <View className="flex-1 bg-background">
      {/* Header Area */}
      <View style={{ paddingTop: insets.top }} className="bg-background pb-4 border-b border-gray-100">
        <View className="px-5 pt-2 mb-6 flex-row-reverse justify-between items-center">
          <Text className="text-3xl font-extrabold text-[#09090B]">הישגים</Text>
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-surface rounded-full">
            <ChevronRight size={24} color="#09090B" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View className="flex-row-reverse justify-between px-8 mb-6">
          <View className="items-center">
            <Text className="text-2xl font-extrabold text-[#09090B]">{completedAchievements.length}</Text>
            <Text className="text-xs font-bold text-gray-400">הושגו</Text>
          </View>
          <View className="w-[1px] h-10 bg-gray-100" />
          <View className="items-center">
            <Text className="text-2xl font-extrabold text-primary">{activeAchievements.length}</Text>
            <Text className="text-xs font-bold text-gray-400">בתהליך</Text>
          </View>
          <View className="w-[1px] h-10 bg-gray-100" />
          <View className="items-center">
            <View className="flex-row items-center gap-1">
              <Image source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q4z20c8mkfmyhfvuuiyfn' }} className="w-5 h-5" resizeMode="contain" />
              <Text className="text-2xl font-extrabold text-[#09090B]">{totalPoints}</Text>
            </View>
            <Text className="text-xs font-bold text-gray-400">פלטות</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mx-5 bg-surface p-1 rounded-2xl flex-row-reverse">
          <TouchableOpacity
            onPress={() => setSelectedTab('achievements')}
            className={cn(
              "flex-1 py-2.5 rounded-xl items-center justify-center transition-all",
              selectedTab === 'achievements' ? "bg-white shadow-sm" : "bg-transparent"
            )}
          >
            <Text className={cn("text-sm font-bold", selectedTab === 'achievements' ? "text-[#09090B]" : "text-gray-400")}>הישגים</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedTab('challenges')}
            className={cn(
              "flex-1 py-2.5 rounded-xl items-center justify-center transition-all",
              selectedTab === 'challenges' ? "bg-white shadow-sm" : "bg-transparent"
            )}
          >
            <Text className={cn("text-sm font-bold", selectedTab === 'challenges' ? "text-[#09090B]" : "text-gray-400")}>אתגרים</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>

      {/* Challenge Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: '#E4E4E7' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          {selectedChallenge && (
            <View className="items-center gap-4">
              <View className="w-28 h-28 rounded-full bg-surface items-center justify-center border border-gray-100 shadow-sm">
                <Image source={{ uri: selectedChallenge.icon }} className="w-20 h-20 rounded-full" resizeMode="contain" />
              </View>

              <Text className="text-2xl font-extrabold text-[#09090B] text-center">{getAchievementName(selectedChallenge)}</Text>

              <View className="bg-black px-4 py-2 rounded-full flex-row items-center gap-2 border border-yellow-500/30">
                <Image source={{ uri: PLATE_ICON_URI }} className="w-5 h-5" />
                <Text className="text-[#FFD700] font-bold text-lg">{formatNumber(Number(selectedChallenge.points))} פלטות</Text>
              </View>

              <Text className="text-gray-500 text-center px-4 leading-6">{getAchievementDescription(selectedChallenge)}</Text>

              {/* Stats Grid in Sheet */}
              <View className="flex-row gap-3 w-full mt-4">
                <View className="flex-1 bg-surface p-4 rounded-2xl items-center border border-gray-100">
                  <Text className="text-gray-400 text-xs font-bold mb-1">יעד</Text>
                  <Text className="text-xl font-extrabold text-[#09090B]">{formatNumber(Number(selectedChallenge.task_requirement))}</Text>
                </View>
                <View className="flex-1 bg-surface p-4 rounded-2xl items-center border border-gray-100">
                  <Text className="text-gray-400 text-xs font-bold mb-1">קטגוריה</Text>
                  <Text className="text-xl font-extrabold text-[#09090B]">{selectedChallenge.catagory || 'כללי'}</Text>
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                onPress={handleAcceptChallenge}
                disabled={hasActiveChallenge}
                className={cn(
                  "w-full py-4 rounded-2xl items-center justify-center mt-6 shadow-sm shadow-pink-200",
                  hasActiveChallenge ? "bg-gray-200" : "bg-primary"
                )}
              >
                <Text className={cn("text-lg font-bold", hasActiveChallenge ? "text-gray-400" : "text-white")}>
                  {hasActiveChallenge ? 'יש לך כבר אתגר פעיל' : 'יאללה, אני בפנים 🚀'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}