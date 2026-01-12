import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CalendarSelectionModalProps {
    visible: boolean;
    calendars: any[];
    onSelect: (calendarId: string) => void;
    onClose: () => void;
}

export const CalendarSelectionModal: React.FC<CalendarSelectionModalProps> = ({
    visible,
    calendars,
    onSelect,
    onClose,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                <View className="bg-white w-full rounded-2xl overflow-hidden max-h-[70%]">
                    {/* Header */}
                    <View className="p-4 border-b border-gray-100 flex-row justify-between items-center bg-gray-50">
                        <Text className="text-lg font-bold text-gray-900 text-right">בחר יומן לסנכרון</Text>
                        <TouchableOpacity onPress={onClose} className="p-1 bg-gray-200 rounded-full">
                            <X size={16} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {/* List */}
                    <FlatList
                        data={calendars}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => onSelect(item.id)}
                                className="flex-row items-center justify-between p-4 mb-3 bg-white border border-gray-100 rounded-xl shadow-sm active:bg-gray-50"
                            >
                                <View className="items-end">
                                    <Text className="text-base font-bold text-gray-900 text-right">{item.title}</Text>
                                    <Text className="text-xs text-gray-500 text-right">
                                        {item.source?.name || (Platform.OS === 'ios' ? item.source?.type : 'מקומי')}
                                    </Text>
                                </View>
                                <View
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text className="text-center text-gray-500 py-8">לא נמצאו יומנים זמינים</Text>
                        }
                    />

                    {/* Footer Warning */}
                    <View className="p-3 bg-blue-50 border-t border-blue-100">
                        <Text className="text-xs text-blue-700 text-center font-medium">
                            הערה: ניתן לסנכרן רק ליומנים המוגדרים במכשיר
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
