import { useState, useEffect } from 'react';
import { supabase } from '@/constants/supabase';

export interface TopClient {
  userId: string;
  name: string;
  count: number;
  avatarUrl?: string;
}

export function useTopClients(currentUserId?: string) {
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTopClients = async () => {
    try {
      setLoading(true);

      // Calculate previous week (Sunday → Saturday, Israeli week)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday

      // Start of THIS week (Sunday 00:00)
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - dayOfWeek);
      startOfThisWeek.setHours(0, 0, 0, 0);

      // Previous week: Sunday 00:00 (7 days before this Sunday) → this Sunday 00:00
      const prevWeekStart = new Date(startOfThisWeek);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = startOfThisWeek;

      const { data, error } = await supabase
        .from('class_bookings')
        .select('user_id, classes!inner(class_date), profiles:user_id!inner(full_name, name, avatar_url)')
        .in('status', ['confirmed', 'completed'])
        .gte('classes.class_date', prevWeekStart.toISOString())
        .lt('classes.class_date', prevWeekEnd.toISOString());

      if (error || !data) {
        console.error('Error fetching top clients:', error);
        setTopClients([]);
        setCurrentUserRank(null);
        return;
      }

      // Group by user_id and count
      const userMap = new Map<string, { name: string; count: number; avatarUrl?: string }>();

      data.forEach((row: any) => {
        const userId = row.user_id;
        const profile = row.profiles;
        const displayName = profile?.full_name || profile?.name || 'Unknown';
        const avatarUrl = profile?.avatar_url || undefined;

        if (userMap.has(userId)) {
          userMap.get(userId)!.count++;
        } else {
          userMap.set(userId, { name: displayName, count: 1, avatarUrl });
        }
      });

      // Sort by count DESC — full ranking
      const sorted = Array.from(userMap.entries())
        .map(([userId, info]) => ({ userId, ...info }))
        .sort((a, b) => b.count - a.count);

      // Find current user's rank (1-based)
      if (currentUserId) {
        const idx = sorted.findIndex((u) => u.userId === currentUserId);
        setCurrentUserRank(idx >= 0 ? idx + 1 : null);
      } else {
        setCurrentUserRank(null);
      }

      setTopClients(sorted.slice(0, 3));
    } catch (err) {
      console.error('Error in useTopClients:', err);
      setTopClients([]);
      setCurrentUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopClients();
  }, [currentUserId]);

  return { topClients, currentUserRank, loading, refresh: fetchTopClients };
}
