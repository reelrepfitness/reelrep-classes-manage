import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Spinner } from '@/components/ui/spinner';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

// --- Input Field Component (RTL) ---
interface InputFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    editable?: boolean;
    icon?: string;
}

const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    editable = true,
    icon,
}: InputFieldProps) => (
    <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[styles.inputWrapper, !editable && styles.inputDisabled]}>
            <TextInput
                style={styles.textInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={editable}
            />
            {icon && (
                <View style={styles.inputIcon}>
                    <Ionicons name={icon as any} size={20} color="#9CA3AF" />
                </View>
            )}
        </View>
    </View>
);

// --- Date Picker Field Component (RTL) ---
interface DateFieldProps {
    label: string;
    value: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
}

const DateField = ({ label, value, onChange, placeholder }: DateFieldProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date(2000, 0, 1));

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const handleConfirm = () => {
        onChange(tempDate);
        setShowPicker(false);
    };

    const handleCancel = () => {
        setTempDate(value || new Date(2000, 0, 1));
        setShowPicker(false);
    };

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.inputWrapper}
                onPress={() => {
                    setTempDate(value || new Date(2000, 0, 1));
                    setShowPicker(true);
                }}
                activeOpacity={0.7}
            >
                <Text style={[styles.dateText, !value && styles.placeholderText]}>
                    {value ? formatDate(value) : placeholder}
                </Text>
                <View style={styles.inputIcon}>
                    <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
                <Modal
                    visible={showPicker}
                    transparent
                    animationType="slide"
                >
                    <TouchableOpacity
                        style={styles.datePickerModal}
                        activeOpacity={1}
                        onPress={handleCancel}
                    >
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.datePickerCancel}>ביטול</Text>
                                </TouchableOpacity>
                                <Text style={styles.datePickerTitle}>בחר תאריך</Text>
                                <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={styles.datePickerConfirm}>אישור</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.datePickerContent}>
                                <View style={{ direction: 'rtl' }}>
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="date"
                                        display="inline"
                                        onChange={(event, selectedDate) => {
                                            if (selectedDate) {
                                                setTempDate(selectedDate);
                                            }
                                        }}
                                        maximumDate={new Date()}
                                        minimumDate={new Date(1920, 0, 1)}
                                        themeVariant="light"
                                        locale="he-IL"
                                    />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            ) : (
                showPicker && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowPicker(false);
                            if (event.type === 'set' && selectedDate) {
                                onChange(selectedDate);
                            }
                        }}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                    />
                )
            )}
        </View>
    );
};

