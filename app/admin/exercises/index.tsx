import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Edit, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';

// --- Equipment Tabs Configuration ---
const EQUIPMENT_TABS = [
  { id: 'kettlebell', label: 'Kettlebell', icon: require('@/assets/eqe-icons/kettlebell-icon.png') },
  { id: 'barbell', label: 'Barbell', icon: require('@/assets/eqe-icons/barbell-icon.png') },
  { id: 'dumbbell', label: 'Dumbbell', icon: require('@/assets/eqe-icons/dumbell-icon.png') },
  { id: 'landmine', label: 'Landmine', icon: require('@/assets/eqe-icons/landmine-icon.png') },
  { id: 'bodyweight', label: 'BW', icon: require('@/assets/eqe-icons/BW-icon.png') },
];

// --- Equipment Tab Component ---
interface EquipmentTabProps {
  tab: typeof EQUIPMENT_TABS[0];
  isSelected: boolean;
  onSelect: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EquipmentTab = ({ tab, isSelected, onSelect }: EquipmentTabProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isSelected ? 1.15 : 1, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  return (
    <AnimatedTouchable
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderRadius: 12,
          backgroundColor: 'transparent',
          minWidth: 60,
        },
        animatedStyle,
      ]}
    >
      <Image
        source={tab.icon}
        style={{ width: 36, height: 36, marginBottom: 4, opacity: isSelected ? 1 : 0.5 }}
        resizeMode="contain"
      />
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#1c1c1c', textAlign: 'center', opacity: isSelected ? 1 : 0.5 }} numberOfLines={1}>
        {tab.label}
      </Text>
    </AnimatedTouchable>
  );
};

interface Exercise {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  measurement_type: string;
  measurement_unit: string;
  difficulty?: string;
  equipment?: 'kettlebell' | 'barbell' | 'dumbbell' | 'landmine' | 'bodyweight' | null;
  is_active: boolean;
}

const equipmentIcons: Record<string, any> = {
  kettlebell: require('@/assets/eqe-icons/kettlebell-icon.png'),
  barbell: require('@/assets/eqe-icons/barbell-icon.png'),
  dumbbell: require('@/assets/eqe-icons/dumbell-icon.png'),
  landmine: require('@/assets/eqe-icons/landmine-icon.png'),
  bodyweight: require('@/assets/eqe-icons/BW-icon.png'),
};

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('barbell');

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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      Alert.alert('הצלחה', 'התרגיל נמחק בהצלחה');
    },
    onError: (error) => {
      Alert.alert('שגיאה', 'לא ניתן למחוק את התרגיל');
    },
  });

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.name_en?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEquipment = ex.equipment === selectedEquipment;
    return matchesSearch && matchesEquipment;
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'מחיקת תרגיל',
      `האם למחוק את התרגיל "${name}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

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
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>תרגיל חדש</Text>
        </TouchableOpacity>

        <View style={{
          flexDirection: 'row-reverse',
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

        <View style={{ alignItems: 'center' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}
          >
            {EQUIPMENT_TABS.map((tab) => (
              <EquipmentTab
                key={tab.id}
                tab={tab}
                isSelected={selectedEquipment === tab.id}
                onSelect={() => setSelectedEquipment(tab.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Exercise List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
      >
        {isLoading ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 12 }}>טוען תרגילים...</Text>
          </View>
        ) : filteredExercises.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 20 }}>לא נמצאו תרגילים</Text>
        ) : (
          filteredExercises.map(exercise => (
            <View
              key={exercise.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                    {exercise.equipment && equipmentIcons[exercise.equipment] && (
                      <Image
                        source={equipmentIcons[exercise.equipment]}
                        style={{ width: 32, height: 32 }}
                        resizeMode="contain"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                        {exercise.name}
                      </Text>
                      {exercise.name_en && (
                        <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'right', marginTop: 2 }}>
                          {exercise.name_en}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                        {exercise.category}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                        {exercise.measurement_unit}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/admin/exercises/${exercise.id}` as any)}
                    style={{ padding: 8 }}
                  >
                    <Edit size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(exercise.id, exercise.name)}
                    style={{ padding: 8 }}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
