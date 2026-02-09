import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';

interface CalendarSyncBarProps {
    onPress: () => void;
    isSynced?: boolean;
}

export const CalendarSyncBar: React.FC<CalendarSyncBarProps> = ({ onPress, isSynced = false }) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[styles.container, isSynced && styles.syncedContainer]}
        >
            {/* Right Side: Calendar Icon */}
            <View style={styles.iconContainer}>
                {Platform.OS === 'ios' ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Image
                            source={require('@/assets/images/Apple_Calendar_(iOS).svg.png')}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                        />
                        <Image
                            source={require('@/assets/images/Google_Calendar_icon_(2020).svg.png')}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <Image
                        source={require('@/assets/images/Google_Calendar_icon_(2020).svg.png')}
                        style={{ width: 28, height: 28 }}
                        resizeMode="contain"
                    />
                )}
            </View>

            {/* Center: Text Label */}
            <Text style={[styles.textLabel, isSynced && styles.syncedText]}>
                {isSynced ? 'מסונכרן ליומן' : 'סנכרן שיעורים ליומן'}
            </Text>

            {/* Left Side: Action/Sync Icon */}
            <View style={styles.actionIconContainer}>
                {/* Icon removed per user request */}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', // RTL via I18nManager
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,

        // Soft Shadow / Elevation
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    iconContainer: {
        marginLeft: 12,
    },
    textLabel: {
        flex: 1,
        textAlign: 'right', // Align text to the right for Hebrew
        fontSize: 16,
        fontWeight: '700', // Bold
        color: '#111827', // Dark text
    },
    actionIconContainer: {
        marginRight: 4,
    },
    syncedContainer: {
        backgroundColor: '#ecfdf5', // Light green bg
        borderColor: '#22c55e',
        borderWidth: 1,
    },
    syncedText: {
        color: '#15803d', // Darker green text
    },
});
