import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Workout } from '@/constants/types';
import { mockHealthMetrics } from '@/constants/mockData';
import { useAuth } from './AuthContext';
import { supabase } from '@/constants/supabase';

export const [WorkoutProvider, useWorkouts] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workoutsQuery = useQuery({
    queryKey: ['workouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: workoutsData, error } = await supabase
        .from('workouts')
        .select(`
          *,
          exercises:workout_exercises(
            id,
            exercise_name,
            sets,
            reps,
            weight,
            notes,
            order_index
          )
        `)
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false });

      if (error) {
        console.error('[Workouts] Fetch error:', error);
        throw error;
      }

      // Transform data to match Workout type
      return (workoutsData || []).map((workout: any) => ({
        id: workout.id,
        userId: workout.user_id,
        title: workout.title,
        date: workout.workout_date,
        duration: workout.duration,
        calories: workout.calories,
        type: workout.workout_type,
        exercises: (workout.exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          notes: ex.notes,
        })),
        notes: workout.notes,
        heartRateAvg: workout.heart_rate_avg,
        heartRateMax: workout.heart_rate_max,
        distance: workout.distance,
      })) as Workout[];
    },
    enabled: !!user?.id,
  });

  const addWorkoutMutation = useMutation({
    mutationFn: async (workout: Omit<Workout, 'id'>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Insert workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          title: workout.title,
          workout_date: workout.date,
          duration: workout.duration,
          calories: workout.calories,
          workout_type: workout.type,
          notes: workout.notes,
          heart_rate_avg: workout.heartRateAvg,
          heart_rate_max: workout.heartRateMax,
          distance: workout.distance,
        })
        .select()
        .single();

      if (workoutError) {
        console.error('[Workouts] Insert error:', workoutError);
        throw workoutError;
      }

      // Insert exercises if any
      if (workout.exercises && workout.exercises.length > 0) {
        const exercisesData = workout.exercises.map((ex, index) => ({
          workout_id: workoutData.id,
          exercise_name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          notes: ex.notes,
          order_index: index,
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesData);

        if (exercisesError) {
          console.error('[Workouts] Exercises insert error:', exercisesError);
          throw exercisesError;
        }
      }

      // Update total_workouts count in profile
      // Manual update since we don't have increment RPC function yet
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('total_workouts')
        .eq('id', user.id)
        .single();

      await supabase
        .from('profiles')
        .update({ total_workouts: (currentProfile?.total_workouts || 0) + 1 })
        .eq('id', user.id);

      return workoutData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const updateWorkoutMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workout> }) => {
      const { data, error } = await supabase
        .from('workouts')
        .update({
          title: updates.title,
          workout_date: updates.date,
          duration: updates.duration,
          calories: updates.calories,
          workout_type: updates.type,
          notes: updates.notes,
          heart_rate_avg: updates.heartRateAvg,
          heart_rate_max: updates.heartRateMax,
          distance: updates.distance,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Workouts] Update error:', error);
        throw error;
      }

      // Update exercises if provided
      if (updates.exercises) {
        // Delete existing exercises
        await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', id);

        // Insert new exercises
        if (updates.exercises.length > 0) {
          const exercisesData = updates.exercises.map((ex, index) => ({
            workout_id: id,
            exercise_name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            notes: ex.notes,
            order_index: index,
          }));

          await supabase
            .from('workout_exercises')
            .insert(exercisesData);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', user?.id] });
    },
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: async (id: string) => {
      // Exercises will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Workouts] Delete error:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', user?.id] });
    },
  });

  const addWorkout = useCallback((workout: Omit<Workout, 'id'>) => {
    return addWorkoutMutation.mutateAsync(workout);
  }, [addWorkoutMutation]);

  const updateWorkout = useCallback((id: string, updates: Partial<Workout>) => {
    return updateWorkoutMutation.mutateAsync({ id, updates });
  }, [updateWorkoutMutation]);

  const deleteWorkout = useCallback((id: string) => {
    return deleteWorkoutMutation.mutateAsync(id);
  }, [deleteWorkoutMutation]);

  const getWorkoutsByDateRange = useCallback((startDate: string, endDate: string) => {
    const workouts = workoutsQuery.data || [];
    return workouts.filter(w => w.date >= startDate && w.date <= endDate);
  }, [workoutsQuery.data]);

  const getTotalStats = useCallback(() => {
    const workouts = workoutsQuery.data || [];
    const total = workouts.reduce((acc, workout) => ({
      workouts: acc.workouts + 1,
      duration: acc.duration + workout.duration,
      calories: acc.calories + (workout.calories || 0),
      distance: acc.distance + (workout.distance || 0),
    }), { workouts: 0, duration: 0, calories: 0, distance: 0 });

    return total;
  }, [workoutsQuery.data]);

  const getWeekStats = useCallback(() => {
    const workouts = workoutsQuery.data || [];
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekWorkouts = workouts.filter(w => new Date(w.date) >= weekAgo);

    return weekWorkouts.reduce((acc, workout) => ({
      workouts: acc.workouts + 1,
      duration: acc.duration + workout.duration,
      calories: acc.calories + (workout.calories || 0),
    }), { workouts: 0, duration: 0, calories: 0 });
  }, [workoutsQuery.data]);

  const getTotalWeight = useCallback(() => {
    const workouts = workoutsQuery.data || [];
    return workouts.reduce((total, workout) => {
      const workoutWeight = workout.exercises.reduce((sum, exercise) => {
        return sum + (exercise.weight || 0) * exercise.sets * exercise.reps;
      }, 0);
      return total + workoutWeight;
    }, 0);
  }, [workoutsQuery.data]);

  const syncHealthData = useCallback(async () => {
    console.log('Syncing health data from device...');
  }, []);

  return useMemo(() => ({
    workouts: workoutsQuery.data || [],
    healthMetrics: mockHealthMetrics,
    isLoading: workoutsQuery.isLoading,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutsByDateRange,
    getTotalStats,
    getWeekStats,
    getTotalWeight,
    syncHealthData,
  }), [workoutsQuery.data, workoutsQuery.isLoading, addWorkout, updateWorkout, deleteWorkout, getWorkoutsByDateRange, getTotalStats, getWeekStats, getTotalWeight, syncHealthData]);
});
