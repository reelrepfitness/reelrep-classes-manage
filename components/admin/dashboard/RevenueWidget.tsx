import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

type RevenueWidgetProps = {
    revenue: string;
    trend: string;
    trendUp: boolean;
    data: { value: number }[];
};

export default function RevenueWidget({ revenue, trend, trendUp, data }: RevenueWidgetProps) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1F2937', '#111827']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.trendBadge}>
                        <Text style={[styles.trendText, { color: trendUp ? '#10B981' : '#EF4444' }]}>
                            {trend}
                        </Text>
                    </View>
                    <Text style={styles.title}>הכנסות החודש</Text>
                </View>

                <Text style={styles.amount}>{revenue}</Text>

                <View style={styles.chartContainer}>
                    <LineChart
                        data={data}
                        color1="#DA4477"
                        thickness={3}
                        hideRules
                        hideAxesAndRules
                        hideYAxisText
                        hideDataPoints
                        curved
                        curveType={1} // Bezier
                        height={100}
                        width={width - 80} // Adjusted for padding
                        startFillColor="#DA4477"
                        endFillColor="rgba(218, 68, 119, 0.0)"
                        startOpacity={0.4}
                        endOpacity={0.0}
                        areaChart
                    />
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        paddingBottom: 0, // Allow chart to sit at bottom
        minHeight: 220,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#9CA3AF',
        textAlign: 'right',
    },
    trendBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
    },
    amount: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'right',
        marginBottom: 16,
    },
    chartContainer: {
        marginLeft: -20, // Negative margin to align with edge if needed, or keeping it centered
        marginBottom: 10,
    },
});
