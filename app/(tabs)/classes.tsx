import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Dimensions, Modal, PanResponder, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { Calendar as CalendarIcon, Users, Trophy, Lock, Check, X, Clock, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses } from '@/contexts/ClassesContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { supabase } from '@/constants/supabase';
import { cn } from '@/lib/utils';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarCircles } from '@/components/ui/AvatarCircles';
import { ClassRegistrationCard } from '@/components/ui/ClassRegistrationCard';
import { CalendarSyncBar } from '@/components/ui/CalendarSyncBar';
import { CalendarSelectionModal } from '@/components/ui/CalendarSelectionModal';

// --- Logic & Helpers (KEPT 100% INTACT) ---

const { width } = Dimensions.get('window');

function getNextThursdayNoon(): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  let daysUntilThursday = (4 - currentDay + 7) % 7;
  if (currentDay === 4 && currentHour >= 12) daysUntilThursday = 7;
  else if (currentDay === 4 && currentHour < 12) daysUntilThursday = 0;
  const nextThursday = new Date(now);
  nextThursday.setDate(now.getDate() + daysUntilThursday);
  nextThursday.setHours(12, 0, 0, 0);
  return nextThursday;
}

function getNextWednesdayNoon(): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  let daysUntilWednesday = (3 - currentDay + 7) % 7;
  if (currentDay === 3 && currentHour >= 12) daysUntilWednesday = 7;
  else if (currentDay === 3 && currentHour < 12) daysUntilWednesday = 0;
  const nextWednesday = new Date(now);
  nextWednesday.setDate(now.getDate() + daysUntilWednesday);
  nextWednesday.setHours(12, 0, 0, 0);
  return nextWednesday;
}

function getUnlockTime(subscriptionType?: string): Date {
  // reel.ONE and reel.ELITE are 'unlimited' type - get early Wednesday unlock
  const isPremiumUser = subscriptionType === 'unlimited';
  return isPremiumUser ? getNextWednesdayNoon() : getNextThursdayNoon();
}

function isNextWeekUnlocked(subscriptionType?: string): boolean {
  const now = new Date();
  const unlockTime = getUnlockTime(subscriptionType);
  return now >= unlockTime;
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
  if (days > 0) parts.push(`${days} ${hebrew.classes.countdownDays}`);
  if (hours > 0) parts.push(`${hours} ${hebrew.classes.countdownHours}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${hebrew.classes.countdownMinutes}`);
  if (parts.length === 1) return parts[0];
  else if (parts.length === 2) return `${parts[0]} ${hebrew.classes.and}${parts[1]}`;
  else return `${parts[0]}, ${parts[1]} ${hebrew.classes.and}${parts[2]}`;
}

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const formatDateKey = (date: Date) => date.toLocaleDateString('en-CA');
const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const NEXT_WEEK_LOCK_MESSAGE = 'ההרשמה לשבוע הבא נפתחת כל חמישי ב-12:00';

