import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Dimensions, PanResponder, Platform } from 'react-native';
import { useRouter } from 'expo-router';
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
import { Ionicons } from '@expo/vector-icons';
import { AvatarCircles } from '@/components/ui/AvatarCircles';
import { ClassAttendeesSheet } from '@/components/ui/ClassAttendeesSheet';
import { CalendarSyncBar } from '@/components/ui/CalendarSyncBar';
import { CalendarSelectionModal } from '@/components/ui/CalendarSelectionModal';
import { Progress } from '@tamagui/progress';
import CustomDialog, { DialogButton } from '@/components/ui/CustomDialog';

// --- Logic & Helpers ---

const { width } = Dimensions.get('window');

/**
 * Returns the MOST RECENT Thursday at noon (for unlock check)
 * If today is Thu and before noon -> returns last week's Thursday
 * If today is Thu after noon or Fri-Wed -> returns this week's Thursday
 */
function getMostRecentThursdayNoon(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 4=Thu
  const currentHour = now.getHours();

  // How many days since last Thursday?
  let daysSinceThursday = (currentDay - 4 + 7) % 7;

  // If it's Thursday but before noon, treat as if Thursday hasn't happened yet
  if (currentDay === 4 && currentHour < 12) {
    daysSinceThursday = 7; // Go back to last week's Thursday
  }

  const recentThursday = new Date(now);
  recentThursday.setDate(now.getDate() - daysSinceThursday);
  recentThursday.setHours(12, 0, 0, 0);
  return recentThursday;
}

/**
 * Returns the MOST RECENT Wednesday at noon (for premium users unlock check)
 * If today is Wed and before noon -> returns last week's Wednesday
 * If today is Wed after noon or Thu-Tue -> returns this week's Wednesday
 */
function getMostRecentWednesdayNoon(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 3=Wed
  const currentHour = now.getHours();

  // How many days since last Wednesday?
  let daysSinceWednesday = (currentDay - 3 + 7) % 7;

  // If it's Wednesday but before noon, treat as if Wednesday hasn't happened yet
  if (currentDay === 3 && currentHour < 12) {
    daysSinceWednesday = 7; // Go back to last week's Wednesday
  }

  const recentWednesday = new Date(now);
  recentWednesday.setDate(now.getDate() - daysSinceWednesday);
  recentWednesday.setHours(12, 0, 0, 0);
  return recentWednesday;
}

/**
 * Returns the NEXT upcoming Thursday at noon (for countdown display)
 */
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

/**
 * Returns the NEXT upcoming Wednesday at noon (for premium countdown display)
 */
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
  // This returns NEXT unlock time for countdown purposes
  const isPremiumUser = subscriptionType === 'unlimited';
  return isPremiumUser ? getNextWednesdayNoon() : getNextThursdayNoon();
}

/**
 * Checks if next week is currently unlocked for booking
 * Premium users (unlimited): unlocked from Wednesday noon until next Wednesday noon
 * Regular users: unlocked from Thursday noon until next Thursday noon
 */
