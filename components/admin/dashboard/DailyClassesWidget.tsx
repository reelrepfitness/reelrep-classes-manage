import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';

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
    onPressClass?: (id: string) => void;
};

export default function DailyClassesWidget({ classes, onPressClass }: DailyClassesWidgetProps) {
    const todayLabel = new Date().toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    });

    const renderCard = ({ item }: { item: ClassItem }) => {
        const occupancy = item.max > 0 ? item.current / item.max : 0;
        const fillPercent = Math.min(occupancy * 100, 100);
        const barColor = fillPercent > 75 ? '#4ADE80' : fillPercent > 50 ? '#FACC15' : fillPercent > 25 ? '#FB923C' : '#F87171';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => onPressClass?.(item.id)}
            >
                {/* Vertical time/progress badge - left side */}
                <View style={styles.timeBadgeStrip}>
                    {/* Progress fill from bottom */}
                    <View
                        style={[
                            styles.progressFill,
                            {
                                height: `${fillPercent}%`,
                                backgroundColor: barColor,
                            },
                        ]}
                    />
                    {/* Time text overlay */}
                    <Text style={styles.timeBadgeText}>{item.time}</Text>
                </View>

                {/* Card content - right side */}
                <View style={styles.cardContent}>
                    {/* Class name - top right */}
                    <Text style={styles.className} numberOfLines={2}>{item.name}</Text>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Capacity - bottom right */}
                    <Text style={styles.occupancyText}>
                        <Text style={{ color: barColor }}>{item.current}</Text>
                        <Text style={styles.maxText}>/{item.max}</Text>
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>השיעורים היום</Text>
                <Text style={styles.dateText}>{todayLabel}</Text>
            </View>

            {classes.length === 0 ? (
                <Text style={styles.emptyText}>אין שיעורים היום</Text>
            ) : (
                <FlatList
                    data={classes}
                    renderItem={renderCard}
                    keyExtractor={item => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
    },
    dateText: {
        fontSize: 15,
        color: '#636872ff',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 20,
    },
    listContent: {
        paddingHorizontal: 4,
        paddingBottom: 8,
        gap: 12,
    },
    card: {
        width: 120,
        minHeight: 110,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 0,
        ...Platform.select({
            ios: {
                shadowColor: '#010101ff',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    timeBadgeStrip: {
        backgroundColor: '#f4f4f4ff',
        borderRadius: 10,
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    progressFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 10,
    },
    timeBadgeText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        transform: [{ rotate: '90deg' }],
        width: 60,
        textAlign: 'center',
        zIndex: 1,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    className: {
        fontSize: 15,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'right',
    },
    occupancyText: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'right',
    },
    maxText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#B0B5BC',
    },
});
