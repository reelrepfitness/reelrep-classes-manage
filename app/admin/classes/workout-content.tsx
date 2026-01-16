import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/icon';
import Colors from '@/constants/colors';
import { supabase } from '@/constants/supabase';

export default function WorkoutContentScreen() {
    const { classId } = useLocalSearchParams<{ classId: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!classId || classId.startsWith('virtual_')) {
            Alert.alert('שגיאה', 'לא ניתן לשמור תוכן לשיעור וירטואלי');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('classes')
                .update({ description: content })
                .eq('id', classId);

            if (error) throw error;

            Alert.alert('הצלחה', 'תוכן האימון נשמר בהצלחה');
            router.back();
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לשמור את תוכן האימון');
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
                    <Text style={styles.headerTitle}>תוכן האימון</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.headerButton}
                        disabled={saving}
                    >
                        <Icon
                            name="check"
                            size={24}
                            color={saving ? '#6B7280' : '#10B981'}
                            strokeWidth={2.5}
                        />
                    </TouchableOpacity>
                </LinearGradient>

                <ScrollView
                    contentContainerStyle={{
                        padding: 20,
                        paddingBottom: insets.bottom + 40,
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <Text style={styles.label}>תיאור האימון</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="הוסף תיאור לאימון..."
                            placeholderTextColor="#9CA3AF"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            numberOfLines={10}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.saveButtonText}>
                            {saving ? 'שומר...' : 'שמור תוכן'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
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
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
        textAlign: 'right',
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#111827',
        minHeight: 200,
        textAlign: 'right',
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
