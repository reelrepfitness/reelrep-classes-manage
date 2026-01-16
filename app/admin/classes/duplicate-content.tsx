import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function DuplicateContentScreen() {
    const { content } = useLocalSearchParams<{ content: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    const fetchClasses = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch future classes
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .gte('date', now)
                .order('date', { ascending: true })
                .limit(20);

            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון שיעורים');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedClasses);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedClasses(newSelected);
    };

    const handleSave = async () => {
        if (selectedClasses.size === 0) {
            Alert.alert('שגיאה', 'יש לבחור לפחות שיעור אחד');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('classes')
                .update({ description: content })
                .in('id', Array.from(selectedClasses));

            if (error) throw error;

            Alert.alert('הצלחה', 'התוכן שוכפל בהצלחה');
            router.back();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Header */}
                <LinearGradient
                    colors={['#1F2937', '#111827']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top }]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>שכפול תוכן אימון</Text>
                    <View style={styles.headerButton} />
                </LinearGradient>

                <View style={styles.content}>
                    <Text style={styles.subtitle}>בחר שיעורים אליהם תרצה להעתיק את התוכן:</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                            {classes.map((item) => {
                                const isSelected = selectedClasses.has(item.id);
                                const date = new Date(item.date);
                                const dateStr = format(date, 'EEEE d MMMM', { locale: he });
                                const timeStr = format(date, 'HH:mm');

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.classCard, isSelected && styles.classCardSelected]}
                                        onPress={() => toggleSelection(item.id)}
                                    >
                                        <View style={styles.classInfo}>
                                            <Text style={styles.className}>{item.name}</Text>
                                            <Text style={styles.classDate}>{dateStr} | {timeStr}</Text>
                                        </View>
                                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                            {isSelected && <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, (selectedClasses.size === 0 || saving) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={selectedClasses.size === 0 || saving}
                    >
                        <Text style={styles.saveButtonText}>
                            {saving ? 'שומר...' : `שכפל ל-${selectedClasses.size} שיעורים`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 20,
    },
    headerButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 16,
        textAlign: 'right',
    },
    classCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    classCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(235, 235, 235, 0.5)', // Light gray tint
    },
    classInfo: {
        flex: 1,
    },
    className: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'left',
        marginBottom: 4,
    },
    classDate: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'left',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    checkboxSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
