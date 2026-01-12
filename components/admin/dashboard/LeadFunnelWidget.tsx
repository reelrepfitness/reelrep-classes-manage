import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type LeadFunnelWidgetProps = {
    newLeads: number;
    trials: number;
    conversionRate: string;
};

export default function LeadFunnelWidget({ newLeads, trials, conversionRate }: LeadFunnelWidgetProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>משפך לידים (חודשי)</Text>

            <View style={styles.row}>
                {/* New Leads */}
                <View style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="person-add" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.value}>{newLeads}</Text>
                    <Text style={styles.label}>לידים חדשים</Text>
                    {newLeads > 0 && <View style={styles.badge} />}
                </View>

                {/* Trials */}
                <View style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="calendar" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.value}>{trials}</Text>
                    <Text style={styles.label}>אימוני ניסיון</Text>
                </View>

                {/* Conversions */}
                <View style={styles.card}>
                    <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="trending-up" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.value}>{conversionRate}</Text>
                    <Text style={styles.label}>המרות</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'right',
        marginBottom: 12,
        paddingRight: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
});
