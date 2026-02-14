import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { useClasses } from '@/contexts/ClassesContext';
import Colors from '@/constants/colors';
import AdminClassModal from '@/components/admin/AdminClassModal';

export function ClassesSlide() {
    const { classes, isLoading } = useClasses();
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Filter Today's Classes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    const todaysClasses = classes
        .filter(c => c.date === todayString)
        .sort((a, b) => a.time.localeCompare(b.time));

    const getProgressColor = (percentage: number) => {
        if (percentage < 30) return Colors.error; // Red
        if (percentage < 80) return '#eab308'; // Yellow
        return '#22c55e'; // Green
    };

    const handleClassPress = (classItem: any) => {
        setSelectedClass(classItem);
        setModalVisible(true);
    };

    if (isLoading) {
        return (
            <Card className="h-[340px] border-none rounded-[40px]" style={{ backgroundColor: 'white', borderWidth: 0 }}>
                <CardContent className="h-full flex-1 items-center justify-center">
                    <Spinner size="lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="h-[340px] border border-gray-200 rounded-[40px] overflow-hidden" style={{ backgroundColor: 'white' }}>
                <CardContent className="h-full flex-1 p-4">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-[#09090B]">שיעורים היום</Text>
                        <Text className="text-sm text-gray-500">{todaysClasses.length} שיעורים</Text>
                    </View>

                    {/* Scrollable Classes List */}
                    {todaysClasses.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-gray-400 text-sm">אין שיעורים היום ✅</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 10 }}
                        >
                            {todaysClasses.map((classItem) => {
                                const percentage = Math.min(100, (classItem.enrolled / classItem.capacity) * 100);
                                const progressColor = getProgressColor(percentage);

                                return (
                                    <TouchableOpacity
                                        key={classItem.id}
                                        onPress={() => handleClassPress(classItem)}
                                        activeOpacity={0.7}
                                        className="bg-gray-50 rounded-2xl p-4 mb-3 border border-gray-200"
                                    >
                                        {/* Top Row: Title + Time */}
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className="flex-1 pr-2">
                                                <Text className="text-base font-bold text-[#09090B] text-right" numberOfLines={1}>
                                                    {classItem.title}
                                                </Text>
                                                <Text className="text-xs text-gray-500 text-right">
                                                    {classItem.time}
                                                </Text>
                                            </View>
                                            <View className="bg-white px-3 py-1 rounded-full border border-gray-200 flex-row items-center gap-1">
                                                <Image
                                                    source={require('@/assets/images/group-session.webp')}
                                                    style={{ width: 14, height: 14 }}
                                                    resizeMode="contain"
                                                />
                                                <Text className="text-sm font-bold text-[#09090B]">
                                                    {classItem.enrolled}/{classItem.capacity}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Progress Bar */}
                                        <View className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                            <View
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${percentage}%`,
                                                    backgroundColor: progressColor
                                                }}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </CardContent>
            </Card>

            <AdminClassModal
                visible={modalVisible}
                classItem={selectedClass}
                onClose={() => setModalVisible(false)}
            />
        </>
    );
}
