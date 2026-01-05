import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Users, Trophy, Lock, Check, X, Clock, ChevronLeft, MapPin } from 'lucide-react-native';
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

  // --- Effects & Logic ---

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextThursday = getNextThursdayNoon();
      const diff = nextThursday.getTime() - now.getTime();
      if (diff > 0) setCountdown(formatCountdown(diff));
      else setCountdown('');
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleBookClass = async (classId: string) => {
    console.log('[Classes] Opening modal for classId:', classId);

    // 1. Try to find the class immediately
    const classItem = classes.find(c => c.id === classId);

    if (classItem) {
      setSelectedClass(classItem);
    } else {
      // If not found in local state (rare), maybe show loading without title?
      // Or just return error. But user says "no pop up". 
      // So let's force open modal anyway to see what happens.
      console.warn('[Classes] Class item not found via find(), will attempt to load...');
      setSelectedClass(null);
    }

    // 2. Open modal immediately
    setLoadingEnrolled(true);
    setModalVisible(true);

    if (!classItem) {
      console.error('[Classes] Class item really not found for id:', classId);
      // Keep modal open but show error state? or close it?
      // Let's close and alert for now, but at least we tried.
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

  // --- Data Preparation ---

  const groupedClasses = classes.reduce((groups, classItem) => {
    if (!groups[classItem.date]) groups[classItem.date] = [];
    groups[classItem.date].push(classItem);
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
      if (dayOfWeek === 6) continue; // Skip Saturday if needed
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

      {/* 1. Header Section (Clean, No Notch) */}
      <View style={{ paddingTop: insets.top }} className="bg-background pb-2 rounded-b-[32px] border-b border-gray-100 shadow-sm z-10">
        <View className="px-5 pt-2 mb-4 flex-row-reverse justify-between items-center">
          <Text className="text-3xl font-extrabold text-[#09090B]">לוח שיעורים</Text>
          {countdown ? (
            <View className="bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
              <Text className="text-orange-700 text-xs font-bold">{countdown}</Text>
            </View>
          ) : null}
        </View>

        {/* Calendar Strip */}
        <View className="flex-row-reverse justify-between px-4 pb-2">
          {calendarDays.map((day, index) => {
            const isSelected = selectedDate === day.dateKey;
            const isToday = day.dateKey === formatDateKey(today);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (day.isLocked) { Alert.alert('מוקדם מדי', NEXT_WEEK_LOCK_MESSAGE); return; }
                  setSelectedDate(day.dateKey);
                }}
                disabled={false}
                className={cn(
                  "items-center justify-center w-[13%] py-3 rounded-2xl transition-all",
                  isSelected ? "bg-[#09090B] shadow-md shadow-gray-400" : "bg-transparent",
                  isToday && !isSelected ? "border border-gray-200 bg-gray-50" : "",
                  day.isLocked && "opacity-40"
                )}
              >
                <Text className={cn("text-xs font-bold mb-1", isSelected ? "text-gray-300" : "text-gray-400")}>
                  {DAYS_OF_WEEK[day.dayOfWeek]}
                </Text>
                <Text className={cn("text-lg font-extrabold", isSelected ? "text-white" : "text-[#09090B]")}>
                  {day.dayNumber}
                </Text>
                {day.isLocked && (
                  <View className="absolute top-1 right-1">
                    <Lock size={8} color={isSelected ? "white" : "black"} />
                  </View>
                )}
                {/* Dot indicator for classes? Optional */}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

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
            const booked = isClassBooked(classItem);
            const isFull = classItem.enrolled >= classItem.capacity;
            const percent = Math.round((classItem.enrolled / classItem.capacity) * 100);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleBookClass(classItem.id)}
                activeOpacity={0.9}
                className={cn(
                  "bg-white rounded-2xl p-4 mb-4 border shadow-sm active:scale-[0.99]",
                  booked ? "border-green-500 border-l-4" : "border-gray-200",
                )}
              >
                <View className="flex-row-reverse justify-between">
                  {/* Right Side: Info */}
                  <View className="flex-1 items-end pl-4">
                    <View className="flex-row-reverse items-center gap-2 mb-1">
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

                    <View className="flex-row-reverse items-center gap-4 mb-3">
                      <View className="flex-row-reverse items-center gap-1">
                        <Clock size={14} color="#71717A" />
                        <Text className="text-gray-500 font-medium">{classItem.time}</Text>
                      </View>
                      <View className="w-[1px] h-3 bg-gray-300" />
                      <Text className="text-gray-500 font-medium">מאמן: {classItem.instructor}</Text>
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
                  <View className="flex-row-reverse justify-between mb-1">
                    <Text className="text-[10px] text-gray-400 font-bold">תפוסה</Text>
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

                  <View className="flex-row-reverse justify-end">
                    <AvatarCircles
                      numPeople={Math.max(0, classItem.enrolled - 3)}
                      avatarUrls={classItem.enrolledAvatars?.slice(0, 3) || []}
                      className="justify-end"
                    />
                  </View>
                </View>

                {/* Action Buttons (Only if booked) */}
                {booked && (
                  <View className="flex-row-reverse gap-3 mt-4 pt-3 border-t border-gray-100">
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleSwitchClass(classItem); }}
                      className="flex-1 bg-gray-50 py-2 rounded-lg items-center border border-gray-200"
                    >
                      <Text className="text-xs font-bold text-gray-700">החלפה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleCancelClass(classItem); }}
                      className={cn(
                        "flex-1 py-2 rounded-lg items-center border",
                        !canCancelClass(classItem) ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
                      )}
                    >
                      <Text className={cn("text-xs font-bold", !canCancelClass(classItem) ? "text-red-600" : "text-gray-700")}>
                        {canCancelClass(classItem) ? 'ביטול' : 'ביטול מאוחר'}
                      </Text>
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
              isBooked={isClassBooked(selectedClass)}
              isAdmin={isAdmin}
              onRegister={handleConfirmBooking}
              onCancel={() => {
                setModalVisible(false);
                setSelectedClass(null);
              }}
              className="w-full"
            />
          )}
        </View>
      </Modal>
    </View >
  );
}