function isNextWeekUnlocked(subscriptionType?: string): boolean {
  const now = new Date();
  const isPremiumUser = subscriptionType === 'unlimited';

  // Get the most recent unlock time (when booking opened)
  const mostRecentUnlock = isPremiumUser
    ? getMostRecentWednesdayNoon()
    : getMostRecentThursdayNoon();

  // Next week is unlocked if we've passed the most recent unlock time
  return now >= mostRecentUnlock;
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

// --- MOCK DATA FOR ATTENDEES (REQUESTED) ---
const MOCK_BOOKED_USERS = [
  { id: '1', name: 'איתי אהרוני', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'נועה קירל', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'מיכל אמדורסקי', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'גיא זוארץ', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'אסי עזר', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
  { id: '6', name: 'רותם סלע', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
  { id: '7', name: 'עברי לידר', avatarUrl: 'https://i.pravatar.cc/150?u=7' },
  { id: '8', name: 'נינט טייב', avatarUrl: 'https://i.pravatar.cc/150?u=8' },
];

const MOCK_WAITLIST_USERS = [
  { id: 'w1', name: 'נועם לוי', position: 1, joinedAt: '14:30', avatarUrl: 'https://i.pravatar.cc/150?u=w1' },
  { id: 'w2', name: 'דניאל כהן', position: 2, joinedAt: '14:45', avatarUrl: 'https://i.pravatar.cc/150?u=w2' },
  { id: 'w3', name: 'עומר רפאלי', position: 3, joinedAt: '15:05', avatarUrl: 'https://i.pravatar.cc/150?u=w3' },
];

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAdmin, updateUser } = useAuth();
  const { classes, bookClass, isClassBooked, getClassBookings, cancelBooking, getClassBooking, bookings } = useClasses();
  const { updateProgress } = useAchievements();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Attendees Sheet Ref
  const attendeesSheetRef = useRef<any>(null);

  const handleOpenAttendees = (item: any) => {
    setSelectedClass(item);
    attendeesSheetRef.current?.present();
  };

  const lateCancellations = user?.lateCancellations || 0;
  const blockEndDate = user?.blockEndDate || null;

  const [countdown, setCountdown] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week

  // Calendar Selection State
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [syncedCalendarId, setSyncedCalendarId] = useState<string | null>(null);

  // Custom Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    type?: 'success' | 'warning' | 'error' | 'confirm';
    title?: string;
    message?: string;
    buttons?: DialogButton[];
    showSuccessGif?: boolean;
    showWarningGif?: boolean;
    showCancelGif?: boolean;
    autoCloseAfterGif?: boolean;
  }>({});

  const showDialog = (config: typeof dialogConfig) => {
    setDialogConfig(config);
    setDialogVisible(true);
  };

  const hideDialog = () => {
    setDialogVisible(false);
  };

  // Load Synced Calendar ID
  useEffect(() => {
    AsyncStorage.getItem('@reelrep_synced_calendar').then(id => {
      if (id) setSyncedCalendarId(id);
    });
  }, []);

  // --- Data Preparation ---
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const groupedClasses = classes.reduce((groups, classItem) => {
    if (!groups[classItem.date]) groups[classItem.date] = [];
    groups[classItem.date].push(classItem);
    return groups;
  }, {} as Record<string, typeof classes>);

  const filteredClasses = useMemo(() => {
    let baseClasses = selectedDate !== null
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

    // --- MOCK DATA FOR TESTING WAITING LIST ---
    if (selectedDate === formatDateKey(today)) {
      baseClasses.push({
        id: 'mock_full_class',
        title: 'אימון כוח (Full)',
        instructor: 'Ivan',
        date: formatDateKey(today),
        time: '23:59',
        duration: 60,
        capacity: 8,
        enrolled: 8,
        waitingListCount: 4,
        enrolledAvatars: [
          'https://i.pravatar.cc/150?u=1',
          'https://i.pravatar.cc/150?u=2',
          'https://i.pravatar.cc/150?u=3'
        ],
        difficulty: 'intermediate',
        location: 'Main Gym',
        requiredSubscription: ['unlimited'],
        description: 'שיעור כוח מלא לבדיקת המתנה'
      });
    }

    return baseClasses;
  }, [groupedClasses, selectedDate, classes]);

  useEffect(() => {
    if (selectedDate === null) setSelectedDate(formatDateKey(today));
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

  const handleBookClass = (classId: string) => {
    router.push(`/class/${classId}`);
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
      showDialog({
        type: 'error',
        title: 'חשבון חסום',
        message: 'לא ניתן לבטל שיעורים כרגע. החשבון שלך חסום עד ' + new Date(blockEndDate).toLocaleDateString('he-IL'),
        buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
      });
      return;
    }

    const isLateCancellation = !canCancelClass(classItem);

    const performCancellation = async () => {
      try {
        await cancelBooking(booking.id);
        // Success - no dialog needed, UI will update automatically
      } catch (error) {
        showDialog({
          type: 'error',
          title: 'שגיאה',
          message: 'לא ניתן לבטל את השיעור',
          buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
        });
      }
    };

    if (isLateCancellation) {
      // Late Cancel Logic
      showDialog({
        type: 'warning',
        title: 'ביטול מאוחר',
        message: user?.ticket
          ? 'אתה מבטל פחות מ-6 שעות לפני תחילת השיעור.\n\nביטול מאוחר עלול לגרור לחיוב אימון מהכרטיסייה.'
          : `לא ניתן לבטל פחות מ-6 שעות לפני.\n\nביטול יגרור חיוב. (ביטולים מאוחרים: ${lateCancellations}/3)`,
        showWarningGif: true,
        buttons: [
          { text: 'חזרה', onPress: hideDialog, style: 'cancel' },
          {
            text: 'בטל בכל זאת',
            onPress: () => {
              hideDialog();
              performCancellation();
              // Handle late cancellation consequences
              if (!user?.ticket) {
                const newLate = lateCancellations + 1;
                if (newLate >= 3) {
                  const blockEnd = new Date();
                  blockEnd.setDate(blockEnd.getDate() + 3);
                  updateUser({ lateCancellations: newLate, blockEndDate: blockEnd.toISOString() });
                }
              }
            },
            style: 'destructive',
          },
        ],
      });
    } else {
      // Normal Cancel
      showDialog({
        type: 'confirm',
        title: 'ביטול שיעור',
        message: 'האם לבטל את ההרשמה?',
        showCancelGif: true,
        buttons: [
          { text: 'לא', onPress: hideDialog, style: 'cancel' },
          {
            text: 'כן, בטל',
            onPress: () => {
              hideDialog();
              performCancellation();
            },
            style: 'destructive',
          },
        ],
      });
    }
  };

  const handleSwitchClass = (classItem: any) => {
    if (blockEndDate && new Date(blockEndDate) > new Date()) {
      showDialog({
        type: 'error',
        title: 'חשבון חסום',
        message: 'לא ניתן להחליף שיעורים כרגע.',
        buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
      });
      return;
    }
    if (!canSwitchClass(classItem)) {
      showDialog({
        type: 'warning',
        title: 'זמן החלפה עבר',
        message: 'לא ניתן להחליף שיעור פחות משעה לפני תחילתו.',
        buttons: [{ text: 'אישור', onPress: hideDialog, style: 'default' }],
      });
      return;
    }
    showDialog({
      type: 'confirm',
      title: 'החלף שיעור',
      message: 'אנא בטל את השיעור הנוכחי והירשם לשיעור אחר.',
      buttons: [{ text: 'הבנתי', onPress: hideDialog, style: 'default' }],
    });
  };

  const handleMarkAttendance = async (booking: any, status: 'attended' | 'no_show') => {
    try {
      const { error } = await supabase
        .from('class_bookings')
        .update({ status: status === 'attended' ? 'completed' : 'no_show', attended_at: status === 'attended' ? new Date().toISOString() : null })
        .eq('id', booking.id);

      if (error) throw error;
      if (status === 'attended') await updateProgress(booking.user_id, 'classes_attended', 1);
    } catch (err) {
      Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
    }
  };

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
            {/* Right Arrow (Previous - Current Week) - First in RTL */}
            <TouchableOpacity
              onPress={() => { setWeekOffset(0); setSelectedDate(formatDateKey(today)); }}
              disabled={weekOffset === 0}
              className={cn("p-2 rounded-full", weekOffset === 0 ? "opacity-30" : "bg-gray-100")}
            >
              <ChevronRight size={20} color="#09090B" />
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

            {/* Left Arrow (Next Week) - Last in RTL */}
            <TouchableOpacity
              onPress={() => setWeekOffset(1)}
              disabled={weekOffset === 1}
              className={cn("p-2 rounded-full", weekOffset === 1 ? "opacity-30" : "bg-gray-100")}
            >
              <ChevronLeft size={20} color="#09090B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sync Bar */}
      <CalendarSyncBar onPress={handleSyncPress} isSynced={!!syncedCalendarId} />

      {/* 2. Classes List */}
      <ScrollView
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
          filteredClasses.map((classItem, index) => {
            // Robust Booking Check
            // 1. Try standard context check (now fixed)
            // 2. Fallback: Check bookings array directly for matching schedule + date
            const booked = isClassBooked(classItem) || bookings.some((b: any) => {
              if (b.status !== 'confirmed') return false;
              if (b.schedule_id !== classItem.scheduleId) return false;

              // Compare dates (YYYY-MM-DD)
              const bookingDatePart = b.class_date ? new Date(b.class_date).toISOString().split('T')[0] : '';
              return bookingDatePart === classItem.date;
            });

            const isFull = classItem.enrolled >= classItem.capacity;
            const percent = Math.round((classItem.enrolled / classItem.capacity) * 100);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleBookClass(classItem.id)}
                activeOpacity={0.9}
                className={cn(
                  "rounded-2xl p-4 mb-4 shadow-sm active:scale-[0.99] overflow-hidden",
                  booked
                    ? "bg-green-50 border-2 border-green-400"
                    : "bg-white border border-gray-200",
                )}
                style={booked ? {
                  shadowColor: '#22C55E',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                } : undefined}
              >
                {/* Left Accent Strip for Booked */}
                {booked && (
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 5,
                      backgroundColor: '#22C55E',
                      borderTopLeftRadius: 16,
                      borderBottomLeftRadius: 16,
                    }}
                  />
                )}
                <View className="flex-1">
                  {/* Row 1: Class Name + Time Badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Text className="text-lg font-extrabold text-[#09090B] text-left">{classItem.title}</Text>
                      {isFull && !booked && (
                        <View className="bg-red-100 px-2 py-0.5 rounded">
                          <Text className="text-red-600 text-[10px] font-bold">מלא</Text>
                        </View>
                      )}
                      {booked && (
                        <View className="bg-green-500 px-2 py-0.5 rounded">
                          <Text className="text-white text-[10px] font-bold">רשום ✓</Text>
                        </View>
                      )}
                    </View>

                    {/* Time Badge with Black Gradient */}
                    <LinearGradient
                      colors={['#18181B', '#09090B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text className="text-white font-bold text-sm">{classItem.time}</Text>
                    </LinearGradient>
                  </View>

                  {/* Row 2: Coach with Avatar */}
                  <View className="flex-row items-center gap-2">
                    {classItem.instructorAvatar ? (
                      <Image
                        source={{ uri: classItem.instructorAvatar }}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                    ) : (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#6B7280' }}>
                          {classItem.instructor?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                    <Text className="text-gray-500 font-medium text-sm">{classItem.instructor}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mt-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-[10px] text-gray-400 font-bold">רשומים</Text>
                    <Text className="text-[10px] text-gray-400 font-bold">{classItem.enrolled}/{classItem.capacity}</Text>
                  </View>
                  <Progress
                    value={percent}
                    size="$2"
                    backgroundColor="#E5E7EB"
                    borderRadius="$4"
                    marginBottom={12}
                  >
                    <Progress.Indicator
                      animation="bouncy"
                      backgroundColor={
                        percent >= 90 ? '$red10' :
                          percent >= 70 ? '$orange10' : '$green10'
                      }
                      borderRadius="$4"
                    />
                  </Progress>
                  <View className="flex-row items-center justify-start">
                    <TouchableOpacity onPress={() => handleOpenAttendees(classItem)} activeOpacity={0.7}>
                      <AvatarCircles
                        numPeople={Math.max(0, classItem.enrolled - 3)}
                        avatarUrls={classItem.enrolledAvatars?.slice(0, 3) || []}
                        className="justify-start"
                      />
                    </TouchableOpacity>

                    {/* Waiting List Badge (Left side in RTL) */}
                    {isFull && !booked && (classItem.waitingListCount || 0) > 0 && (
                      <View className="bg-[#FFF7ED] px-2 py-1 rounded-full flex-row items-center lg:gap-1 mr-2">
                        <Ionicons name="hourglass-outline" size={12} color="#C2410C" />
                        <Text className="text-[#C2410C] text-[10px] font-extrabold">
                          {classItem.waitingListCount} ממתינים
                        </Text>
                      </View>
                    )}
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

      {/* 4. Calendar Selection Modal */}
      <CalendarSelectionModal
        visible={calendarModalVisible}
        calendars={availableCalendars}
        onSelect={performSync}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* 5. Class Attendees Sheet (Global Instance) */}
      <ClassAttendeesSheet
        ref={attendeesSheetRef}
        title={selectedClass?.title || ''}
        subtitle={selectedClass ? `${selectedClass.time} • ${selectedClass.instructor}` : ''}
        bookedUsers={MOCK_BOOKED_USERS}
        waitlistUsers={MOCK_WAITLIST_USERS}
        bookedCount={selectedClass ? `${selectedClass.enrolled}/${selectedClass.capacity}` : '0/0'}
        waitlistCount={selectedClass?.waitingListCount || 0}
      />

      {/* 6. Custom Dialog */}
      <CustomDialog
        visible={dialogVisible}
        onClose={hideDialog}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        showSuccessGif={dialogConfig.showSuccessGif}
        showWarningGif={dialogConfig.showWarningGif}
        showCancelGif={dialogConfig.showCancelGif}
        autoCloseAfterGif={dialogConfig.autoCloseAfterGif}
      />
    </View>
  );
}