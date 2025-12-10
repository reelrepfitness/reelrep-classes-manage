import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, Alert } from "react-native";
import type { StyleProp, ViewStyle } from 'react-native';
import { Award, TrendingUp, Target, ChevronRight, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResponsiveWaveBackground } from '@/components/ResponsiveWaveBackground';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Achievement } from '@/constants/types';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Svg, { Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const NOTCH_HEIGHT = isTablet ? Math.min(380, height * 0.3) : Math.min(320, height * 0.38);

const CATEGORY_CONFIG = [
  { key: 'פזמ', label: 'פז״מ' },
  { key: 'התמדה', label: 'התמדה' },
  { key: 'משמעת', label: 'משמעת' },
] as const;

const CATEGORY_LOOKUP = CATEGORY_CONFIG.reduce<Record<string, string>>((acc, category) => {
  acc[category.key] = category.label;
  return acc;
}, {});

const normalizeCategory = (value?: string | null) =>
  value ? value.replace(/["״]/g, '').trim() : '';

const getAchievementName = (achievement: Achievement) =>
  achievement.name_hebrew || achievement.name;

const getAchievementDescription = (achievement: Achievement) =>
  achievement.description_hebrew || achievement.description || '';

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('he-IL').format(value);
};

const PLATE_ICON_URI = 'https://res.cloudinary.com/diwe4xzro/image/upload/v1762853881/%D7%98%D7%A7%D7%A1%D7%98_%D7%94%D7%A4%D7%A1%D7%A7%D7%94_%D7%A9%D7%9C%D7%9A.png_i0ydun.png';

const ICON_RING_SIZE = 112;
const ICON_RING_STROKE = 6;

const ProgressRing = ({
  progress,
  iconUri,
  isCompleted,
  isLocked,
  size = ICON_RING_SIZE,
  strokeWidth = ICON_RING_STROKE,
  style,
}: {
  progress: number;
  iconUri: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - clampedProgress * circumference;
  const progressColor = isCompleted
    ? Colors.success
    : isLocked
      ? Colors.border
      : Colors.primary;
  const innerSize = Math.max(size - strokeWidth * 4, 0);
  const iconSize = Math.max(innerSize - 24, 32);

  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle
          stroke="rgba(255, 255, 255, 0.15)"
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
        <View
          style={[
            styles.progressRingInner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          <Image
            source={{ uri: iconUri }}
            style={[
              styles.progressRingIcon,
              {
                width: iconSize,
                height: iconSize,
              },
            ]}
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
  const snapPoints = useMemo(() => [
    Math.min(height * (isTablet ? 0.5 : 0.75), isTablet ? 600 : 560),
  ], [isTablet]);

  useEffect(() => {
    if (params.tab === 'challenges') {
      setSelectedTab('challenges');
    }
  }, [params.tab]);

  const categorizedAchievements = useMemo<Record<string, Achievement[]>>(() => {
    if (!achievements?.length) return {};

    const grouped = achievements.reduce((acc, achievement) => {
      const normalizedKey = normalizeCategory(achievement.catagory);
      if (!normalizedKey || !CATEGORY_LOOKUP[normalizedKey]) {
        return acc;
      }
      if (!acc[normalizedKey]) {
        acc[normalizedKey] = [];
      }
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

  const renderAchievementCard = (userAchievement: any, completed = false) => {
    const isChallenge = userAchievement.isChallenge;
    const requirement = userAchievement.achievement.task_requirement || 1;
    const showRing = userAchievement.achievement.task_type === 'classes_attended';
    const ringProgress = showRing ? Math.min(userAchievement.progress / requirement, 1) : 0;
    const progressPercent = Math.min((userAchievement.progress / requirement) * 100, 100);
    
    return (
      <View 
        key={userAchievement.id} 
        style={[
          styles.achievementCard,
          isChallenge && styles.challengeCard,
          completed && styles.completedCard,
        ]}
      >
        <Text style={[
          styles.achievementCategory,
          isChallenge && styles.challengeText,
          completed && styles.completedText,
        ]} numberOfLines={1}>
          {userAchievement.achievement.catagory || 'הישג'}
        </Text>
        <View style={styles.achievementIconContainer}>
          {showRing ? (
            <ProgressRing
              progress={ringProgress}
              iconUri={userAchievement.achievement.icon}
              isCompleted={completed}
              size={88}
              strokeWidth={6}
              style={styles.cardRingSpacing}
            />
          ) : (
            <Image 
              source={{ uri: userAchievement.achievement.icon }} 
              style={styles.achievementIcon}
            />
          )}
        </View>
        <Text style={[
          styles.achievementTitle,
          isChallenge && styles.challengeText,
          completed && styles.completedText,
        ]} numberOfLines={2}>
          {getAchievementName(userAchievement.achievement)}
        </Text>
        <Text style={[
          styles.achievementSubtitle,
          completed && styles.completedSubtitleText,
        ]} numberOfLines={3}>
          {getAchievementDescription(userAchievement.achievement)}
        </Text>
        {!completed && (
          <View style={styles.achievementProgress}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { 
                width: `${progressPercent}%`,
                backgroundColor: isChallenge ? '#ffffff' : Colors.primary,
              }]} />
            </View>
            <Text style={[
              styles.achievementProgressText,
              isChallenge && styles.challengeProgressText,
            ]}>
              {userAchievement.progress}/{userAchievement.achievement.task_requirement}
            </Text>
          </View>
        )}
        {completed && userAchievement.dateEarned && (
          <Text style={styles.completedDate}>
            הושג ב-{new Date(userAchievement.dateEarned).toLocaleDateString('he-IL')}
          </Text>
        )}
      </View>
    );
  };

  const renderAvailableAchievement = (achievement: Achievement) => {
    const isChallenge = achievement.task_type === 'challenge';
    const progress = calculateProgress(achievement);
    const requirement = achievement.task_requirement || 1;
    const progressPercent = Math.min((progress / requirement) * 100, 100);
    const showRing = achievement.task_type === 'classes_attended';
    const ringProgress = showRing ? Math.min(progress / requirement, 1) : 0;
    
    return (
      <View key={achievement.id} style={styles.availableCard}>
        <View style={styles.availableCardContent}>
          <View style={styles.availableIconContainer}>
            {showRing ? (
              <ProgressRing
                progress={ringProgress}
                iconUri={achievement.icon}
                size={88}
                strokeWidth={6}
                isCompleted={ringProgress >= 1}
                style={styles.cardRingSpacing}
              />
            ) : (
              <Image 
                source={{ uri: achievement.icon }} 
                style={styles.availableIcon}
              />
            )}
          </View>
          <View style={styles.availableInfo}>
            <Text style={styles.availableCategory} numberOfLines={1}>
              {achievement.catagory || 'הישג'}
            </Text>
            <Text style={styles.availableTitle} numberOfLines={2}>
              {getAchievementName(achievement)}
            </Text>
            <Text style={styles.availableSubtitle} numberOfLines={3}>
              {getAchievementDescription(achievement)}
            </Text>
            {!isChallenge && (
              <View style={styles.availableProgressContainer}>
                <View style={styles.availableProgressBar}>
                  <View style={[styles.availableProgressFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.availableProgressText}>
                  {progress}/{achievement.task_requirement}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.availableActions}>
            <View style={styles.pointsBadge}>
              <Image 
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q4z20c8mkfmyhfvuuiyfn' }} 
                style={styles.pointsCurrencyIcon}
              />
              <Text style={styles.pointsText}>{achievement.points}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderChallengeGrid = () => {
    if (challengeAchievements.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Target size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>אין אתגרים זמינים</Text>
          <Text style={styles.emptySubtitle}>אתגרים חדשים יתווספו בקרוב!</Text>
        </View>
      );
    }

    const orderedChallenges = activeChallenge
      ? [
          activeChallenge.achievement,
          ...challengeAchievements.filter(ch => ch.id !== activeChallenge.achievement.id),
        ]
      : challengeAchievements;

    return (
      <View style={styles.challengesGrid}>
        {orderedChallenges.map((challenge) => {
          const isActive = activeChallenge?.achievement.id === challenge.id;
          return (
          <TouchableOpacity
            key={challenge.id}
            style={[
              styles.challengeGridCard,
              isActive && styles.challengeGridCardActive,
            ]}
            onPress={() => handleChallengePress(challenge)}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.pointsBadge}>
                <Image
                  source={{ uri: PLATE_ICON_URI }}
                  style={styles.pointsCurrencyIcon}
                />
                <Text style={styles.pointsText}>{formatNumber(Number(challenge.points))}</Text>
              </View>
            </View>

            <Image
              source={{ uri: challenge.icon }}
              style={styles.challengeGridIcon}
            />

            <Text style={[styles.challengeGridName, isActive && styles.challengeGridNameActive]} numberOfLines={2}>
              {getAchievementName(challenge)}
            </Text>
            <Text style={[styles.challengeGridDescription, isActive && styles.challengeGridDescriptionActive]} numberOfLines={3}>
              {getAchievementDescription(challenge)}
            </Text>
            {isActive ? (
              <View style={styles.challengeActiveBadge}>
                <Text style={styles.challengeActiveBadgeText}>אני על זה!</Text>
              </View>
            ) : (
              <View style={styles.challengeCTA}>
                <Text style={styles.challengeCTAText}>צפה בפרטים</Text>
              </View>
            )}
          </TouchableOpacity>
        )})}
      </View>
    );
  };

  const renderContent = () => {
    if (selectedTab === 'challenges') {
      return renderChallengeGrid();
    }

    const hasAchievementsToShow = CATEGORY_CONFIG.some(
      ({ key }) => categorizedAchievements[key]?.length
    );

    if (!hasAchievementsToShow) {
      return (
        <View style={styles.emptyState}>
          <Award size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>עדיין אין הישגים</Text>
          <Text style={styles.emptySubtitle}>התחל להתאמן והישגים יבואו!</Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setSelectedTab('challenges')}
          >
            <Text style={styles.emptyActionButtonText}>עבור לאתגרים</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.achievementsContainer}>
        {CATEGORY_CONFIG.map(({ key, label }) => {
          const categoryAchievements = categorizedAchievements[key];
          if (!categoryAchievements?.length) return null;

          return (
            <View key={key} style={styles.categoryCardWrapper}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{label}</Text>
                <Text style={styles.categoryCount}>{categoryAchievements.length}</Text>
              </View>
              <View style={styles.categoryCard}>
                <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                    {categoryAchievements.map((achievement: Achievement, index: number) => {
                      const normalizedPoints = typeof achievement.points === 'number'
                        ? achievement.points
                        : Number(achievement.points) || 0;
                      const requirement = Number(achievement.task_requirement) || 0;
                      const isAttendanceAchievement = key === 'פזמ' && achievement.task_type === 'classes_attended';
                      const progressValue = isAttendanceAchievement ? calculateProgress(achievement) : 0;
                      const normalizedProgress = requirement > 0
                        ? Math.min(progressValue / requirement, 1)
                        : 0;
                      const previousRequirement = index > 0
                        ? Number(categoryAchievements[index - 1].task_requirement) || 0
                        : 0;
                      const hasUnlockedPrevious = !isAttendanceAchievement || progressValue >= previousRequirement;
                      const isCompleted = isAttendanceAchievement ? progressValue >= requirement : false;
                      const isCurrent = isAttendanceAchievement ? !isCompleted && hasUnlockedPrevious : false;
                      const isLocked = isAttendanceAchievement ? !isCompleted && !isCurrent : false;
                      const unlockRequirement = previousRequirement;
                      const ringProgress = isCompleted ? 1 : isLocked ? 0 : normalizedProgress;

                      return (
                        <View
                          key={achievement.id}
                          style={[
                            styles.achievementCardHorizontal,
                            isAttendanceAchievement && isLocked && styles.lockedAchievementCard,
                            isAttendanceAchievement && isCompleted && styles.completedAchievementCard,
                          ]}
                        >
                          <View style={styles.cardTopRow}>
                            <View style={styles.pointsBadge}>
                              <Image
                                source={{ uri: PLATE_ICON_URI }}
                                style={styles.pointsCurrencyIcon}
                              />
                              <Text style={styles.pointsText}>{formatNumber(normalizedPoints)}</Text>
                            </View>
                          </View>
                          
                          {isAttendanceAchievement ? (
                            <ProgressRing
                              progress={ringProgress}
                              iconUri={achievement.icon}
                              isCompleted={isCompleted}
                              isLocked={isLocked}
                              style={styles.categoryRingSpacing}
                            />
                          ) : (
                            <Image 
                              source={{ uri: achievement.icon }} 
                              style={styles.achievementLargeIcon}
                            />
                          )}

                          <Text style={styles.categoryCardTitle} numberOfLines={2}>
                            {getAchievementName(achievement)}
                          </Text>

                          {(!isAttendanceAchievement || !isLocked) && (
                            <Text style={styles.categoryCardDescription} numberOfLines={3}>
                              {getAchievementDescription(achievement)}
                            </Text>
                          )}

                          {isAttendanceAchievement && (
                            <View style={styles.attendanceProgress}>
                              {isCompleted ? (
                                <View style={styles.completedBadge}>
                                  <Text style={styles.completedBadgeText}>הושלם</Text>
                                </View>
                              ) : (
                                <>
                                  <Text style={styles.attendanceProgressLabel}>
                                    {`${formatNumber(progressValue)}/${formatNumber(requirement)} אימונים`}
                                  </Text>
                                  <View style={styles.attendanceProgressBar}>
                                    <View
                                      style={[
                                        styles.attendanceProgressFill,
                                        { width: `${ringProgress * 100}%` },
                                      ]}
                                    />
                                  </View>
                                </>
                              )}
                            </View>
                          )}

                          {isAttendanceAchievement && isLocked && (
                            <View style={styles.lockedOverlay}>
                              <View style={styles.lockedIconWrapper}>
                                <Lock size={28} color={Colors.background} />
                              </View>
                              <Text style={styles.lockedOverlayText}>
                                {`השלם ${formatNumber(unlockRequirement || requirement)} אימונים בשביל לפתוח`}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            );
        })}
      </View>
    );
  };

  const totalPoints = completedAchievements.reduce((sum: number, ua: any) => sum + ua.achievement.points, 0);
  const totalAchievements = activeAchievements.length + completedAchievements.length + availableAchievements.length;

  return (
    <View style={styles.container}>
      <ResponsiveWaveBackground variant="profile" />

      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerNotch, { paddingTop: insets.top }]}
      >
        <View style={styles.headerNotchContent}>
          <View style={styles.headerTopBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronRight size={24} color={Colors.background} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>הישגים</Text>
            <View style={styles.backButtonSpacer} />
          </View>

          <View style={styles.divider} />

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Award size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{completedAchievements.length}</Text>
              <Text style={styles.statLabel}>הושגו</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <TrendingUp size={24} color={Colors.accent} />
              <Text style={styles.statValue}>{activeAchievements.length}</Text>
              <Text style={styles.statLabel}>בתהליך</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q4z20c8mkfmyhfvuuiyfn' }}
                style={styles.currencyIcon}
              />
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statLabel}>פלטות</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
              onPress={() => setSelectedTab('achievements')}
            >
              <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
                הישגים
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'challenges' && styles.activeTab]}
              onPress={() => setSelectedTab('challenges')}
            >
              <Text style={[styles.tabText, selectedTab === 'challenges' && styles.activeTabText]}>
                אתגרים
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.challengeSheetScroll}>
          {selectedChallenge && (
            <View style={styles.challengeSheetContent}>
              <View style={styles.challengeSheetIconWrapper}>
                <Image
                  source={{ uri: selectedChallenge.icon }}
                  style={styles.challengeSheetIcon}
                />
              </View>
              <Text style={styles.challengeSheetTitle}>
                {getAchievementName(selectedChallenge)}
              </Text>
              <View style={styles.challengeSheetPointsRow}>
                <View style={styles.challengeSheetPointsBadge}>
                  <Image
                    source={{ uri: PLATE_ICON_URI }}
                    style={styles.pointsCurrencyIcon}
                  />
                  <Text style={styles.challengeSheetPointsText}>
                    {formatNumber(Number(selectedChallenge.points))} פלטות
                  </Text>
                </View>
              </View>
              <Text style={styles.challengeSheetDescription}>
                {getAchievementDescription(selectedChallenge)}
              </Text>

              <View style={styles.challengeSheetStats}>
                <View style={styles.challengeSheetStatCard}>
                  <Text style={styles.challengeSheetStatLabel}>יעד</Text>
                  <Text style={styles.challengeSheetStatValue}>
                    {formatNumber(Number(selectedChallenge.task_requirement))}
                  </Text>
                </View>
                <View style={styles.challengeSheetStatCard}>
                  <Text style={styles.challengeSheetStatLabel}>סוג</Text>
                  <Text style={styles.challengeSheetStatValue}>
                    {selectedChallenge.catagory || 'אתגר'}
                  </Text>
                </View>
              </View>

              <View style={styles.challengeSheetSellingBox}>
                <Text style={styles.challengeSheetSellingTitle}>למה להצטרף עכשיו?</Text>
                <Text style={styles.challengeSheetSellingBullet}>
                  • תן לעצמך דדליין ותראה את היכולות שלך פורצות קדימה.
                </Text>
                <Text style={styles.challengeSheetSellingBullet}>
                  • פלטות בונוס שמזניקות אותך לחנות ההטבות.
                </Text>
                <Text style={styles.challengeSheetSellingBullet}>
                  • תמיכת המאמן והקהילה בכל הדרך.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.challengeSheetButton,
                  hasActiveChallenge && styles.challengeSheetButtonDisabled,
                ]}
                onPress={handleAcceptChallenge}
                disabled={hasActiveChallenge}
              >
                <Text style={styles.challengeSheetButtonText}>
                  {hasActiveChallenge ? 'יש לך כבר אתגר פעיל' : 'יאללה, אני בפנים'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light,
  },
  headerNotch: {
    width: '100%',
    minHeight: NOTCH_HEIGHT,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative' as const,
    paddingBottom: 12,
  },
  headerNotchContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  backButtonSpacer: {
    width: 40,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.background,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  currencyIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  activeTabText: {
    color: Colors.background,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#404040',
  },
  challengeCard: {
    backgroundColor: '#171717',
  },
  completedCard: {
    borderWidth: 2,
    borderColor: Colors.success + '40',
  },
  achievementCategory: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  challengeText: {
    color: '#ffffff',
  },
  completedText: {
    color: Colors.success,
  },
  achievementIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    marginBottom: 8,
  },
  iconGlow: {
    position: 'absolute' as const,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  completedBadge: {
    position: 'absolute' as const,
    bottom: -4,
    right: width * 0.18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 0,
    writingDirection: 'rtl' as const,
    minHeight: 28,
    flexWrap: 'wrap' as const,
    flex: 1,
  },
  achievementSubtitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 2,
    writingDirection: 'rtl' as const,
    lineHeight: 15,
    flexWrap: 'wrap' as const,
    flex: 1,
  },
  completedSubtitleText: {
    color: Colors.success + '80',
  },
  achievementProgress: {
    width: '100%',
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  achievementProgressText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  challengeProgressText: {
    color: '#ffffff80',
  },
  completedDate: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 8,
    writingDirection: 'rtl' as const,
  },
  availableList: {
    gap: 12,
  },
  availableCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#404040',
  },
  availableCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  availableIconContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  availableInfo: {
    flex: 1,
  },
  availableCategory: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  availableTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
    marginBottom: 2,
  },
  availableSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
    marginBottom: 8,
    lineHeight: 18,
  },
  availableProgressContainer: {
    width: '100%',
  },
  availableProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  availableProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  availableProgressText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  availableActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  pointsBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFD700',
  },
  pointsCurrencyIcon: {
    width: 20,
    height: 20,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  challengesGrid: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  challengeGridCard: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eaeaea',
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  challengeGridCardActive: {
    backgroundColor: '#050505',
    borderColor: Colors.success,
  },
  challengeGridIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginVertical: 8,
  },
  challengeGridName: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  challengeGridNameActive: {
    color: Colors.background,
  },
  challengeGridDescription: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  challengeGridDescriptionActive: {
    color: Colors.light,
  },
  challengeCTA: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary + '15',
  },
  challengeCTAActive: {
    backgroundColor: Colors.success + '33',
  },
  challengeActiveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.success,
  },
  challengeActiveBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  challengeCTAText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
    writingDirection: 'rtl' as const,
  },
  challengeCTATextActive: {
    color: Colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  emptyActionButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  emptyActionButtonText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  achievementsContainer: {
    flex: 1,
    gap: 28,
  },
  categoryCardWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  achievementCardHorizontal: {
    width: 200,
    minHeight: 320,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
    paddingTop: 12,
  },
  lockedAchievementCard: {
    opacity: 0.8,
  },
  completedAchievementCard: {
    borderColor: Colors.success + '70',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementLargeIcon: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
  },
  categoryCardTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  categoryCardDescription: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 8,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  lockedIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedOverlayText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.background,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  completedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.success,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  progressRingIcon: {
    resizeMode: 'contain',
  },
  categoryRingSpacing: {
    marginVertical: 12,
  },
  cardRingSpacing: {
    marginVertical: 8,
  },
  attendanceProgress: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  attendanceProgressLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
  },
  attendanceProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  attendanceProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  challengeSheetScroll: {
    padding: 24,
  },
  challengeSheetContent: {
    alignItems: 'center',
    gap: 16,
  },
  challengeSheetIconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  challengeSheetIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  challengeSheetTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  challengeSheetPointsRow: {
    width: '100%',
    alignItems: 'center',
  },
  challengeSheetPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  challengeSheetPointsText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FFD700',
  },
  challengeSheetDescription: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    lineHeight: 20,
  },
  challengeSheetStats: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  challengeSheetStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  challengeSheetStatLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  challengeSheetStatValue: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 4,
  },
  challengeSheetSellingBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  challengeSheetSellingTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
    writingDirection: 'rtl' as const,
  },
  challengeSheetSellingBullet: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
    writingDirection: 'rtl' as const,
  },
  challengeSheetButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    marginTop: 8,
  },
  challengeSheetButtonDisabled: {
    backgroundColor: Colors.border,
  },
  challengeSheetButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
});
