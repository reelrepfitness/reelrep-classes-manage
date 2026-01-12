import React from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

type ClassItem = {
    id: string;
    time: string;
    name: string;
    coach: string;
    current: number;
    max: number;
};

type DailyClassesWidgetProps = {
    classes: ClassItem[];
};

export default function DailyClassesWidget({ classes }: DailyClassesWidgetProps) {
    const renderCard = ({ item }: { item: ClassItem }) => {
        const occupancy = item.current / item.max;
        const barColor = occupancy >= 1 ? '#10B981' : occupancy > 0.5 ? '#F59E0B' : '#3B82F6';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.time}>{item.time}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.coach}</Text>
                    </View>
                </View>

                <Text style={styles.className} numberOfLines={1}>{item.name}</Text>

                <View style={styles.footer}>
                    <View style={styles.progressContainer}>
                        <Text style={styles.occupancyText}>{item.current}/{item.max}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(occupancy * 100, 100)}%`, backgroundColor: barColor }]} />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>הסטודיו היום</Text>
                <Text style={styles.dateText}>יום ג׳, 24 אוק</Text>
            </View>

            <FlatList
                data={classes}
                renderItem={renderCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                inverted={Platform.OS === 'android'} // Handle RTL inversion if needed, usually 'inverted' flips direction. 
            // Wait, in RTL environment (I18nManager.isRTL=true), horizontal lists start from RIGHT automatically.
            // We should NOT blindly invert unless we know it's broken.
            // Assuming standard RTL behavior.
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    dateText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 4,
        paddingBottom: 8, // for shadow
        gap: 12,
        // RTL padding fix if needed:
        // paddingRight: 4, paddingLeft: 20? 
        // We'll trust React Native's auto RTL.
    },
    card: {
        width: 160,
        height: 120,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        marginRight: 12, // Gap
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row-reverse', // Time on Left, Badge on Right (in RTL terms: Start=Right)
        // Wait. RTL means Start is RIGHT. 
        // If we want Time Left and Badge Right:
        // Flex-Row (Right to Left): [Item 1] [Item 2].
        // Justify-Between.
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    time: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    badge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4B5563',
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'right', // Align text right
    },
    footer: {
        // 
    },
    progressContainer: {
        gap: 4,
    },
    occupancyText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right',
        marginBottom: 2,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
});
