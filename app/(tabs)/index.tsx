import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/contexts/AchievementsContext';
import { UpcomingWorkoutsWidget } from '@/components/home/UpcomingWorkoutsWidget';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { Icon } from '@/components/ui/icon';
import { DumbbellIcon, TrophyIcon, ShoppingCartIcon } from '@/components/QuickToolsIcons';
import { Lock } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const cardWidth = (width - 52) / 2; // splitRow padding (20*2) + gap (12)

// --- Helper Functions ---
const getHebrewDate = () => {
  const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  const date = new Date();
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${dayName}, ${day} ב${month}`;
};

// Format expiry date in Hebrew
const formatExpiryDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

// --- Components ---

// --- Components ---
// Previous components (WorkoutsCard, StatusCard, ActionCard) removed in redesign

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    getCurrentTask,
    getHighestCompletedAchievement,
    newlyUnlockedAchievement,
    hasSeenUnlockDialog,
    markUnlockSeen,
  } = useAchievements();

  // Get the user's highest completed achievement badge
  const userBadge = getHighestCompletedAchievement();

  /*
   * Dynamic Weekly Goal Logic
   */
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0);
  const [workoutsLastWeek, setWorkoutsLastWeek] = useState(0);
  const [motivationText, setMotivationText] = useState('');
  const [toolsActiveIndex, setToolsActiveIndex] = useState(0);
  const toolsScrollRef = useRef<ScrollView>(null);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Header */}
        <View style={styles.headerWrapper}>
          <LinearGradient
            colors={['#2d2d2d', '#111111', '#000000']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.headerCard}
          >
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarContainer}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarLight} />
              ) : (
                <View style={[styles.avatarLight, styles.avatarPlaceholderLight]}>
                  <Text style={styles.avatarInitialsLight}>{user?.name?.slice(0, 1).toUpperCase() || '?'}</Text>
                </View>
              )}
              {/* Achievement Badge */}
              {userBadge && (
                <View style={styles.avatarBadge}>
                  <Image source={{ uri: userBadge.icon }} style={styles.avatarBadgeIcon} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.greetingTitleLight}>היי, {user?.name?.split(' ')[0] || 'אורח'}</Text>
              <Text style={styles.dateSubtitleLight}>{getHebrewDate()}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* 2. Upcoming Classes Widget */}
        <View style={styles.heroSection}>
          <UpcomingWorkoutsWidget />
        </View>

        {/* Divider after upcoming classes */}
        <View style={styles.divider} />

        {/* 3. Membership Status Widget */}
        {(() => {
          const sub = user?.subscription;
          const hasActiveSubscription = sub?.status === 'active';
          const isTicket = sub?.isTicket;
          const totalSessions = sub?.totalSessions || 0;
          const sessionsRemaining = sub?.sessionsRemaining || 0;
          // Progress fills as user books classes (used = total - remaining)
          const sessionsUsed = totalSessions - sessionsRemaining;
          const progressPercent = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0;

          // Render plan title/image
          const renderPlanTitle = () => {
            if (!sub?.planName) {
              return <Text style={styles.membershipTitle}>הסטטוס שלי</Text>;
            }
            const name = sub.planName.toUpperCase();
            if (name.includes('ELITE')) {
              return <Image source={require('@/assets/images/reel-elite.png')} style={styles.planImage} resizeMode="contain" />;
            } else if (name.includes('ONE')) {
              return <Image source={require('@/assets/images/reel-one.png')} style={styles.planImage} resizeMode="contain" />;
            } else if (name.includes('10') || totalSessions === 10) {
              return <Image source={require('@/assets/images/10sessions.png')} style={styles.planImage} resizeMode="contain" />;
            } else if (name.includes('20') || totalSessions === 20) {
              return <Image source={require('@/assets/images/20sessions.png')} style={styles.planImage} resizeMode="contain" />;
            }
            return <Text style={styles.membershipTitle}>{sub.planName}</Text>;
          };

          return (
            <View style={styles.membershipCard}>
              <View style={styles.membershipHeader}>
                {renderPlanTitle()}
                <View style={[styles.activeBadge, !hasActiveSubscription && styles.inactiveBadge]}>
                  <View style={[styles.activeDot, !hasActiveSubscription && styles.inactiveDot]} />
                  <Text style={[styles.activeText, !hasActiveSubscription && styles.inactiveText]}>
                    {hasActiveSubscription ? 'פעיל' : 'לא פעיל'}
                  </Text>
                </View>
              </View>

              {/* Progress bar - only for tickets - fills as user books */}
              {hasActiveSubscription && isTicket && (
                <View style={styles.punchProgressContainer}>
                  <View style={styles.punchTrack}>
                    <View style={[styles.punchFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.punchText}>
                    {sessionsUsed} / {totalSessions} כניסות בוצעו
                  </Text>
                </View>
              )}

              {/* For unlimited subscriptions, show active task instead of "unlimited" text */}
              {hasActiveSubscription && !isTicket && currentTask && (
                <View style={styles.activeTaskContainer}>
                  <View style={styles.taskIconWrapper}>
                    <Image source={{ uri: currentTask.icon }} style={styles.taskIcon} />
                    <View style={styles.taskLockOverlay}>
                      <Lock size={10} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.taskProgressSection}>
                    <Text style={styles.taskProgressText}>
                      {attendedCount} / {currentTask.task_requirement}
                    </Text>
                    <View style={styles.taskProgressBar}>
                      <View style={[styles.taskProgressFill, { width: `${taskProgress}%` }]} />
                    </View>
                  </View>
                </View>
              )}

              {/* Fallback for unlimited if no task available */}
              {hasActiveSubscription && !isTicket && !currentTask && (
                <View style={styles.unlimitedContainer}>
                  <Icon name="infinity" size={16} color={Colors.primary} />
                  <Text style={styles.unlimitedText}>כניסות ללא הגבלה</Text>
                </View>
              )}

              <View style={styles.membershipFooter}>
                <Text style={styles.validUntilText}>
                  {hasActiveSubscription
                    ? `בתוקף עד ${formatExpiryDate(sub?.endDate)}`
                    : 'אין מנוי פעיל'
                  }
                </Text>
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={() => router.push(hasActiveSubscription ? '/subscription-management' as any : '/shop' as any)}
                >
                  <Text style={styles.renewButtonText}>
                    {hasActiveSubscription ? 'ניהול מנוי' : 'לחנות'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* 4. Split Row: Weekly Goal & Quick Actions */}
        <View style={styles.splitRow}>
          {/* Weekly Goal (Left) */}
          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <Text style={styles.weeklyLabel}>אימונים השבוע</Text>
              <Icon name="fire" size={16} color="#F59E0B" />
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

          {/* Quick Actions (Right) */}
          <View style={styles.toolsCard}>
            <ScrollView
              ref={toolsScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (cardWidth - 32));
                setToolsActiveIndex(index);
              }}
              style={styles.toolsCarousel}
            >
              <TouchableOpacity style={[styles.carouselPage, { width: cardWidth - 32 }]} onPress={() => router.push('/performance' as any)}>
                <DumbbellIcon size={48} />
                <Text style={styles.toolName} numberOfLines={1}>יומן ביצועים</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.carouselPage, { width: cardWidth - 32 }]} onPress={() => router.push('/shop' as any)}>
                <ShoppingCartIcon size={48} />
                <Text style={styles.toolName}>חנות</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.carouselPage, { width: cardWidth - 32 }]} onPress={() => router.push('/achievements' as any)}>
                <TrophyIcon size={48} />
                <Text style={styles.toolName}>הישגים</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.pagination}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.dot, toolsActiveIndex === i && styles.dotActive]} />
              ))}
            </View>
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
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'left',
  },
  dateSubtitleLight: {
    fontSize: 14,
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

  // Split Row
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  weeklyCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    justifyContent: 'space-between',
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weeklyLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 11,
    color: '#9CA3AF',
  },
  lastWeekValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Tools Card
  toolsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  toolsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'left',
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolItem: {
    alignItems: 'center',
    gap: 6,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
  },
  toolsCarousel: {
    flexGrow: 0,
  },
  carouselPage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 16,
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
