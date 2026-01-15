import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';
import { ChevronDown } from 'lucide-react-native';

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

export default function NewExerciseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('strength');
  const [subcategory, setSubcategory] = useState('');
  const [measurementType, setMeasurementType] = useState('weight');
  const [measurementUnit, setMeasurementUnit] = useState('kg');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [instructions, setInstructions] = useState('');

  const createMutation = useMutation({
    mutationFn: async (exercise: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...exercise,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      Alert.alert('הצלחה', 'התרגיל נוצר בהצלחה', [
        { text: 'אישור', onPress: () => router.back() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('שגיאה', error.message || 'לא ניתן ליצור את התרגיל');
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'נא להזין שם תרגיל');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      name_en: nameEn.trim() || null,
      description: description.trim() || null,
      category,
      subcategory: subcategory.trim() || null,
      measurement_type: measurementType,
      measurement_unit: measurementUnit,
      difficulty,
      instructions: instructions.trim() || null,
      is_active: true,
    });
  };

  const categoryOptions: DropdownOption[] = [
    { label: 'כוח', value: 'strength' },
    { label: 'קרדיו', value: 'cardio' },
    { label: 'אולימפי', value: 'olympic' },
    { label: 'התעמלות', value: 'gymnastics' },
    { label: 'סיבולת', value: 'endurance' },
    { label: 'אחר', value: 'other' },
  ];

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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <AdminHeader title="תרגיל חדש" />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}>
        {/* Name (Hebrew) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
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
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Name (English) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
            שם התרגיל (אנגלית)
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
            value={nameEn}
            onChangeText={setNameEn}
          />
        </View>

        {/* Category */}
        <Dropdown
          label="קטגוריה *"
          value={category}
          options={categoryOptions}
          onSelect={setCategory}
        />

        {/* Subcategory */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
            תת-קטגוריה
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
            placeholder="משיכות, דחיפות..."
            value={subcategory}
            onChangeText={setSubcategory}
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
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

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
            תיאור
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
              minHeight: 80,
            }}
            placeholder="תיאור קצר של התרגיל..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Instructions */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'right' }}>
            הוראות ביצוע
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
              minHeight: 120,
            }}
            placeholder="הוראות מפורטות לביצוע התרגיל..."
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          style={{
            backgroundColor: Colors.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: createMutation.isPending ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {createMutation.isPending ? 'שומר...' : 'שמור תרגיל'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
