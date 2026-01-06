import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { MessageCircle, User, CheckCircle, Circle, CheckSquare, Square } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type InactiveUser = {
    id: string;
    name: string;
    lastWorkoutDate: string;
    daysSince: number;
    phone?: string; // Added phone support if available in schema, though not used in UI yet
};

export const RetentionSlide = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'1w' | '2w' | '3w'>('1w');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [weeks1, setWeeks1] = useState<InactiveUser[]>([]);
    const [weeks2, setWeeks2] = useState<InactiveUser[]>([]);
    const [weeks3, setWeeks3] = useState<InactiveUser[]>([]);

    useEffect(() => {
        fetchRetentionData();
    }, []);

    // Clear selection when tab changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab]);

    const fetchRetentionData = async () => {
        try {
            setLoading(true);

            // 1. Get active subscriptions/users
            const { data: subs, error: subsError } = await supabase
                .from('user_subscriptions')
                .select('user_id, profiles!inner(id, name, full_name, phone_number)')
                .eq('is_active', true);

            if (subsError) throw subsError;

            const activeUserIds = subs.map(s => s.user_id);

            if (activeUserIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Get LAST workout for each user
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
                // @ts-ignore
                const userPhone = sub.profiles?.phone_number;

                const lastDateStr = userLastLog[userId];

                // Logic: If no log found, decide if they are "inactive" or "new". 
                // For now, assume inactive (legacy users or dropped out immediately)
                // In real app, check created_at to exclude brand new users

                let diffDays = 999;

                if (lastDateStr) {
                    const lastDate = new Date(lastDateStr);
                    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                const userObj = {
                    id: userId,
                    name: userName,
                    lastWorkoutDate: lastDateStr || 'Never',
                    daysSince: diffDays,
                    phone: userPhone
                };

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

    const handleWhatsApp = () => {
        if (selectedIds.size === 0) return;

        console.log('Opening WhatsApp for users:', Array.from(selectedIds));
        Alert.alert(
            'שליחת הודעה',
            `שולח הודעה ל-${selectedIds.size} מתאמנים שנבחרו.`,
            [{ text: 'אישור' }]
        );
        // Here you would implement actual linking or batch logic
    };

    const currentList = activeTab === '1w' ? weeks1 : activeTab === '2w' ? weeks2 : weeks3;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === currentList.length && currentList.length > 0) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set(currentList.map(u => u.id));
            setSelectedIds(newSet);
        }
    };

    const isAllSelected = currentList.length > 0 && selectedIds.size === currentList.length;

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

    return (
        <Card className="h-[340px] border-none rounded-[40px]" style={{ backgroundColor: 'white', borderWidth: 0 }}>
            <CardContent className="h-full flex-1 p-4">
                {/* Tabs & Select All Header */}
                <View className="flex-row-reverse justify-between items-center border-b border-gray-100 mb-2 pb-2">
                    <View className="flex-row-reverse flex-1">
                        <TabButton id="1w" label="שבוע 1" count={weeks1.length} />
                        <TabButton id="2w" label="שבועיים" count={weeks2.length} />
                        <TabButton id="3w" label="3 שבועות+" count={weeks3.length} />
                    </View>

                    {/* Select All Toggle - Compact */}
                    {currentList.length > 0 && (
                        <TouchableOpacity
                            onPress={toggleSelectAll}
                            className="flex-row-reverse items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-100 ml-2"
                        >
                            <Text className="text-[10px] text-gray-600 font-medium">הכל</Text>
                            {isAllSelected ? (
                                <CheckCircle size={12} color={Colors.primary} />
                            ) : (
                                <Circle size={12} color="#9CA3AF" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* List */}
                <View className="flex-1">
                    {loading ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
                    ) : currentList.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-gray-400 text-sm">אין משתמשים ברשימה זו ✅</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={currentList}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 10 }}
                            renderItem={({ item }) => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={() => toggleSelection(item.id)}
                                        className={cn(
                                            "flex-row-reverse items-center justify-between py-3 border-b border-gray-50 transition-all",
                                            isSelected ? "bg-blue-50/50 -mx-2 px-2 rounded-lg" : ""
                                        )}
                                    >
                                        <View className="flex-row-reverse items-center gap-3 flex-1">
                                            {/* Checkbox */}
                                            <TouchableOpacity onPress={() => toggleSelection(item.id)}>
                                                {isSelected ? (
                                                    <CheckCircle size={20} color={Colors.primary} fill={Colors.primary + "20"} />
                                                ) : (
                                                    <Circle size={20} color="#E5E7EB" />
                                                )}
                                            </TouchableOpacity>

                                            <View className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 shadow-sm">
                                                <User size={18} color="#9CA3AF" />
                                            </View>

                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-gray-900 text-right" numberOfLines={1}>{item.name}</Text>
                                                <Text className="text-xs text-gray-500 text-right">
                                                    {item.daysSince === 999 ? 'לא התאמן מעולם' : `לפני ${item.daysSince} ימים`}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>

                {/* Footer Action - WhatsApp */}
                <View className="mt-auto pt-4 border-t border-gray-100">
                    <TouchableOpacity
                        onPress={handleWhatsApp}
                        disabled={selectedIds.size === 0}
                        className={cn(
                            "w-full py-3.5 rounded-xl flex-row-reverse justify-center items-center gap-2 shadow-sm transition-all",
                            selectedIds.size === 0 ? "bg-gray-100" : "bg-[#25D366]"
                        )}
                        activeOpacity={0.8}
                    >
                        <MessageCircle size={18} color={selectedIds.size === 0 ? "#9CA3AF" : "white"} />
                        <Text className={cn("font-bold text-sm", selectedIds.size === 0 ? "text-gray-400" : "text-white")}>
                            {selectedIds.size === 0
                                ? 'בחר משתמשים לשליחה'
                                : `שלח הודעה (${selectedIds.size})`
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            </CardContent>
        </Card>
    );
};
