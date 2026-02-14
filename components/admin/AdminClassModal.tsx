import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Alert, Linking, ActionSheetIOS, Platform } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { X, Check, Trash2, Plus, MessageCircle, MoreVertical, User as UserIcon, Calendar, Clock, MapPin, AlarmClock } from 'lucide-react-native';
import { useClasses } from '@/contexts/ClassesContext';
import Colors from '@/constants/colors';
import UserPicker from './UserPicker';

interface AdminClassModalProps {
    visible: boolean;
    classItem: any | null;
    onClose: () => void;
}

export default function AdminClassModal({ visible, classItem, onClose }: AdminClassModalProps) {
    const { getClassBookings, adminBookClass, adminCancelBooking, markAttendance, approveWaitingList } = useClasses();
    const [activeTab, setActiveTab] = useState<'enrolled' | 'waiting'>('enrolled');
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showUserPicker, setShowUserPicker] = useState(false);

    useEffect(() => {
        if (visible && classItem) {
            fetchBookings();
        }
    }, [visible, classItem]);

    const fetchBookings = async () => {
        if (!classItem) return;
        setLoading(true);
        try {
            const data = await getClassBookings(classItem.id);
            setBookings(data);
        } catch (error) {
            console.error(error);
            Alert.alert('שגיאה', 'לא ניתן לטעון נרשמים');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (user: any) => {
        try {
            setShowUserPicker(false);
            Alert.alert(
                'הוספת מתאמן',
                `האם להוסיף את ${user.full_name || user.name} לשיעור?`,
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'הוסף',
                        onPress: async () => {
                            await adminBookClass(user.id, classItem.id);
                            await fetchBookings();
                            Alert.alert('הצלחה', 'המתאמן נוסף בהצלחה');
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן להוסיף משתמש');
        }
    };

    const handleRemoveUser = (bookingId: string, name: string) => {
        Alert.alert(
            'הסרת מתאמן',
            `האם להסיר את ${name} מהשיעור? ניתן לבצע זאת גם ברגע האחרון.`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הסר',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminCancelBooking(bookingId);
                            await fetchBookings();
                        } catch (error) {
                            Alert.alert('שגיאה', 'לא ניתן להסיר משתמש');
                        }
                    }
                }
            ]
        );
    };

    const handleAttendance = async (bookingId: string, currentStatus: string, newStatus: 'attended' | 'no_show' | 'late') => {
        // Toggle logic: if already in this status, reset to confirmed
        const mappedStatus = newStatus === 'attended' ? 'completed' : newStatus;
        const finalDbStatus = currentStatus === mappedStatus ? 'confirmed' : mappedStatus;

        // Optimistic update - update UI immediately without waiting for server
        setBookings(prev => prev.map(b =>
            b.id === bookingId
                ? { ...b, status: finalDbStatus, attended_at: finalDbStatus === 'completed' || finalDbStatus === 'late' ? new Date().toISOString() : null }
                : b
        ));

        try {
            const finalStatus = currentStatus === mappedStatus ? 'reset' : newStatus;
            await markAttendance(bookingId, finalStatus);
            // Silent background refresh to sync with server (don't await to avoid flicker)
            fetchBookings();
        } catch (error) {
            // Revert on error
            setBookings(prev => prev.map(b =>
                b.id === bookingId ? { ...b, status: currentStatus } : b
            ));
            Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
        }
    };

    const handleApproveWaiting = async (bookingId: string) => {
        try {
            await approveWaitingList(bookingId);
            await fetchBookings();
            Alert.alert('הצלחה', 'המשתמש הועבר לרשימת המשתתפים');
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לאשר משתמש');
        }
    };

    const handleNotify = () => {
        const enrolledUsers = bookings.filter(b => b.status === 'confirmed');
        if (enrolledUsers.length === 0) {
            Alert.alert('אין משתתפים', 'אין למי לשלוח הודעה');
            return;
        }

        const options = ['ביטול', 'שלח וואטסאפ לקבוצה', 'שלח אימייל לקבוצה'];
        const destructiveButtonIndex = 0;
        const cancelButtonIndex = 0;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                },
                buttonIndex => {
                    if (buttonIndex === 1) {
                        // WhatsApp logic - usually creating a group link or broadcasting isn't direct via URL scheme easily for multiple unless using broadcast list interaction
                        // For now just show info
                        Alert.alert('וואטסאפ', 'פתיחת וואטסאפ לשליחת הודעה (דורש אינטגרציה מלאה)');
                    } else if (buttonIndex === 2) {
                        const emails = enrolledUsers.map(b => b.profiles?.email).filter(Boolean).join(',');
                        Linking.openURL(`mailto:?bcc=${emails}&subject=הודעה לגבי שיעור ${classItem?.title}`);
                    }
                }
            );
        } else {
            // Android fallback (simplified)
            Alert.alert('שליחת הודעה', 'בחר אפשרות', [
                {
                    text: 'אימייל', onPress: () => {
                        const emails = enrolledUsers.map(b => b.profiles?.email).filter(Boolean).join(',');
                        Linking.openURL(`mailto:?bcc=${emails}&subject=הודעה לגבי שיעור ${classItem?.title}`);
                    }
                },
                { text: 'ביטול', style: 'cancel' }
            ]);
        }
    };

    const enrolledList = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'no_show' || b.status === 'late');
    const waitingList = bookings.filter(b => b.status === 'waiting_list');

    const displayList = activeTab === 'enrolled' ? enrolledList : waitingList;

    if (!classItem) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>

                {/* Header */}
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F4F4F5' }}>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', textAlign: 'right' }}>{classItem.title}</Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Clock size={14} color="#71717A" />
                            <Text style={{ color: '#71717A', fontSize: 14 }}>{classItem.time}</Text>
                            <Text style={{ color: '#E4E4E7' }}>|</Text>
                            <Text style={{ color: '#71717A', fontSize: 14 }}>{classItem.instructor}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: '#F4F4F5', borderRadius: 50 }}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row-reverse', padding: 16, gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('enrolled')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            backgroundColor: activeTab === 'enrolled' ? '#000' : 'white',
                            borderRadius: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: activeTab === 'enrolled' ? '#000' : '#E4E4E7'
                        }}
                    >
                        <Text style={{ fontWeight: '700', color: activeTab === 'enrolled' ? 'white' : '#71717A' }}>
                            רשומים ({enrolledList.length}/{classItem.capacity})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('waiting')}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            backgroundColor: activeTab === 'waiting' ? '#000' : 'white',
                            borderRadius: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: activeTab === 'waiting' ? '#000' : '#E4E4E7'
                        }}
                    >
                        <Text style={{ fontWeight: '700', color: activeTab === 'waiting' ? 'white' : '#71717A' }}>
                            המתנה ({waitingList.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Action Bar */}
                <View style={{ flexDirection: 'row-reverse', paddingHorizontal: 16, marginBottom: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => setShowUserPicker(true)}
                        style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 }}
                    >
                        <Plus size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>הוסף מתאמן</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleNotify}
                        style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: '#E4E4E7' }}
                    >
                        <MessageCircle size={16} color="#000" />
                        <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>שלח הודעה</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                    {loading ? (
                        <Spinner size="lg" />
                    ) : displayList.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
                            <UserIcon size={48} color="#000" />
                            <Text style={{ marginTop: 16, fontSize: 16, color: '#71717A' }}>
                                {activeTab === 'enrolled' ? 'אין נרשמים עדיין' : 'אין ממתינים'}
                            </Text>
                        </View>
                    ) : (
                        displayList.map((booking) => (
                            <View key={booking.id} style={{
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'white',
                                padding: 12,
                                marginBottom: 8,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: '#F4F4F5',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2
                            }}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F4F5', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                        {booking.profiles?.avatar_url ? (
                                            <Image source={{ uri: booking.profiles.avatar_url }} style={{ width: 40, height: 40 }} />
                                        ) : (
                                            <Text style={{ fontWeight: '700', color: '#71717A' }}>
                                                {booking.profiles?.name?.charAt(0) || '?'}
                                            </Text>
                                        )}
                                    </View>
                                    <View>
                                        <Text style={{ fontWeight: '700', fontSize: 16, textAlign: 'right' }}>
                                            {booking.profiles?.full_name || booking.profiles?.name || 'Unknown'}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'right' }}>
                                            {booking.status === 'completed' ? 'נכח בשיעור' : booking.status === 'late' ? 'הגיע באיחור' : booking.status === 'no_show' ? 'לא הגיע' : booking.status === 'waiting_list' ? 'בהמתנה' : 'רשום'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {activeTab === 'enrolled' && (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => handleAttendance(booking.id, booking.status, 'no_show')}
                                                style={{ padding: 8, backgroundColor: booking.status === 'no_show' ? '#FEE2E2' : '#F4F4F5', borderRadius: 8 }}
                                            >
                                                <X size={16} color={booking.status === 'no_show' ? '#EF4444' : '#A1A1AA'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleAttendance(booking.id, booking.status, 'late')}
                                                style={{ padding: 8, backgroundColor: booking.status === 'late' ? '#FEF3C7' : '#F4F4F5', borderRadius: 8 }}
                                            >
                                                <Image
                                                    source={require('@/assets/images/late.webp')}
                                                    style={{ width: 16, height: 16, tintColor: booking.status === 'late' ? '#F59E0B' : '#A1A1AA' }}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleAttendance(booking.id, booking.status, 'attended')}
                                                style={{ padding: 8, backgroundColor: booking.status === 'completed' ? '#DCFCE7' : '#F4F4F5', borderRadius: 8 }}
                                            >
                                                <Check size={16} color={booking.status === 'completed' ? '#22C55E' : '#A1A1AA'} />
                                            </TouchableOpacity>
                                            <View style={{ width: 1, height: 20, backgroundColor: '#E4E4E7', marginHorizontal: 4 }} />
                                        </>
                                    )}

                                    {activeTab === 'waiting' && (
                                        <TouchableOpacity
                                            onPress={() => handleApproveWaiting(booking.id)}
                                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#000', borderRadius: 8 }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>אשר</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => handleRemoveUser(booking.id, booking.profiles?.name || 'Unknown')}
                                        style={{ padding: 8 }}
                                    >
                                        <Trash2 size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            <UserPicker
                visible={showUserPicker}
                onClose={() => setShowUserPicker(false)}
                onSelect={handleAddUser}
            />
        </Modal>
    );
}
