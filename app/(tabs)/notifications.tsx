import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, Check, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { cn } from '@/lib/utils';

type TabType = 'unread' | 'all' | 'requests';

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    notification_type?: string;
    type?: string;
    deep_link?: string;
    payload?: any;
    status?: string;
    user_id?: string;
}

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return date.toLocaleDateString('he-IL');
}

function getDeepLink(notification: Notification, isAdmin: boolean): string | null {
    if (notification.deep_link) return notification.deep_link;

    const type = notification.notification_type || notification.type;

    if (isAdmin) {
        switch (type) {
            case 'freeze_request':
            case 'extension_request':
                return notification.payload?.user_id
                    ? `/admin/users/${notification.payload.user_id}`
                    : '/admin';
            default:
                return '/admin';
        }
    } else {
        switch (type) {
            case 'purchase_success':
            case 'purchase_failed':
            case 'payment_pending':
                return '/(tabs)/profile';
            case 'debt_activated':
                return '/subscription-management';
            default:
                return '/(tabs)/profile';
        }
    }
}

function NotificationCard({
    notification,
    onPress,
    isAdmin
}: {
    notification: Notification;
    onPress: () => void;
    isAdmin: boolean;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={cn(
                "bg-white rounded-2xl p-4 mb-3 border shadow-sm flex-row items-start",
                notification.is_read ? "border-gray-100" : "border-primary/20 bg-pink-50/30"
            )}
        >
            {!notification.is_read && (
                <View className="w-2.5 h-2.5 rounded-full bg-primary mr-3 mt-1.5" />
            )}
            {notification.is_read && (
                <View className="w-2.5 h-2.5 mr-3 mt-1.5" />
            )}

            <View className="flex-1">
                <Text
                    className={cn(
                        "text-base text-right mb-1",
                        notification.is_read ? "font-medium text-gray-700" : "font-bold text-[#09090B]"
                    )}
                >
                    {notification.title}
                </Text>
                <Text className="text-sm text-gray-500 text-right mb-2" numberOfLines={2}>
                    {notification.message}
                </Text>
                <Text className="text-xs text-gray-400 text-right">
                    {getRelativeTime(notification.created_at)}
                </Text>
            </View>

            {notification.is_read && (
                <View className="ml-2 mt-1">
                    <Check size={16} color="#9CA3AF" />
                </View>
            )}
        </TouchableOpacity>
    );
}

