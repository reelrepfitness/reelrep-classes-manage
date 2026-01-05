import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Achievement, UserAchievement } from '@/constants/types';
import { useAuth } from './AuthContext';
import { useClasses } from './ClassesContext';
import { useWorkouts } from './WorkoutContext';
import { supabase } from '@/constants/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const [AchievementsProvider, useAchievements] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getClassAttendanceCount } = useClasses();
  const { getTotalWeight } = useWorkouts();

  const achievementsQuery = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Achievement[];
    },
  });

  const userAchievementsQuery = useQuery({
    queryKey: ['userAchievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((ua: any) => ({
        id: ua.id,
        achievement: ua.achievements,
        progress: ua.progress || 0,
        completed: ua.completed || false,
        dateEarned: ua.date_earned,
        isChallenge: ua.is_challenge,
        acceptedAt: ua.accepted_at,
      })) as UserAchievement[];
    },
    enabled: !!user?.id,
  });

  const acceptChallengeMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      if (!user?.id) throw new Error('User not found');

      const existingChallenge = userAchievementsQuery.data?.find(
        ua => ua.isChallenge && !ua.completed
      );

      if (existingChallenge && existingChallenge.achievement.id !== achievementId) {
        const { error } = await supabase
          .from('user_achievements')
          .delete()
          .eq('id', existingChallenge.id);
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_id: achievementId,
          progress: 0,
          completed: false,
          is_challenge: true,
          accepted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAchievements', user?.id] });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ userAchievementId, progress }: { userAchievementId: string; progress: number }) => {
      const { data, error } = await supabase
        .from('user_achievements')
        .update({ progress })
        .eq('id', userAchievementId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAchievements', user?.id] });
    },
  });

  const calculateProgress = useCallback((achievement: Achievement): number => {
    if (!user) return 0;

    switch (achievement.task_type) {
      case 'classes_attended':
        return getClassAttendanceCount();
      case 'total_weight':
        return getTotalWeight();
      case 'disapline':
        return 0;
      case 'challenge':
        return 0;
      default:
        return 0;
    }
  }, [user, getClassAttendanceCount, getTotalWeight]);

  const getActiveAchievements = useCallback((): UserAchievement[] => {
    if (!userAchievementsQuery.data || !achievementsQuery.data) return [];

    const classAttendance = getClassAttendanceCount();
    const attendanceAchievements = achievementsQuery.data
      .filter(a => a.task_type === 'classes_attended')
      .sort((a, b) => a.task_requirement - b.task_requirement);

    const userAttendanceIds = new Set(
      userAchievementsQuery.data
        .filter(ua => ua.achievement.task_type === 'classes_attended')
        .map(ua => ua.achievement.id)
    );

    const visibleAttendanceAchievements: UserAchievement[] = [];
    let lastUnlockedIndex = -1;

    for (let i = 0; i < attendanceAchievements.length; i++) {
      const achievement = attendanceAchievements[i];

      if (classAttendance >= achievement.task_requirement) {
        lastUnlockedIndex = i;

        if (!userAttendanceIds.has(achievement.id)) {
          const newUserAchievement: UserAchievement = {
            id: achievement.id + '-temp',
            achievement,
            progress: classAttendance,
            completed: true,
            dateEarned: new Date().toISOString(),
            isChallenge: false,
          };
          visibleAttendanceAchievements.push(newUserAchievement);
        } else {
          const existing = userAchievementsQuery.data.find(ua => ua.achievement.id === achievement.id);
          if (existing) {
            visibleAttendanceAchievements.push({
              ...existing,
              progress: classAttendance,
            });
          }
        }
      }
    }

    if (lastUnlockedIndex < attendanceAchievements.length - 1) {
      const nextAchievement = attendanceAchievements[lastUnlockedIndex + 1];
      if (!userAttendanceIds.has(nextAchievement.id)) {
        const newUserAchievement: UserAchievement = {
          id: nextAchievement.id + '-temp',
          achievement: nextAchievement,
          progress: classAttendance,
          completed: false,
          isChallenge: false,
        };
        visibleAttendanceAchievements.push(newUserAchievement);
      } else {
        const existing = userAchievementsQuery.data.find(ua => ua.achievement.id === nextAchievement.id);
        if (existing) {
          visibleAttendanceAchievements.push({
            ...existing,
            progress: classAttendance,
          });
        }
      }
    }

    const nonAttendanceAchievements = userAchievementsQuery.data
      .filter(ua => !ua.completed && ua.achievement.task_type !== 'classes_attended')
      .map(ua => ({
        ...ua,
        progress: calculateProgress(ua.achievement),
      }));

    const active = [...visibleAttendanceAchievements, ...nonAttendanceAchievements]
      .sort((a, b) => {
        if (a.isChallenge && !b.isChallenge) return -1;
        if (!a.isChallenge && b.isChallenge) return 1;
        return 0;
      });

    return active;
  }, [userAchievementsQuery.data, achievementsQuery.data, calculateProgress, getClassAttendanceCount]);

  const getCompletedAchievements = useCallback((): UserAchievement[] => {
    if (!userAchievementsQuery.data) return [];
    return userAchievementsQuery.data.filter(ua => ua.completed);
  }, [userAchievementsQuery.data]);

  const getAvailableAchievements = useCallback((): Achievement[] => {
    if (!achievementsQuery.data) return [];
    const userAchievementIds = userAchievementsQuery.data?.map(ua => ua.achievement.id) || [];
    return achievementsQuery.data.filter(a => !userAchievementIds.includes(a.id));
  }, [achievementsQuery.data, userAchievementsQuery.data]);

  const getChallengeAchievements = useCallback((): Achievement[] => {
    if (!achievementsQuery.data) return [];
    return achievementsQuery.data.filter(a => a.task_type === 'challenge');
  }, [achievementsQuery.data]);

  const acceptChallenge = useCallback((achievementId: string) => {
    acceptChallengeMutation.mutate(achievementId);
  }, [acceptChallengeMutation]);

  const hasActiveChallenge = useCallback((): boolean => {
    return userAchievementsQuery.data?.some(ua => ua.isChallenge && !ua.completed) || false;
  }, [userAchievementsQuery.data]);

  const getActiveChallenge = useCallback((): UserAchievement | null => {
    const challenge = userAchievementsQuery.data?.find(ua => ua.isChallenge && !ua.completed);
    if (!challenge) return null;
    return {
      ...challenge,
      progress: calculateProgress(challenge.achievement),
    };
  }, [userAchievementsQuery.data, calculateProgress]);

  const getTotalPlates = useCallback((): number => {
    if (!userAchievementsQuery.data) return 0;
    return userAchievementsQuery.data
      .filter(ua => ua.completed)
      .reduce((total, ua) => total + ua.achievement.points, 0);
  }, [userAchievementsQuery.data]);

  const updateProgress = useCallback(async (userId: string, type: string, value: number) => {
    // Invalidate queries to refresh derived progress
    await queryClient.invalidateQueries({ queryKey: ['userAchievements', userId] });
    await queryClient.invalidateQueries({ queryKey: ['achievements'] });
  }, [queryClient]);

  return {
    achievements: achievementsQuery.data || [],
    userAchievements: userAchievementsQuery.data || [],
    activeAchievements: getActiveAchievements(),
    completedAchievements: getCompletedAchievements(),
    availableAchievements: getAvailableAchievements(),
    challengeAchievements: getChallengeAchievements(),
    activeChallenge: getActiveChallenge(),
    hasActiveChallenge: hasActiveChallenge(),
    totalPlates: getTotalPlates(),
    isLoading: achievementsQuery.isLoading || userAchievementsQuery.isLoading,
    acceptChallenge,
    calculateProgress,
    updateProgress,
  };
});
