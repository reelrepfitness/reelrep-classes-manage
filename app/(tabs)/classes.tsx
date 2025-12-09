import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Users, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResponsiveWaveBackground } from '@/components/ResponsiveWaveBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/contexts/ClassesContext';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const NOTCH_HEIGHT = isTablet ? Math.min(450, height * 0.35) : Math.min(400, height * 0.5);

function getNextThursdayNoon(): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  
  let daysUntilThursday = (4 - currentDay + 7) % 7;
  
  if (currentDay === 4 && currentHour >= 12) {
    daysUntilThursday = 7;
  } else if (currentDay === 4 && currentHour < 12) {
    daysUntilThursday = 0;
  }
  
  const nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(12, 0, 0, 0);
  
  return nextThursday;
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  
  const friday = new Date(sunday);
  friday.setDate(sunday.getDate() + 5);
  friday.setHours(23, 59, 59, 999);
  
  return { start: sunday, end: friday };
}

function isNextWeek(classDate: string): boolean {
  const now = new Date();
  
  const thisWeekRange = getWeekRange(now);
  const nextWeekStart = new Date(thisWeekRange.end);
  nextWeekStart.setDate(nextWeekStart.getDate() + 1);
  nextWeekStart.setHours(0, 0, 0, 0);
  
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 5);
  nextWeekEnd.setHours(23, 59, 59, 999);
  
  const classDateTime = new Date(classDate);
  
  return classDateTime >= nextWeekStart && classDateTime <= nextWeekEnd;
}

function isRegistrationOpen(): boolean {
  const now = new Date();
  const nextThursday = getNextThursdayNoon();
  return now >= nextThursday;
}

