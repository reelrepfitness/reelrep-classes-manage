import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type StatItem = {
    key: string;
    label: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    route: string;
};

type StatsGridProps = {
    stats: StatItem[];
};

export default function StatsGrid({ stats }: StatsGridProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>פעולות מהירות</Text>

            <View style={styles.grid}>
                {stats.map((item) => (
                    <TouchableOpacity
                        key={item.key}
                        style={styles.card}
                        onPress={() => router.push(item.route as any)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={24} color={item.color} />
                            {/* Assuming value is critical if it's "Tasks" or "Debt", maybe add badge? Keeping it clean for now */}
                        </View>
                        <Text style={styles.value}>{item.value}</Text>
                        <Text style={styles.label}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'right',
        marginBottom: 12,
        paddingRight: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: '48%', // Just under 50% for gap
        aspectRatio: 1.1, // Slightly rectangular
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'right',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'right',
    },
});
