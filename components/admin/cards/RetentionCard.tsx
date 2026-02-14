import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { MessageCircle, User } from 'lucide-react-native';
import { cn } from '@/lib/utils';

type InactiveUser = {
    id: string;
    name: string;
    lastWorkoutDate: string;
    daysSince: number;
};

export const RetentionCard = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'1w' | '2w' | '3w'>('1w');

    const [weeks1, setWeeks1] = useState<InactiveUser[]>([]);
    const [weeks2, setWeeks2] = useState<InactiveUser[]>([]);
    const [weeks3, setWeeks3] = useState<InactiveUser[]>([]);

    useEffect(() => {
        fetchRetentionData();
    }, []);

    const fetchRetentionData = async () => {
        try {
            setLoading(true);

            // 1. Get active subscriptions/users
            const { data: subs, error: subsError } = await supabase
                .from('user_subscriptions')
                .select('user_id, profiles!inner(id, name, full_name)')
                .eq('is_active', true);

            if (subsError) throw subsError;

            const activeUserIds = subs.map(s => s.user_id);

            if (activeUserIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Get LAST workout for each user
            // We can't easily do "group by user info max date" in one simple query without RPC or complex joins.
            // Strategy: Fetch all logs for these users, safe assumption for now or optimize later.
            const { data: logs, error: logsError } = await supabase
                .from('workout_logs')
                .select('user_id, log_date')
                .in('user_id', activeUserIds)
                .order('log_date', { ascending: false });

            if (logsError) throw logsError;

            // Process in JS
            const now = new Date();
            const userLastLog: Record<string, string> = {};

            logs.forEach(log => {
                if (!userLastLog[log.user_id]) {
                    userLastLog[log.user_id] = log.log_date;
                }
            });

            const w1: InactiveUser[] = [];
            const w2: InactiveUser[] = [];
            const w3: InactiveUser[] = [];

            subs.forEach(sub => {
                const userId = sub.user_id;
                // @ts-ignore
                const userName = sub.profiles?.full_name || sub.profiles?.name || 'User';
                const lastDateStr = userLastLog[userId];

                if (!lastDateStr) {
                    // Never trained? Or trained long ago (not in fetched logs)?
                    // Treat as 3w+ (High risk)
                    w3.push({ id: userId, name: userName, lastWorkoutDate: 'Never', daysSince: 999 });
                    return;
                }

                const lastDate = new Date(lastDateStr);
                const diffTime = Math.abs(now.getTime() - lastDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const userObj = { id: userId, name: userName, lastWorkoutDate: lastDateStr, daysSince: diffDays };

                if (diffDays >= 7 && diffDays < 14) {
                    w1.push(userObj);
                } else if (diffDays >= 14 && diffDays < 21) {
                    w2.push(userObj);
                } else if (diffDays >= 21) {
                    w3.push(userObj);
                }
            });

            setWeeks1(w1);
            setWeeks2(w2);
            setWeeks3(w3);

        } catch (err) {
            console.error('Retention fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = () => {
        const currentList = activeTab === '1w' ? weeks1 : activeTab === '2w' ? weeks2 : weeks3;
        const count = currentList.length;
        Alert.alert('שליחת הודעה', `הודעה תישלח ל-${count} משתמשים ברשימה זו.`);
    };

    // Helper for tab styling
    const TabButton = ({ id, label, count }: { id: '1w' | '2w' | '3w', label: string, count: number }) => {
        const isActive = activeTab === id;
        return (
            <TouchableOpacity
                onPress={() => setActiveTab(id)}
                className={cn(
                    "flex-1 items-center py-2 border-b-2",
                    isActive ? "border-primary" : "border-transparent"
                )}
            >
                <Text className={cn("font-bold text-xs mb-1", isActive ? "text-primary" : "text-gray-400")}>
                    {label}
                </Text>
                <View className={cn("px-2 py-0.5 rounded-full", isActive ? "bg-primary" : "bg-gray-100")}>
                    <Text className={cn("text-[10px] font-bold", isActive ? "text-white" : "text-gray-500")}>
                        {count}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const currentList = activeTab === '1w' ? weeks1 : activeTab === '2w' ? weeks2 : weeks3;

    return (
        <View style={{ backgroundColor: 'white' }} className="rounded-3xl p-5 shadow-sm border border-gray-100 flex-1">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-extrabold text-[#09090B]">שימור לקוחות</Text>
                <Text className="text-xs text-gray-400">לא התאמנו לאחרונה</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-gray-100 mb-4">
                <TabButton id="1w" label="שבוע 1" count={weeks1.length} />
                <TabButton id="2w" label="שבועיים" count={weeks2.length} />
                <TabButton id="3w" label="3 שבועות+" count={weeks3.length} />
            </View>

            {/* List */}
            <View className="flex-1">
                {loading ? (
                    <Spinner size="sm" />
                ) : currentList.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-400 text-sm">אין משתמשים ברשימה זו ✅</Text>
                    </View>
                ) : (
                    <FlatList
                        data={currentList}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
                                <View className="flex-row items-center gap-2">
                                    <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                                        <User size={14} color="#9CA3AF" />
                                    </View>
                                    <View>
                                        <Text className="text-sm font-bold text-gray-800 text-right">{item.name}</Text>
                                        <Text className="text-[10px] text-gray-400 text-right">
                                            {item.daysSince === 999 ? 'לא התאמן מעולם' : `לפני ${item.daysSince} ימים`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Footer Action */}
            <View className="mt-auto pt-4 border-t border-gray-100">
                <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={currentList.length === 0}
                    className={cn(
                        "w-full py-3 rounded-xl flex-row justify-center items-center gap-2",
                        currentList.length === 0 ? "bg-gray-100" : "bg-black"
                    )}
                >
                    <MessageCircle size={16} color={currentList.length === 0 ? "#9CA3AF" : "white"} />
                    <Text className={cn("font-bold text-sm", currentList.length === 0 ? "text-gray-400" : "text-white")}>
                        שלח הודעה לכולם ({currentList.length})
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
