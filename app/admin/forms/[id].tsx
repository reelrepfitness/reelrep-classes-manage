import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions,
    FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    ChevronRight,
    Save,
    RotateCcw,
    Plus,
    Trash2,
    Search,
    UserCheck,
    Users,
    AlertTriangle,
    FileText,
    Activity
} from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

interface Question {
    id: number | string;
    text: string;
    type: 'yes_no';
}

interface Signature {
    id: string;
    user_id: string;
    signed_at: string;
    form_version: number;
    signature_data: any;
    profiles: {
        full_name: string;
        phone: string;
    };
}

export default function FormDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'edit' | 'signatures'>('edit');
    const [form, setForm] = useState<any>(null);
    const [content, setContent] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadFormData();
    }, [id]);

    useEffect(() => {
        if (tab === 'signatures') {
            loadSignatures();
        }
    }, [tab, id]);

    const loadFormData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_forms')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setForm(data);

            if (data.form_type === 'regulations') {
                setContent(data.content || '');
            } else {
                try {
                    const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                    setQuestions(parsed || []);
                } catch (e) {
                    setQuestions([]);
                }
            }
        } catch (error) {
            console.error('Error loading form:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני הטופס');
        } finally {
            setLoading(false);
        }
    };

    const loadSignatures = async () => {
        try {
            const { data, error } = await supabase
                .from('user_signatures')
                .select(`
                    id,
                    user_id,
                    signed_at,
                    form_version,
                    signature_data,
                    profiles (*)
                `)
                .eq('form_id', id)
                .order('signed_at', { ascending: false });

            if (error) throw error;
            // Handle TypeScript issue with join
            setSignatures(data as any);
        } catch (error) {
            console.error('Error loading signatures:', error);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedContent = form.form_type === 'regulations' ? content : JSON.stringify(questions);

            const { error } = await supabase
                .from('app_forms')
                .update({
                    content: updatedContent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            Alert.alert('הצלחה', 'השינויים נשמרו בהצלחה');
        } catch (error) {
            console.error('Error saving:', error);
            Alert.alert('שגיאה', 'לא ניתן לשמור את השינויים');
        } finally {
            setSaving(false);
        }
    };

    const resetFormVersion = async () => {
        Alert.alert(
            'אפס חתימות?',
            'פעולה זו תעלה את גרסת הטופס ותדרוש מכל הלקוחות לחתום מחדש. לא ניתן לבטל פעולה זו.',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'אפס ודרוש חתימה',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const newVersion = (form.version || 1) + 1;
                            const { error } = await supabase
                                .from('app_forms')
                                .update({
                                    version: newVersion,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', id);

                            if (error) throw error;
                            setForm({ ...form, version: newVersion });
                            Alert.alert('הצלחה', `גרסה v${newVersion} הופצה בהצלחה. כל המשתמשים יתבקשו לחתום מחדש.`);
                        } catch (error) {
                            Alert.alert('שגיאה', 'לא ניתן לעדכן גרסה');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const addQuestion = () => {
        const newId = questions.length > 0 ? Math.max(...questions.map(q => Number(q.id))) + 1 : 1;
        setQuestions([...questions, { id: newId, text: '', type: 'yes_no' }]);
    };

    const removeQuestion = (qId: number | string) => {
        setQuestions(questions.filter(q => q.id !== qId));
    };

    const updateQuestionText = (qId: number | string, text: string) => {
        setQuestions(questions.map(q => q.id === qId ? { ...q, text } : q));
    };

    const filteredSignatures = signatures.filter(sig =>
        sig.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sig.profiles?.phone?.includes(searchQuery)
    );

    const renderSignatureItem = ({ item }: { item: Signature }) => {
        const hasRisk = item.signature_data && Object.values(item.signature_data).some(v => v === true || v === 'yes');

        return (
            <View style={styles.signatureCard}>
                <View style={styles.sigHeader}>
                    <View style={styles.sigMainInfo}>
                        <Text style={styles.sigName}>{item.profiles?.full_name || 'לקוח לא ידוע'}</Text>
                        <Text style={styles.sigDate}>{new Date(item.signed_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={[styles.versionTag, item.form_version === form.version ? styles.currentVersionTag : null]}>
                        <Text style={[styles.versionTagText, item.form_version === form.version ? styles.currentVersionTagText : null]}>v{item.form_version}</Text>
                    </View>
                </View>

                {hasRisk && (
                    <View style={styles.riskAlert}>
                        <AlertTriangle size={14} color="#EF4444" />
                        <Text style={styles.riskText}>ענה "כן" על שאלות סיכון רפואי</Text>
                    </View>
                )}

                <View style={styles.sigFooter}>
                    <Text style={styles.sigPhone}>{item.profiles?.phone}</Text>
                    <TouchableOpacity
                        style={styles.viewAnswersBtn}
                        onPress={() => {
                            // Show summary of answers in an Alert or another modal
                            const answers = questions.map(q => {
                                const ans = item.signature_data?.[q.id];
                                const ansText = (ans === true || ans === 'yes') ? 'כן' : 'לא';
                                return `${q.text}: ${ansText}`;
                            }).join('\n');
                            Alert.alert(`תשובות של ${item.profiles?.full_name}`, answers);
                        }}
                    >
                        <Text style={styles.viewAnswersText}>צפה בתשובות</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) return (
        <View style={styles.centered}>
            <Spinner size="lg" />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronRight size={28} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{form?.title}</Text>
                    <View style={styles.versionHeaderBadge}>
                        <Text style={styles.versionHeaderText}>גרסה v{form?.version}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButtonWrapper}>
                    {saving ? <Spinner size="sm" /> : <Save size={24} color={Colors.primary} />}
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'signatures' && styles.activeTab]}
                    onPress={() => setTab('signatures')}
                >
                    <Users size={18} color={tab === 'signatures' ? Colors.primary : '#64748B'} />
                    <Text style={[styles.tabText, tab === 'signatures' && styles.activeTabText]}>חתימות</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'edit' && styles.activeTab]}
                    onPress={() => setTab('edit')}
                >
                    <FileText size={18} color={tab === 'edit' ? Colors.primary : '#64748B'} />
                    <Text style={[styles.tabText, tab === 'edit' && styles.activeTabText]}>עריכת טופס</Text>
                </TouchableOpacity>
            </View>

            {tab === 'edit' ? (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {form.form_type === 'regulations' ? 'עריכת תוכן התקנון' : 'שאלון הצהרת בריאות'}
                        </Text>
                    </View>

                    {form.form_type === 'regulations' ? (
                        <TextInput
                            style={styles.textArea}
                            multiline
                            placeholder="הכנס את תוכן התקנון כאן..."
                            value={content}
                            onChangeText={setContent}
                            textAlignVertical="top"
                            textAlign="right"
                        />
                    ) : (
                        <View style={styles.questionBuilder}>
                            {questions.map((q, idx) => (
                                <View key={q.id} style={styles.questionItem}>
                                    <View style={styles.questionHeader}>
                                        <Text style={styles.questionNumber}>{idx + 1}</Text>
                                        <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={styles.questionInput}
                                        placeholder="טקסט השאלה..."
                                        value={q.text}
                                        onChangeText={(text) => updateQuestionText(q.id, text)}
                                        multiline
                                        textAlign="right"
                                    />
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
                                <Plus size={20} color="#fff" style={{ marginLeft: 8 }} />
                                <Text style={styles.addQuestionBtnText}>הוסף שאלה</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.dangerZone}>
                        <Text style={styles.dangerTitle}>פעולות קריטיות</Text>
                        <Text style={styles.dangerDesc}>
                            העלאת גרסה תדרוש חתימה מחדש מכל הלקוחות ותוצג להם כחסימה במסך הבית עד שיחתמו.
                        </Text>
                        <TouchableOpacity style={styles.resetBtn} onPress={resetFormVersion}>
                            <RotateCcw size={20} color="#fff" style={{ marginLeft: 8 }} />
                            <Text style={styles.resetBtnText}>אפס חתימות ודרוש חתימה מחדש</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.signaturesView}>
                    <View style={styles.searchBarContainer}>
                        <View style={styles.searchBar}>
                            <Search size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="חפש לקוח שהחתים..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <FlatList
                        data={filteredSignatures}
                        renderItem={renderSignatureItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={[styles.sigList, { paddingBottom: insets.bottom + 20 }]}
                        ListEmptyComponent={
                            <View style={styles.emptySignatures}>
                                <UserCheck size={48} color="#E2E8F0" />
                                <Text style={styles.emptyText}>לא נמצאו חתימות</Text>
                            </View>
                        }
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 15,
        // Remove 'justifyContent: space-between' if you want improved specific alignment, 
        // but 'space-between' is usually good for [Back] [Title] [Action].
        // The issue 'not aligned to center' usually refers to the TITLE not being perfectly centered 
        // because the Back button and Action button have different widths.
    },
    backButton: {
        padding: 4,
        zIndex: 10, // Ensure clickable
        width: 40, // Fixed width for balance
    },
    headerTitleContainer: {
        alignItems: 'center',
        flex: 1, // Takes up all remaining space
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    versionHeaderBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    versionHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
    },
    saveButtonWrapper: {
        width: 40,
        alignItems: 'flex-start',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tab: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    activeTabText: {
        color: Colors.primary,
    },
    content: {
        padding: 20,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'right',
    },
    textArea: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        height: 400,
        fontSize: 15,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        textAlign: 'right',
    },
    questionBuilder: {
        gap: 16,
    },
    questionItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    questionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        color: '#fff',
        textAlign: 'center',
        lineHeight: 24,
        fontSize: 12,
        fontWeight: '800',
    },
    questionInput: {
        fontSize: 15,
        color: '#0F172A',
        textAlign: 'right',
        lineHeight: 22,
    },
    addQuestionBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 10,
    },
    addQuestionBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    dangerZone: {
        marginTop: 40,
        backgroundColor: '#FEF2F2',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    dangerTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#EF4444',
        textAlign: 'right',
        marginBottom: 8,
    },
    dangerDesc: {
        fontSize: 13,
        color: '#991B1B',
        textAlign: 'right',
        lineHeight: 18,
        marginBottom: 16,
    },
    resetBtn: {
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
    },
    resetBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    signaturesView: {
        flex: 1,
    },
    searchBarContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0F172A',
        textAlign: 'right',
    },
    sigList: {
        padding: 16,
    },
    signatureCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    sigHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    sigMainInfo: {
        alignItems: 'flex-start',
    },
    sigName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    sigDate: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    versionTag: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    versionTagText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
    },
    currentVersionTag: {
        backgroundColor: '#DCFCE7',
    },
    currentVersionTagText: {
        color: '#166534',
    },
    riskAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 8,
        borderRadius: 8,
        gap: 6,
        marginBottom: 12,
    },
    riskText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    sigFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    sigPhone: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    viewAnswersBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    viewAnswersText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
    },
    emptySignatures: {
        padding: 60,
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        fontSize: 15,
        color: '#CBD5E1',
        fontWeight: '700',
    },
});
