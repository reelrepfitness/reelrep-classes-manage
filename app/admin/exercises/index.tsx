import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Edit, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/constants/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Colors from '@/constants/colors';

interface Exercise {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  measurement_type: string;
  measurement_unit: string;
  difficulty?: string;
  is_active: boolean;
}

export default function ExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    const matchesCategory = !selectedCategory || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

  const categories = [
    { value: null, label: 'הכל' },
    { value: 'strength', label: 'כוח' },
    { value: 'cardio', label: 'קרדיו' },
    { value: 'olympic', label: 'אולימפי' },
    { value: 'gymnastics', label: 'התעמלות' },
    { value: 'endurance', label: 'סיבולת' },
    { value: 'other', label: 'אחר' },
  ];

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.value || 'all'}
              onPress={() => setSelectedCategory(cat.value)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat.value ? Colors.primary : '#F1F5F9',
                marginLeft: 8,
              }}
            >
              <Text style={{
                color: selectedCategory === cat.value ? '#fff' : '#64748B',
                fontWeight: '600',
              }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'right' }}>
                    {exercise.name}
                  </Text>
                  {exercise.name_en && (
                    <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'right', marginTop: 2 }}>
                      {exercise.name_en}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
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