function RequestCard({
    request,
    onApprove,
    onDecline
}: {
    request: Notification;
    onApprove: () => void;
    onDecline: () => void;
}) {
    const type = request.type || '';
    const isPending = request.status === 'pending';

    const getTypeLabel = () => {
        switch (type) {
            case 'freeze_request': return 'בקשת הקפאה';
            case 'extension_request': return 'בקשת הארכה';
            default: return 'בקשה';
        }
    };

    const getStatusBadge = () => {
        switch (request.status) {
            case 'approved':
                return <View className="bg-green-100 px-2 py-1 rounded-full"><Text className="text-green-600 text-xs font-bold">אושר</Text></View>;
            case 'declined':
                return <View className="bg-red-100 px-2 py-1 rounded-full"><Text className="text-red-600 text-xs font-bold">נדחה</Text></View>;
            default:
                return <View className="bg-orange-100 px-2 py-1 rounded-full"><Text className="text-orange-600 text-xs font-bold">ממתין</Text></View>;
        }
    };

    return (
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                    <FileText size={18} color={Colors.primary} />
                    <Text className="text-base font-bold text-[#09090B]">{getTypeLabel()}</Text>
                </View>
                {getStatusBadge()}
            </View>

            <Text className="text-sm text-gray-600 text-right mb-1">{request.title}</Text>
            {request.message && (
                <Text className="text-sm text-gray-500 text-right mb-2" numberOfLines={3}>
                    {request.message}
                </Text>
            )}

            {request.payload?.reason && (
                <View className="bg-gray-50 rounded-lg p-2 mb-2">
                    <Text className="text-xs text-gray-400 text-right">סיבה:</Text>
                    <Text className="text-sm text-gray-700 text-right">{request.payload.reason}</Text>
                </View>
            )}

            {request.payload?.startDate && request.payload?.endDate && (
                <View className="bg-gray-50 rounded-lg p-2 mb-2">
                    <Text className="text-xs text-gray-400 text-right">תאריכים:</Text>
                    <Text className="text-sm text-gray-700 text-right">
                        {new Date(request.payload.startDate).toLocaleDateString('he-IL')} - {new Date(request.payload.endDate).toLocaleDateString('he-IL')}
                    </Text>
                </View>
            )}

            <Text className="text-xs text-gray-400 text-right mb-3">
                {getRelativeTime(request.created_at)}
            </Text>

            {isPending && (
                <View className="flex-row gap-3">
                    <TouchableOpacity
                        onPress={onDecline}
                        className="flex-1 flex-row py-2.5 rounded-xl items-center justify-center gap-2 border border-gray-300 bg-transparent"
                    >
                        <XCircle size={18} color="#6B7280" />
                        <Text className="text-gray-600 font-bold">דחה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onApprove}
                        className="flex-1 flex-row py-2.5 rounded-xl items-center justify-center gap-2 bg-[#09090B]"
                    >
                        <CheckCircle size={18} color="white" />
                        <Text className="text-white font-bold">אשר</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('unread');
    const [refreshing, setRefreshing] = useState(false);

    const tableName = isAdmin ? 'admin_notifications' : 'purchase_notifications';

    // Fetch notifications
    const notificationsQuery = useQuery({
        queryKey: ['notifications', user?.id, isAdmin, activeTab],
        queryFn: async () => {
            if (!user) return [];

            if (activeTab === 'requests' && isAdmin) {
                // Fetch pending requests for admin
                const { data, error } = await supabase
                    .from('admin_notifications')
                    .select('*')
                    .in('type', ['freeze_request', 'extension_request'])
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (error) throw error;
                return data as Notification[];
            }

            let query = supabase
                .from(tableName)
                .select('*')
                .order('created_at', { ascending: false });

            if (!isAdmin) {
                query = query.eq('user_id', user.id);
            }

            if (activeTab === 'unread') {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;
            return data as Notification[];
        },
        enabled: !!user,
    });

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from(tableName)
                .update({ is_read: true })
                .eq('id', notificationId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        },
    });

    // Update request status mutation
    const updateRequestMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'declined' }) => {
            const { error } = await supabase
                .from('admin_notifications')
                .update({ status, is_read: true, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        },
    });

    const handleNotificationPress = useCallback((notification: Notification) => {
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }
        const deepLink = getDeepLink(notification, isAdmin);
        if (deepLink) {
            router.push(deepLink as any);
        }
    }, [isAdmin, markAsReadMutation, router]);

    const handleApprove = (request: Notification) => {
        Alert.alert('אישור בקשה', 'האם לאשר את הבקשה?', [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'אשר',
                onPress: () => updateRequestMutation.mutate({ id: request.id, status: 'approved' })
            }
        ]);
    };

    const handleDecline = (request: Notification) => {
        Alert.alert('דחיית בקשה', 'האם לדחות את הבקשה?', [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'דחה',
                style: 'destructive',
                onPress: () => updateRequestMutation.mutate({ id: request.id, status: 'declined' })
            }
        ]);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await notificationsQuery.refetch();
        setRefreshing(false);
    }, [notificationsQuery]);

    const notifications = notificationsQuery.data || [];

    const tabs = isAdmin
        ? [
            { key: 'unread' as TabType, label: 'שלא נקראו' },
            { key: 'all' as TabType, label: 'כל ההתראות' },
            { key: 'requests' as TabType, label: 'בקשות' },
        ]
        : [
            { key: 'unread' as TabType, label: 'שלא נקראו' },
            { key: 'all' as TabType, label: 'כל ההתראות' },
        ];

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header with tabs */}
            <View
                style={{ paddingTop: insets.top }}
                className="bg-white rounded-b-[28px] shadow-sm border-b border-gray-100 pb-3"
            >
                <Text className="text-2xl font-extrabold text-[#09090B] text-center pt-3 mb-4">
                    התראות
                </Text>

                {/* Tab Selector */}
                <View className="flex-row justify-center gap-2 px-4">
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl items-center",
                                activeTab === tab.key
                                    ? "bg-[#09090B]"
                                    : "bg-gray-100"
                            )}
                        >
                            <Text className={cn(
                                "font-bold text-sm",
                                activeTab === tab.key ? "text-white" : "text-gray-600"
                            )}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content List */}
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => (
                    activeTab === 'requests' ? (
                        <RequestCard
                            request={item}
                            onApprove={() => handleApprove(item)}
                            onDecline={() => handleDecline(item)}
                        />
                    ) : (
                        <NotificationCard
                            notification={item}
                            onPress={() => handleNotificationPress(item)}
                            isAdmin={isAdmin}
                        />
                    )
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        {activeTab === 'requests' ? (
                            <>
                                <FileText size={64} color="#D4D4D8" />
                                <Text className="text-lg font-bold text-gray-400 mt-4 text-center">
                                    אין בקשות ממתינות
                                </Text>
                            </>
                        ) : (
                            <>
                                <Bell size={64} color="#D4D4D8" />
                                <Text className="text-lg font-bold text-gray-400 mt-4 text-center">
                                    {activeTab === 'unread'
                                        ? 'אין התראות שלא נקראו'
                                        : 'אין התראות'}
                                </Text>
                            </>
                        )}
                    </View>
                }
            />
        </View>
    );
}
