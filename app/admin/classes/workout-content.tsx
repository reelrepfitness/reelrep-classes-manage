import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
    Image,
    ScrollView,
    Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Icon } from '@/components/ui/icon';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';
import { EQUIPMENT_TABS } from '@/constants/equipment';

// --- DB Types (cached on mount) ---
interface ExerciseFromDB {
    id: string;
    name: string;
    name_he: string | null;
    equipment: string[] | null;
    equipment_gifs: Record<string, string> | null;
}

interface WorkoutMethodFromDB {
    id: string;
    name: string;
    stands_for: string | null;
    description: string | null;
}

// --- Workout Data Interfaces (saved to classes.workout_data) ---
export interface WorkoutExercise {
    id: string;
    name: string;
    repsOrTime: string;
    exerciseDbId?: string;
    equipment?: string[] | null;
    equipmentGifs?: Record<string, string> | null;
    selectedEquipment?: string[];
}

export interface WorkoutSection {
    id: string;
    title: string;
    workoutMethodId?: string;
    workoutMethodName?: string;
    workoutMethodDescription?: string;
    exercises: WorkoutExercise[];
}

// ============================
// Inline Components
// ============================

// --- Workout Method Picker ---
function WorkoutMethodPicker({
    currentMethodName,
    currentMethodDescription,
    methods,
    onSelectMethod,
    onCustomMethod,
    onClear,
}: {
    currentMethodName?: string;
    currentMethodDescription?: string;
    methods: WorkoutMethodFromDB[];
    onSelectMethod: (method: WorkoutMethodFromDB) => void;
    onCustomMethod: (name: string) => void;
    onClear: () => void;
}) {
    const [showModal, setShowModal] = useState(false);
    const [isCustom, setIsCustom] = useState(false);
    const [customText, setCustomText] = useState('');

    const hasMethod = !!currentMethodName && currentMethodName.length > 0;

    return (
        <View style={styles.methodPickerContainer}>
            <TouchableOpacity
                style={styles.methodPickerButton}
                onPress={() => {
                    setIsCustom(false);
                    setCustomText('');
                    setShowModal(true);
                }}
                activeOpacity={0.7}
            >
                <Text style={[styles.methodPickerText, !hasMethod && styles.methodPickerPlaceholder]}>
                    {hasMethod ? currentMethodName : 'שיטת אימון (אופציונלי)'}
                </Text>
                {hasMethod ? (
                    <TouchableOpacity
                        onPress={onClear}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ padding: 2 }}
                    >
                        <Icon name="x" size={16} color="#9CA3AF" strokeWidth={2} />
                    </TouchableOpacity>
                ) : (
                    <Icon name="chevron-down" size={16} color="#9CA3AF" strokeWidth={2} />
                )}
            </TouchableOpacity>

            {hasMethod && currentMethodDescription ? (
                <Text style={styles.methodDescription}>{currentMethodDescription}</Text>
            ) : null}

            {/* Method Selection Modal */}
            <Modal visible={showModal} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowModal(false)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>בחר שיטת אימון</Text>

                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {methods.map((method) => (
                                <TouchableOpacity
                                    key={method.id}
                                    style={styles.methodOption}
                                    onPress={() => {
                                        onSelectMethod(method);
                                        setShowModal(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.methodOptionName}>{method.name}</Text>
                                    {method.stands_for ? (
                                        <Text style={styles.methodOptionStandsFor}>{method.stands_for}</Text>
                                    ) : null}
                                    {method.description ? (
                                        <Text style={styles.methodOptionDesc} numberOfLines={3}>{method.description}</Text>
                                    ) : null}
                                </TouchableOpacity>
                            ))}

                            {/* Custom option */}
                            <View style={[styles.methodOption, { borderBottomWidth: 0 }]}>
                                {!isCustom ? (
                                    <TouchableOpacity
                                        onPress={() => setIsCustom(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.methodOptionName, { color: Colors.primary }]}>
                                            + שיטה מותאמת אישית
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        <TextInput
                                            style={styles.customMethodInput}
                                            placeholder="שם השיטה..."
                                            placeholderTextColor="#9CA3AF"
                                            value={customText}
                                            onChangeText={setCustomText}
                                            textAlign="right"
                                            autoFocus
                                        />
                                        <TouchableOpacity
                                            style={styles.customMethodConfirm}
                                            onPress={() => {
                                                if (customText.trim()) {
                                                    onCustomMethod(customText.trim());
                                                    setShowModal(false);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.customMethodConfirmText}>אישור</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowModal(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.modalCloseBtnText}>ביטול</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// --- Exercise Autocomplete ---
function ExerciseAutocomplete({
    exerciseRowId,
    value,
    allExercises,
    activeAutocompleteId,
    onFocus,
    onChangeText,
    onSelectExercise,
}: {
    exerciseRowId: string;
    value: string;
    allExercises: ExerciseFromDB[];
    activeAutocompleteId: string | null;
    onFocus: () => void;
    onChangeText: (text: string) => void;
    onSelectExercise: (exercise: ExerciseFromDB) => void;
}) {
    // Local state so the TextInput doesn't re-render from parent setSections
    const [localText, setLocalText] = useState(value);
    const isActive = activeAutocompleteId === exerciseRowId;
    const inputRef = useRef<any>(null);

    // Sync when parent value changes (e.g., after selecting a suggestion)
    useEffect(() => { setLocalText(value); }, [value]);

    const handleChangeText = useCallback((text: string) => {
        setLocalText(text);
        onChangeText(text);
    }, [onChangeText]);

    const suggestions = useMemo(() => {
        if (!isActive || !localText || localText.length < 1) return [];
        const query = localText.toLowerCase();
        return allExercises
            .filter(ex =>
                ex.name.toLowerCase().includes(query) ||
                (ex.name_he && ex.name_he.toLowerCase().includes(query))
            )
            .slice(0, 6);
    }, [isActive, localText, allExercises]);

    return (
        <View style={[styles.autocompleteWrapper, isActive && suggestions.length > 0 && { zIndex: 1000 }]}>
            <TextInput
                ref={inputRef}
                style={[styles.input, styles.nameInput]}
                placeholder="שם התרגיל"
                placeholderTextColor="#9CA3AF"
                value={localText}
                onChangeText={handleChangeText}
                onFocus={onFocus}
                textAlign="right"
            />
            {isActive && suggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                    <ScrollView
                        keyboardShouldPersistTaps="always"
                        nestedScrollEnabled
                        style={{ maxHeight: 220 }}
                    >
                        {suggestions.map((ex, idx) => (
                            <TouchableOpacity
                                key={ex.id}
                                style={[
                                    styles.suggestionItem,
                                    idx === suggestions.length - 1 && { borderBottomWidth: 0 },
                                ]}
                                onPress={() => onSelectExercise(ex)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.suggestionName}>{ex.name}</Text>
                                {ex.name_he && ex.name_he !== ex.name ? (
                                    <Text style={styles.suggestionNameHe}>{ex.name_he}</Text>
                                ) : null}
                                {ex.equipment && ex.equipment.length > 0 ? (
                                    <View style={styles.suggestionEquipmentRow}>
                                        {ex.equipment.slice(0, 4).map(eqId => {
                                            const tab = EQUIPMENT_TABS.find(t => t.id === eqId);
                                            if (!tab) return null;
                                            return (
                                                <Image
                                                    key={eqId}
                                                    source={tab.icon}
                                                    style={styles.suggestionEquipmentIcon}
                                                    resizeMode="contain"
                                                />
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

// --- Exercise Equipment Selector ---
function ExerciseEquipmentSelector({
    availableEquipment,
    selectedEquipment,
    equipmentGifs,
    onToggle,
}: {
    availableEquipment: string[];
    selectedEquipment: string[];
    equipmentGifs?: Record<string, string> | null;
    onToggle: (equipmentId: string) => void;
}) {
    const tabs = EQUIPMENT_TABS.filter(t => availableEquipment.includes(t.id));
    if (tabs.length === 0) return null;

    return (
        <View style={styles.equipmentRow}>
            {tabs.map(tab => {
                const isSelected = selectedEquipment.includes(tab.id);
                const hasGif = !!equipmentGifs?.[tab.id];
                return (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => onToggle(tab.id)}
                        activeOpacity={0.7}
                        style={styles.equipmentIconBtn}
                    >
                        <Image
                            source={tab.icon}
                            style={[
                                styles.equipmentIconSmall,
                                { opacity: isSelected ? 1 : hasGif ? 0.35 : 0.12 },
                            ]}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================
// Main Screen
// ============================
export default function WorkoutContentScreen() {
    const { classId } = useLocalSearchParams<{ classId: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [sections, setSections] = useState<WorkoutSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Reference data from DB
    const [allExercises, setAllExercises] = useState<ExerciseFromDB[]>([]);
    const [workoutMethods, setWorkoutMethods] = useState<WorkoutMethodFromDB[]>([]);

    // Autocomplete focus tracking
    const [activeAutocompleteId, setActiveAutocompleteId] = useState<string | null>(null);

    // --- Load reference data on mount ---
    useEffect(() => {
        const loadExercises = async () => {
            const { data } = await supabase
                .from('exercises')
                .select('id, name, name_he, equipment, equipment_gifs')
                .eq('is_active', true)
                .order('name');
            if (data) setAllExercises(data as ExerciseFromDB[]);
        };

        const loadMethods = async () => {
            const { data } = await supabase
                .from('workout_methods')
                .select('id, name, stands_for, description')
                .order('created_at');
            if (data) setWorkoutMethods(data as WorkoutMethodFromDB[]);
        };

        loadExercises();
        loadMethods();
    }, []);

    // --- Workout Data Fetching ---
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
                const loadedData = Array.isArray(data.workout_data) ? data.workout_data : [];
                setSections(loadedData);
            } else {
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

    // --- Section Actions ---
    const handleSave = async () => {
        if (!classId) return;

        setSaving(true);
        try {
            let actualClassId = classId;

            if (classId.includes('_') && !classId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                let scheduleId = '';
                let dateStr = '';

                if (classId.startsWith('virtual_')) {
                    scheduleId = classId.replace('virtual_', '');
                    dateStr = new Date().toISOString().split('T')[0];
                } else {
                    const parts = classId.split('_');
                    dateStr = parts.pop() || '';
                    scheduleId = parts.join('_');
                }

                if (!scheduleId || !dateStr) {
                    throw new Error('Invalid class ID format');
                }

                const { data: schedule, error: schedError } = await supabase
                    .from('class_schedules')
                    .select('*')
                    .eq('id', scheduleId)
                    .single();

                if (schedError || !schedule) throw new Error('Schedule not found');

                const classDateTime = new Date(`${dateStr}T${schedule.start_time}`);

                const { data: existingClass } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('schedule_id', scheduleId)
                    .eq('class_date', classDateTime.toISOString())
                    .single();

                if (existingClass) {
                    actualClassId = existingClass.id;
                } else {
                    const { data: newClass, error: createError } = await supabase
                        .from('classes')
                        .insert({
                            name: schedule.name,
                            name_hebrew: schedule.name,
                            coach_name: schedule.coach_name,
                            class_date: classDateTime.toISOString(),
                            duration_minutes: schedule.duration_minutes,
                            max_participants: schedule.max_participants,
                            current_participants: 0,
                            required_subscription_level: schedule.required_subscription_level || 1,
                            location: schedule.location,
                            location_hebrew: schedule.location,
                            class_type: 'general',
                            schedule_id: scheduleId,
                            workout_data: sections
                        })
                        .select('id')
                        .single();

                    if (createError) throw createError;
                    actualClassId = newClass.id;

                    Alert.alert('הצלחה', 'תוכנית האימון נשמרה בהצלחה');
                    router.back();
                    return;
                }
            }

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

    const updateSectionMethod = (
        sectionId: string,
        method: WorkoutMethodFromDB | null,
        customName?: string
    ) => {
        setSections(sections.map(s => {
            if (s.id !== sectionId) return s;
            if (method) {
                return {
                    ...s,
                    workoutMethodId: method.id,
                    workoutMethodName: method.name,
                    workoutMethodDescription: method.description || undefined,
                };
            }
            if (customName !== undefined) {
                return {
                    ...s,
                    workoutMethodId: undefined,
                    workoutMethodName: customName,
                    workoutMethodDescription: undefined,
                };
            }
            return {
                ...s,
                workoutMethodId: undefined,
                workoutMethodName: undefined,
                workoutMethodDescription: undefined,
            };
        }));
    };

    // --- Exercise Actions ---
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

    const updateExerciseField = (sectionId: string, exerciseId: string, field: 'name' | 'repsOrTime', value: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    exercises: s.exercises.map(e => {
                        if (e.id !== exerciseId) return e;
                        const updated = { ...e, [field]: value };
                        // If user edits the name after selecting a DB exercise, revert to custom
                        if (field === 'name' && e.exerciseDbId) {
                            updated.exerciseDbId = undefined;
                            updated.equipment = undefined;
                            updated.equipmentGifs = undefined;
                            updated.selectedEquipment = undefined;
                        }
                        return updated;
                    })
                };
            }
            return s;
        }));
    };

    const handleSelectExercise = (sectionId: string, exerciseId: string, dbExercise: ExerciseFromDB) => {
        setSections(sections.map(s => {
            if (s.id !== sectionId) return s;
            return {
                ...s,
                exercises: s.exercises.map(e => {
                    if (e.id !== exerciseId) return e;
                    const pick = (() => {
                        const withGif = dbExercise.equipment?.find(
                            eq => dbExercise.equipment_gifs?.[eq]
                        );
                        return withGif || dbExercise.equipment?.[0] || null;
                    })();
                    return {
                        ...e,
                        name: dbExercise.name,
                        exerciseDbId: dbExercise.id,
                        equipment: dbExercise.equipment,
                        equipmentGifs: dbExercise.equipment_gifs,
                        selectedEquipment: pick ? [pick] : [],
                        assignedGifUrl: pick ? (dbExercise.equipment_gifs?.[pick] || null) : null,
                    };
                }),
            };
        }));
        setActiveAutocompleteId(null);
    };

    const toggleExerciseEquipment = (sectionId: string, exerciseId: string, equipmentId: string) => {
        setSections(sections.map(s => {
            if (s.id !== sectionId) return s;
            return {
                ...s,
                exercises: s.exercises.map(e => {
                    if (e.id !== exerciseId) return e;
                    // Single-select: tap selects this one, tap again deselects
                    const isAlreadySelected = e.selectedEquipment?.includes(equipmentId);
                    return {
                        ...e,
                        selectedEquipment: isAlreadySelected ? [] : [equipmentId],
                        assignedGifUrl: isAlreadySelected ? null : (e.equipmentGifs?.[equipmentId] || null),
                    };
                }),
            };
        }));
    };

    // --- Render ---
    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Spinner size="lg" />
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
                    keyboardShouldPersistTaps="handled"
                >
                    {sections.map((section, sectionIndex) => (
                        <View
                            key={section.id}
                            style={[styles.sectionCard, { zIndex: sections.length - sectionIndex }]}
                        >
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

                            {/* Workout Method Picker */}
                            <WorkoutMethodPicker
                                currentMethodName={section.workoutMethodName}
                                currentMethodDescription={section.workoutMethodDescription}
                                methods={workoutMethods}
                                onSelectMethod={(method) => updateSectionMethod(section.id, method)}
                                onCustomMethod={(name) => updateSectionMethod(section.id, null, name)}
                                onClear={() => updateSectionMethod(section.id, null)}
                            />

                            {/* Exercises */}
                            <View style={styles.exercisesList}>
                                {section.exercises.map((exercise, exIndex) => (
                                    <View
                                        key={exercise.id}
                                        style={{ zIndex: section.exercises.length - exIndex }}
                                    >
                                        {/* Main Exercise Row */}
                                        <View style={styles.exerciseRow}>
                                            {/* Time/Reps (Left) */}
                                            <TextInput
                                                style={[styles.input, styles.timeInput]}
                                                placeholder="זמן/חזרות"
                                                placeholderTextColor="#9CA3AF"
                                                value={exercise.repsOrTime}
                                                onChangeText={(text) => updateExerciseField(section.id, exercise.id, 'repsOrTime', text)}
                                                textAlign="right"
                                            />

                                            {/* Exercise Name with Autocomplete (Right) */}
                                            <ExerciseAutocomplete
                                                exerciseRowId={exercise.id}
                                                value={exercise.name}
                                                allExercises={allExercises}
                                                activeAutocompleteId={activeAutocompleteId}
                                                onFocus={() => setActiveAutocompleteId(exercise.id)}
                                                onChangeText={(text) => updateExerciseField(section.id, exercise.id, 'name', text)}
                                                onSelectExercise={(dbExercise) => handleSelectExercise(section.id, exercise.id, dbExercise)}
                                            />

                                            {/* Delete Exercise */}
                                            <TouchableOpacity
                                                onPress={() => removeExercise(section.id, exercise.id)}
                                                style={styles.deleteExerciseBtn}
                                            >
                                                <Icon name="x" size={16} color="#EF4444" strokeWidth={2.5} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Equipment Icons (only for DB exercises) */}
                                        {exercise.exerciseDbId && exercise.equipment && exercise.equipment.length > 0 && (
                                            <ExerciseEquipmentSelector
                                                availableEquipment={exercise.equipment}
                                                selectedEquipment={exercise.selectedEquipment || []}
                                                equipmentGifs={exercise.equipmentGifs}
                                                onToggle={(eqId) => toggleExerciseEquipment(section.id, exercise.id, eqId)}
                                            />
                                        )}
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

// ============================
// Styles
// ============================
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
        marginBottom: 12,
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

    // Workout Method Picker
    methodPickerContainer: {
        marginBottom: 14,
    },
    methodPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    methodPickerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
        flex: 1,
    },
    methodPickerPlaceholder: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
    methodDescription: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right',
        marginTop: 6,
        paddingHorizontal: 4,
        lineHeight: 18,
    },

    // Method Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    methodOption: {
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    methodOptionName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'right',
    },
    methodOptionStandsFor: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'right',
        marginTop: 2,
    },
    methodOptionDesc: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4,
        lineHeight: 17,
    },
    customMethodInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
        fontSize: 15,
        color: '#111827',
        textAlign: 'right',
    },
    customMethodConfirm: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    customMethodConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalCloseBtn: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#9CA3AF',
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
    },

    // Autocomplete
    autocompleteWrapper: {
        flex: 2,
        position: 'relative',
    },
    suggestionsDropdown: {
        position: 'absolute',
        top: 52,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
        overflow: 'hidden',
    },
    suggestionItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#111827',
        textAlign: 'left',
    },
    suggestionNameHe: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'left',
        marginTop: 2,
    },
    suggestionEquipmentRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
        justifyContent: 'flex-start',
    },
    suggestionEquipmentIcon: {
        width: 21,
        height: 21,
        opacity: 0.8,
    },

    // Equipment Row
    equipmentRow: {
        flexDirection: 'row',
        gap: 10,
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginTop: 4,
        justifyContent: 'flex-end',
    },
    equipmentIconBtn: {
        padding: 2,
    },
    equipmentIconSmall: {
        width: 30,
        height: 30,
    },

    addExerciseBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    addExerciseText: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.primary,
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
        fontWeight: '900',
        color: Colors.text,
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
        color: '#ffffffff',
    },
});
