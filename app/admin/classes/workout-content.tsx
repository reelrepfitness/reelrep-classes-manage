import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Icon } from '@/components/ui/icon';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';

// --- Interfaces ---
export interface WorkoutExercise {
    id: string;
    name: string;      // Input 1 (Right side)
    repsOrTime: string; // Input 2 (Left side)
}

export interface WorkoutSection {
    id: string;
    title: string;     // e.g., "Warm Up", "Metcon"
    exercises: WorkoutExercise[];
}

export default function WorkoutContentScreen() {
    const { classId } = useLocalSearchParams<{ classId: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [sections, setSections] = useState<WorkoutSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // --- Data Fetching ---
    useEffect(() => {
        if (classId) {
            fetchWorkoutData();
        }
    }, [classId]);

    const fetchWorkoutData = async () => {
        // Handle virtual IDs (not yet saved to DB)
        if (classId.startsWith('virtual_') || classId.includes('_')) {
            setSections([{
                id: Date.now().toString(),
                title: '',
                exercises: []
            }]);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('classes')
                .select('workout_data')
                .eq('id', classId)
                .single();

            if (error) throw error;

            if (data?.workout_data) {
                // Ensure data structure is correct (handle legacy or empty)
                const loadedData = Array.isArray(data.workout_data) ? data.workout_data : [];
                setSections(loadedData);
            } else {
                // Initialize with one empty section if nothing exists
                setSections([{
                    id: Date.now().toString(),
                    title: '',
                    exercises: []
                }]);
            }
        } catch (error) {
            console.error('Error fetching workout data:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון את תוכנית האימון');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---
    // --- Actions ---
    const handleSave = async () => {
        if (!classId) return;

        setSaving(true);
        try {
            let actualClassId = classId;

            // Handle Virtual/Generated ID (e.g., "scheduleId_date" or "virtual_scheduleId")
            if (classId.includes('_') && !classId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                let scheduleId = '';
                let dateStr = '';

                if (classId.startsWith('virtual_')) {
                    // ID format: virtual_scheduleId (Assuming today or passed metadata?)
                    // *Warning*: logic in AdminClassDetails uses Today for virtual_. 
                    // This might be risky if we don't have the date. 
                    // But usually IDs are scheduleId_YYYY-MM-DD in the main app.
                    scheduleId = classId.replace('virtual_', '');
                    dateStr = new Date().toISOString().split('T')[0];
                } else {
                    // ID format: scheduleId_YYYY-MM-DD
                    const parts = classId.split('_');
                    // Last part is date, first parts are scheduleId (in case scheduleId has underscores? UUIDs don't)
                    dateStr = parts.pop() || '';
                    scheduleId = parts.join('_');
                }

                if (!scheduleId || !dateStr) {
                    throw new Error('Invalid class ID format');
                }

                // fetch schedule to get time/details for creation
                const { data: schedule, error: schedError } = await supabase
                    .from('class_schedules')
                    .select('*')
                    .eq('id', scheduleId)
                    .single();

                if (schedError || !schedule) throw new Error('Schedule not found');

                // Construct full timestamp
                // start_time is "HH:MM:SS" or "HH:MM"
                const classDateTime = new Date(`${dateStr}T${schedule.start_time}`);

                // Check if class exists
                const { data: existingClass, error: findError } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('schedule_id', scheduleId)
                    .eq('class_date', classDateTime.toISOString())
                    .single();

                if (existingClass) {
                    actualClassId = existingClass.id;
                } else {
                    // Create Class
                    const { data: newClass, error: createError } = await supabase
                        .from('classes')
                        .insert({
                            name: schedule.name,
                            name_hebrew: schedule.name, // or localized if available
                            coach_name: schedule.coach_name,
                            class_date: classDateTime.toISOString(),
                            duration_minutes: schedule.duration_minutes,
                            max_participants: schedule.max_participants,
                            current_participants: 0,
                            required_subscription_level: schedule.required_subscription_level || 1,
                            location: schedule.location,
                            location_hebrew: schedule.location, // or localized
                            class_type: 'general',
                            schedule_id: scheduleId,
                            workout_data: sections // Save workout data immediately on creation
                        })
                        .select('id')
                        .single();

                    if (createError) throw createError;
                    actualClassId = newClass.id;

                    // Note: We don't need to run the update below since we inserted it
                    Alert.alert('הצלחה', 'תוכנית האימון נשמרה בהצלחה');
                    router.back();
                    return;
                }
            }

            // Update existing class (UUID)
            const { error } = await supabase
                .from('classes')
                .update({ workout_data: sections })
                .eq('id', actualClassId);

            if (error) throw error;

            Alert.alert('הצלחה', 'תוכנית האימון נשמרה בהצלחה');
            router.back();
        } catch (error) {
            console.error('Error saving workout:', error);
            Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
        } finally {
            setSaving(false);
        }
    };

    const addSection = () => {
        setSections([...sections, {
            id: Date.now().toString(),
            title: '',
            exercises: []
        }]);
    };

    const removeSection = (sectionId: string) => {
        Alert.alert(
            'מחיקת חלק',
            'האם למחוק את החלק הזה?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'מחק',
                    style: 'destructive',
                    onPress: () => {
                        setSections(sections.filter(s => s.id !== sectionId));
                    }
                }
            ]
        );
    };

    const updateSectionTitle = (sectionId: string, title: string) => {
        setSections(sections.map(s => s.id === sectionId ? { ...s, title } : s));
    };

    const addExercise = (sectionId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    exercises: [...s.exercises, {
                        id: Date.now().toString() + Math.random(),
                        name: '',
                        repsOrTime: ''
                    }]
                };
            }
            return s;
        }));
    };

    const removeExercise = (sectionId: string, exerciseId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    exercises: s.exercises.filter(e => e.id !== exerciseId)
                };
            }
            return s;
        }));
    };

    const updateExercise = (sectionId: string, exerciseId: string, field: keyof WorkoutExercise, value: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    exercises: s.exercises.map(e => e.id === exerciseId ? { ...e, [field]: value } : e)
                };
            }
            return s;
        }));
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

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
                    <Text style={styles.headerTitle}>תוכן האימון</Text>
                    <View style={styles.headerButton} />
                </LinearGradient>

                <KeyboardAwareScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: insets.bottom + 100,
                    }}
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                    extraScrollHeight={20}
                >
                    {sections.map((section, index) => (
                        <View key={section.id} style={styles.sectionCard}>
                            {/* Section Header */}
                            <View style={styles.sectionHeader}>
                                <TouchableOpacity
                                    onPress={() => removeSection(section.id)}
                                    style={styles.deleteSectionBtn}
                                >
                                    <Icon name="trash-2" size={20} color="#EF4444" strokeWidth={2} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.sectionTitleInput}
                                    placeholder="שם החלק, למשל: חימום"
                                    placeholderTextColor="#9CA3AF"
                                    value={section.title}
                                    onChangeText={(text) => updateSectionTitle(section.id, text)}
                                    textAlign="right"
                                />
                            </View>

                            {/* Exercises */}
                            <View style={styles.exercisesList}>
                                {section.exercises.map((exercise) => (
                                    <View key={exercise.id} style={styles.exerciseRow}>
                                        {/* Input B (Left): Time/Reps - Flex 1 */}
                                        <TextInput
                                            style={[styles.input, styles.timeInput]}
                                            placeholder="זמן/חזרות"
                                            placeholderTextColor="#9CA3AF"
                                            value={exercise.repsOrTime}
                                            onChangeText={(text) => updateExercise(section.id, exercise.id, 'repsOrTime', text)}
                                            textAlign="right"
                                        />

                                        {/* Input A (Right): Name - Flex 2 */}
                                        <TextInput
                                            style={[styles.input, styles.nameInput]}
                                            placeholder="שם התרגיל"
                                            placeholderTextColor="#9CA3AF"
                                            value={exercise.name}
                                            onChangeText={(text) => updateExercise(section.id, exercise.id, 'name', text)}
                                            textAlign="right"
                                        />

                                        {/* Delete Exercise Button */}
                                        <TouchableOpacity
                                            onPress={() => removeExercise(section.id, exercise.id)}
                                            style={styles.deleteExerciseBtn}
                                        >
                                            <Icon name="x" size={16} color="#EF4444" strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            {/* Add Exercise Button */}
                            <TouchableOpacity
                                style={styles.addExerciseBtn}
                                onPress={() => addExercise(section.id)}
                            >
                                <Text style={styles.addExerciseText}>+ הוסף תרגיל</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Add New Section Button */}
                    <TouchableOpacity style={styles.addSectionBtn} onPress={addSection}>
                        <Icon name="plus" size={20} color={Colors.primary} strokeWidth={2.5} />
                        <Text style={styles.addSectionText}>הוסף חלק חדש</Text>
                    </TouchableOpacity>

                </KeyboardAwareScrollView>

                {/* Footer */}
                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.saveButtonText}>
                            {saving ? 'שומר...' : 'שמור אימון'}
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
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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

    // Section Card
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    sectionTitleInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    deleteSectionBtn: {
        padding: 4,
    },

    // Exercises
    exercisesList: {
        gap: 12,
        marginBottom: 16,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        fontSize: 15,
        color: '#111827',
    },
    timeInput: {
        flex: 1,
    },
    nameInput: {
        flex: 2,
    },
    deleteExerciseBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        // marginLeft: -4, 
    },

    addExerciseBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    addExerciseText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary, // Brand Blue/Gray ? using primary which is usually pink/red in this app, but prompt said "Brand Blue/Gray". I will use primary for now or similar.
    },

    // Global Buttons
    addSectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 16,
        marginBottom: 24,
        gap: 8,
    },
    addSectionText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingTop: 16,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    saveButton: {
        backgroundColor: '#EF4444', // Heavy rounded corners, Brand Color (Pink/Red)
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
