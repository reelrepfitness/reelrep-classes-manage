import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { MessageCircle, Gift, Calendar, Cake } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { LinearGradient } from 'expo-linear-gradient';

type BirthdayUser = {
    id: string;
    name: string;
    avatar_url?: string;
    birthday: string;
    age?: number;
    isToday: boolean;
};

export const BirthdayCard = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<BirthdayUser[]>([]);

    useEffect(() => {
        fetchBirthdays();
    }, []);

    const fetchBirthdays = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, full_name, avatar_url, birthday')
                .not('birthday', 'is', null);

            if (error) throw error;

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentDay = today.getDate();

            const upcoming: BirthdayUser[] = [];

            data.forEach(user => {
                if (!user.birthday) return;
                const bdate = new Date(user.birthday);
                const bMethod = bdate.getMonth();
                const bDay = bdate.getDate();

                const birthYear = bdate.getFullYear();
                const age = today.getFullYear() - birthYear;

                // Define if is today
                const isToday = bMethod === currentMonth && bDay === currentDay;

                // Define if in next 7 days
                // Simple logic taking into account month overflow
                const thisYearBirthday = new Date(today.getFullYear(), bMethod, bDay);
                if (thisYearBirthday < today) {
                    thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }

                const diffTime = thisYearBirthday.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (isToday || (diffDays >= 0 && diffDays <= 14)) { // Showing next 2 weeks to populate list better
                    upcoming.push({
                        id: user.id,
                        name: user.full_name || user.name || 'User',
                        avatar_url: user.avatar_url,
                        birthday: user.birthday,
                        age: isToday ? age : age + 1, // approximate
                        isToday
                    });
                }
            });

            // Sort: Today first, then by date
            upcoming.sort((a, b) => {
                if (a.isToday && !b.isToday) return -1;
                if (!a.isToday && b.isToday) return 1;
                return 0; // simplistic for now
            });

            setUsers(upcoming);

        } catch (err) {
            console.error('Birthday fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (user: BirthdayUser) => {
        Alert.alert('מזל טוב!', `שליחת הודעת מזל טוב ל-${user.name}`);
    };

    const todayList = users.filter(u => u.isToday);
    const upcomingList = users.filter(u => !u.isToday);

    return (
        <View style={{ backgroundColor: Colors.primary }} className="rounded-3xl p-5 shadow-sm border border-white/10 flex-1">
            <View className="flex-row-reverse justify-between items-center mb-4">
                <Text className="text-lg font-extrabold text-white">ימי הולדת</Text>
                <Text className="text-xs text-pink-100">היום ובקרוב</Text>
            </View>

            {/* Hero: Today's Birthdays */}
            {todayList.length > 0 ? (
                <View className="mb-4">
                    <View
                        className="bg-white p-4 rounded-2xl flex-row-reverse items-center justify-between shadow-sm"
                    >
                        <View className="flex-row-reverse items-center gap-3">
                            <View className="bg-pink-50 p-2 rounded-full">
                                <Cake size={20} color={Colors.primary} />
                            </View>
                            <View>
                                <Text className="font-bold text-base text-right" style={{ color: Colors.primary }}>
                                    {todayList[0].name} חוגג/ת היום!
                                </Text>
                                <Text className="text-gray-500 text-xs text-right">
                                    בן/בת {todayList[0].age}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleSendMessage(todayList[0])}
                            style={{ backgroundColor: Colors.primary }}
                            className="px-3 py-1.5 rounded-full shadow-sm"
                        >
                            <Text className="text-white text-xs font-bold">ברך</Text>
                        </TouchableOpacity>
                    </View>

                    {todayList.length > 1 && (
                        <Text className="text-right text-xs text-pink-100 mt-1 mr-1">
                            ועוד {todayList.length - 1} חוגגים היום...
                        </Text>
                    )}
                </View>
            ) : (
                <View className="bg-white/10 p-4 rounded-2xl mb-4 items-center justify-center border border-white/20 border-dashed">
                    <Text className="text-pink-100 text-xs">אין ימי הולדת היום</Text>
                </View>
            )}

            <Text className="text-right font-bold text-white mb-2">בקרוב</Text>

            {/* List */}
            <View className="flex-1">
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : upcomingList.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-pink-100 text-sm">אין ימי הולדת קרובים</Text>
                    </View>
                ) : (
                    <FlatList
                        data={upcomingList}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View className="flex-row-reverse items-center justify-between py-2 border-b border-white/10">
                                <View className="flex-row-reverse items-center gap-3">
                                    <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center">
                                        <Gift size={14} color="white" />
                                    </View>
                                    <View>
                                        <Text className="text-sm font-bold text-white text-right">{item.name}</Text>
                                        <Text className="text-[10px] text-pink-100 text-right">
                                            {new Date(item.birthday).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        </View>
    );
};
