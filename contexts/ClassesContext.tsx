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
  const { user, isAdmin, refreshUser } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);

  const schedulesQuery = useQuery({
    queryKey: ['class-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*, coach:coach_id(avatar_url)')
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
            id: `${schedule.id}_${dateKey}`, // Unique ID for each class instance
            scheduleId: schedule.id,
            classDate: classDate.toISOString(),
            title: schedule.name,
            instructor: schedule.coach_name,
            instructorAvatar: (schedule.coach as any)?.avatar_url || null,
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



  // Fetch all bookings to calculate accurate enrolled counts
  const allBookingsQuery = useQuery({
    queryKey: ['all-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_bookings')
        .select('class_id, status, classes:class_id(schedule_id, class_date), profiles:user_id(avatar_url)')
        .in('status', ['confirmed', 'completed', 'no_show', 'waiting_list']);

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
    if (!schedulesQuery.data || schedulesQuery.data.length === 0) {
      return;
    }

    // If bookings haven't loaded yet, show classes with enrolled: 0
    if (!allBookingsQuery.data) {
      setClasses(schedulesQuery.data);
      return;
    }

    // Use schedulesQuery.data as base to avoid stale closure issues
    const updatedClasses = schedulesQuery.data.map(classItem => {
      // Count bookings that match this schedule and date
      const classBookings = allBookingsQuery.data.filter((b: any) => {
        if (!b.classes) return false;

        // Match by schedule_id
        const matchesSchedule = b.classes.schedule_id === classItem.scheduleId;

        // Match by date (compare date strings)
        const bookingDate = formatDateKey(new Date(b.classes.class_date));
        const classDate = classItem.date;
        const matchesDate = bookingDate === classDate;

        return matchesSchedule && matchesDate;
      });

      const enrolledBookings = classBookings.filter((b: any) =>
        ['confirmed', 'completed', 'no_show'].includes(b.status)
      );
      const waitingListBookings = classBookings.filter((b: any) =>
        b.status === 'waiting_list'
      );

      const enrolledCount = enrolledBookings.length;
      const waitingListCount = waitingListBookings.length;
      const enrolledAvatars = enrolledBookings
        .map((b: any) => b.profiles?.avatar_url as string | undefined)
        .filter((url): url is string => !!url);

      return {
        ...classItem,
        enrolled: enrolledCount,
        waitingListCount,
        enrolledAvatars,
      };
    });

    // Always update classes with the computed enrolled counts
    setClasses(updatedClasses);
  }, [schedulesQuery.data, allBookingsQuery.data]);



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

  // Realtime subscription for User's Bookings
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:class_bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch bookings when any change happens to user's bookings
          bookingsQuery.refetch();
          allBookingsQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookingsQuery, allBookingsQuery]);

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
    if (!user) {
      throw new Error('יש להתחבר כדי להירשם לשיעור');
    }

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

    // Check if already booked using schedule and date (consistent with isClassBooked)
    const existingBooking = bookings.find((b: any) => {
      const matchesSchedule = b.scheduleId === classItem.scheduleId;
      const bookingDate = b.classDate ? formatDateKey(new Date(b.classDate)) : null;
      const matchesDate = bookingDate === classItem.date;
      return matchesSchedule && matchesDate && b.status === 'confirmed';
    });

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

    // Check if user is already booked for this class in database
    const { data: existingDbBooking } = await supabase
      .from('class_bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_id', actualClassId)
      .single();

    if (existingDbBooking) {
      throw new Error('כבר רשום לשיעור זה');
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
      // Check if it's a duplicate booking error
      if (error.code === '23505') {
        throw new Error('כבר רשום לשיעור זה');
      }
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

    // Decrement ticket sessions if user has an active ticket plan
    if (!isAdmin) {
      const { data: activeTicket, error: ticketError } = await supabase
        .from('user_tickets')
        .select('id, sessions_remaining')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('sessions_remaining', 0)
        .gt('expiry_date', new Date().toISOString())
        .order('purchase_date', { ascending: false })
        .limit(1)
        .single();

      if (ticketError) {
        console.error('Error finding active ticket for decrement:', ticketError);
      }

      if (activeTicket) {
        // Try using RPC first (safer and handles status updates atomically)
        const { data: rpcSuccess, error: rpcError } = await supabase
          .rpc('use_ticket_session', { ticket_id: activeTicket.id });

        if (rpcError || !rpcSuccess) {
          console.log('RPC use_ticket_session failed or not found, falling back to manual update:', rpcError);

          // Fallback to manual update
          const newRemaining = activeTicket.sessions_remaining - 1;
          const newStatus = newRemaining <= 0 ? 'depleted' : 'active';

          const { error: updateError } = await supabase
            .from('user_tickets')
            .update({
              sessions_remaining: newRemaining,
              status: newStatus
            })
            .eq('id', activeTicket.id);

          if (updateError) {
            console.error('Error decrementing ticket sessions manually:', updateError);
          } else {
            console.log('Ticket session decremented manually. Remaining:', newRemaining);
          }
        } else {
          console.log('Ticket session decremented via RPC');
        }

        // Refresh user data to update UI (home screen header, profile)
        refreshUser();
      } else {
        console.log('No active ticket found to decrement (or user has unlimited plan)');
      }
    }

    const updated = [...bookings, newBooking];
    setBookings(updated);
    syncBookings(updated);

    // Refetch all bookings to update enrolled counts immediately
    allBookingsQuery.refetch();
    bookingsQuery.refetch();

    return newBooking;
  }, [user, isAdmin, classes, bookings, syncBookings, allBookingsQuery, bookingsQuery, refreshUser]);

  const adminBookClass = useCallback(async (userId: string, classId: string) => {
    // 1. Get class details
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) throw new Error('Class not found');

    const classDateTime = new Date(`${classItem.date}T${classItem.time}`);

    // 2. Ensure class instance exists
    const { data: existingClass } = await supabase
      .from('classes')
      .select('id')
      .eq('schedule_id', classItem.scheduleId)
      .eq('class_date', classDateTime.toISOString())
      .single();

    let actualClassId = existingClass?.id;

    if (!existingClass) {
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
          required_subscription_level: 1, // Default to premium for now or derive
          location: classItem.location,
          location_hebrew: classItem.location,
          class_type: 'general',
          schedule_id: classItem.scheduleId,
        })
        .select('id')
        .single();

      if (createError) throw new Error('Failed to create class instance');
      actualClassId = newClass.id;
    }

    // 3. Insert Booking
    const { error } = await supabase
      .from('class_bookings')
      .insert({
        user_id: userId,
        class_id: actualClassId,
        status: 'confirmed',
      });

    if (error) throw error;

    // Refresh
    allBookingsQuery.refetch();
  }, [classes, allBookingsQuery]);

  const adminCancelBooking = useCallback(async (bookingId: string) => {
    const { error } = await supabase
      .from('class_bookings')
      .delete() // Actually remove it or just cancel? User asked to "remove clients manually". Delete is cleaner for "Force Remove".
      .eq('id', bookingId);

    if (error) throw error;
    allBookingsQuery.refetch();
  }, [allBookingsQuery]);

  const markAttendance = useCallback(async (bookingId: string, status: 'attended' | 'no_show' | 'late' | 'reset') => {
    let updateData: { status: string; attended_at: string | null };

    switch (status) {
      case 'attended':
        updateData = { status: 'completed', attended_at: new Date().toISOString() };
        break;
      case 'no_show':
        updateData = { status: 'no_show', attended_at: null };
        break;
      case 'late':
        updateData = { status: 'late', attended_at: new Date().toISOString() };
        break;
      case 'reset':
        updateData = { status: 'confirmed', attended_at: null };
        break;
    }

    const { error } = await supabase
      .from('class_bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (error) throw error;
  }, []);

  const approveWaitingList = useCallback(async (bookingId: string) => {
    const { error } = await supabase
      .from('class_bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (error) throw error;
    allBookingsQuery.refetch();
  }, [allBookingsQuery]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    // Delete from Supabase
    const { error } = await supabase
      .from('class_bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      console.error('Error canceling booking:', error);
      throw new Error('Failed to cancel booking');
    }

    // Update local state
    const updated = bookings.filter(b => b.id !== bookingId);
    setBookings(updated);
    syncBookings(updated);

    // Refetch to update enrolled counts
    allBookingsQuery.refetch();
    bookingsQuery.refetch();
  }, [bookings, syncBookings, allBookingsQuery, bookingsQuery]);

  const getMyClasses = useCallback(() => {
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

    return classes.filter(c => {
      return confirmedBookings.some((b: any) => {
        // Match by schedule_id and date
        const matchesSchedule = b.scheduleId === c.scheduleId;

        // Match by date (compare date strings using Local Time to match classItem.date)
        const bookingDate = b.classDate ? formatDateKey(new Date(b.classDate)) : null;
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
      // Support both camelCase (from mapped data) and snake_case (fallback)
      const bookingScheduleId = b.scheduleId || b.schedule_id;
      const bookingClassDate = b.classDate || b.class_date;

      const matchesSchedule = bookingScheduleId === classItem.scheduleId;
      const bookingDate = bookingClassDate ? formatDateKey(new Date(bookingClassDate)) : null;
      const matchesDate = bookingDate === classDate;
      return matchesSchedule && matchesDate && b.status === 'confirmed';
    });
  }, [bookings, classes]);

  const getClassBooking = useCallback((classId: string) => {
    // classId is the schedule UUID from the displayed classes
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return undefined;

    return bookings.find((b: any) => {
      // Support both camelCase (from mapped data) and snake_case (fallback)
      const bookingScheduleId = b.scheduleId || b.schedule_id;
      const bookingClassDate = b.classDate || b.class_date;

      const matchesSchedule = bookingScheduleId === classItem.scheduleId;
      const bookingDate = bookingClassDate ? formatDateKey(new Date(bookingClassDate)) : null;
      const matchesDate = bookingDate === classItem.date;
      return matchesSchedule && matchesDate && b.status === 'confirmed';
    });
  }, [bookings, classes]);

  const getClassAttendanceCount = useCallback(() => {
    return bookings.filter(b => b.attendedAt || b.status === 'completed').length;
  }, [bookings]);

  const getClassBookings = useCallback(async (classId: string) => {
    try {
      // classId could be a schedule UUID or a class instance ID
      // First try to find it in our classes array
      const classItem = classes.find(c => c.id === classId);

      let classInstanceId: string;

      if (classItem) {
        // Found in classes array - need to get the instance ID
        const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
        const { data: classInstance, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('schedule_id', classItem.scheduleId)
          .eq('class_date', classDateTime.toISOString())
          .single();

        if (classError || !classInstance) {
          // No class instance yet - return empty array silently
          return [];
        }
        classInstanceId = classInstance.id;
      } else {
        // Not in classes array - try using classId directly as instance ID
        classInstanceId = classId;
      }

      // Now get the bookings with profile data using the actual class instance ID
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('class_bookings')
        .select('*, profiles:user_id(id, name, email, avatar_url, full_name)')
        .eq('class_id', classInstanceId)
        .in('status', ['confirmed', 'completed', 'no_show', 'late', 'waiting_list']);

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
                catagory,
                task_requirement
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
    adminBookClass,
    adminCancelBooking,
    markAttendance,
    approveWaitingList,
  }), [classes, bookings, bookingsQuery.isLoading, schedulesQuery.isLoading, bookClass, cancelBooking, getMyClasses, getUpcomingClasses, isClassBooked, getClassBooking, getClassAttendanceCount, getClassBookings, adminBookClass, adminCancelBooking, markAttendance, approveWaitingList]);
});