export default function EditProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, refreshUser } = useAuth();

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthday, setBirthday] = useState<Date | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Load current user data
    useEffect(() => {
        const loadProfile = async () => {
            if (!user?.id) return;
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, email, phone_number, avatar_url, birthday')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                setFullName(data?.full_name || '');
                setEmail(data?.email || user?.email || '');
                setPhoneNumber(data?.phone_number || '');
                setAvatarUrl(data?.avatar_url || null);
                if (data?.birthday) {
                    setBirthday(new Date(data.birthday));
                }
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user?.id]);

    // Pick image from gallery
    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('שגיאה', 'נדרשת הרשאה לגלריה');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true, // Get base64 data for upload
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                await uploadImage(asset.uri, asset.base64 || null);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('שגיאה', 'לא ניתן לבחור תמונה');
        }
    };

    // Upload image to Supabase Storage
    const uploadImage = async (uri: string, base64Data: string | null) => {
        if (!user?.id) return;
        setUploadingImage(true);

        try {
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Determine content type
            const contentType = fileExt === 'png' ? 'image/png' :
                               fileExt === 'gif' ? 'image/gif' :
                               fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

            // Convert base64 to Uint8Array for Supabase upload
            if (!base64Data) {
                throw new Error('No base64 data available');
            }

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, bytes, {
                    contentType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Add cache-busting parameter
            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setAvatarUrl(publicUrl);

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            Alert.alert('הצלחה', 'התמונה עודכנה בהצלחה');
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('שגיאה', 'לא ניתן להעלות תמונה');
        } finally {
            setUploadingImage(false);
        }
    };

    // Save profile changes
    const handleSave = async () => {
        if (!user?.id) return;

        if (!fullName.trim()) {
            Alert.alert('שגיאה', 'נא להזין שם מלא');
            return;
        }

        setSaving(true);

        try {
            const updates: any = {
                full_name: fullName.trim(),
                phone_number: phoneNumber.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (birthday) {
                updates.birthday = birthday.toISOString().split('T')[0];
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            // Refresh the auth context
            if (refreshUser) {
                refreshUser();
            }

            Alert.alert('הצלחה', 'הפרופיל עודכן בהצלחה', [
                { text: 'אישור', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
        } finally {
            setSaving(false);
        }
    };

    const initials = fullName
        ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'ME';

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
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
                    <View style={styles.headerContent}>
                        {/* Right side - Back button (RTL) */}
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        {/* Center - Title */}
                        <Text style={styles.headerTitle}>עריכת פרופיל</Text>

                        {/* Left side - Save button (RTL) */}
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <Spinner size="sm" />
                            ) : (
                                <Text style={styles.saveText}>שמור</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            { paddingBottom: insets.bottom + 20 }
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity
                                style={styles.avatarWrapper}
                                onPress={handlePickImage}
                                disabled={uploadingImage}
                                activeOpacity={0.8}
                            >
                                {uploadingImage ? (
                                    <View style={styles.avatarPlaceholder}>
                                        <Spinner size="lg" />
                                    </View>
                                ) : avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.avatarHint}>לחץ לשינוי תמונה</Text>
                        </View>

                        {/* Form Section */}
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>פרטים אישיים</Text>

                            <View style={styles.formCard}>
                                <InputField
                                    label="שם מלא"
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="הזן שם מלא"
                                    autoCapitalize="words"
                                    icon="person-outline"
                                />

                                <View style={styles.divider} />

                                <DateField
                                    label="תאריך לידה"
                                    value={birthday}
                                    onChange={setBirthday}
                                    placeholder="בחר תאריך"
                                />

                                <View style={styles.divider} />

                                <InputField
                                    label="אימייל"
                                    value={email}
                                    onChangeText={() => {}}
                                    placeholder="אימייל"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={false}
                                    icon="mail-outline"
                                />

                                <View style={styles.divider} />

                                <InputField
                                    label="מספר טלפון"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="050-1234567"
                                    keyboardType="phone-pad"
                                    icon="call-outline"
                                />
                            </View>
                        </View>

                        {/* Info Note */}
                        <View style={styles.infoNote}>
                            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
                            <Text style={styles.infoNoteText}>
                                לא ניתן לשנות את כתובת האימייל. לשינוי אימייל, פנה לתמיכה.
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
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
        textAlign: 'center',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
    },

    // Scroll Content
    scrollContent: {
        paddingTop: 24,
        paddingHorizontal: 20,
    },

    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 8,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#202020',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarInitials: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    avatarHint: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },

    // Form Section
    formSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 12,
        textAlign: 'left',
        marginLeft: 8,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
    },

    // Input Field
    inputContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        textAlign: 'left',
    },
    inputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputDisabled: {
        backgroundColor: '#F3F4F6',
        opacity: 0.7,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        textAlign: 'right',
        fontWeight: '500',
    },
    inputIcon: {
        marginRight: 8,
    },

    // Date Field
    dateText: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        textAlign: 'right',
        fontWeight: '500',
    },
    placeholderText: {
        color: '#9CA3AF',
    },

    // Info Note
    infoNote: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    infoNoteText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'left',
        lineHeight: 18,
    },

    // Date Picker Modal (iOS)
    datePickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    datePickerContent: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    datePickerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111827',
    },
    datePickerCancel: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    datePickerConfirm: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
});
