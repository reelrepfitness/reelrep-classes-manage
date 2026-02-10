// app/admin/green-invoice-test.tsx
// Green Invoice Testing & Admin Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useGreenInvoice } from '@/hooks/useGreenInvoice';
import { supabase } from '@/constants/supabase';

export default function GreenInvoiceTestScreen() {
  const {
    syncFinancialData,
    getDashboardSummary,
    loading,
    error,
  } = useGreenInvoice();

  const [results, setResults] = useState<any>({});
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const testAuth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('green-invoice-auth');
      if (error) throw error;

      setResults((prev: any) => ({
        ...prev,
        auth: { success: true, tokenLength: data?.token?.length },
      }));

      Alert.alert('הצלחה ✅', `JWT Token התקבל: ${data?.token?.length} תווים`);
    } catch (err: any) {
      setResults((prev: any) => ({
        ...prev,
        auth: { success: false, error: err.message },
      }));
      Alert.alert('שגיאה ❌', err.message);
    }
  };

  const testSync = async () => {
    try {
      const result = await syncFinancialData();
      setResults((prev: any) => ({ ...prev, sync: result }));

      Alert.alert(
        'הצלחה ✅',
        `סונכרנו:\n${result.invoicesCount || 0} חשבוניות\n${result.expensesCount || 0} הוצאות`
      );
    } catch (err: any) {
      Alert.alert('שגיאה ❌', err.message);
    }
  };

  const testStats = async () => {
    try {
      const stats = await getDashboardSummary();
      setResults((prev: any) => ({ ...prev, stats }));

      if (stats) {
        Alert.alert(
          'סטטיסטיקות ✅',
          `הכנסות החודש: ₪${stats.currentMonth.income.toLocaleString()}\n` +
          `הוצאות החודש: ₪${stats.currentMonth.expenses.toLocaleString()}\n` +
          `רווח נקי: ₪${stats.currentMonth.profit.toLocaleString()}`
        );
      }
    } catch (err: any) {
      Alert.alert('שגיאה ❌', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Green Invoice - בדיקות</Text>
        <Text style={styles.subtitle}>Sandbox Environment</Text>
      </View>

      {/* User Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>סטטוס משתמש</Text>
        {user && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Email: {user.email}</Text>
            <Text style={styles.infoText}>User ID: {user.id?.slice(0, 8)}...</Text>
          </View>
        )}
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>פעולות בדיקה</Text>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>1. בדוק Auth Token</Text>
          )}
        </TouchableOpacity>

        {results.auth && (
          <View style={[styles.infoBox, { marginBottom: 10, backgroundColor: results.auth.success ? '#22c55e20' : '#ef444420' }]}>
            <Text style={[styles.infoText, { color: results.auth.success ? '#4ade80' : '#ef4444' }]}>
              {results.auth.success
                ? `✅ Token: ${results.auth.tokenLength} תווים`
                : `❌ ${results.auth.error}`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testSync}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#da4477" />
          ) : (
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              2. סנכרן נתונים פיננסיים
            </Text>
          )}
        </TouchableOpacity>

        {results.sync && (
          <View style={[styles.infoBox, { marginBottom: 10, backgroundColor: '#22c55e20' }]}>
            <Text style={[styles.infoText, { color: '#4ade80' }]}>
              ✅ {results.sync.invoicesCount} חשבוניות, {results.sync.expensesCount} הוצאות
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testStats}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#da4477" />
          ) : (
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              3. בדוק Dashboard Stats
            </Text>
          )}
        </TouchableOpacity>

        {results.stats && !results.stats.error && (
          <View style={[styles.infoBox, { marginBottom: 10, backgroundColor: '#22c55e20' }]}>
            <Text style={[styles.infoText, { color: '#4ade80', fontWeight: 'bold' }]}>
              ✅ נתונים התקבלו:
            </Text>
            <Text style={[styles.infoText, { color: '#4ade80' }]}>
              הכנסות: ₪{results.stats.currentMonth?.income?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.infoText, { color: '#4ade80' }]}>
              הוצאות: ₪{results.stats.currentMonth?.expenses?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.infoText, { color: '#4ade80' }]}>
              רווח: ₪{results.stats.currentMonth?.profit?.toLocaleString() || 0}
            </Text>
          </View>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ שגיאה: {error}</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הוראות</Text>
        <Text style={styles.instructionText}>
          1. לחץ "סנכרן לקוח" ליצירת לקוח ב-Green Invoice{'\n'}
          2. לחץ "צור חשבונית" ליצירת חשבונית בדיקה{'\n'}
          3. פתח Sandbox בדפדפן כדי לראות את התוצאות{'\n'}
          4. בדוק את הטבלאות ב-Supabase
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    padding: 20,
    backgroundColor: '#da4477',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'right',
  },
  infoBox: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'right',
  },
  successText: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#da4477',
  },
  secondaryButton: {
    backgroundColor: '#fff',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#da4477',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButtonText: {
    color: '#da4477',
  },
  outlineButtonText: {
    color: '#da4477',
  },
  statsBox: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#ff4444',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  instructionText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'right',
  },
});
