import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Users, Trophy, Lock, Check, X, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ResponsiveWaveBackground } from '@/components/ResponsiveWaveBackground';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/contexts/ClassesContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { supabase } from '@/constants/supabase';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const NOTCH_HEIGHT = isTablet ? Math.min(300, height * 0.25) : Math.min(270, height * 0.35);

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

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const formatDateKey = (date: Date) => date.toLocaleDateString('en-CA');
const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const NEXT_WEEK_LOCK_MESSAGE = 'ההרשמה לשבוע הבא נפתחת כל חמישי ב-12:00';

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, updateUser } = useAuth();
  const { classes, bookClass, isClassBooked, getClassBookings, cancelBooking, getClassBooking } = useClasses();
  const { updateProgress } = useAchievements();
  const [countdown, setCountdown] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<any[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  const lateCancellations = user?.lateCancellations || 0;
  const blockEndDate = user?.blockEndDate || null;

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

  const canCancelClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);
    return hoursUntilClass >= 6;
  };

  const canSwitchClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);
    return hoursUntilClass >= 1;
  };

  const handleCancelClass = (classItem: any) => {
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
      { text: 'סגור', style: 'cancel' }
    ]);
  };

  const handleMarkAttendance = async (booking: any, status: 'attended' | 'no_show') => {
    try {
      const userId = booking.user_id;

      if (status === 'attended') {
        // Mark as attended (came to class)
        const { error } = await supabase
          .from('class_bookings')
          .update({
            status: 'completed',
            attended_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (error) throw error;

        // Update achievements progress for classes_attended
        await updateProgress(userId, 'classes_attended', 1);

        // Refresh enrolled users list
        if (selectedClass) {
          const bookings = await getClassBookings(selectedClass.id);
          setEnrolledUsers(bookings);
        }

        Alert.alert('עודכן', 'המשתתף סומן כנוכח');
      } else if (status === 'no_show') {
        // Mark as no-show (didn't come to class)
        const { error } = await supabase
          .from('class_bookings')
          .update({
            status: 'no_show',
            attended_at: null,
          })
          .eq('id', booking.id);

        if (error) throw error;

        // Refresh enrolled users list
        if (selectedClass) {
          const bookings = await getClassBookings(selectedClass.id);
          setEnrolledUsers(bookings);
        }

        Alert.alert('עודכן', 'המשתתף סומן כלא הגיע');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
    }
  };

  const groupedClasses = classes.reduce((groups, classItem) => {
    const classDateKey = classItem.date;
    if (!groups[classDateKey]) {
      groups[classDateKey] = [];
    }
    groups[classDateKey].push(classItem);
    return groups;
  }, {} as Record<string, typeof classes>);

  const generateCalendarDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];

    const { start: currentWeekStart } = getWeekRange(today);
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    nextWeekStart.setHours(0, 0, 0, 0);

    for (let offset = 0; days.length < 7; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 6) continue;
      const isFutureWeek = date >= nextWeekStart;
      const isLocked = isFutureWeek && !isRegistrationOpen();
      days.push({
        dayOfWeek,
        date: date.toISOString(),
        dateKey: formatDateKey(date),
        dayNumber: date.getDate(),
        isLocked,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const getUserClassForDay = (dateISO: string) => {
    const targetDate = formatDateKey(new Date(dateISO));
    const dayClasses = groupedClasses[targetDate] || [];
    return dayClasses.find((c) => c.date === targetDate && isClassBooked(c));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);

  useEffect(() => {
    if (selectedDate === null) {
      setSelectedDate(formatDateKey(today));
    }
  }, []);

  const filteredClasses = selectedDate !== null
    ? (groupedClasses[selectedDate] || [])
        .filter(classItem => {
          // Check if class has already passed today
          const now = new Date();
          const classDate = parseDateKey(classItem.date);
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
          </View>

          <View style={styles.calendarStripWrapper}>
            <View style={styles.calendarStrip}>
              {calendarDays.map((day, index) => {
                const dayKey = day.dateKey;
                const bookedClass = getUserClassForDay(day.date);
                const isToday = dayKey === today.toISOString().split('T')[0];
                const isSelected = selectedDate === dayKey;

                return (
                  <TouchableOpacity
                    key={`${day.dayOfWeek}-${index}`}
                    style={[
                      styles.calendarDayCard,
                      isSelected && styles.calendarDayCardActive,
                      isToday && styles.calendarDayCardToday,
                      day.isLocked && styles.calendarDayCardLocked,
                    ]}
                    onPress={() => {
                      if (day.isLocked) {
                        Alert.alert('מוקדם מדי', NEXT_WEEK_LOCK_MESSAGE);
                        return;
                      }
                      setSelectedDate(isSelected ? null : dayKey);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.calendarDayDotBase,
                        bookedClass ? styles.calendarDayBookedDot : styles.calendarDayAvailableDot,
                      ]}
                    />
                    <Text style={[
                      styles.calendarDayNumber,
                      isSelected && styles.calendarDayNumberActive,
                      day.isLocked && styles.calendarDayNumberLocked,
                    ]}>{day.dayNumber}</Text>
                    <Text style={[
                      styles.calendarDayName,
                      isSelected && styles.calendarDayNameActive,
                      day.isLocked && styles.calendarDayNameLocked,
                    ]}>{DAYS_OF_WEEK[day.dayOfWeek]}</Text>
                    {day.isLocked && (
                      <View style={styles.calendarDayLockOverlay}>
                        <Lock size={16} color={Colors.background} />
                      </View>
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
        {selectedDate === null ? (
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
          const booked = isClassBooked(classItem);
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
              onCancel={handleCancelClass}
              onSwitch={handleSwitchClass}
              canCancel={canCancelClass}
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
                      const isAttended = booking.attended_at !== null;
                      const isNoShow = booking.status === 'no_show';

                      return (
                        <View key={booking.id} style={[
                          styles.enrolledUserCard,
                          isAttended && styles.enrolledUserCardAttended,
                          isNoShow && styles.enrolledUserCardCancelled,
                        ]}>
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
                            <View style={styles.userNameContainer}>
                              <Text style={styles.userName}>{userName}</Text>
                              {isAttended && (
                                <View style={styles.attendanceStatusBadge}>
                                  <Check size={10} color={Colors.success} />
                                  <Text style={styles.attendanceStatusText}>נוכח</Text>
                                </View>
                              )}
                              {isNoShow && (
                                <View style={[styles.attendanceStatusBadge, styles.attendanceStatusBadgeCancelled]}>
                                  <X size={10} color={Colors.error} />
                                  <Text style={[styles.attendanceStatusText, styles.attendanceStatusTextCancelled]}>לא הגיע</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={styles.userCardRight}>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              style={{ maxWidth: 150 }}
                              contentContainerStyle={styles.achievementsRow}
                            >
                              {userAchievements.slice(0, 5).map((ach: any, index: number) => (
                                <View key={index} style={styles.achievementBadge}>
                                  <Trophy size={12} color={Colors.primary} />
                                </View>
                              ))}
                            </ScrollView>

                            {isAdmin && (
                              <View style={styles.adminActionsRow}>
                                <TouchableOpacity
                                  style={[styles.adminActionButton, styles.adminActionButtonAttended, isAttended && styles.adminActionButtonActive]}
                                  onPress={() => handleMarkAttendance(booking, 'attended')}
                                >
                                  <Check size={16} color={isAttended ? Colors.background : Colors.success} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.adminActionButton, styles.adminActionButtonNoShow, isNoShow && styles.adminActionButtonActive]}
                                  onPress={() => handleMarkAttendance(booking, 'no_show')}
                                >
                                  <X size={16} color={isNoShow ? Colors.background : Colors.error} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
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
                  isClassBooked(selectedClass) && styles.confirmBookButtonBooked,
                  (selectedClass.enrolled >= selectedClass.capacity && !isAdmin && !isClassBooked(selectedClass)) && styles.confirmBookButtonDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={isClassBooked(selectedClass) || (selectedClass.enrolled >= selectedClass.capacity && !isAdmin)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmBookButtonText}>
                  {isClassBooked(selectedClass)
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
  onCancel: (classItem: any) => void;
  onSwitch: (classItem: any) => void;
  canCancel: (classItem: any) => boolean;
}

function ClassCard({
  classItem,
  booked,
  isFull,
  onBook,
  getDifficultyColor,
  getCapacityColor,
  getCapacityPercentage,
  onCancel,
  onSwitch,
  canCancel,
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

      {booked && (
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={(e) => {
              e.stopPropagation();
              onSwitch(classItem);
            }}
          >
            <Text style={styles.switchButtonText}>החלפה</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cancelButton,
              !canCancel(classItem) && styles.cancelButtonLate,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onCancel(classItem);
            }}
          >
            <Text style={styles.cancelButtonText}>
              {canCancel(classItem) ? 'ביטול' : 'ביטול מאוחר'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 13,
  },
  headerNotchContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
    backgroundColor: Colors.card,
    borderWidth: 6,
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
    paddingBottom: 10,
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
    borderRadius: 30,
    backgroundColor:"transparent",
    borderWidth: 1,
    borderColor: "transparent",
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
    backgroundColor: Colors.dark,
    borderColor: "transparent",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDayCardLocked: {
    opacity: 0.55,
  },
  calendarDayCardToday: {
    borderColor: "transparent",
    borderWidth: 2,
  },
  calendarDayNumber: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.light,
    marginBottom: 2,
  },
  calendarDayNumberActive: {
    color: Colors.light,
  },
  calendarDayNumberLocked: {
    color: Colors.textSecondary,
  },
  calendarDayName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light,
    writingDirection: 'rtl' as const,
  },
  calendarDayNameActive: {
    color: Colors.light,
  },
  calendarDayNameLocked: {
    color: Colors.textSecondary,
  },
  calendarDayDotBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  calendarDayBookedDot: {
    backgroundColor: Colors.success,
  },
  calendarDayAvailableDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  calendarDayLockOverlay: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
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
  actionButtonsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  switchButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cancelButtonLate: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  enrolledUserCardAttended: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  enrolledUserCardCancelled: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  userNameContainer: {
    flex: 1,
    gap: 4,
  },
  attendanceStatusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  attendanceStatusBadgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  attendanceStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.success,
    writingDirection: 'rtl' as const,
  },
  attendanceStatusTextCancelled: {
    color: Colors.error,
  },
  userCardRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flexShrink: 0,
  },
  adminActionsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginLeft: 12,
  },
  adminActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
  },
  adminActionButtonAttended: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  adminActionButtonNoShow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  adminActionButtonActive: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
});
