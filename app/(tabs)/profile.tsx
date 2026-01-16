import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Share,
  I18nManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// --- Menu Row Component (RTL Forced) ---
const MenuRow = ({ icon, label, onPress, value, isDestructive, showChevron = true }: any) => (
  <TouchableOpacity
    style={[styles.menuRow, isDestructive && styles.menuRowDestructive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {/* Right Side (Icon + Label) - First in Visual Order for RTL */}
    <View style={styles.menuRowRight}>
      <Text style={[styles.menuLabel, isDestructive && styles.textDestructive]}>{label}</Text>
      <View style={[styles.iconContainer, isDestructive && styles.iconContainerDestructive]}>
        <Ionicons
          name={icon}
          size={18}
          color={isDestructive ? '#EF4444' : '#374151'}
        />
      </View>
    </View>

    {/* Left Side (Chevron/Value) */}
    <View style={styles.menuRowLeft}>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {showChevron && <Ionicons name="chevron-back" size={18} color="#D1D5DB" />}
    </View>
  </TouchableOpacity>
);

// --- Subscription Card Component ---
const SubscriptionCard = ({ user, onPress }: { user: any, onPress: () => void }) => {
  if (!user?.subscription) return null;

  const totalClasses = user.subscription.classesPerMonth || 10;
  const usedClasses = user.subscription.classesUsed || 0;
  const remaining = totalClasses - usedClasses;
  const isUnlimited = user.subscription.type === 'unlimited';

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.cardWrapper} onPress={onPress}>
      <LinearGradient
        colors={['#111827', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardPatternCircle} />

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{user.subscription.name || 'מנוי רגיל'}</Text>
          <View style={styles.activeTag}>
            <View style={styles.activeDot} />
            <Text style={styles.activeTagText}>מנוי פעיל</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.statsRow}>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.statLabel}>תוקף עד</Text>
              <Text style={styles.statValue}>
                {new Date(user.subscription.endDate).toLocaleDateString('he-IL')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.statLabel}>יתרה</Text>
              <Text style={styles.statValue}>
                {isUnlimited ? '∞' : remaining}
                <Text style={styles.statTotal}>{!isUnlimited && ` / ${totalClasses}`}</Text>
              </Text>
            </View>
          </View>

          {!isUnlimited && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={['#34D399', '#10B981']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${(remaining / totalClasses) * 100}%` }]}
                />
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isAdmin, isCoach } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const shareApp = async () => {
    try { await Share.share({ message: 'היי! בוא להתאמן איתי באפליקציית ReelRep Training' }); } catch (error) { console.log(error); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgDecoration} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsIcon}>
            {/* Future Settings */}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => router.push('/edit-profile' as any)}
              activeOpacity={0.8}
            >
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{user?.name?.slice(0, 2).toUpperCase() || 'ME'}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user?.name || 'אורח'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          {user?.subscription ? (
            <SubscriptionCard user={user} onPress={() => router.push('/subscription-management' as any)} />
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>אין מנוי פעיל כרגע</Text>
            </View>
          )}
        </View>

        {/* Menu Groups */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionHeader}>הגדרות חשבון</Text>
          <View style={styles.menuGroup}>
            <MenuRow icon="receipt-outline" label="חשבוניות ותשלומים" onPress={() => { }} />
            <View style={styles.divider} />
            <MenuRow icon="heart-outline" label="הצהרת בריאות" value="בתוקף" onPress={() => { }} />
            <View style={styles.divider} />
            <MenuRow icon="notifications-outline" label="התראות" onPress={() => { }} />
          </View>
        </View>

        {(isAdmin || isCoach) && (
          <View style={styles.menuContainer}>
            <Text style={styles.sectionHeader}>ניהול</Text>
            <View style={styles.menuGroup}>
              <MenuRow icon="shield-checkmark-outline" label="פאנל ניהול" onPress={() => router.push('/admin' as any)} />
            </View>
          </View>
        )}



        <View style={styles.menuContainer}>
          <View style={styles.menuGroup}>
            <MenuRow icon="share-social-outline" label="שתף לחברים" onPress={shareApp} />
            <View style={styles.divider} />
            <MenuRow icon="chatbubble-ellipses-outline" label="צור קשר / תמיכה" onPress={() => { }} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>התנתק מהמערכת</Text>
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>גרסה 1.0.2 • ReelRep Training</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  bgDecoration: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: '#fff', borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 10 }
  },
  scrollContent: { paddingBottom: 50 },

  // Header
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  settingsIcon: { position: 'absolute', right: 24, top: 10, padding: 8 },
  profileInfo: { alignItems: 'center' },
  avatarWrapper: { marginBottom: 16, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#F9FAFB' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#202020', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#F9FAFB' },
  avatarInitials: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#111827', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 14, color: '#6B7280', fontWeight: '500' },

  // Card
  section: { paddingHorizontal: 20, marginBottom: 24 },
  cardWrapper: {
    borderRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: { borderRadius: 24, padding: 24, minHeight: 190, justifyContent: 'space-between', overflow: 'hidden' },
  cardPatternCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'left' },
  activeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  activeTagText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  cardBody: { marginTop: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4, textAlign: 'left' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'left' },
  statTotal: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  progressContainer: { marginTop: 0 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  emptyStateCard: { backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  emptyStateText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },

  // Menu
  menuContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12, textAlign: 'right', marginRight: 8 },
  menuGroup: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  menuRowDestructive: {},
  menuRowRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  menuRowLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  menuLabel: { fontSize: 16, color: '#111827', fontWeight: '500', textAlign: 'right' },
  menuValue: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  textDestructive: { color: '#EF4444' },
  iconContainer: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  iconContainerDestructive: { backgroundColor: '#FEE2E2' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  // Logout & Footer
  logoutButton: { marginHorizontal: 20, paddingVertical: 16, backgroundColor: '#FEE2E2', borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  versionInfo: { alignItems: 'center', marginBottom: 20 },
  versionText: { color: '#D1D5DB', fontSize: 12, fontWeight: '500' },
});