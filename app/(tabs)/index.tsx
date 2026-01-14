import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { UpcomingWorkoutsStack } from '@/components/home/UpcomingWorkoutsStack';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

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

// --- Components ---

const StatusCard = ({ label, value, icon }: any) => (
  <View style={styles.statusCard}>
    <View style={styles.statusContent}>
      <Text style={styles.statusValue}>{value}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
    <View style={styles.statusAccent} />
  </View>
);

const ActionCard = ({ title, iconName, onPress }: any) => (
  <TouchableOpacity
    style={styles.actionCard}
    activeOpacity={0.7}
    onPress={onPress}
  >
    <View style={styles.actionIconContainer}>
      <Ionicons name={iconName} size={28} color={Colors.primary} />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getTotalStats } = useWorkouts();

  // Mock / Calculated Data
  const workoutsThisMonth = 12; // Placeholder
  const balance = user?.subscription?.type?.includes('class')
    ? (user.subscription.classesPerMonth - user.subscription.classesUsed)
    : '∞';
  const points = 350; // Placeholder

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Header (Clean & Personal) */}
        <View style={styles.header}>
          {/* Left Side: Avatar (Visual Left in code, Right in RTL?) 
                Wait, in RTL Row: 
                First item rendered is Rightmost visually. 
                Request: "Right Side (Text)... Left Side (Avatar)".
                So in Code (Flex Row): 
                <TextSide /> 
                <AvatarSide /> 
            */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingTitle}>היי, {user?.name?.split(' ')[0] || 'אורח'}</Text>
            <Text style={styles.dateSubtitle}>{getHebrewDate()}</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{user?.name?.slice(0, 1).toUpperCase() || '?'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Hero Stack (Center Stage) */}
        <View style={styles.heroSection}>
          <UpcomingWorkoutsStack />
        </View>

        {/* 3. Status Strip (Functional Data) */}
        <View style={styles.statusStrip}>
          {/* 3 Columns */}
          <StatusCard
            label="ניקוד צבור"
            value={points}
          />
          <StatusCard
            label="יתרה"
            value={balance}
          />
          <StatusCard
            label="אימונים החודש"
            value={workoutsThisMonth}
          />
        </View>

        {/* 4. Quick Actions (The Grid) */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>פעולות מהירות</Text>
          <View style={styles.actionsGrid}>
            {/* 2x2 Grid */}
            {/* RTL visual flow: Top Right -> Top Left? 
                    Unless purely grid. 
                    Let's render 4 items.
                */}
            <ActionCard
              title="יומן ביצועים"
              iconName="calendar-outline"
              onPress={() => router.push('/performance' as any)}
            />
            <ActionCard
              title="חנות והטבות" // Shop
              iconName="cart-outline"
              onPress={() => router.push('/shop' as any)}
            />
            <ActionCard
              title="ההישגים שלי" // Progress
              iconName="stats-chart-outline"
              onPress={() => router.push('/achievements' as any)}
            />
            <ActionCard
              title="יצירת קשר" // Contact
              iconName="chatbubble-ellipses-outline"
              onPress={() => Linking.openURL('https://wa.me/972500000000')}
            />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Clean White/Off-white
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row', // RTL handled by content order if logic requires specifically
    // Design check: "Right Side (Text) ... Left Side (Avatar)"
    // In LTR Flex Row: [Left Item] [Right Item]
    // In RTL Device: [Right Item] [Left Item]
    // Assuming we want strict control or native RTL:
    // Let's use justifyContent: space-between normally. 
    // If we put Text first, it goes to Left in LTR.
    // We want Text on Right. So Avatar First, then Text? 
    // Or just flexDirection: 'row-reverse' to force it?
    // Native RTL flips it automatically. 
    // Let's assume Native RTL is ON. 
    // So layout: <Avatar /> <Text /> -> Avatar on Right.
    // Wait, request said "Right Side (Text)". 
    // So in RTL: [Text] ... [Avatar] (Avatar on left).
    // So structure: <Avatar /> ... <Text /> 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginTop: 6,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700', // Bold
    color: '#171717',
    textAlign: 'left', // Will align right in RTL likely
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'left',
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderRadius: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary, // #da4477
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: Colors.primary,
  },
  avatarInitials: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },

  // Hero
  heroSection: {
    marginBottom: 32,
    paddingHorizontal: 0,
  },

  // Status Strip
  statusStrip: {
    flexDirection: 'row-reverse', // Ensure standard order 1-2-3? Or just row. 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Soft shadow
    shadowRadius: 8,
    elevation: 2,
    minHeight: 80,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  statusContent: {
    alignItems: 'center',
    gap: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171717',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 16,
    textAlign: 'right', // RTL
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 40 - 12) / 2, // 2 cols
    aspectRatio: 1.3, // Rectangular
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5', // Subtle border
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02, // Very subtle lift
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
  },
});