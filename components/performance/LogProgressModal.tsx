import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { X, Calendar, Dumbbell, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface LogProgressModalProps {
    visible: boolean;
    onClose: () => void;
    exercise: { id: string; label: string; unit: string; isTime?: boolean };
    onSave: (data: { weight: string | null; reps: string | null; time: string | null; date: string }) => void;
}

export default function LogProgressModal({ visible, onClose, exercise, onSave }: LogProgressModalProps) {
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [time, setTime] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Simple YYYY-MM-DD for now

    const isCardio = exercise.isTime;

    const handleSubmit = () => {
        onSave({
            weight: isCardio ? null : weight,
            reps: isCardio ? null : reps,
            time: isCardio ? time : null,
            date
        });
        // We let the parent handle closing if needed, or close here. 
        // Parent in my code calls onClose, so we can keep onClose here or let parent do it.
        // My parent implementation: calls refetch then setModalVisible(false).
        // BUT the parent implementation I wrote for performance.tsx calls onClose automatically ONLY IF I don't wait? 
        // Actually, in `handleSaveLog` I call setModalVisible(false). 
        // So I should just call onSave.
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContent}>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <X size={24} color="#64748B" />
                                </TouchableOpacity>
                                <Text style={styles.title}>עדכון {exercise.label}</Text>
                            </View>

                            {/* Form */}
                            <View style={styles.form}>
                                {/* Date (Read only for now or simple text) */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>תאריך</Text>
                                    <View style={styles.inputContainer}>
                                        <Calendar size={20} color="#94A3B8" />
                                        <Text style={styles.dateText}>{date}</Text>
                                    </View>
                                </View>

                                {isCardio ? (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>זמן (דקות)</Text>
                                        <View style={styles.inputContainer}>
                                            <Clock size={20} color="#94A3B8" />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="20:00"
                                                placeholderTextColor="#CBD5E1"
                                                value={time}
                                                onChangeText={setTime}
                                                keyboardType="numeric" // or default if formatted
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>משקל ({exercise.unit})</Text>
                                            <View style={styles.inputContainer}>
                                                <Dumbbell size={20} color="#94A3B8" />
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="0"
                                                    placeholderTextColor="#CBD5E1"
                                                    value={weight}
                                                    onChangeText={setWeight}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                        <View style={{ width: 12 }} />
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>חזרות</Text>
                                            <View style={styles.inputContainer}>
                                                <Text style={styles.hash}>#</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="0"
                                                    placeholderTextColor="#CBD5E1"
                                                    value={reps}
                                                    onChangeText={setReps}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Footer Actions */}
                            <View style={styles.footer}>
                                <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                                    <LinearGradient
                                        colors={[Colors.primary, '#be185d']}
                                        style={styles.gradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.submitText}>שמור תוצאה</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    closeButton: {
        padding: 4,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'right',
    },
    inputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        textAlign: 'right',
        padding: 0, // Reset default padding
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    row: {
        flexDirection: 'row-reverse',
    },
    hash: {
        fontSize: 18,
        fontWeight: '600',
        color: '#94A3B8',
        width: 20,
        textAlign: 'center',
    },
    footer: {
        marginTop: 32,
    },
    submitButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
