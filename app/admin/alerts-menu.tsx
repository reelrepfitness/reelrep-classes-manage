import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Zap, Settings } from 'lucide-react-native';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function AlertsMenuScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <AdminHeader title="מרכז ההתראות" />

            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push('/admin/notification-settings')}
                >
                    <View style={[styles.iconContainer,]}>
                        <Bell size={40} color="#EF4444" />
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>התראות מנהל</Text>
                        <Text style={styles.cardSubtitle}>עדכונים שוטפים, ביטולים ופספוסים</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push('/admin/push-automation')}
                >
                    <View style={[styles.iconContainer,]}>
                        <Zap size={40} color="#3B82F6" />
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>התראות למתאמן</Text>
                        <Text style={styles.cardSubtitle}>אוטומציות חכמות ודחיפה למתאמנים</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push('/admin-alerts')}
                >
                    <View style={[styles.iconContainer,]}>
                        <Settings size={40} color="#9333EA" />
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>הגדרות התראות</Text>
                        <Text style={styles.cardSubtitle}>ניהול סוגי התראות פעילות</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    cardText: {
        flex: 1,
        alignItems: 'flex-start',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'right',
    },
});