// --- Main Component ---

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, updateUser } = useAuth();
  const { classes, bookClass, isClassBooked, getClassBookings, cancelBooking, getClassBooking } = useClasses();
  const { updateProgress } = useAchievements();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<any[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [classBookingsMap, setClassBookingsMap] = useState<Record<string, any[]>>({});

  const lateCancellations = user?.lateCancellations || 0;
  const blockEndDate = user?.blockEndDate || null;

  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week

  // Calendar Selection State
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [syncedCalendarId, setSyncedCalendarId] = useState<string | null>(null);

  // Load Synced Calendar ID
  useEffect(() => {
    AsyncStorage.getItem('@reelrep_synced_calendar').then(id => {
      if (id) setSyncedCalendarId(id);
    });
  }, []);

  // --- Effects & Logic ---

  // Subscription-aware unlock time countdown
  const subscriptionType = user?.subscription?.type;
  const isWeekLocked = weekOffset === 1 && !isNextWeekUnlocked(subscriptionType);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const unlockTime = getUnlockTime(subscriptionType);
      const diff = unlockTime.getTime() - now.getTime();
      if (diff > 0) setCountdown(formatCountdown(diff));
      else setCountdown('');
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [subscriptionType]);

  const handleBookClass = async (classId: string) => {
    console.log('[Classes] Opening modal for classId:', classId);

    // 1. Try to find the class immediately
    const classItem = classes.find(c => c.id === classId);

    if (classItem) {
      setSelectedClass(classItem);
    } else {
      console.warn('[Classes] Class item not found via find(), will attempt to load...');
      setSelectedClass(null);
    }

    // 2. Open modal immediately
    setLoadingEnrolled(true);
    setModalVisible(true);

    if (!classItem) {
      console.error('[Classes] Class item really not found for id:', classId);
      setModalVisible(false);
      Alert.alert('שגיאה', 'לא ניתן לטעון את פרטי השיעור (זיהוי שגוי)');
      setLoadingEnrolled(false);
      return;
    }

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
      const bookings = await getClassBookings(selectedClass.id);
      setEnrolledUsers(bookings);
      setModalVisible(false);
      setSelectedClass(null);
      Alert.alert(hebrew.common.success, 'נרשמת לשיעור בהצלחה!');
    } catch (error) {
      Alert.alert(hebrew.common.error, (error as Error).message);
    }
  };

  // --- Helper Functions ---

  const canCancelClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    return (classDateTime - now) / (1000 * 60 * 60) >= 6;
  };

  const canSwitchClass = (classItem: any) => {
    const classDateTime = new Date(classItem.date + ' ' + classItem.time).getTime();
    const now = Date.now();
    return (classDateTime - now) / (1000 * 60 * 60) >= 1;
  };

  const handleCancelClass = (classItem: any) => {
    const booking = getClassBooking(classItem.id);
    if (!booking) return;

    if (blockEndDate && new Date(blockEndDate) > new Date()) {
      Alert.alert('חשבון חסום', 'לא ניתן לבטל שיעורים כרגע. החשבון שלך חסום עד ' + new Date(blockEndDate).toLocaleDateString('he-IL'));
      return;
    }

    const isLateCancellation = !canCancelClass(classItem);

    if (isLateCancellation) {
      // Late Cancel Logic
      const onConfirm = () => {
        cancelBooking(booking.id);
        if (user?.ticket) {
          Alert.alert('בוטל', 'השיעור בוטל. האימון נוקב מהכרטיסייה שלך.');
        } else {
          const newLate = lateCancellations + 1;
          if (newLate >= 3) {
            const blockEnd = new Date();
            blockEnd.setDate(blockEnd.getDate() + 3);
            updateUser({ lateCancellations: newLate, blockEndDate: blockEnd.toISOString() });
            Alert.alert('חשבון חסום', 'ביטלת 3 שיעורים באיחור. החשבון שלך חסום ל-3 ימים.');
          } else {
            updateUser({ lateCancellations: newLate });
            Alert.alert('בוטל', `השיעור בוטל. חשבונך יחויב. ביטולים מאוחרים: ${newLate}/3`);
          }
        }
      };

      Alert.alert(
        'ביטול מאוחר',
        user?.ticket ? 'האימון ינוקב מהכרטיסייה.' : `לא ניתן לבטל פחות מ-6 שעות לפני. ביטול יגרור חיוב. (${lateCancellations}/3)`,
        [{ text: 'ביטול', style: 'cancel' }, { text: 'אשר ביטול', style: 'destructive', onPress: onConfirm }]
      );
    } else {
      // Normal Cancel
      Alert.alert('ביטול שיעור', 'מבטלים בוודאות?', [
        { text: 'לא', style: 'cancel' },
        { text: 'כן, בטל', style: 'destructive', onPress: () => { cancelBooking(booking.id); Alert.alert('בוטל', 'השיעור בוטל בהצלחה.'); } }
      ]);
    }
  };

  const handleSwitchClass = (classItem: any) => {
    // (Switch logic kept identical)
    if (blockEndDate && new Date(blockEndDate) > new Date()) {
      Alert.alert('חשבון חסום', 'לא ניתן להחליף שיעורים כרגע.');
      return;
    }
    if (!canSwitchClass(classItem)) {
      Alert.alert('זמן החלפה עבר', 'לא ניתן להחליף שיעור פחות משעה לפני תחילתו.');
      return;
    }
    // Assuming navigation to switch logic or simple alert as per original
    Alert.alert('החלף שיעור', 'אנא בטל את השיעור הנוכחי והירשם לשיעור אחר.');
  };

  const handleMarkAttendance = async (booking: any, status: 'attended' | 'no_show') => {
    try {
      const { error } = await supabase
        .from('class_bookings')
        .update({ status: status === 'attended' ? 'completed' : 'no_show', attended_at: status === 'attended' ? new Date().toISOString() : null })
        .eq('id', booking.id);

      if (error) throw error;
      if (status === 'attended') await updateProgress(booking.user_id, 'classes_attended', 1);

      if (selectedClass) {
        const bookings = await getClassBookings(selectedClass.id);
        setEnrolledUsers(bookings);
      }
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
    }
  };

  // --- New Sync Function ---
  // --- Sync Function ---
  // --- Sync Function ---
  const handleSyncPress = async () => {
    // If already synced, ask to unsync
    if (syncedCalendarId) {
      Alert.alert(
        'ביטול סנכרון',
        'האם ברצונך לבטל את הסנכרון האוטומטי ליומן זה?',
        [
          { text: 'לא', style: 'cancel' },
          {
            text: 'כן, בטל סנכרון',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem('@reelrep_synced_calendar');
              setSyncedCalendarId(null);
              Alert.alert('בוטל', 'הסנכרון בוטל. כעת תוכל לבחור יומן אחר.');
            }
          }
        ]
      );
      return;
    }

    try {
      // 1. Request Permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('נדרשת הרשאה', 'אנא אשר גישה ליומן כדי לסנכרן את השיעורים.');
        return;
      }

      // 2. Fetch Calendars
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      // Filter for writable calendars only
      const writableCalendars = calendars.filter(c => c.allowsModifications);

      if (writableCalendars.length === 0) {
        Alert.alert('שגיאה', 'לא נמצאו יומנים זמינים לעריכה במכשיר.');
        return;
      }

      setAvailableCalendars(writableCalendars.sort((a, b) => (a.isPrimary ? -1 : 1)));
      setCalendarModalVisible(true);

    } catch (error) {
      console.error('Error fetching calendars:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון רשימת יומנים.');
    }
  };

  const performSync = async (calendarId: string) => {
    setCalendarModalVisible(false);

    try {
      // Filter Future Booked Classes
      const now = new Date();
      const futureBookedClasses = classes.filter(c => {
        if (!isClassBooked(c)) return false;

        const [h, m] = c.time.split(':').map(Number);
        const d = parseDateKey(c.date);
        d.setHours(h, m, 0, 0);

        return d > now;
      });

      if (futureBookedClasses.length === 0) {
        Alert.alert('אין שיעורים', 'לא נמצאו שיעורים עתידיים רשומים לסנכרון.');
        return;
      }

      let addedCount = 0;
      for (const classItem of futureBookedClasses) {
        const [h, m] = classItem.time.split(':').map(Number);
        const startDate = parseDateKey(classItem.date);
        startDate.setHours(h, m, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(startDate.getMinutes() + 60);

        await Calendar.createEventAsync(calendarId, {
          title: `Reel Rep: ${classItem.title}`,
          startDate,
          endDate,
          location: 'Reel Rep Training Studio',
          notes: `מדריך/ה: ${classItem.instructor}`,
          timeZone: 'Asia/Jerusalem',
        });
        addedCount++;
      }

      Alert.alert('הצלחה', `סונכרנו ${addedCount} שיעורים ליומן שנבחר!`);

      // Save Sync Preference
      await AsyncStorage.setItem('@reelrep_synced_calendar', calendarId);
      setSyncedCalendarId(calendarId);

    } catch (error) {
      console.error('Sync Error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בזמן הסינכרון.');
    }
  };

  // --- Data Preparation ---

  const groupedClasses = classes.reduce((groups, classItem) => {
    if (!groups[classItem.date]) groups[classItem.date] = [];
    groups[classItem.date].push(classItem);
    return groups;
  }, {} as Record<string, typeof classes>);

  // Generate static Sun-Sat week based on weekOffset
  const generateWeekDays = (offset: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get Sunday of the current week
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());

    // Apply week offset (0 = current week, 1 = next week)
    const targetSunday = new Date(currentSunday);
    targetSunday.setDate(currentSunday.getDate() + (offset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(targetSunday);
      date.setDate(targetSunday.getDate() + i);
      days.push({
        dayOfWeek: i,
        date: date.toISOString(),
        dateKey: formatDateKey(date),
        dayNumber: date.getDate(),
      });
    }
    return days;
  };

  const calendarDays = generateWeekDays(weekOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (selectedDate === null) setSelectedDate(formatDateKey(today));
  }, []);

  const filteredClasses = selectedDate !== null
    ? (groupedClasses[selectedDate] || [])
      .filter(classItem => {
        const now = new Date();
        const classDate = parseDateKey(classItem.date);
        const isToday = classDate.toDateString() === now.toDateString();
        if (isToday) {
          const [hours, minutes] = classItem.time.split(':').map(Number);
          const classDateTime = new Date();
          classDateTime.setHours(hours, minutes, 0, 0);
          return classDateTime.getTime() > now.getTime();
        }
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // --- Render ---

  return (
    <View className="flex-1 bg-background">

      {/* 1. Header Section */}
      <View style={{ paddingTop: insets.top }} className="bg-background pb-2 rounded-b-[32px] border-b border-gray-100 shadow-sm z-10">
        <View className="px-5 pt-2 mb-3 flex-row justify-center items-center">
          <Text className="text-3xl font-extrabold text-[#09090B] text-right">לוח שיעורים</Text>
        </View>

        {/* Calendar Strip with Arrows and Swipe */}
        <View
          className="relative"
          {...PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
            onPanResponderRelease: (_, gestureState) => {
              if (gestureState.dx < -50 && weekOffset === 0) {
                setWeekOffset(1);
              } else if (gestureState.dx > 50 && weekOffset === 1) {
                setWeekOffset(0);
                setSelectedDate(formatDateKey(today));
              }
            },
          }).panHandlers}
        >
          <View className="flex-row items-center justify-between px-2 pb-2">
            {/* Left Arrow (Next Week) */}
            <TouchableOpacity
              onPress={() => setWeekOffset(1)}
              disabled={weekOffset === 1}
              className={cn("p-2 rounded-full", weekOffset === 1 ? "opacity-30" : "bg-gray-100")}
            >
              <ChevronLeft size={20} color="#09090B" />
            </TouchableOpacity>

            {/* Days Strip */}
            <View className={cn("flex-1 flex-row justify-between px-2", isWeekLocked && "opacity-40")}>
              {calendarDays.map((day, index) => {
                const isSelected = selectedDate === day.dateKey;
                const isToday = day.dateKey === formatDateKey(today);

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (isWeekLocked) { Alert.alert('מוקדם מדי', NEXT_WEEK_LOCK_MESSAGE); return; }
                      setSelectedDate(day.dateKey);
                    }}
                    disabled={isWeekLocked}
                    className={cn(
                      "items-center justify-center w-[12%] py-2.5 rounded-xl transition-all",
                      isSelected && !isWeekLocked ? "bg-[#09090B] shadow-md shadow-gray-400" : "bg-transparent",
                      isToday && !isSelected ? "border border-gray-200 bg-gray-50" : ""
                    )}
                  >
                    <Text className={cn("text-[10px] font-bold mb-0.5", isSelected && !isWeekLocked ? "text-gray-300" : "text-gray-400")}>
                      {DAYS_OF_WEEK[day.dayOfWeek]}
                    </Text>
                    <Text className={cn("text-base font-extrabold", isSelected && !isWeekLocked ? "text-white" : "text-[#09090B]")}>
                      {day.dayNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Right Arrow (Previous - Current Week) */}
            <TouchableOpacity
              onPress={() => { setWeekOffset(0); setSelectedDate(formatDateKey(today)); }}
              disabled={weekOffset === 0}
              className={cn("p-2 rounded-full", weekOffset === 0 ? "opacity-30" : "bg-gray-100")}
            >
              <ChevronRight size={20} color="#09090B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sync Bar */}
      <CalendarSyncBar onPress={handleSyncPress} isSynced={!!syncedCalendarId} />

      {/* 2. Classes List */}
      <ScrollView
        // ... (rest of scrollview props)
        className="flex-1 bg-gray-50/50"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {selectedDate === null || filteredClasses.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-50">
            <CalendarIcon size={64} color="#D4D4D8" />
            <Text className="text-lg font-bold text-gray-400 mt-4">אין שיעורים זמינים ליום זה</Text>
          </View>
        ) : (
          // ... (rest of list mapping)
          filteredClasses.map((classItem, index) => {
            const booked = isClassBooked(classItem);
            const isFull = classItem.enrolled >= classItem.capacity;
            const percent = Math.round((classItem.enrolled / classItem.capacity) * 100);

            return (
              <TouchableOpacity
                // ...
                key={index}
                onPress={() => handleBookClass(classItem.id)}
                activeOpacity={0.9}
                className={cn(
                  "bg-white rounded-2xl p-4 mb-4 border shadow-sm active:scale-[0.99]",
                  booked ? "border-green-500 border-l-4" : "border-gray-200",
                )}
              >
                {/* ... Card Content ... (omitted for brevity in replacement, but needs to be kept) */}
                {/* Wait, I cannot safely omit lines inside a replace block without context matching. 
                   I should better just replace the function body above, and then replace the render part separately 
                   or use multi_replace.
                   
                   Actually, I need to REMOVE the old `syncAllClasses` function implementation which is likely lines ~280-360.
                   Then I need to ADD the `<CalendarSelectionModal ... />` at the end of the file.
               */}

                {/* ... */}
                <View className="flex-row justify-between">
                  {/* Right Side: Info */}
                  <View className="flex-1 items-end pl-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-xl font-extrabold text-[#09090B] text-right">{classItem.title}</Text>
                      {isFull && !booked && (
                        <View className="bg-red-100 px-2 py-0.5 rounded text-xs">
                          <Text className="text-red-600 text-[10px] font-bold">מלא</Text>
                        </View>
                      )}
                      {booked && (
                        <View className="bg-green-100 px-2 py-0.5 rounded text-xs">
                          <Text className="text-green-600 text-[10px] font-bold">רשום</Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-4 mb-3">
                      <View className="flex-row items-center gap-1">
                        <Clock size={14} color="#71717A" />
                        <Text className="text-gray-500 font-medium">{classItem.time}</Text>
                      </View>
                      <View className="w-[1px] h-3 bg-gray-300" />
                      <View className="flex-row items-center gap-1">
                        <Image source={require('@/assets/images/coach.webp')} style={{ width: 24, height: 24, tintColor: '#6B7280' }} resizeMode="contain" />
                        <Text className="text-gray-500 font-medium">{classItem.instructor}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Left Side: Actions/Status */}
                  <View className="items-center justify-center pl-1">
                    <View className={cn(
                      "w-12 h-12 rounded-full items-center justify-center border",
                      booked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
                    )}>
                      {booked ? <Check size={20} color={Colors.success} /> : <ChevronLeft size={20} color="#09090B" />}
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-[10px] text-gray-400 font-bold">רשומים</Text>
                    <Text className="text-[10px] text-gray-400 font-bold">{classItem.enrolled}/{classItem.capacity}</Text>
                  </View>
                  <View className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                    <View
                      className={cn("h-full rounded-full",
                        percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-orange-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </View>

                  <View className="flex-row justify-end">
                    <AvatarCircles
                      numPeople={Math.max(0, classItem.enrolled - 3)}
                      avatarUrls={classItem.enrolledAvatars?.slice(0, 3) || []}
                      className="justify-end"
                    />
                  </View>
                </View>

                {/* Action Buttons (Only if booked) */}
                {booked && (
                  <View className="flex-row gap-3 mt-4 pt-3 border-t border-gray-100">
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleSwitchClass(classItem); }}
                      className="flex-1 bg-gray-50 py-2 rounded-lg items-center border border-gray-200"
                    >
                      <View className="flex-row items-center justify-center gap-1.5">
                        <Text className="text-xs font-bold text-gray-700">החלפה</Text>
                        <Image source={require('@/assets/images/replace.webp')} style={{ width: 14, height: 14, tintColor: '#374151' }} resizeMode="contain" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleCancelClass(classItem); }}
                      className={cn(
                        "flex-1 py-2 rounded-lg items-center border",
                        !canCancelClass(classItem) ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
                      )}
                    >
                      <View className="flex-row items-center justify-center gap-1.5">
                        <Text className={cn("text-xs font-bold", !canCancelClass(classItem) ? "text-red-600" : "text-gray-700")}>
                          {canCancelClass(classItem) ? 'ביטול' : 'ביטול מאוחר'}
                        </Text>
                        <Image
                          source={require('@/assets/images/cancel.webp')}
                          style={{
                            width: 14,
                            height: 14,
                            tintColor: !canCancelClass(classItem) ? '#dc2626' : '#374151'
                          }}
                          resizeMode="contain"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 3. Modal (Class Info & Booking) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          {!selectedClass ? (
            <View className="bg-white rounded-3xl p-8 items-center">
              <Text className="text-gray-500">טוען פרטי שיעור...</Text>
            </View>
          ) : (
            <ClassRegistrationCard
              title={selectedClass.title}
              date={selectedClass.date}
              time={selectedClass.time}
              instructor={selectedClass.instructor}
              enrolled={selectedClass.enrolled}
              capacity={selectedClass.capacity}
              enrolledAvatars={selectedClass.enrolledAvatars || []}
              isBooked={isClassBooked(selectedClass)}
              isAdmin={isAdmin}
              onRegister={handleConfirmBooking}
              onCancel={() => {
                setModalVisible(false);
                setSelectedClass(null);
              }}
              onCancelClass={() => {
                setModalVisible(false);
                handleCancelClass(selectedClass);
              }}
              onSwitch={() => {
                setModalVisible(false);
                handleSwitchClass(selectedClass);
              }}
              className="w-full"
            />
          )}
        </View>
      </Modal>

      {/* 4. Calendar Selection Modal */}
      <CalendarSelectionModal
        visible={calendarModalVisible}
        calendars={availableCalendars}
        onSelect={performSync}
        onClose={() => setCalendarModalVisible(false)}
      />
    </View >
  );
}