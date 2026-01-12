import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { Gift, Cake } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/card';
import { LinearGradient } from 'expo-linear-gradient';

type BirthdayUser = {
    id: string;
    name: string;
    birthday: string;
    age?: number;
    isToday: boolean;
};

export const BirthdaySlide = () => {
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
                .select('id, name, full_name, birthday')
                .not('birthday', 'is', null);

            if (error) throw error;

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentDay = today.getDate();

            const upcoming: BirthdayUser[] = [];

            data.forEach(user => {
                if (!user.birthday) return;
                const bdate = new Date(user.birthday);
                // Adjust parsing if formatted differently, standard is YYYY-MM-DD

                const bMethod = bdate.getMonth();
                const bDay = bdate.getDate();

                const birthYear = bdate.getFullYear();
                const age = today.getFullYear() - birthYear;

                const isToday = bMethod === currentMonth && bDay === currentDay;

                // Upcoming logic
                const thisYearBirthday = new Date(today.getFullYear(), bMethod, bDay);
                if (thisYearBirthday < today) {
                    thisYearBirthday.setFullYear(today.getFullYear() + 1);
                }

                const diffTime = thisYearBirthday.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (isToday || (diffDays >= 0 && diffDays <= 7)) { // Upcoming 7 days
                    upcoming.push({
                        id: user.id,
                        name: user.full_name || user.name || 'User',
                        birthday: user.birthday,
                        age: isToday ? age : age + 1,
                        isToday
                    });
                }
            });

            // Sort: Today first, then date
            upcoming.sort((a, b) => {
                if (a.isToday && !b.isToday) return -1;
                if (!a.isToday && b.isToday) return 1;
                return 0; // simplistic
            });

            setUsers(upcoming);

        } catch (err) {
            console.error('Birthday fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const todayList = users.filter(u => u.isToday);
    const upcomingList = users.filter(u => !u.isToday);

    return (
        <Card className="h-[340px] border-none p-0 overflow-hidden rounded-[40px]" style={{ borderWidth: 0 }}>
            <LinearGradient
                colors={[Colors.primary, '#be185d']}
                style={{ flex: 1, padding: 16 }}
            >
                {/* Header removed for cleaner look, space reused for content */}
                <View className="h-2" />

                {/* Hero: Today's Birthdays */}
                {todayList.length > 0 ? (
                    <View className="mb-4">
                        <View className="bg-white/10 p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-white/20">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-white/20 p-2 rounded-full">
                                    <Cake size={20} color="white" />
                                </View>
                                <View>
                                    <Text className="font-bold text-base text-right text-white">
                                        {todayList[0].name} חוגג/ת היום!
                                    </Text>
                                    <Text className="text-pink-100 text-xs text-right">
                                        בן/בת {todayList[0].age}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="px-3 py-1.5 rounded-full shadow-sm bg-white"
                            >
                                <Text className="text-pink-600 text-xs font-bold">ברך</Text>
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
                                <View className="flex-row items-center justify-between py-2 border-b border-white/10">
                                    <View className="flex-row items-center gap-3">
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
            </LinearGradient>
        </Card>
    );
};
