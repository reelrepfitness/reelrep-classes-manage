import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch, Platform, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { Spinner } from '@/components/ui/spinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---
type UserNotificationSettings = {
  id?: string;
  user_id?: string;
  // Section 1: Payments & Account
  notify_payment_failed: boolean;
  notify_payment_success: boolean;
  notify_new_purchase: boolean;
  notify_payment_updated: boolean;
  notify_sub_expiring: boolean;

  // Section 2: Classes & Schedule
  notify_class_cancelled_by_studio: boolean;
  notify_waiting_list_entered: boolean;
  notify_waiting_list_spot: boolean;
  notify_ticket_finished: boolean;
  notify_last_punch: boolean;

  // Section 3: General
  notify_birthday_wish: boolean;
  notify_sub_frozen: boolean; // Assuming this column exists or mapping to general sub alerts
};

// --- Mappings ---
type SettingConfig = {
  key: keyof UserNotificationSettings;
  label: string;
  iconIOS: keyof typeof Ionicons.glyphMap;
  iconAndroid: keyof typeof Ionicons.glyphMap;
  color: string;
};

const SECTIONS: { title: string; data: SettingConfig[] }[] = [
  {
    title: "תשלומים וחשבון",
    data: [
      { key: 'notify_payment_failed', label: "חיוב ה.קבע נכשל", iconIOS: "card", iconAndroid: "card", color: "#EF4444" },
      { key: 'notify_payment_success', label: "חיוב ה.קבע הצליח", iconIOS: "checkmark-circle", iconAndroid: "checkmark-circle", color: "#10B981" },
      { key: 'notify_new_purchase', label: "רכישת מנוי חדש", iconIOS: "receipt", iconAndroid: "receipt", color: "#3B82F6" },
      { key: 'notify_payment_updated', label: "אמצעי התשלום עודכן בהצלחה", iconIOS: "wallet", iconAndroid: "wallet", color: "#8B5CF6" },
      { key: 'notify_sub_expiring', label: "תוקף המנוי עומד להסתיים", iconIOS: "hourglass", iconAndroid: "hourglass", color: "#F59E0B" },
    ]
  },
  {
    title: "שיעורים וסטודיו",
    data: [
      { key: 'notify_class_cancelled_by_studio', label: "ביטול שיעור באמצעות הסטודיו", iconIOS: "calendar", iconAndroid: "calendar", color: "#EF4444" },
      { key: 'notify_waiting_list_entered', label: "שיבוץ מרשימת המתנה", iconIOS: "play-skip-forward-circle", iconAndroid: "play-skip-forward-circle", color: "#3B82F6" }, // Approximation for Ticket/Checkmark logic
      { key: 'notify_waiting_list_spot', label: "התפנה מקום ברשימת המתנה", iconIOS: "flash", iconAndroid: "flash", color: "#F59E0B" },
      { key: 'notify_ticket_finished', label: "כרטיסיה הסתיימה", iconIOS: "file-tray-full", iconAndroid: "file-tray-full", color: "#F97316" },
      { key: 'notify_last_punch', label: "ניקוב אחרון בכרטיסיה", iconIOS: "alert-circle", iconAndroid: "alert-circle", color: "#EF4444" },
    ]
  },
  {
    title: "כללי",
    data: [
      { key: 'notify_birthday_wish', label: "הודעת יום הולדת", iconIOS: "gift", iconAndroid: "gift", color: "#EC4899" },
      { key: 'notify_sub_frozen', label: "מנוי הוקפא / הופשר", iconIOS: "snow", iconAndroid: "snow", color: "#3B82F6" },
    ]
  }
];

export default function UserNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserNotificationSettings>({
    notify_payment_failed: true,
    notify_payment_success: true,
    notify_new_purchase: true,
    notify_payment_updated: true,
    notify_sub_expiring: true,
    notify_class_cancelled_by_studio: true,
    notify_waiting_list_entered: true,
    notify_waiting_list_spot: true,
    notify_ticket_finished: true,
    notify_last_punch: true,
    notify_birthday_wish: true,
    notify_sub_frozen: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user logged in");
        return;
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // Create default if missing
        const newSettings = { ...settings, user_id: user.id };
        // Ensure we don't send ID if it's undefined or mocked
        delete (newSettings as any).id;

        const { data: newData, error: insertError } = await supabase
          .from('user_notification_preferences')
          .insert([newSettings])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating default settings:', insertError);
        } else if (newData) {
          setSettings(newData);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof UserNotificationSettings) => {
    const previousValue = settings[key];
    const newValue = !previousValue;

    // Optimistic UI
    setSettings(prev => ({ ...prev, [key]: newValue }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase
        .from('user_notification_preferences')
        .update({ [key]: newValue })
        .eq('user_id', user.id);

      if (error) {
        console.error("Update failed", error);
        throw error;
      }

    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert
      setSettings(prev => ({ ...prev, [key]: previousValue }));
      Alert.alert('שגיאה', 'עדכון ההגדרה נכשל');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>הגדרות התראות</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-forward" size={24} color="#09090B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
        {loading ? (
          <View style={{ marginTop: 40 }}>
            <Spinner size="lg" />
          </View>
        ) : (
          SECTIONS.map((section, index) => (
            <View key={index} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>

              <View style={styles.card}>
                {section.data.map((item, itemIndex) => {
                  const isLast = itemIndex === section.data.length - 1;
                  const iconName = Platform.OS === 'ios' ? item.iconIOS : item.iconAndroid;

                  return (
                    <View
                      key={item.key}
                      style={[
                        styles.row,
                        !isLast && styles.rowBorder
                      ]}
                    >
                      {/* Left: Switch */}
                      <Switch
                        value={!!settings[item.key as keyof UserNotificationSettings]}
                        onValueChange={() => toggleSetting(item.key as keyof UserNotificationSettings)}
                        trackColor={{ false: '#E5E7EB', true: Platform.OS === 'ios' ? '#34C759' : Colors.primary }}
                        thumbColor={'#FFFFFF'}
                        ios_backgroundColor="#E5E7EB"
                      />

                      {/* Right: Content */}
                      <View style={styles.contentContainer}>
                        <Text style={styles.label}>{item.label}</Text>
                        <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                          <Ionicons
                            name={iconName}
                            size={20}
                            color={item.color}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // gray-50
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // gray-100
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#09090B',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  scrollContent: {
    padding: 24,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827', // gray-900
    marginBottom: 12,
    textAlign: 'right',
    paddingRight: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // rounded-3xl
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20, // p-5
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB', // gray-50
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937', // gray-800
    textAlign: 'right',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
