import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { View, Text, TouchableOpacity, TextInput, Alert, Image, I18nManager, StyleSheet, Switch, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';
import { ChevronDown, Trash2 } from 'lucide-react-native';

const EQUIPMENT_TABS = [
  { id: 'kettlebell', label: 'קטלבל', labelEn: 'Kettlebell', icon: require('@/assets/eqe-icons/kettlebell-icon.png') },
  { id: 'barbell', label: 'מוט', labelEn: 'Barbell', icon: require('@/assets/eqe-icons/barbell-icon.png') },
  { id: 'dumbbell', label: 'משקולת יד', labelEn: 'Dumbbell', icon: require('@/assets/eqe-icons/dumbell-icon.png') },
  { id: 'landmine', label: 'מוקש', labelEn: 'Landmine', icon: require('@/assets/eqe-icons/landmine-icon.png') },
  { id: 'bodyweight', label: 'משקל גוף', labelEn: 'BW', icon: require('@/assets/eqe-icons/BW-icon.png') },
  { id: 'cable', label: 'כבל קרוס', labelEn: 'Cable', icon: require('@/assets/eqe-icons/cable-icon.png') },
  { id: 'medicine_ball', label: 'כדור כוח', labelEn: 'Medicine Ball', icon: require('@/assets/eqe-icons/medecine-ball.png') },
  { id: 'machine', label: 'מכשיר', labelEn: 'Machine', icon: require('@/assets/eqe-icons/machine.png') },
];

// --- Muscle Groups Configuration ---
const MUSCLE_GROUPS = [
  { id: 'chest', label: 'חזה', labelEn: 'Chest' },
  { id: 'back', label: 'גב', labelEn: 'Back' },
  { id: 'shoulders', label: 'כתפיים', labelEn: 'Shoulders' },
  { id: 'biceps', label: 'יד קדמית', labelEn: 'Biceps' },
  { id: 'triceps', label: 'יד אחורית', labelEn: 'Triceps' },
  { id: 'forearms', label: 'אמות', labelEn: 'Forearms' },
  { id: 'core', label: 'בטן', labelEn: 'Core' },
  { id: 'quads', label: 'ירך קדמי', labelEn: 'Quads' },
  { id: 'hamstrings', label: 'ירך אחורי', labelEn: 'Hamstrings' },
  { id: 'glutes', label: 'ישבן', labelEn: 'Glutes' },
  { id: 'calves', label: 'שוקיים', labelEn: 'Calves' },
  { id: 'full_body', label: 'כל הגוף', labelEn: 'Full Body' },
];

// --- Equipment Tab Component ---
interface EquipmentTabProps {
  tab: typeof EQUIPMENT_TABS[0];
  isSelected: boolean;
  onSelect: () => void;
}

const EquipmentTab = ({ tab, isSelected, onSelect }: EquipmentTabProps) => {
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={styles.equipmentTab}
    >
      <Image
        source={tab.icon}
        style={[
          styles.equipmentIcon,
          { opacity: isSelected ? 1 : 0.3 }
        ]}
        resizeMode="contain"
      />
      <Text style={[
        styles.equipmentLabel,
        { opacity: isSelected ? 1 : 0.4, fontWeight: isSelected ? '700' : '500' }
      ]} numberOfLines={1}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

function Dropdown({ label, value, options, onSelect, placeholder }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 16, color: selectedOption ? '#0F172A' : '#94A3B8' }}>
          {selectedOption?.label || placeholder || 'בחר...'}
        </Text>
        <ChevronDown size={20} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          marginTop: 4,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: 16,
                borderBottomWidth: index < options.length - 1 ? 1 : 0,
                borderBottomColor: '#E2E8F0',
                backgroundColor: option.value === value ? '#F1F5F9' : '#fff',
              }}
            >
              <Text style={{
                fontSize: 16,
                color: '#0F172A',
                textAlign: 'right',
                fontWeight: option.value === value ? '600' : '400',
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EditExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [nameHe, setNameHe] = useState('');
  const [measurementType, setMeasurementType] = useState('weight');
  const [measurementUnit, setMeasurementUnit] = useState('kg');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [instructions, setInstructions] = useState('');
  const [equipment, setEquipment] = useState<string[]>(['barbell']);
  const [equipmentGifs, setEquipmentGifs] = useState<Record<string, string>>({});
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);

  // Toggle equipment selection (multi-select)
  const toggleEquipment = (id: string) => {
    setEquipment(prev =>
      prev.includes(id)
        ? prev.filter(e => e !== id)  // Remove if already selected
        : [...prev, id]               // Add if not selected
    );
  };

  // Toggle muscle group selection (multi-select)
  const toggleMuscleGroup = (id: string) => {
    setMuscleGroups(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const [prList, setPrList] = useState(true);

  // Fetch exercise data
  const { isLoading } = useQuery({
    queryKey: ['exercise', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      // Populate form with existing data
      setName(data.name || '');
      setNameHe(data.name_he || '');
      setMeasurementType(data.measurement_type || 'weight');
      setMeasurementUnit(data.measurement_unit || 'kg');
      setDifficulty(data.difficulty || 'beginner');
      setInstructions(data.instructions || '');
      setEquipment(data.equipment || ['barbell']);
      setPrList(data.PR_list || false);
      setEquipmentGifs(data.equipment_gifs || {});
      setMuscleGroups(data.muscle_groups || []);

      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (exercise: any) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(exercise)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise', id] });
      Alert.alert('הצלחה', 'התרגיל עודכן בהצלחה', [
        { text: 'אישור', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('שגיאה', error.message || 'לא ניתן לעדכן את התרגיל');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      Alert.alert('הצלחה', 'התרגיל נמחק בהצלחה', [
        { text: 'אישור', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('שגיאה', error.message || 'לא ניתן למחוק את התרגיל');
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם תרגיל באנגלית');
      return;
    }

    if (!nameHe.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם תרגיל בעברית');
      return;
    }

    if (equipment.length === 0) {
      Alert.alert('שגיאה', 'נא לבחור לפחות סוג ציוד אחד');
      return;
    }

    updateMutation.mutate({
      name: name.trim(),
      name_he: nameHe.trim(),
      description: null,
      category: 'strength',
      subcategory: null,
      measurement_type: measurementType,
      measurement_unit: measurementUnit,
      difficulty,
      instructions: equipmentGifs[equipment[0]] || instructions.trim() || null,
      equipment,
      equipment_gifs: equipmentGifs,
      muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
      is_active: true,
      PR_list: prList,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'מחיקת תרגיל',
      `האם למחוק את התרגיל "${name}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const measurementTypeOptions: DropdownOption[] = [
    { label: 'משקל', value: 'weight' },
    { label: 'זמן', value: 'time' },
    { label: 'מרחק', value: 'distance' },
    { label: 'חזרות', value: 'reps' },
    { label: 'נקודות', value: 'points' },
  ];

  const difficultyOptions: DropdownOption[] = [
    { label: 'מתחילים', value: 'beginner' },
    { label: 'בינוני', value: 'intermediate' },
    { label: 'מתקדמים', value: 'advanced' },
  ];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <AdminHeader title="עריכת תרגיל" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size="lg" />
          <Text style={{ marginTop: 12, color: '#64748B' }}>טוען נתוני תרגיל...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <AdminHeader title="עריכת תרגיל" />
      <TouchableOpacity
        onPress={handleDelete}
        style={{
          position: 'absolute',
          right: 20,
          top: insets.top + 12,
          padding: 8,
          zIndex: 999,
          backgroundColor: '#FEE2E2',
          borderRadius: 8,
        }}
      >
        <Trash2 size={20} color="#EF4444" />
      </TouchableOpacity>


      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={150}
        keyboardOpeningTime={0}
      >
        {/* Name (English) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'left' }}>
            שם התרגיל (אנגלית) *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              textAlign: 'left',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
            placeholder="Deadlift"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Name (Hebrew) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'left' }}>
            שם התרגיל (עברית) *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              textAlign: 'right',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
            placeholder="דדליפט"
            value={nameHe}
            onChangeText={setNameHe}
          />
        </View>

        {/* Equipment */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12, textAlign: 'left' }}>
            ציוד *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {EQUIPMENT_TABS.map((tab) => (
              <EquipmentTab
                key={tab.id}
                tab={tab}
                isSelected={equipment.includes(tab.id)}
                onSelect={() => toggleEquipment(tab.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Muscle Groups */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12, textAlign: 'left' }}>
            קבוצות שרירים
          </Text>
          <View style={styles.muscleGroupsContainer}>
            {MUSCLE_GROUPS.map((group) => {
              const isSelected = muscleGroups.includes(group.id);
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => toggleMuscleGroup(group.id)}
                  style={[
                    styles.muscleGroupChip,
                    isSelected && styles.muscleGroupChipSelected
                  ]}
                >
                  <Text style={[
                    styles.muscleGroupChipText,
                    isSelected && styles.muscleGroupChipTextSelected
                  ]}>
                    {group.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PR_list Toggle */}
        <View style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B' }}>
            האם להציג ביומן ביצועים?
          </Text>
          <Switch
            trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor="#CBD5E1"
            onValueChange={setPrList}
            value={prList}
          />
        </View>

        {/* Measurement Type */}
        <Dropdown
          label="סוג מדידה *"
          value={measurementType}
          options={measurementTypeOptions}
          onSelect={setMeasurementType}
        />

        {/* Measurement Unit */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'left' }}>
            יחידת מדידה *
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              textAlign: 'right',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
            placeholder="kg, min:sec, km, reps..."
            value={measurementUnit}
            onChangeText={setMeasurementUnit}
          />
        </View>

        {/* Difficulty */}
        <Dropdown
          label="רמת קושי"
          value={difficulty}
          options={difficultyOptions}
          onSelect={(val) => setDifficulty(val as any)}
        />

        {/* GIF URLs per Equipment */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 12, textAlign: 'right' }}>
            קישורי GIF לפי ציוד
          </Text>
          {equipment.length === 0 ? (
            <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'right' }}>
              בחר ציוד כדי להוסיף קישורי GIF
            </Text>
          ) : (
            equipment.map(eq => {
              const tab = EQUIPMENT_TABS.find(t => t.id === eq);
              if (!tab) return null;
              return (
                <View key={eq} style={styles.gifInputRow}>
                  <View style={styles.gifInputHeader}>
                    <Image source={tab.icon} style={styles.gifEquipmentIcon} resizeMode="contain" />
                    <Text style={styles.gifEquipmentLabel}>{tab.label}</Text>
                  </View>
                  <TextInput
                    style={styles.gifInput}
                    placeholder="https://cloudinary.com/..."
                    placeholderTextColor="#94A3B8"
                    value={equipmentGifs[eq] || ''}
                    onChangeText={(text) => setEquipmentGifs(prev => ({
                      ...prev,
                      [eq]: text
                    }))}
                  />
                </View>
              );
            })
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={updateMutation.isPending}
          style={{
            backgroundColor: Colors.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: updateMutation.isPending ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {updateMutation.isPending ? 'שומר...' : 'עדכן תרגיל'}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  equipmentTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: 60,
    marginRight: 8,
  },
  equipmentIcon: {
    width: 40,
    height: 40,
    marginBottom: 6,
  },
  equipmentLabel: {
    fontSize: 12,
    color: '#1E293B',
    textAlign: 'center',
  },
  gifInputRow: {
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  gifInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  gifEquipmentIcon: {
    width: 24,
    height: 24,
  },
  gifEquipmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  gifInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlign: 'left',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muscleGroupChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  muscleGroupChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  muscleGroupChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
