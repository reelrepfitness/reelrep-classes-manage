import React, { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, Modal } from 'react-native';
import { Image as OptimizedImage } from '@/components/ui/image';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, ChevronDown, Check, X } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';

// --- Equipment Tabs Configuration ---
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
  { id: 'all', label: 'הכל', labelEn: 'All' },
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

// --- Selection Modal Component ---
const SelectionModal = ({
  visible,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; label: string; labelEn?: string; icon?: any }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            maxHeight: '70%',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
              {title}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 8 }}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor:
                    selectedId === option.id ? '#EFF6FF' : 'transparent',
                  marginBottom: 4,
                  justifyContent: option.icon ? 'center' : 'flex-end', // Center for equipment, Right for others
                  position: 'relative', // For absolute positioning of checkmark if needed
                }}
              >
                {selectedId === option.id && (
                  <Check
                    size={20}
                    color="#2563EB"
                    style={{
                      position: option.icon ? 'absolute' : 'relative',
                      left: option.icon ? 12 : 'auto', // Absolute left for equipment
                      marginRight: option.icon ? 0 : 'auto', // Margin auto for others
                    }}
                  />
                )}

                {option.icon ? (
                  // Centered Layout: English -> Icon -> Hebrew
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ flex: 1, textAlign: 'right', fontSize: 16, fontWeight: selectedId === option.id ? '600' : '400', color: selectedId === option.id ? '#2563EB' : '#1E293B' }}>
                      {option.labelEn}
                    </Text>
                    <View style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <Image
                        source={option.icon}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={{ flex: 1, textAlign: 'left', fontSize: 16, fontWeight: selectedId === option.id ? '600' : '400', color: selectedId === option.id ? '#2563EB' : '#1E293B' }}>
                      {option.label}
                    </Text>
                  </View>
                ) : (
                  // Default Layout (Right Aligned)
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: selectedId === option.id ? '600' : '400',
                      color: selectedId === option.id ? '#2563EB' : '#1E293B',
                      marginRight: 12,
                    }}
                  >
                    {option.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

interface Exercise {
  id: string;
  name: string;
  name_he?: string;
  category: string;
  measurement_type: string;
  measurement_unit: string;
  difficulty?: string;
  equipment?: string[] | null;  // Array for multi-equipment
  is_active: boolean;
  gif_url?: string;
  equipment_gifs?: Record<string, string>;
  muscle_groups?: string[] | null;
}

const equipmentIcons: Record<string, any> = {
  kettlebell: require('@/assets/eqe-icons/kettlebell-icon.png'),
  barbell: require('@/assets/eqe-icons/barbell-icon.png'),
  dumbbell: require('@/assets/eqe-icons/dumbell-icon.png'),
  landmine: require('@/assets/eqe-icons/landmine-icon.png'),
  bodyweight: require('@/assets/eqe-icons/BW-icon.png'),
  cable: require('@/assets/eqe-icons/cable-icon.png'),
  medicine_ball: require('@/assets/eqe-icons/medecine-ball.png'),
  machine: require('@/assets/eqe-icons/machine.png'),
};

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('barbell');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');

  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [showMusclePicker, setShowMusclePicker] = useState(false);

  // Fetch exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Exercise[];
    },
  });

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.name_he?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = ex.equipment?.includes(selectedEquipment);
    const matchesMuscleGroup = selectedMuscleGroup === 'all' ||
      (ex.muscle_groups && ex.muscle_groups.includes(selectedMuscleGroup));
    return matchesSearch && matchesEquipment && matchesMuscleGroup;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <AdminHeader title="ניהול תרגילים" />

      {/* Search & Filter */}
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => router.push('/admin/exercises/new')}
          style={{
            backgroundColor: Colors.primary,
            paddingVertical: 14,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>תרגיל חדש</Text>
        </TouchableOpacity>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F1F5F9',
          borderRadius: 12,
          paddingHorizontal: 16,
          marginBottom: 12,
        }}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, marginRight: 10, textAlign: 'right' }}
            placeholder="חיפוש תרגיל..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Pickers */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {/* Equipment Picker */}
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 8,
              }}
              onPress={() => setShowEquipmentPicker(true)}
            >
              <Image
                source={EQUIPMENT_TABS.find(t => t.id === selectedEquipment)?.icon}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 }}>
                {EQUIPMENT_TABS.find(t => t.id === selectedEquipment)?.label}
              </Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Muscle Group Picker */}
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                gap: 8,
              }}
              onPress={() => setShowMusclePicker(true)}
            >
              {/* Spacer to match height of equipment icon (24px) */}
              <View style={{ height: 24 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', flex: 1 }}>
                {MUSCLE_GROUPS.find(m => m.id === selectedMuscleGroup)?.label || 'הכל'}
              </Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Spinner size="lg" />
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 12 }}>טוען תרגילים...</Text>
          </View>
        ) : filteredExercises.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 20 }}>לא נמצאו תרגילים</Text>
        ) : (
          filteredExercises.map((exercise, index) => {
            // Get GIF URL - check equipment_gifs for selected equipment first
            let gifUrl: string | null = null;

            // Try equipment_gifs with selected equipment
            if (exercise.equipment_gifs && typeof exercise.equipment_gifs === 'object') {
              const equipGif = exercise.equipment_gifs[selectedEquipment];
              if (equipGif && typeof equipGif === 'string') {
                gifUrl = equipGif.trim();
              }
            }

            // Fallback: if no GIF for selected equipment, use ANY available equipment GIF
            if (!gifUrl && exercise.equipment_gifs && typeof exercise.equipment_gifs === 'object') {
              const availableGifs = Object.values(exercise.equipment_gifs).filter(gif => gif && typeof gif === 'string');
              if (availableGifs.length > 0) {
                gifUrl = availableGifs[0].trim();
              }
            }

            // Final fallback to gif_url if no equipment-specific GIF found
            if (!gifUrl && exercise.gif_url && typeof exercise.gif_url === 'string') {
              gifUrl = exercise.gif_url.trim();
            }

            return (
              <TouchableOpacity
                key={exercise.id}
                onPress={() => router.push(`/admin/exercises/${exercise.id}` as any)}
                activeOpacity={0.7}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16
                }}>
                  {/* GIF Display - Shows on Right in RTL */}
                  {gifUrl ? (
                    <OptimizedImage
                      source={{ uri: gifUrl }}
                      width={100}
                      height={100}
                      style={{
                        borderRadius: 8,
                      }}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={{
                      width: 100,
                      height: 100,
                      borderRadius: 8,
                      backgroundColor: '#F1F5F9',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>No GIF</Text>
                    </View>
                  )}

                  {/* Exercise Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                      {exercise.equipment && exercise.equipment.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: -8 }}>
                          {exercise.equipment.map((eq, idx) => (
                            equipmentIcons[eq] && (
                              <Image
                                key={eq}
                                source={equipmentIcons[eq]}
                                style={{ width: 28, height: 28, marginLeft: idx > 0 ? -8 : 0 }}
                                resizeMode="contain"
                              />
                            )
                          ))}
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                      {exercise.name}
                    </Text>
                    {exercise.name_he && (
                      <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 2 }}>
                        {exercise.name_he}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {exercise.muscle_groups && exercise.muscle_groups.length > 0 ? (
                        exercise.muscle_groups.slice(0, 3).map((muscle, idx) => (
                          <View key={idx} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                              {muscle}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                            {exercise.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modals */}
      <SelectionModal
        visible={showEquipmentPicker}
        onClose={() => setShowEquipmentPicker(false)}
        title="בחר ציוד"
        options={EQUIPMENT_TABS}
        selectedId={selectedEquipment}
        onSelect={setSelectedEquipment}
      />

      <SelectionModal
        visible={showMusclePicker}
        onClose={() => setShowMusclePicker(false)}
        title="בחר קבוצת שרירים"
        options={MUSCLE_GROUPS}
        selectedId={selectedMuscleGroup}
        onSelect={setSelectedMuscleGroup}
      />
    </View >
  );
}
