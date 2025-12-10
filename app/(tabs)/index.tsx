import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Image, Animated, Alert } from "react-native";
import { TrendingUp, Clock, Users, Bell, Plus, Award, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WorkoutIcon from '@/components/WorkoutIcon';
import FireIcon from '@/components/FireIcon';
import { ResponsiveWaveBackground } from '@/components/ResponsiveWaveBackground';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { useClasses } from '@/contexts/ClassesContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { useEffect, useRef, useState } from 'react';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const NOTCH_HEIGHT = isTablet ? Math.min(350, height * 0.3) : Math.min(340, height * 0.42);

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, updateUser } = useAuth();
  const { getWeekStats } = useWorkouts();
  const { getUpcomingClasses, getMyClasses, cancelBooking, getClassBooking, classes } = useClasses();
  const { activeAchievements, completedAchievements, activeChallenge, challengeAchievements, hasActiveChallenge, acceptChallenge, calculateProgress } = useAchievements();
  
  const lateCancellations = user?.lateCancellations || 0;
  const blockEndDate = user?.blockEndDate || null;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [countdown, setCountdown] = useState('');

  // Get user updates/notifications
  const userUpdates = user?.updates || [];
  const hasUpdates = userUpdates.length > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const weekStats = getWeekStats();
  const weeklyGoal = 4;

  // Filter for today's available classes only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  const upcomingClasses = getUpcomingClasses()
    .filter(classItem => {
      // Only today's classes
      if (classItem.date !== todayString) return false;

      // Only classes with available spots
      return classItem.enrolled < classItem.capacity;
    })
    .slice(0, 3); // Show up to 3 classes

  const myBookedClasses = getMyClasses()
    .filter(classItem => {
      try {
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const now = new Date();
        return classDateTime > now;
      } catch (error) {
        console.error('Error filtering future classes:', error);
        return false;
      }
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const dateB = new Date(`${b.date}T${b.time}`).getTime();
      return dateA - dateB;
    });

  // Countdown timer for next session
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

        if (days > 0) {
          setCountdown(`${days} ימים ${hours} שעות`);
        } else if (hours > 0) {
          setCountdown(`${hours} שעות ${minutes} דקות`);
        } else {
          setCountdown(`${minutes} דקות`);
        }
      } catch (error) {
        console.error('Error calculating countdown:', error);
        setCountdown('');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, [myBookedClasses]);

  const canCancelClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);
    return hoursUntilClass >= 6;
  };

  const handleCancelClass = (classItem: any) => {
    const booking = getClassBooking(classItem.id);
    if (!booking) return;

    if (blockEndDate && new Date(blockEndDate) > new Date()) {
      Alert.alert('חשבון חסום', 'לא ניתן לבטל שיעורים כרגע. החשבון שלך חסום עד ' + new Date(blockEndDate).toLocaleDateString('he-IL'));
      return;
    }

    if (!isAdmin && !canCancelClass(classItem)) {
      Alert.alert(
        'ביטול מאוחר',
        'לא ניתן לבטל שיעור פחות מ-6 שעות לפני תחילתו. ביטול יגרור חיוב. ביטולים מאוחרים: ' + lateCancellations + '/3',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'אשר ביטול + חיוב',
            style: 'destructive',
            onPress: () => {
              cancelBooking(booking.id);
              const newLateCancellations = lateCancellations + 1;
              
              if (newLateCancellations >= 3) {
                const blockEnd = new Date();
                blockEnd.setDate(blockEnd.getDate() + 3);
                updateUser({
                  lateCancellations: newLateCancellations,
                  blockEndDate: blockEnd.toISOString()
                });
                Alert.alert('חשבון חסום', 'ביטלת 3 שיעורים באיחור. החשבון שלך חסום ל-3 ימים. חשבונך יחויב.');
              } else {
                updateUser({ lateCancellations: newLateCancellations });
                Alert.alert('בוטל', `השיעור בוטל. חשבונך יחויב בגין ביטול מאוחר. ביטולים מאוחרים: ${newLateCancellations}/3`);
              }
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'ביטול שיעור',
      `האם אתה בטוח שברצונך לבטל את ${classItem.title}?`,
      [
        { text: 'לא', style: 'cancel' },
        {
          text: 'כן, בטל',
          style: 'destructive',
          onPress: () => {
            cancelBooking(booking.id);
            Alert.alert('בוטל', 'השיעור בוטל בהצלחה.');
          }
        }
      ]
    );
  };

  const canSwitchClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);
    return hoursUntilClass >= 1;
  };

  // Get relative date text (היום, מחר, or day name)
  const getRelativeDateText = (dateString: string) => {
    const classDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    classDate.setHours(0, 0, 0, 0);

    if (classDate.getTime() === today.getTime()) {
      return 'היום';
    } else if (classDate.getTime() === tomorrow.getTime()) {
      return 'מחר';
    } else {
      // Return day name in Hebrew
      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      return dayNames[classDate.getDay()];
    }
  };

  const handleSwitchClass = (classItem: any) => {
    if (blockEndDate && new Date(blockEndDate) > new Date()) {
      Alert.alert('חשבון חסום', 'לא ניתן להחליף שיעורים כרגע. החשבון שלך חסום עד ' + new Date(blockEndDate).toLocaleDateString('he-IL'));
      return;
    }

    if (!canSwitchClass(classItem)) {
      Alert.alert('זמן החלפה עבר', 'לא ניתן להחליף שיעור פחות משעה לפני תחילתו.');
      return;
    }

    const availableClasses = classes.filter(c => 
      c.id !== classItem.id && 
      c.date === classItem.date && 
      c.enrolled < c.capacity &&
      (user?.subscription?.type ? c.requiredSubscription.includes(user.subscription.type) : false)
    );

    if (availableClasses.length === 0) {
      Alert.alert('אין שיעורים זמינים', 'אין שיעורים זמינים להחלפה באותו יום.');
      return;
    }

    const message = 'שיעורים זמינים להחלפה:\n' + 
      availableClasses.map(c => `• ${c.time} - ${c.title}`).join('\n');

    Alert.alert('החלף שיעור', message, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'עבור לשיעורים', onPress: () => router.push('/classes' as any) }
    ]);
  };

  const getSubscriptionProgress = (subscription: any) => {
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
    return progress;
  };

  const getProgressColor = (subscription: any) => {
    const progress = getSubscriptionProgress(subscription);
    if (progress < 50) return Colors.success;
    if (progress < 80) return Colors.accent;
    return Colors.primary;
  };

  return (
    <View style={styles.container}>
      <ResponsiveWaveBackground variant="home" />

      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerNotch, { paddingTop: insets.top }]}
      >
        <View style={styles.headerNotchContent}>
          <View style={styles.messageContent}>
              {/* Row 1: Greeting and Plates */}
              <View style={styles.greetingRow}>
                <View style={styles.greetingTextContainer}>
                  <Text style={styles.greetingTitle}>היי</Text>
                  <Text style={styles.greetingName}>{user?.name?.split(' ')[0] || user?.name} 💪</Text>
                </View>
                <View style={styles.platesBalanceGreeting}>
                  <Image
                    source={{ uri: 'https://res.cloudinary.com/diwe4xzro/image/upload/v1762853884/%D7%98%D7%A7%D7%A1%D7%98_%D7%94%D7%A4%D7%A1%D7%A7%D7%94_%D7%A9%D7%9C%D7%9A_2.png_zpdglt.png' }}
                    style={styles.plateIconGreeting}
                  />
                  <Text style={styles.plateBalanceGreetingText}>{user?.plateBalance || 0}</Text>
                </View>
              </View>

              {/* Row 2: Upcoming Session */}
              {myBookedClasses.length > 0 ? (
                <View style={styles.upcomingSessionSection}>
                  <View style={styles.sessionTitleRow}>
                    <Text style={styles.upcomingSessionTitle}>השיעור הבא שלך</Text>
                    <View style={styles.sessionBadgesRow}>
                      <TouchableOpacity
                        style={styles.sessionBadge}
                        onPress={() => handleSwitchClass(myBookedClasses[0])}
                      >
                        <Text style={styles.sessionBadgeText}>החלפה</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.sessionBadge,
                          !canCancelClass(myBookedClasses[0]) && styles.sessionBadgeLateCancellation,
                        ]}
                        onPress={() => {
                          const classItem = myBookedClasses[0];
                          const booking = getClassBooking(classItem.id);
                          if (!booking) return;

                          const isLateCancellation = !canCancelClass(classItem);

                          if (blockEndDate && new Date(blockEndDate) > new Date()) {
                            Alert.alert('חשבון חסום', 'לא ניתן לבטל שיעורים כרגע. החשבון שלך חסום עד ' + new Date(blockEndDate).toLocaleDateString('he-IL'));
                            return;
                          }

                          if (isLateCancellation) {
                            // Late cancellation
                            if (user?.ticket) {
                              // User has ticket
                              Alert.alert(
                                'ביטול מאוחר',
                                'בטוח שמבטלים? עבר זמן מועד הביטול האימון הזה ינוקב בכל זאת.',
                                [
                                  { text: 'ביטול', style: 'cancel' },
                                  {
                                    text: 'אשר ביטול',
                                    style: 'destructive',
                                    onPress: () => {
                                      cancelBooking(booking.id);
                                      Alert.alert('בוטל', 'השיעור בוטל. האימון נוקב מהכרטיסייה שלך.');
                                    }
                                  }
                                ]
                              );
                            } else {
                              // User has subscription - use existing late cancellation logic
                              Alert.alert(
                                'ביטול מאוחר',
                                'לא ניתן לבטל שיעור פחות מ-6 שעות לפני תחילתו. ביטול יגרור חיוב. ביטולים מאוחרים: ' + lateCancellations + '/3',
                                [
                                  { text: 'ביטול', style: 'cancel' },
                                  {
                                    text: 'אשר ביטול + חיוב',
                                    style: 'destructive',
                                    onPress: () => {
                                      cancelBooking(booking.id);
                                      const newLateCancellations = lateCancellations + 1;

                                      if (newLateCancellations >= 3) {
                                        const blockEnd = new Date();
                                        blockEnd.setDate(blockEnd.getDate() + 3);
                                        updateUser({
                                          lateCancellations: newLateCancellations,
                                          blockEndDate: blockEnd.toISOString()
                                        });
                                        Alert.alert('חשבון חסום', 'ביטלת 3 שיעורים באיחור. החשבון שלך חסום ל-3 ימים. חשבונך יחויב.');
                                      } else {
                                        updateUser({ lateCancellations: newLateCancellations });
                                        Alert.alert('בוטל', `השיעור בוטל. חשבונך יחויב בגין ביטול מאוחר. ביטולים מאוחרים: ${newLateCancellations}/3`);
                                      }
                                    }
                                  }
                                ]
                              );
                            }
                          } else {
                            // Normal cancellation
                            Alert.alert(
                              'ביטול שיעור',
                              'מבטלים בוודאות?',
                              [
                                { text: 'לא', style: 'cancel' },
                                {
                                  text: 'כן, בטל',
                                  style: 'destructive',
                                  onPress: () => {
                                    cancelBooking(booking.id);
                                    Alert.alert('בוטל', 'השיעור בוטל בהצלחה.');
                                  }
                                }
                              ]
                            );
                          }
                        }}
                      >
                        <Text style={styles.sessionBadgeText}>
                          {canCancelClass(myBookedClasses[0]) ? 'ביטול' : 'ביטול מאוחר'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Clock size={18} color="#ff6b35" />
                    <Text style={styles.sessionTitle}>{myBookedClasses[0].title}</Text>
                  </View>
                  <View style={styles.sessionDetailsRow}>
                    <View style={styles.sessionDateTime}>
                      <Clock size={16} color={Colors.textSecondary} />
                      <Text style={styles.sessionDateText}>
                        {getRelativeDateText(myBookedClasses[0].date)} • {myBookedClasses[0].time}
                        {countdown && ` • ${countdown}`}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.upcomingSessionSection}
                  onPress={() => router.push('/classes' as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.emptySessionContent}>
                    <View style={styles.emptySessionIconContainer}>
                      <Plus size={36} color={Colors.background} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.emptySessionTitle}>הזמן שיעור</Text>
                    <Text style={styles.emptySessionSubtitle}>לחץ כאן להזמנת שיעור חדש</Text>
                  </View>
                </TouchableOpacity>
              )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Cards Container */}
        <View style={styles.actionCardsContainer}>
          {/* Action Cards Row */}
          <View style={styles.actionCardsRow}>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardBlack]}
              onPress={() => router.push('/classes' as any)}
            >
              <Plus size={40} color={Colors.background} strokeWidth={3} />
              <Text style={[styles.actionCardLabel, styles.actionCardLabelWhite]}>הזמן שיעור</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/workout-log' as any)}
            >
              <Image
                source={{ uri: 'https://res.cloudinary.com/dtffqhujt/image/upload/v1760962804/kettlebell_j2m67x.png' }}
                style={styles.actionCardIcon}
              />
              <Text style={styles.actionCardLabel}>יומן ביצועים</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Achievements & Challenge Row */}
        <View style={styles.achievementsRow}>
            {/* Active Challenge Card */}
            <TouchableOpacity
              style={styles.challengeCardSmall}
              onPress={() => router.push({ pathname: '/achievements', params: { tab: 'challenges' } })}
            >
              {activeChallenge ? (
                <>
                  <Text style={styles.challengeCardHeader}>אתגר פעיל</Text>
                  <Image
                    source={{ uri: activeChallenge.achievement.icon }}
                    style={styles.challengeIcon}
                  />
                  <Text
                    style={styles.challengeName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {activeChallenge.achievement.name_hebrew || activeChallenge.achievement.name}
                  </Text>
                </>
              ) : (
                <>
                  <Target size={32} color={Colors.textSecondary} />
                  <Text style={styles.emptyChallengeText}>אין אתגר פעיל</Text>
                  <Text style={styles.emptyChallengeSubtext}>בחר אתגר</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Achievements Card (70%) */}
            <View style={styles.achievementsCardLarge}>
              {activeAchievements.length > 0 || completedAchievements.length > 0 ? (
                <>
                  <Text style={styles.achievementsTitle}>ההישגים שלי</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.achievementsScroll}
                  >
                    {[...completedAchievements.slice(0, 3), ...activeAchievements.slice(0, 2)].map((ach, index) => (
                      <View key={index} style={styles.miniAchievementCard}>
                        <Image
                          source={{ uri: ach.achievement.icon }}
                          style={styles.miniAchievementIcon}
                        />
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/achievements' as any)}
                  >
                    <Text style={styles.viewAllButtonText}>רשימת ההישגים המלאה</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.emptyAchievementsContainer}
                  onPress={() => router.push('/achievements' as any)}
                >
                  <Award size={32} color={Colors.textSecondary} />
                  <Text style={styles.emptyAchievementsText}>עדיין אין הישגים</Text>
                  <Text style={styles.emptyAchievementsButton}>עבור למסך ההישגים</Text>
                </TouchableOpacity>
              )}
            </View>
        </View>

        {upcomingClasses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={20} color={Colors.accent} />
              <Text style={styles.sectionTitle}>אימונים פנויים להיום:</Text>
            </View>
            {upcomingClasses.map((classItem: any) => (
              <TouchableOpacity
                key={classItem.id}
                style={styles.upcomingClassCard}
                onPress={() => router.push('/classes' as any)}
              >
                <View style={styles.classInfo}>
                  <Text style={styles.classTitle}>{classItem.title}</Text>
                  <View style={styles.classDetails}>
                    <Clock size={14} color={Colors.textSecondary} />
                    <Text style={styles.classTime}>{classItem.time}</Text>
                    <Text style={styles.classDivider}>•</Text>
                    <Users size={14} color={Colors.textSecondary} />
                    <Text style={styles.classEnrolled}>{classItem.enrolled}/{classItem.capacity}</Text>
                  </View>
                  <View style={styles.classCapacityBar}>
                    <View style={styles.capacityProgressBg}>
                      <View
                        style={[
                          styles.capacityProgressFill,
                          {
                            width: `${(classItem.enrolled / classItem.capacity) * 100}%`,
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 40 : 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: isTablet ? 1200 : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    width: isTablet ? '100%' : undefined,
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
    position: 'relative',
  },
  headerNotchContent: {
    flex: 1,
    paddingBottom: 16,
  },
  arrowContainer: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  greetingScrollContent: {
    alignItems: 'center',
  },
  messageContent: {
    width: width,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 16,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.background,
  },
  platesBalanceGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plateIconGreeting: {
    width: 40,
    height: 40,
  },
  plateBalanceGreetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.background,
  },
  upcomingSessionSection: {
    marginTop: 12,
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 1)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,

    shadowColor: '#000000ff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  emptySessionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    minHeight: 90,
  },
  emptySessionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(198, 70, 126, 0.69)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#ff6b35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptySessionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: 0.5,
  },
  emptySessionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.2,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  upcomingSessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sessionBadgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sessionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionBadgeLateCancellation: {
    backgroundColor: 'rgba(255, 107, 53, 0.4)',
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sessionDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bookClassButtonGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  bookClassButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9d4edd',
  },
  streakBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b35',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.background,
    flex: 1,
    letterSpacing: 0.3,
  },
  countdownContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.background,
  },
  bookNowText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 6,
  },
  subscriptionNameTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 16,
  },
  subscriptionProgressSection: {
    gap: 8,
  },
  subscriptionProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  subscriptionProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subscriptionDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 6,
  },
  subscriptionType: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  subscriptionClasses: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  updateIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(218, 68, 119, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateTextContainer: {
    flex: 1,
  },
  updateText: {
    fontSize: 14,
    color: Colors.background,
    fontWeight: '500',
    lineHeight: 18,
  },
  updateDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  adminBadgeContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(218, 68, 119, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  plateBalanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  plateIconSmall: {
    width: 20,
    height: 20,
  },
  plateBalanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.cardBackground,
    position: 'relative',
  },
  profileImageInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  subscriptionProgressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  classCard: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  upcomingClassCard: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  classInfo: {
    flex: 1,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classTime: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  classDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  classDivider: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  classEnrolled: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  classActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.errorLight,
  },
  challengeCard: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  challengeProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  challengeProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  logWorkoutButton: {
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  logWorkoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
  classCapacityBar: {
    marginTop: 10,
  },
  capacityProgressBg: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  bookClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    gap: 12,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookClassButtonTextMain: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingVertical: isTablet ? 36 : 28,
    paddingHorizontal: isTablet ? 24 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: isTablet ? 300 : undefined,
  },
  actionCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  actionCardIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  actionCardBlack: {
    backgroundColor: "#3a3a3a",
    borderColor: Colors.dark,
  },
  actionCardLabelWhite: {
    color: Colors.background,
  },
  actionCardsContainer: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbdadaff",
    padding: 16,
    marginBottom: 20,
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  challengeCardSmall: {
    flex: 0.32,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 190,
  },
  challengeCardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  challengeIcon: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyChallengeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyChallengeSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.primary,
    textAlign: 'center',
  },
  achievementsCardLarge: {
    flex: 0.7,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'right',
  },
  achievementsScroll: {
    marginBottom: 12,
  },
  miniAchievementCard: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  miniAchievementIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  viewAllButton: {
    backgroundColor: Colors.dark,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
  emptyAchievementsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyAchievementsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyAchievementsButton: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
});
