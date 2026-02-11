import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    PanResponder,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Users, ChevronRight, Plus, ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { supabase } from '@/constants/supabase';

// --- Types ---
interface ClassSession {
    id: string;
    schedule_id?: string;
    name: string;
    name_hebrew: string;
    time: string; // derived from class_date
    date: string; // derived from class_date
    trainer_name: string;
    registered_count: number;
    max_capacity: number;
    status: 'open' | 'filling' | 'full';
    class_date: string;
    is_instance?: boolean;
}

const DAYS_OF_WEEK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const formatDateKey = (date: Date) => date.toLocaleDateString('en-CA');

export default function ClassesListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<ClassSession[]>([]);
    
    // Calendar State
    const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
    const [weekOffset, setWeekOffset] = useState(0);

    const fetchClasses = async () => {
        try {
            setLoading(true);

            // 1. Setup Dates
            const dateObj = new Date(selectedDate);
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            // day_of_week: 1=Sunday, 7=Saturday (Supabase/Postgres convention usually 0-6 or 1-7, verify usage)
            // In ClassesContext it was (day_of_week || 1) - 1 for JS. So DB is likely 1-based (Sunday=1).
            const dayOfWeek = dateObj.getDay() + 1; 

            // 2. Fetch Schedules for this day
            const { data: schedules, error: schedError } = await supabase
                .from('class_schedules')
                .select('*')
                .eq('is_active', true)
                .eq('day_of_week', dayOfWeek);

            if (schedError) throw schedError;

            // 3. Fetch Instantiated Classes for this day
            const { data: existingClasses, error: classesError } = await supabase
                .from('classes')
                .select(`
                    *,
                    bookings:class_bookings(count)
                `)
                .gte('class_date', startOfDay.toISOString())
                .lte('class_date', endOfDay.toISOString());

            if (classesError) throw classesError;

            // 4. Merge
            const combinedClasses: ClassSession[] = (schedules || []).map((schedule: any) => {
                // Find matching instance
                const instance = existingClasses?.find(c => c.schedule_id === schedule.id);
                
                // Base data from Schedule
                const [hours, minutes] = schedule.start_time.split(':');
                const classDate = new Date(dateObj);
                classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                
                // Format time string
                const endTime = new Date(classDate.getTime() + (schedule.duration_minutes || 60)*60000);
                const timeStr = `${schedule.start_time.slice(0,5)} - ${endTime.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}`;

                if (instance) {
                    // Use Instance Data
                    const registered = instance.bookings?.[0]?.count || 0;
                    const capacity = instance.max_participants || schedule.max_participants;
                    
                    let status: 'open' | 'filling' | 'full' = 'open';
                    if (registered >= capacity) status = 'full';
                    else if (registered / capacity > 0.7) status = 'filling';

                    return {
                        id: instance.id, // Real ID
                        name: instance.name_hebrew || instance.name,
                        name_hebrew: instance.name_hebrew,
                        time: timeStr,
                        date: selectedDate,
                        trainer_name: instance.coach_name || schedule.coach_name || 'מאמן',
                        registered_count: registered,
                        max_capacity: capacity,
                        status,
                        class_date: instance.class_date,
                        is_instance: true
                    };
                } else {
                    // Use Schedule Data (Virtual)
                    return {
                        id: `virtual_${schedule.id}`, // Virtual ID
                        schedule_id: schedule.id,
                        name: schedule.name,
                        name_hebrew: schedule.name,
                        time: timeStr,
                        date: selectedDate,
                        trainer_name: schedule.coach_name || 'מאמן',
                        registered_count: 0,
                        max_capacity: schedule.max_participants || 15,
                        status: 'open',
                        class_date: classDate.toISOString(),
                        is_instance: false
                    };
                }
            });

            // Sort by time
            combinedClasses.sort((a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime());

            setClasses(combinedClasses);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            // Auto-complete attendance for past classes
            const autoCompletePastClasses = async () => {
                try {
                    const { data } = await supabase.rpc('auto_complete_past_classes');
                    if (data && data > 0) {
                        console.log(`Auto-marked ${data} bookings as attended`);
                    }
                } catch (err) {
                    console.error('Auto-complete error:', err);
                }
            };
            autoCompletePastClasses();

            fetchClasses();
        }, [selectedDate]) // Refetch when date changes
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchClasses();
        setRefreshing(false);
    };

    // Calendar Logic
    const generateWeekDays = (offset: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get Sunday of the current week
        const currentSunday = new Date(today);
        currentSunday.setDate(today.getDate() - today.getDay());

        // Apply week offset
        const targetSunday = new Date(currentSunday);
        targetSunday.setDate(currentSunday.getDate() + (offset * 7));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(targetSunday);
            date.setDate(targetSunday.getDate() + i);
            days.push({
                dayOfWeek: i,
                date: date.toISOString(),
                dateKey: formatDateKey(date),
                dayNumber: date.getDate(),
            });
        }
        return days;
    };

    const calendarDays = useMemo(() => generateWeekDays(weekOffset), [weekOffset]);
    const todayKey = formatDateKey(new Date());

    const panResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dx < -50) {
                // Swipe Left -> Next Week
                setWeekOffset(prev => prev + 1);
            } else if (gestureState.dx > 50) {
                // Swipe Right -> Prev Week
                setWeekOffset(prev => prev - 1);
            }
        },
    }), []);

    const getStatusColor = (status: string) => {
        if (status === 'full') return '#EF4444';
        if (status === 'filling') return '#F59E0B';
        return '#34C759';
    };

    const renderClassCard = (item: ClassSession) => {
        const progress = item.registered_count / item.max_capacity;
        const statusColor = getStatusColor(item.status);

        return (
            <TouchableOpacity 
                key={item.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/admin/classes/${item.id}`)}
            >
                <View style={styles.cardLeft}>
                    <View style={[styles.timeContainer, { borderColor: statusColor }]}>
                        <Text style={styles.timeText}>{item.time.split(' - ')[0]}</Text>
                        <Text style={styles.durationText}>
                            {new Date(item.class_date).toLocaleDateString('he-IL', { weekday: 'short' })}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.className}>{item.name}</Text>
                        {item.status === 'full' && (
                            <View style={styles.fullBadge}>
                                <Text style={styles.fullBadgeText}>מלא</Text>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.trainerRow}>
                        <Text style={styles.trainerName}>{item.trainer_name}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Users size={14} color="#64748B" />
                            <Text style={styles.statText}>
                                {item.registered_count}/{item.max_capacity}
                            </Text>
                        </View>
                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View 
                                style={[
                                    styles.progressBarFill, 
                                    { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: statusColor }
                                ]} 
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <ChevronLeft size={20} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <AdminHeader title="ניהול שיעורים" />
            
            {/* Calendar Strip */}
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <Text style={styles.monthTitle}>
                        {new Date(selectedDate).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                    </Text>
                </View>

                <View style={styles.calendarStrip} {...panResponder.panHandlers}>
                    <TouchableOpacity 
                        onPress={() => setWeekOffset(prev => prev - 1)}
                        style={styles.arrowBtn}
                    >
                        <ChevronRight size={20} color="#000" />
                    </TouchableOpacity>

                    <View style={styles.daysRow}>
                        {calendarDays.map((day, index) => {
                            const isSelected = selectedDate === day.dateKey;
                            const isToday = day.dateKey === todayKey;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => setSelectedDate(day.dateKey)}
                                    style={[
                                        styles.dayItem,
                                        isSelected && styles.dayItemSelected,
                                        isToday && !isSelected && styles.dayItemToday
                                    ]}
                                >
                                    <Text style={[
                                        styles.dayName, 
                                        isSelected && styles.dayTextSelected
                                    ]}>
                                        {DAYS_OF_WEEK[day.dayOfWeek]}
                                    </Text>
                                    <Text style={[
                                        styles.dayNumber, 
                                        isSelected && styles.dayTextSelected
                                    ]}>
                                        {day.dayNumber}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity 
                        onPress={() => setWeekOffset(prev => prev + 1)}
                        style={styles.arrowBtn}
                    >
                        <ChevronLeft size={20} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.listSection}>
                        {classes.length > 0 ? (
                            classes.map(renderClassCard)
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>אין שיעורים בתאריך זה</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 90 }]}
                activeOpacity={0.8}
                onPress={() => {/* Open Create Class Modal */}}
            >
                <Plus size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    // Calendar Styles
    calendarContainer: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 10,
    },
    calendarHeader: {
        paddingHorizontal: 20,
        marginBottom: 8,
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    calendarStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    arrowBtn: {
        padding: 8,
    },
    daysRow: {
        flex: 1,
        flexDirection: 'row', // User requested opposite direction
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    dayItem: {
        width: 40,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    dayItemSelected: {
        backgroundColor: '#09090B',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    dayItemToday: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dayName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 2,
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    dayTextSelected: {
        color: '#FFFFFF',
    },
    
    scrollContent: {
        padding: 20,
    },
    listSection: {
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        alignItems: 'center',
    },
    cardLeft: {
        marginRight: 12,
    },
    timeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        borderLeftWidth: 3,
        minWidth: 60,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    durationText: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    cardContent: {
        flex: 1,
        gap: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    className: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
    },
    fullBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    fullBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },
    trainerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trainerName: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'left',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        width: 60,
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden',
        maxWidth: 100,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    cardRight: {
        marginLeft: 8,
    },
    fab: {
        position: 'absolute',
        left: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '500'
    }
});

