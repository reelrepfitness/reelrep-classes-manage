import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Class, ClassBooking } from '@/constants/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/constants/supabase';

const BOOKINGS_STORAGE_KEY = '@reelrep_bookings';
const formatDateKey = (date: Date) => date.toLocaleDateString('en-CA');

export const [ClassesProvider, useClasses] = createContextHook(() => {
  const { user, isAdmin } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);

  const schedulesQuery = useQuery({
    queryKey: ['class-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Generate classes for next 2 weeks
      const classes: Class[] = [];
      const now = new Date();

      for (let week = 0; week < 2; week++) {
        for (const schedule of data || []) {
          const scheduleDayOfWeek = Math.max(0, Math.min(6, (schedule.day_of_week || 1) - 1));
          const dayOffset = scheduleDayOfWeek - now.getDay() + (week * 7);
          const classDate = new Date(now);
          classDate.setDate(now.getDate() + dayOffset);
          classDate.setHours(0, 0, 0, 0);

          const [hours, minutes] = schedule.start_time.split(':');

          const dateKey = formatDateKey(classDate);
          classes.push({
            id: schedule.id, // Use schedule UUID directly
            scheduleId: schedule.id,
            classDate: classDate.toISOString(),
            title: schedule.name,
            instructor: schedule.coach_name,
            date: dateKey,
            time: `${hours}:${minutes}`,
            duration: schedule.duration_minutes,
            capacity: schedule.max_participants,
            enrolled: 0,
            location: schedule.location || 'Main Gym',
            difficulty: 'intermediate',
            description: schedule.description || '',
            requiredSubscription: schedule.required_subscription_level === 1
              ? ['unlimited', 'premium']
              : ['unlimited'],
          });
        }
      }

      return classes.sort((a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
    },
  });

  useEffect(() => {
    if (schedulesQuery.data) {
      setClasses(schedulesQuery.data);
    }
  }, [schedulesQuery.data]);

  // Fetch all bookings to calculate accurate enrolled counts
  const allBookingsQuery = useQuery({
    queryKey: ['all-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_bookings')
        .select('class_id, status, classes:class_id(schedule_id, class_date)')
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error fetching all bookings:', error);
        return [];
      }

      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds to keep counts updated
  });

  // Update enrolled counts based on all bookings
  useEffect(() => {
    if (classes.length > 0 && allBookingsQuery.data) {
      const updatedClasses = classes.map(classItem => {
        // Count bookings that match this schedule and date
        const enrolledCount = allBookingsQuery.data.filter((b: any) => {
          if (!b.classes) return false;

          // Match by schedule_id
          const matchesSchedule = b.classes.schedule_id === classItem.scheduleId;

          // Match by date (compare date strings)
          const bookingDate = formatDateKey(new Date(b.classes.class_date));
          const classDate = classItem.date;
          const matchesDate = bookingDate === classDate;

          return matchesSchedule && matchesDate;
        }).length;

        return {
          ...classItem,
          enrolled: enrolledCount,
        };
      });

      // Only update if the enrolled counts actually changed
      const hasChanges = updatedClasses.some((c, i) => c.enrolled !== classes[i].enrolled);
      if (hasChanges) {
        setClasses(updatedClasses);
      }
    }
  }, [allBookingsQuery.data]);

  const bookingsQuery = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch bookings from Supabase with class details
      const { data, error } = await supabase
        .from('class_bookings')
        .select('*, classes:class_id(schedule_id, class_date)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        // Fallback to AsyncStorage if Supabase fails
        const stored = await AsyncStorage.getItem(`${BOOKINGS_STORAGE_KEY}_${user.id}`);
        return stored ? JSON.parse(stored) : [];
      }

      // Map Supabase data to ClassBooking format with schedule info
      return (data || []).map((booking: any) => ({
        id: booking.id,
        userId: booking.user_id,
        classId: booking.class_id,
        bookingDate: booking.created_at || booking.booking_date || new Date().toISOString(),
        status: booking.status,
        scheduleId: booking.classes?.schedule_id || null,
        classDate: booking.classes?.class_date || null,
        attendedAt: booking.attended_at || null,
      }));
    },
    enabled: !!user,
  });

  const syncMutation = useMutation({
    mutationFn: async (bookings: ClassBooking[]) => {
      if (user) {
        await AsyncStorage.setItem(`${BOOKINGS_STORAGE_KEY}_${user.id}`, JSON.stringify(bookings));
      }
      return bookings;
    },
  });

  const { mutate: syncBookings } = syncMutation;

  useEffect(() => {
    if (bookingsQuery.data !== undefined) {
      setBookings(bookingsQuery.data);
    }
  }, [bookingsQuery.data]);

  const bookClass = useCallback(async (classId: string) => {
    // Admins bypass all subscription checks
    if (!isAdmin) {
      if (!user?.subscription) {
        throw new Error('נדרש מנוי פעיל');
      }
    }

    const classItem = classes.find(c => c.id === classId);
    if (!classItem) {
      throw new Error('השיעור לא נמצא');
    }

    if (!isAdmin && classItem.enrolled >= classItem.capacity) {
      throw new Error('השיעור מלא');
    }

    if (!isAdmin && user?.subscription && !classItem.requiredSubscription.includes(user.subscription.type)) {
      throw new Error('המנוי שלך אינו כולל שיעור זה');
    }

    if (!isAdmin && user?.subscription && user.subscription.classesUsed >= user.subscription.classesPerMonth) {
      throw new Error('מיצית את מכסת השיעורים החודשית');
    }

    const existingBooking = bookings.find(
      b => b.classId === classId && b.status === 'confirmed'
    );

    if (!isAdmin && existingBooking) {
      throw new Error('כבר נרשמת לשיעור זה');
    }

    // First, create or get the class instance in the classes table
    const classDateTime = new Date(`${classItem.date}T${classItem.time}`);

    const { data: existingClass, error: checkError } = await supabase
      .from('classes')
      .select('id')
      .eq('schedule_id', classItem.scheduleId)
      .eq('class_date', classDateTime.toISOString())
      .single();

    let actualClassId = existingClass?.id;

    if (!existingClass) {
      // Create the class instance
      const { data: newClass, error: createError } = await supabase
        .from('classes')
        .insert({
          name: classItem.title,
          name_hebrew: classItem.title,
          coach_name: classItem.instructor,
          class_date: classDateTime.toISOString(),
          duration_minutes: classItem.duration,
          max_participants: classItem.capacity,
          current_participants: 0,
          required_subscription_level: classItem.requiredSubscription.includes('premium') ? 1 : 2,
          location: classItem.location,
          location_hebrew: classItem.location,
          class_type: 'general',
          schedule_id: classItem.scheduleId,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating class instance:', createError);
        throw new Error('שגיאה ביצירת השיעור');
      }

      actualClassId = newClass.id;
    }

    // Now book with the actual class UUID
    const { data, error } = await supabase
      .from('class_bookings')
      .insert({
        user_id: user.id,
        class_id: actualClassId,
        status: 'confirmed',
      })
      .select()
      .single();

    if (error) {
      console.error('Error booking class:', error);
      throw new Error('שגיאה בהזמנת השיעור');
    }

    const newBooking: ClassBooking = {
      id: data.id,
      userId: data.user_id,
      classId: actualClassId,
      bookingDate: data.created_at || new Date().toISOString(),
      status: data.status,
      scheduleId: classItem.scheduleId,
      classDate: classDateTime.toISOString(),
      attendedAt: null,
    };

    const updated = [...bookings, newBooking];
    setBookings(updated);
    syncBookings(updated);

    // Refetch all bookings to update enrolled counts immediately
    allBookingsQuery.refetch();
    bookingsQuery.refetch();

    return newBooking;
  }, [user, isAdmin, classes, bookings, syncBookings, allBookingsQuery, bookingsQuery]);

  const cancelBooking = useCallback((bookingId: string) => {
    const updated = bookings.map(b =>
      b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
    );
    setBookings(updated);
    syncBookings(updated);
  }, [bookings, syncBookings]);

  const getMyClasses = useCallback(() => {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

    return classes.filter(c => {
      return confirmedBookings.some((b: any) => {
        // Match by schedule_id and date
        const matchesSchedule = b.scheduleId === c.scheduleId;

        // Match by date (compare date strings)
        const bookingDate = b.classDate ? new Date(b.classDate).toISOString().split('T')[0] : null;
        const classDate = c.date;
        const matchesDate = bookingDate === classDate;

        return matchesSchedule && matchesDate;
      });
    });
  }, [bookings, classes]);

  const getUpcomingClasses = useCallback(() => {
    const now = new Date();
    return classes.filter(c => new Date(c.date + ' ' + c.time) > now);
  }, [classes]);

  const isClassBooked = useCallback((classInfo: Class | string) => {
    const classItem =
      typeof classInfo === 'string'
        ? classes.find(c => c.id === classInfo)
        : classInfo;

    if (!classItem) return false;

    const classDate = classItem.date;

    return bookings.some((b: any) => {
      const matchesSchedule = b.scheduleId === classItem.scheduleId;
      const bookingDate = b.classDate ? formatDateKey(new Date(b.classDate)) : null;
      const matchesDate = bookingDate === classDate;
      return matchesSchedule && matchesDate && b.status === 'confirmed';
    });
  }, [bookings, classes]);

  const getClassBooking = useCallback((classId: string) => {
    // classId is the schedule UUID from the displayed classes
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return undefined;

    return bookings.find((b: any) => {
      const matchesSchedule = b.scheduleId === classItem.scheduleId;
      const bookingDate = b.classDate ? formatDateKey(new Date(b.classDate)) : null;
      const matchesDate = bookingDate === classItem.date;
      return matchesSchedule && matchesDate && b.status === 'confirmed';
    });
  }, [bookings, classes]);

  const getClassAttendanceCount = useCallback(() => {
    return bookings.filter(b => b.attendedAt || b.status === 'completed').length;
  }, [bookings]);

  const getClassBookings = useCallback(async (classId: string) => {
    try {
      // classId is the schedule UUID, we need to find the actual class instance
      const classItem = classes.find(c => c.id === classId);
      if (!classItem) {
        console.error('Class not found:', classId);
        return [];
      }

      // Find the actual class instance ID from the classes table
      const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
      const { data: classInstance, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('schedule_id', classItem.scheduleId)
        .eq('class_date', classDateTime.toISOString())
        .single();

      if (classError || !classInstance) {
        console.log('No class instance found yet (no bookings)');
        return [];
      }

      // Now get the bookings with profile data using the actual class instance ID
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('class_bookings')
        .select('*, profiles:user_id(id, name, email, avatar_url, full_name)')
        .eq('class_id', classInstance.id)
        .in('status', ['confirmed', 'completed', 'no_show']);

      if (bookingsError) {
        console.error('Error fetching class bookings:', bookingsError);
        return [];
      }

      if (!bookingsData) return [];

      // Then, fetch achievements for each user
      const enrichedBookings = await Promise.all(
        bookingsData.map(async (booking: any) => {
          if (!booking.profiles?.id) return booking;

          // Convert UUID to string for user_achievements table
          const userId = booking.profiles.id.toString();

          const { data: achievementsData } = await supabase
            .from('user_achievements')
            .select(`
              achievement_id,
              achievements:achievement_id (
                id,
                name,
                icon,
                catagory
              )
            `)
            .eq('user_id', userId)
            .eq('completed', true);

          return {
            ...booking,
            profiles: {
              ...booking.profiles,
              user_achievements: achievementsData || [],
            },
          };
        })
      );

      return enrichedBookings;
    } catch (error) {
      console.error('Error in getClassBookings:', error);
      return [];
    }
  }, [classes]);

  return useMemo(() => ({
    classes,
    bookings,
    isLoading: bookingsQuery.isLoading || schedulesQuery.isLoading,
    bookClass,
    cancelBooking,
    getMyClasses,
    getUpcomingClasses,
    isClassBooked,
    getClassBooking,
    getClassAttendanceCount,
    getClassBookings,
  }), [classes, bookings, bookingsQuery.isLoading, schedulesQuery.isLoading, bookClass, cancelBooking, getMyClasses, getUpcomingClasses, isClassBooked, getClassBooking, getClassAttendanceCount, getClassBookings]);
});