function formatCountdown(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days} ${hebrew.classes.countdownDays}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hebrew.classes.countdownHours}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${hebrew.classes.countdownMinutes}`);
  }
  
  if (parts.length === 1) {
    return parts[0];
  } else if (parts.length === 2) {
    return `${parts[0]} ${hebrew.classes.and}${parts[1]}`;
  } else {
    return `${parts[0]}, ${parts[1]} ${hebrew.classes.and}${parts[2]}`;
  }
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDayOfWeek(date: string): number {
  return new Date(date).getDay();
}

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { classes, bookClass, isClassBooked, getClassBookings } = useClasses();
  const [countdown, setCountdown] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<any[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextThursday = getNextThursdayNoon();
      const diff = nextThursday.getTime() - now.getTime();
      
      if (diff > 0) {
        setCountdown(formatCountdown(diff));
      } else {
        setCountdown('');
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleBookClass = async (classId: string) => {
    const classItem = classes.find(c => c.id === classId);
    setSelectedClass(classItem);
    bottomSheetRef.current?.expand();

    // Fetch enrolled users
    setLoadingEnrolled(true);
    try {
      const bookings = await getClassBookings(classId);
      setEnrolledUsers(bookings);
    } catch (error) {
      console.error('Error fetching enrolled users:', error);
      setEnrolledUsers([]);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedClass) return;

    try {
      await bookClass(selectedClass.id);

      // Refetch enrolled users after booking
      const bookings = await getClassBookings(selectedClass.id);
      setEnrolledUsers(bookings);

      bottomSheetRef.current?.close();
      setSelectedClass(null);
      Alert.alert(hebrew.common.success, 'נרשמת לשיעור בהצלחה!');
    } catch (error) {
      Alert.alert(hebrew.common.error, (error as Error).message);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return Colors.success;
      case 'intermediate': return Colors.accent;
      case 'advanced': return Colors.error;
      default: return Colors.primary;
    }
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return '#EF4444';
    if (percentage >= 70) return '#F97316';
    if (percentage >= 50) return '#F59E0B';
    return '#10B981';
  };

  const getCapacityPercentage = (enrolled: number, capacity: number) => {
    return Math.round((enrolled / capacity) * 100);
  };

  const groupedClasses = classes.reduce((groups, classItem) => {
    const dayOfWeek = getDayOfWeek(classItem.date);
    const isNextWeekClass = isNextWeek(classItem.date);
    
    if (isNextWeekClass) {
      if (!groups['nextWeek']) {
        groups['nextWeek'] = [];
      }
      groups['nextWeek'].push(classItem);
    } else {
      if (!groups[dayOfWeek]) {
        groups[dayOfWeek] = [];
      }
      groups[dayOfWeek].push(classItem);
    }
    return groups;
  }, {} as Record<string | number, typeof classes>);

  const generateCalendarDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const now = new Date();
    const currentHour = now.getHours();
    const days = [];

    const isThursdayAfterNoon = currentDay === 4 && currentHour >= 12;

    let endDate: Date;
    if (isThursdayAfterNoon) {
      endDate = new Date(today);
      endDate.setDate(today.getDate() + (7 + (5 - currentDay)));
    } else {
      endDate = new Date(today);
      const daysToFriday = (5 - currentDay + 7) % 7;
      endDate.setDate(today.getDate() + (daysToFriday === 0 ? 7 : daysToFriday));
    }

    console.log('[Calendar] Today:', today.toISOString());
    console.log('[Calendar] Current day:', currentDay, '- Current hour:', currentHour);
    console.log('[Calendar] Is Thursday after noon:', isThursdayAfterNoon);
    console.log('[Calendar] End date:', endDate.toISOString());

    // Only show upcoming days (today and future), excluding Saturdays
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();

      // Skip Saturdays
      if (dayOfWeek !== 6) {
        const isAvailable = date <= endDate;

        // Only add available days (not past days)
        if (isAvailable) {
          days.push({
            dayOfWeek,
            date: date.toISOString(),
            dayNumber: date.getDate(),
            isAvailable: true,
            isFirstBlocked: false,
          });
        }
      }
    }

    console.log('[Calendar] Generated', days.length, 'upcoming days');

    return days;
  };

  const calendarDays = generateCalendarDays();

  const availableDays = Object.keys(groupedClasses)
    .filter(key => key !== 'nextWeek')
    .map(Number)
    .sort((a, b) => a - b);

  const getUserClassForDay = (dayOfWeek: number) => {
    const dayClasses = groupedClasses[dayOfWeek] || [];
    return dayClasses.find((c) => isClassBooked(c.id));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getDay();

  useEffect(() => {
    if (selectedDay === null) {
      setSelectedDay(todayDayOfWeek);
    }
  }, []);

  const filteredClasses = selectedDay !== null
    ? (groupedClasses[selectedDay] || [])
        .filter(classItem => {
          // Check if class has already passed today
          const now = new Date();
          const classDate = new Date(classItem.date);
          const isToday = classDate.toDateString() === now.toDateString();

          if (isToday) {
            // Parse class time and check if it has passed
            const [hours, minutes] = classItem.time.split(':').map(Number);
            const classDateTime = new Date();
            classDateTime.setHours(hours, minutes, 0, 0);

            // Hide classes that have already started/passed
            return classDateTime.getTime() > now.getTime();
          }

          // Show all future day classes
          return true;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  return (
    <View style={styles.container}>
      <ResponsiveWaveBackground variant="classes" />

      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d', '#1a1a1a', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerNotch, { paddingTop: insets.top }]}
      >
        <View style={styles.headerNotchContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{hebrew.classes.allClasses}</Text>
            {(user?.subscription || isAdmin) && (
              <View style={styles.classesInfo}>
                <Text style={styles.classesText}>
                  {isAdmin && !user?.subscription
                    ? 'מנהל - גישה מלאה'
                    : `${user?.subscription?.classesUsed || 0}/${user?.subscription?.classesPerMonth || 0} ${hebrew.classes.classesUsed}`
                  }
                </Text>
              </View>
            )}
          </View>

          <View style={styles.calendarStripWrapper}>
            <View style={styles.calendarStrip}>
              {calendarDays.map((day, index) => {
                const bookedClass = getUserClassForDay(day.dayOfWeek);
                const isToday = day.dayOfWeek === todayDayOfWeek && new Date(day.date).toDateString() === today.toDateString();

                return (
                  <TouchableOpacity
                    key={`${day.dayOfWeek}-${index}`}
                    style={[
                      styles.calendarDayCard,
                      selectedDay === day.dayOfWeek && styles.calendarDayCardActive,
                      isToday && styles.calendarDayCardToday,
                    ]}
                    onPress={() => {
                      setSelectedDay(selectedDay === day.dayOfWeek ? null : day.dayOfWeek);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.calendarDayNumber,
                      selectedDay === day.dayOfWeek && styles.calendarDayNumberActive,
                    ]}>{day.dayNumber}</Text>
                    <Text style={[
                      styles.calendarDayName,
                      selectedDay === day.dayOfWeek && styles.calendarDayNameActive,
                    ]}>{DAYS_OF_WEEK[day.dayOfWeek]}</Text>
                    {bookedClass && (
                      <Text style={styles.bookedClassTime}>רשום ל{bookedClass.time}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedDay === null ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>בחר יום כדי לראות שיעורים זמינים</Text>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>אין שיעורים זמינים ביום זה</Text>
          </View>
        ) : filteredClasses.map((classItem, index) => {
          const booked = isClassBooked(classItem.id);
          const isFull = classItem.enrolled >= classItem.capacity;

          return (
            <ClassCard
              key={`${classItem.id}-${classItem.date}-${classItem.time}-${index}`}
              classItem={classItem}
              booked={booked}
              isFull={isFull}
              onBook={handleBookClass}
              getDifficultyColor={getDifficultyColor}
              getCapacityColor={getCapacityColor}
              getCapacityPercentage={getCapacityPercentage}
            />
          );
        })}
        
        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          {selectedClass && (
            <>
              <View style={styles.bottomSheetHeader}>
                <Image
                  source={{ uri: 'https://via.placeholder.com/400x200' }}
                  style={styles.classThumbnail}
                />
                <View style={styles.classDetailsSection}>
                  <Text style={styles.bottomSheetClassName}>{selectedClass.title}</Text>
                  <View style={styles.classDetailRow}>
                    <Text style={styles.classDetailText}>{selectedClass.time}</Text>
                    <Text style={styles.classDetailSeparator}>•</Text>
                    <Text style={styles.classDetailText}>{selectedClass.instructor}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.enrolledSection}>
                <View style={styles.enrolledHeader}>
                  <Users size={20} color={Colors.text} />
                  <Text style={styles.enrolledTitle}>
                    משתתפים ({enrolledUsers.length}/{selectedClass.capacity})
                  </Text>
                </View>

                {loadingEnrolled ? (
                  <Text style={styles.noEnrolledText}>טוען משתתפים...</Text>
                ) : enrolledUsers.length > 0 ? (
                  <View style={styles.enrolledUsersList}>
                    {enrolledUsers.map((booking: any) => {
                      const userData = booking.profiles;
                      const userAchievements = userData?.user_achievements || [];
                      const userName = userData?.full_name || userData?.name || 'משתמש';
                      const userInitial = userName.charAt(0).toUpperCase();

                      return (
                        <View key={booking.id} style={styles.enrolledUserCard}>
                          <View style={styles.userInfo}>
                            {userData?.avatar_url ? (
                              <Image
                                source={{ uri: userData.avatar_url }}
                                style={styles.userAvatar}
                              />
                            ) : (
                              <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>{userInitial}</Text>
                              </View>
                            )}
                            <Text style={styles.userName}>{userName}</Text>
                          </View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.achievementsRow}
                          >
                            {userAchievements.slice(0, 5).map((ach: any, index: number) => (
                              <View key={index} style={styles.achievementBadge}>
                                <Trophy size={12} color={Colors.primary} />
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noEnrolledText}>עדיין אין משתתפים בשיעור זה</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmBookButton,
                  isClassBooked(selectedClass.id) && styles.confirmBookButtonBooked,
                  (selectedClass.enrolled >= selectedClass.capacity && !isAdmin && !isClassBooked(selectedClass.id)) && styles.confirmBookButtonDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={isClassBooked(selectedClass.id) || (selectedClass.enrolled >= selectedClass.capacity && !isAdmin)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmBookButtonText}>
                  {isClassBooked(selectedClass.id)
                    ? 'כבר נרשמת לשיעור זה'
                    : (selectedClass.enrolled >= selectedClass.capacity && !isAdmin)
                    ? 'השיעור מלא'
                    : 'אשר הזמנה'
                  }
                </Text>
              </TouchableOpacity>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

interface ClassCardProps {
  classItem: any;
  booked: boolean;
  isFull: boolean;
  onBook: (id: string) => void;
  getDifficultyColor: (difficulty: string) => string;
  getCapacityColor: (percentage: number) => string;
  getCapacityPercentage: (enrolled: number, capacity: number) => number;
}

function ClassCard({
  classItem,
  booked,
  isFull,
  onBook,
  getDifficultyColor,
  getCapacityColor,
  getCapacityPercentage,
}: ClassCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.classCard,
        booked && styles.classCardBooked,
      ]}
      onPress={() => onBook(classItem.id)}
      activeOpacity={0.7}
    >
      <View style={styles.classCardInner}>
        <View style={styles.dateCard}>
          <Text style={styles.dateCardTime}>{classItem.time}</Text>
        </View>

        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <View style={styles.groupWorkoutBadge}>
              <Text style={styles.groupWorkoutBadgeText}>אימון קבוצה</Text>
            </View>
            <Text style={styles.className}>{classItem.title}</Text>
            <Text style={styles.instructor}>
              מאמן: {classItem.instructor}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.capacityText}>
          {classItem.enrolled}/{classItem.capacity}
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${getCapacityPercentage(classItem.enrolled, classItem.capacity)}%`,
                backgroundColor: getCapacityColor(getCapacityPercentage(classItem.enrolled, classItem.capacity))
              }
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
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
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative' as const,
    paddingBottom: 20,
  },
  headerNotchContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.background,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 8,
  },
  classesInfo: {
    flexDirection: 'column',
    textAlign: 'center',
  },
  classesText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: isTablet ? 40 : 20,
    maxWidth: isTablet ? 1200 : undefined,
    alignSelf: isTablet ? 'center' : undefined,
    width: isTablet ? '100%' : undefined,
  },
  classCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classCardLocked: {
    opacity: 0.7,
  },
  classCardBooked: {
    borderColor: Colors.success,
    borderWidth: 2,
  },
  lockedBanner: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  lockedBannerText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  classCardInner: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  classHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classHeaderWithBanner: {
    marginTop: 32,
  },
  classInfo: {
    flex: 1,
  },
  groupWorkoutBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  groupWorkoutBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    writingDirection: 'rtl' as const,
    textAlign: 'center',
  },
  className: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },
  textLocked: {
    color: Colors.textSecondary,
  },
  dateCard: {
    backgroundColor: '#dfdfdfff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    alignSelf: 'flex-start',
  },
  dateCardNumber: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.dark,
  },
  dateCardDay: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.dark,
    writingDirection: 'rtl' as const,
    marginTop: 2,
  },
  dateCardTime: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.dark,
    writingDirection: 'rtl' as const,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
    marginBottom: 16,
    lineHeight: 20,
  },
  countdownContainer: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  countdownTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
  classDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
  },
  bookButton: {
    backgroundColor: Colors.dark,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: Colors.border,
  },
  bookButtonBooked: {
    backgroundColor: Colors.success,
  },
  bookButtonWaitlist: {
    backgroundColor: Colors.accent,
  },
  waitlistButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitlistBadge: {
    backgroundColor: Colors.background + '40',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  waitlistBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  progressContainer: {
    marginTop: 12,
    gap: 8,
    position: 'relative' as const,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    position: 'absolute' as const,
    right: 0,
    top: -18,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
  bookButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  calendarStripWrapper: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calendarStrip: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  calendarDayCard: {
    flex: 1,
    minWidth: 50,
    maxWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor:"#f5f5f50a",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative' as const,
  },
  calendarDayCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDayCardDisabled: {
    opacity: 0.4,
  },
  calendarDayCardToday: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  calendarDayNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  calendarDayNumberActive: {
    color: Colors.background,
  },
  calendarDayNumberDisabled: {
    color: Colors.textSecondary,
  },
  calendarDayName: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
  },
  calendarDayNameActive: {
    color: Colors.background,
  },
  calendarDayNameDisabled: {
    color: Colors.textSecondary,
  },
  bookedClassTime: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#242424ff',
    writingDirection: 'rtl' as const,
    marginTop: 4,
    textAlign: 'center',
  },
  bigCountdownCard: {
    backgroundColor: Colors.accent + '20',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.accent + '40',
    marginRight: 8,
  },
  bigCountdownTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.accent,
    writingDirection: 'rtl' as const,
    textAlign: 'center',
  },
  bigCountdownText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.accent,
    writingDirection: 'rtl' as const,
    textAlign: 'center',
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
  },
  dayButtonTextActive: {
    color: Colors.background,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  dayDotActive: {
    backgroundColor: Colors.background,
  },
  daySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  daySectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
  },
  daySectionLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
  },
  nextWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginBottom: 16,
  },
  nextWeekTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.accent,
    writingDirection: 'rtl' as const,
  },
  nextWeekCountdown: {
    backgroundColor: Colors.accent + '15',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.accent + '30',
    alignItems: 'center',
  },
  nextWeekCountdownTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
    marginBottom: 12,
  },
  nextWeekCountdownText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.accent,
    writingDirection: 'rtl' as const,
  },
  nextWeekPreview: {
    backgroundColor: Colors.card + '80',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextWeekPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
    marginBottom: 12,
    textAlign: 'center',
  },
  nextWeekClassCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextWeekClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextWeekClassName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
    marginBottom: 4,
  },
  nextWeekClassDay: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
  },
  nextWeekClassTime: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    writingDirection: 'rtl' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
    textAlign: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: Colors.background,
  },
  bottomSheetIndicator: {
    backgroundColor: Colors.border,
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    padding: 20,
    paddingBottom: 40,
  },
  bottomSheetHeader: {
    marginBottom: 24,
  },
  classThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  classDetailsSection: {
    gap: 8,
  },
  bottomSheetClassName: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  classDetailText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    writingDirection: 'rtl' as const,
  },
  classDetailSeparator: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  enrolledSection: {
    marginBottom: 24,
  },
  enrolledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  enrolledTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
  },
  enrolledUsersList: {
    gap: 12,
  },
  enrolledUserCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    writingDirection: 'rtl' as const,
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  achievementBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  noEnrolledText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    paddingVertical: 32,
  },
  confirmBookButton: {
    backgroundColor: Colors.dark,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmBookButtonDisabled: {
    backgroundColor: Colors.border,
  },
  confirmBookButtonBooked: {
    backgroundColor: Colors.success,
  },
  confirmBookButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.background,
    writingDirection: 'rtl' as const,
  },
});
