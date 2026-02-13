import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import type { TopClient } from '@/hooks/useTopClients';

const { width } = Dimensions.get('window');

interface TopClientsPodiumProps {
  topClients: TopClient[];
  loading?: boolean;
}

const MEDAL_COLORS = {
  gold: '#FFD700',
  goldAccent: '#FFC700',
  silver: '#C0C0C0',
  silverAccent: '#E8E8E8',
  bronze: '#CD7F32',
  bronzeAccent: '#D4A574',
};

export default function TopClientsPodium({ topClients, loading }: TopClientsPodiumProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  if (!topClients || topClients.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>אין נתונים לשבוע שעבר</Text>
      </View>
    );
  }

  // Pad to 3 if fewer
  const first = topClients[0];
  const second = topClients.length > 1 ? topClients[1] : null;
  const third = topClients.length > 2 ? topClients[2] : null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return name[0] || '?';
  };

  const renderAvatar = (
    user: TopClient,
    borderColor: string,
    size: number,
    rank: number,
    badgeColor: string
  ) => (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
            borderWidth: 3,
          },
        ]}
      >
        {user.avatarUrl ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>
            {getInitials(user.name)}
          </Text>
        )}
      </View>
      <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
    </View>
  );

  const isSmall = width < 380;
  const barWidths = isSmall ? { first: 100, other: 88 } : { first: 115, other: 100 };
  const barHeights = isSmall
    ? { first: 60, second: 44, third: 32 }
    : { first: 70, second: 52, third: 38 };
  const avatarSize = isSmall ? 46 : 52;

  const renderPosition = (
    user: TopClient | null,
    rank: number,
    barHeight: number,
    barWidth: number,
    barColor: string,
    borderColor: string,
    badgeColor: string,
    size: number
  ) => {
    if (!user) return <View style={{ width: barWidth }} />;
    return (
      <View style={styles.position}>
        {renderAvatar(user, borderColor, size, rank, badgeColor)}
        <Text style={styles.athleteName} numberOfLines={2}>
          {user.name}
        </Text>
        <View
          style={[
            styles.podiumBar,
            { height: barHeight, width: barWidth, backgroundColor: barColor },
          ]}
        >
          <Text style={styles.podiumBarCount}>{user.count}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>המתמידים של שבוע שעבר</Text>

      <View style={styles.podiumContainer}>
          {/* 3rd — left */}
          {renderPosition(
            third,
            3,
            barHeights.third,
            barWidths.other,
            MEDAL_COLORS.bronzeAccent,
            MEDAL_COLORS.bronze,
            MEDAL_COLORS.bronze,
            avatarSize - 8
          )}

          {/* 1st — center */}
          {renderPosition(
            first,
            1,
            barHeights.first,
            barWidths.first,
            MEDAL_COLORS.goldAccent,
            MEDAL_COLORS.gold,
            MEDAL_COLORS.gold,
            avatarSize
          )}

          {/* 2nd — right */}
          {renderPosition(
            second,
            2,
            barHeights.second,
            barWidths.other,
            MEDAL_COLORS.silverAccent,
            MEDAL_COLORS.silver,
            MEDAL_COLORS.silver,
            avatarSize - 8
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 18,
    textAlign: 'center',
    color: '#374151',
    writingDirection: 'rtl',
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  position: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontWeight: '700',
    color: '#6B7280',
  },
  rankBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rankText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  athleteName: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    color: '#374151',
    maxWidth: 90,
    writingDirection: 'rtl',
  },
  attendanceCount: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#9CA3AF',
    writingDirection: 'rtl',
  },
  podiumBar: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  podiumBarCount: {
    fontSize: 22,
    fontWeight: '900',
    color: 'rgba(0,0,0,0.45)',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    writingDirection: 'rtl',
  },
});
