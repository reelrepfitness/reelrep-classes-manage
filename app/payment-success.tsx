import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();
  const { invoiceId } = useLocalSearchParams<{ invoiceId?: string }>();

  useEffect(() => {
    // רענון נתוני משתמש בכניסה למסך
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <CheckCircle size={80} color="#10B981" />

          <Text style={styles.title}>
            התשלום בוצע בהצלחה!
          </Text>

          <Text style={styles.message}>
            המנוי/כרטיסייה שלך הופעל/ה.{'\n'}
            תוכל להתחיל להזמין אימונים באפליקציה.
          </Text>

          {invoiceId && (
            <Text style={styles.invoiceId}>
              מספר חשבונית: {invoiceId}
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                התחל להזמין אימונים
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                צפה במנוי שלי
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  invoiceId: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginTop: 32,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
