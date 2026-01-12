import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, LogOut, Trophy, Dumbbell, TrendingUp, Shield, ChevronLeft, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkouts } from '@/contexts/WorkoutContext';
import { cn } from '@/lib/utils'; // וודא שזה קיים, אם לא - תמחק את ה-cn ותשתמש בסטרינג רגיל
import { hebrew } from '@/constants/hebrew';
import Colors from '@/constants/colors'; // נשמור את זה בשביל צבעי האייקונים

// --- קומפוננטות עזר פנימיות ---

const StatBox = ({ label, value, icon: Icon, image, color }: any) => (
  <View className="flex-1 items-center bg-surface p-4 rounded-2xl mx-1 active:opacity-90">
    <View className="p-3 rounded-full mb-2 bg-white shadow-sm">
      {image ? (
        <Image source={image} style={{ width: 24, height: 24 }} resizeMode="contain" />
      ) : (
        <Icon size={24} color={color} />
      )}
    </View>
    <Text className="text-2xl font-bold text-text text-right">{value}</Text>
    <Text className="text-xs text-muted mt-1 text-center font-medium">{label}</Text>
  </View>
);

const MenuItem = ({ icon: Icon, title, subtitle, isDestructive, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    className={cn(
      "flex-row items-center justify-between p-4 bg-surface mb-3 rounded-2xl active:scale-[0.98] transition-all shadow-sm",
      isDestructive && "border border-red-200 bg-red-50"
    )}
  >
    <View className="flex-row items-center gap-4">
      <View className={cn("p-2.5 rounded-xl", isDestructive ? "bg-red-100" : "bg-white")}>
        <Icon size={20} color={isDestructive ? "#ef4444" : Colors.primary} />
      </View>
      <View>
        <Text className={cn("text-base font-bold text-right", isDestructive ? "text-red-500" : "text-text")}>
          {title}
        </Text>
        {subtitle && <Text className="text-xs text-muted text-right mt-0.5">{subtitle}</Text>}
      </View>
    </View>
    <ChevronLeft size={18} color="#71717A" />
  </TouchableOpacity>
);

// --- המסך הראשי ---

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, isAdmin, isCoach } = useAuth();
  const { getTotalStats } = useWorkouts();

  const stats = getTotalStats();

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View className="px-5 pt-6 pb-8">
          <View className="flex-row items-center gap-4 mb-8">
            <View className="w-20 h-20 rounded-full bg-surface items-center justify-center border-2 border-white shadow-md">
              <User size={32} color={Colors.primary} />
            </View>
            <View className="flex-1 items-end">
              <Text className="text-text text-2xl font-bold mb-1 text-right">{user?.name || 'אורח'}</Text>
              <Text className="text-muted text-sm mb-2 text-right">{user?.email}</Text>

              {user?.subscription?.type && (
                <View className="bg-primary/20 px-3 py-1 rounded-full self-end border border-primary/30">
                  <Text className="text-primary text-xs font-bold tracking-wide">
                    {user.subscription.type.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* כרטיס יתרת פלטות - מעוצב מחדש */}
          <TouchableOpacity
            onPress={() => router.push('/plates/store')}
            className="bg-surface rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center gap-4">
              <Image
                source={{ uri: 'https://res.cloudinary.com/diwe4xzro/image/upload/v1762853884/%D7%98%D7%A7%D7%A1%D7%98_%D7%94%D7%A4%D7%A1%D7%A7%D7%94_%D7%A9%D7%9C%D7%9A_2.png_zpdglt.png' }}
                className="w-12 h-12 rounded-full"
              />
              <View>
                <Text className="text-text text-lg font-bold text-right">{user?.plateBalance || 0}</Text>
                <Text className="text-muted text-xs text-right">יתרת פלטות זמינה</Text>
              </View>
            </View>
            <View className="bg-primary px-4 py-2 rounded-full shadow-sm">
              <Text className="text-white text-xs font-bold">החנות</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View className="px-4 mb-8">
          <Text className="text-text font-bold mb-4 text-right px-1 text-lg">{hebrew.profile.statistics}</Text>
          <View className="flex-row gap-3">
            <StatBox
              label={hebrew.profile.totalWorkouts}
              value={stats.workouts.toString()}
              icon={Dumbbell}
              color={Colors.primary}
            />
            <StatBox
              label='דקות אימון'
              value={stats.duration.toString()}
              icon={TrendingUp}
              color="#a855f7" // סגול לשינוי
            />
            <StatBox
              label={hebrew.home.achievements}
              value={user?.achievements?.length.toString() || '0'}
              image={require('@/assets/images/trophy.webp')}
              color="#eab308" // זהב
            />
          </View>
        </View>

        {/* Subscription Info */}
        {user?.subscription && (
          <View className="px-4 mb-8">
            <Text className="text-text font-bold mb-4 text-right px-1 text-lg">{hebrew.profile.subscription}</Text>
            <View className="bg-surface rounded-2xl p-5 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <CreditCard size={18} color={Colors.primary} />
                  <Text className="text-muted font-medium text-sm">שיעורים החודש</Text>
                </View>
                <Text className="text-text font-bold">
                  <Text className="text-primary text-lg">{user.subscription.classesPerMonth - user.subscription.classesUsed}</Text>
                  <Text className="text-muted text-sm"> / {user.subscription.classesPerMonth}</Text>
                </Text>
              </View>

              {/* Progress Bar Visual */}
              <View className="h-2 bg-white rounded-full overflow-hidden mb-4">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${((user.subscription.classesPerMonth - user.subscription.classesUsed) / user.subscription.classesPerMonth) * 100}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-muted text-xs">בתוקף עד</Text>
                <Text className="text-text text-xs font-medium">{new Date(user.subscription.endDate).toLocaleDateString('he-IL')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Actions */}
        <View className="px-4">
          <Text className="text-text font-bold mb-4 text-right px-1 text-lg">{hebrew.profile.settings}</Text>

          {(isAdmin || isCoach) && (
            <MenuItem
              icon={Shield}
              title="לוח ניהול"
              subtitle="גישת צוות ומנהלים"
              onPress={() => router.push('/admin/' as any)}
            />
          )}

          <MenuItem
            icon={Settings}
            title={hebrew.profile.settings}
            onPress={() => console.log('Settings Pressed')} // תוסיף פה ניווט אם צריך
          />

          <MenuItem
            icon={LogOut}
            title={hebrew.profile.logout}
            isDestructive
            onPress={handleSignOut}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}