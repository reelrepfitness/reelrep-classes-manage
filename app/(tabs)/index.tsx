import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import { UpcomingWorkoutsWidget } from '@/components/home/UpcomingWorkoutsWidget';
import { HomeHeader } from '@/components/home/HomeHeader';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { Icon } from '@/components/ui/icon';
import { DumbbellIcon, TrophyIcon, ShoppingCartIcon } from '@/components/QuickToolsIcons';
import { Lock } from 'lucide-react-native';
import TopClientsPodium from '@/components/home/TopClientsPodium';
import { useTopClients } from '@/hooks/useTopClients';

const { width } = Dimensions.get('window');
const cardWidth = (width - 52) / 2; // splitRow padding (20*2) + gap (12)

// --- Components ---

// --- Components ---
// Previous components (WorkoutsCard, StatusCard, ActionCard) removed in redesign

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refreshPodium()]);
    setRefreshing(false);
  };
  const {
    getCurrentTask,
    newlyUnlockedAchievement,
    hasSeenUnlockDialog,
    markUnlockSeen,
  } = useAchievements();

  /*
   * Dynamic Weekly Goal Logic
   */
  // TODO: restore real data — const { topClients, currentUserRank, loading: podiumLoading, refresh: refreshPodium } = useTopClients(user?.id);
  const refreshPodium = async () => {};
  const podiumLoading = false;
  const currentUserRank = 14;
  const topClients = [
    { userId: '1', name: 'שרה מילר', count: 12, avatarUrl: undefined },
    { userId: '2', name: 'ירדן דוד', count: 10, avatarUrl: undefined },
    { userId: '3', name: 'אלכס כהן', count: 8, avatarUrl: undefined },
  ];
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [workoutsLastWeek, setWorkoutsLastWeek] = useState(0);
  const [motivationText, setMotivationText] = useState('');
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  // Get current active task
  const { achievement: currentTask, progress: attendedCount } = getCurrentTask();
  const taskProgress = currentTask
    ? Math.min((attendedCount / currentTask.task_requirement) * 100, 100)
    : 0;

  // Show unlock dialog when there's a new unlock
  useEffect(() => {
    if (newlyUnlockedAchievement && !hasSeenUnlockDialog) {
      // Slight delay for better UX
      const timer = setTimeout(() => setShowUnlockDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlockedAchievement, hasSeenUnlockDialog]);

  const handleDismissUnlockDialog = () => {
    setShowUnlockDialog(false);
    markUnlockSeen();
  };

  // Helper to get random message based on count & gender
  const getMotivationMessage = (count: number, gender: string = 'male', name: string = '') => {
    // Default to 'male' if undefined, but check specific string
    const isFemale = gender?.toLowerCase() === 'female';
    const messages: Record<number | string, string[]> = {
      0: [
        "וואלה?",
        "לא הבנתי...",
        isFemale ? "חכי כשאיוון ישמע על זה" : "חכה כשאיוון ישמע על זה",
        "נראה לי זה הזמן לקבוע"
      ],
      1: [
        "זהו? פחחח",
        "יאללה, קל עוד אחד",
        "וזה מספיק? לא נראה לי.",
        "דוואי, עוד אחד השבוע!"
      ],
      2: [
        "דיבור. אבל אפשר עוד.",
        "ככה מגיעים לתוצאות, שאפו."
      ],
      3: [
        `רמה גבוהה, ${name}`,
        "היידה ככה אני אוהב!"
      ],
      // 4, 5, 6+
      'high': [
        isFemale ? "את נכנסת איתי בשכירות, כן?" : "אתה נכנס איתי בשכירות, כן?",
        isFemale ? "יום מנוחה, מכירה?" : "יום מנוחה, מכיר?",
        isFemale ? "עף עלייך ברמות!" : "עף עליך ברמות!"
      ]
    };

    let options = [];
    if (count >= 4) {
      options = messages['high'];
    } else {
      options = messages[count] || messages[0];
    }

    // Pick random
    return options[Math.floor(Math.random() * options.length)];
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchWeeklyWorkouts = async () => {
      const now = new Date();
      // Start of this week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Start and end of last week
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfWeek);

      // Fetch this week
      const { count } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('attended_at', startOfWeek.toISOString());

      // Fetch last week
      const { count: lastWeekCount } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('attended_at', startOfLastWeek.toISOString())
        .lt('attended_at', endOfLastWeek.toISOString());

      const countVal = count || 0;
      setWorkoutsThisWeek(countVal);
      setWorkoutsLastWeek(lastWeekCount || 0);
      setMotivationText(getMotivationMessage(countVal, user.gender, user.name?.split(' ')[0]));
    };

    fetchWeeklyWorkouts();
  }, [user?.id, user?.gender]);

  return (
    <View style={styles.container}>
      {/* Collapsible Profile Header */}
      <HomeHeader />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 1. Upcoming Classes Widget */}
        <View style={styles.heroSection}>
          <UpcomingWorkoutsWidget />
        </View>

        {/* Divider after upcoming classes */}
        <View style={styles.divider} />

        {/* 3. Full-width Weekly Card: Podium + User's Weekly Data */}
        <View style={styles.weeklyCardFull}>
          {/* Top 3 Podium */}
          <TopClientsPodium topClients={topClients} loading={podiumLoading} />

          {/* Divider */}
          <View style={styles.weeklyCardDivider} />

          {/* Current user's weekly data — 2 columns */}
          <View style={styles.weeklyUserSection}>
            <View style={styles.weeklyColumns}>
              {/* Column 1: User's rank last week */}
              <View style={[styles.weeklyColNarrow, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={styles.rankLabel}>המיקום שלך</Text>
                <Text style={styles.rankValue}>
                  {currentUserRank != null ? `#${currentUserRank}` : '—'}
                </Text>
                <Text style={styles.rankSublabel}>שבוע שעבר</Text>
              </View>

              {/* Vertical divider */}
              <View style={styles.weeklyColDivider} />

              {/* Column 2: Workouts this week */}
              <View style={styles.weeklyCol}>
                <View style={styles.weeklyHeader}>
                  <Text style={styles.weeklyLabel}>אימונים השבוע</Text>
                  <Icon name="fire" size={18} color="#F59E0B" />
                </View>
                <View style={styles.weeklyContent}>
                  <Text style={styles.weeklyValue}>{workoutsThisWeek}</Text>
                  <Text style={styles.weeklySubtext}>{motivationText}</Text>
                </View>
                <View style={styles.lastWeekRow}>
                  <Text style={styles.lastWeekLabel}>שבוע שעבר:</Text>
                  <Text style={styles.lastWeekValue}>{workoutsLastWeek}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Action Cards Row: Performance Log (big) + stacked Achievements & Store */}
        <View style={styles.actionCardsRow}>
          <TouchableOpacity
            style={styles.actionCardLarge}
            onPress={() => router.push('/performance' as any)}
          >
            <DumbbellIcon size={44} />
            <Text style={styles.actionCardLabelLarge}>יומן ביצועים</Text>
          </TouchableOpacity>

          <View style={styles.actionCardsColumn}>
            <TouchableOpacity
              style={styles.actionCardSmall}
              onPress={() => router.push('/achievements' as any)}
            >
              <TrophyIcon size={28} />
              <Text style={styles.actionCardLabel}>הישגים</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardSmall}
              onPress={() => router.push('/shop' as any)}
            >
              <ShoppingCartIcon size={28} />
              <Text style={styles.actionCardLabel}>חנות</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Achievement Unlock Dialog */}
      <Modal visible={showUnlockDialog} transparent animationType="fade">
        <View style={styles.unlockOverlay}>
          <Animated.View style={styles.unlockDialog}>
            {newlyUnlockedAchievement && (
              <>
                <Image
                  source={{ uri: newlyUnlockedAchievement.icon }}
                  style={styles.unlockIcon}
                />
                <Text style={styles.unlockTitle}>
                  {newlyUnlockedAchievement.description || newlyUnlockedAchievement.name}
                </Text>
                <TouchableOpacity
                  style={styles.unlockButton}
                  onPress={handleDismissUnlockDialog}
                >
                  <Text style={styles.unlockButtonText}>מדהים! 🎉</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 6,
    gap: 12,
  },
  headerWrapper: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerTextContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
    textAlign: 'left',
  },
  greetingTitleLight: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  dateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'left',
  },
  dateSubtitleLight: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    textAlign: 'left',
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 26,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: '#fff',
  },
  avatarLight: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: Colors.primary,
  },
  avatarPlaceholderLight: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitials: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  avatarInitialsLight: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarBadgeIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },

  // Hero
  heroSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginBottom: 24,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  // Membership Status Widget
  membershipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  membershipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  inactiveBadge: {
    backgroundColor: '#FEF2F2',
  },
  inactiveDot: {
    backgroundColor: '#EF4444',
  },
  inactiveText: {
    color: '#EF4444',
  },
  planImage: {
    width: 120,
    height: 24,
  },
  unlimitedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  unlimitedText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  punchProgressContainer: {
    gap: 8,
    marginBottom: 16,
  },
  punchTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  punchFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  punchText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'left',
    fontWeight: '500',
  },
  membershipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  validUntilText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  renewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  renewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Full-width Weekly Card
  weeklyCardFull: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  weeklyCardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  weeklyUserSection: {
    paddingTop: 4,
  },
  weeklyColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  weeklyCol: {
    flex: 7,
  },
  weeklyColNarrow: {
    flex: 3,
  },
  weeklyColDivider: {
    width: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
  },
  rankLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  rankValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFD700',
  },
  rankSublabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1D5DB',
    marginTop: 4,
    writingDirection: 'rtl',
  },
  // Plan Card Row (standalone)
  planCardRow: {
    paddingHorizontal: 20,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weeklyLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  weeklyContent: {
    gap: 4,
  },
  weeklyValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'left',
  },
  weeklySubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'left',
  },
  lastWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lastWeekLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#bdbdbdff',
  },
  lastWeekValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#bcbcbcff',
  },

  // Action Cards Row
  actionCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  actionCardLarge: {
    flex: 6,
    backgroundColor: '#ffffffff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 130,
    shadowColor: '#000000ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  actionCardLabelLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000ff',
    textAlign: 'center',
  },
  actionCardsColumn: {
    flex: 4,
    gap: 12,
  },
  actionCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  actionCardLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000ff',
    textAlign: 'center',
  },

  // Compact Plan Card
  planCardCompact: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  planBadgeStrip: {
    backgroundColor: '#e7e7e8ff',
    borderRadius: 10,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  planBadgeImage: {
    width: 80,
    height: 22,
    transform: [{ rotate: '90deg' }],
  },
  planCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ringValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  ringTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  unlimitedRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSubRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expirySmall: {
    fontSize: 13,
    color: '#76797eff',
    fontWeight: '600',
    marginTop: 8,
  },

  // Active Task Styles
  activeTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  taskIconWrapper: {
    position: 'relative',
  },
  taskIcon: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  taskLockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  taskProgressSection: {
    flex: 1,
  },
  taskProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'left',
  },
  taskProgressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  taskProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  // Unlock Dialog Styles
  unlockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockDialog: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  unlockIcon: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  unlockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
