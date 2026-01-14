import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    FileText,
    Activity,
    ChevronLeft,
    Users,
    AlertCircle,
    RotateCcw
} from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';
import { AdminHeader } from '@/components/admin/AdminHeader';

const { width } = Dimensions.get('window');

interface AppForm {
    id: string;
    title: string;
    description: string;
    form_type: 'regulations' | 'health_declaration';
    version: number;
    is_active: boolean;
    signed_count?: number;
    total_users?: number;
}

export default function FormsHubScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [forms, setForms] = useState<AppForm[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFormsData();
    }, []);

    const loadFormsData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Forms
            const { data: formsData, error: formsError } = await supabase
                .from('app_forms')
                .select('*')
                .order('created_at', { ascending: true });

            if (formsError) throw formsError;

            // 2. Fetch Stats (Signatures on current version)
            const { count: totalUsers } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const updatedForms = await Promise.all((formsData || []).map(async (form) => {
                const { count: signedCount } = await supabase
                    .from('user_signatures')
                    .select('*', { count: 'exact', head: true })
                    .eq('form_id', form.id)
                    .eq('form_version', form.version);

                return {
                    ...form,
                    signed_count: signedCount || 0,
                    total_users: totalUsers || 0
                };
            }));

            setForms(updatedForms);
        } catch (error) {
            console.error('Error loading forms:', error);
            Alert.alert('שגיאה', 'לא ניתן לטעון את נתוני הטפסים');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        return type === 'regulations' ? <FileText size={32} color={Colors.primary} /> : <Activity size={32} color={Colors.primary} />;
    };

    return (
        <View style={styles.container}>
            <AdminHeader title="ניהול טפסים" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeTitle}>מרכז ניהול משפטי</Text>
                    <Text style={styles.welcomeSubtitle}>נהל תקנונים, הצהרות בריאות וחתימות לקוחות</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.formsGrid}>
                        {forms.map((form) => {
                            const completionRate = form.total_users ? (form.signed_count || 0) / form.total_users : 0;

                            return (
                                <TouchableOpacity
                                    key={form.id}
                                    style={styles.formCard}
                                    activeOpacity={0.8}
                                    onPress={() => router.push(`/admin/forms/${form.id}`)}
                                >
                                    <View style={styles.cardTop}>
                                        <View style={styles.iconCircle}>
                                            {getIcon(form.form_type)}
                                        </View>
                                        <View style={styles.versionBadge}>
                                            <Text style={styles.versionText}>v{form.version}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardContent}>
                                        <Text style={styles.formTitle}>{form.title}</Text>
                                        <Text style={styles.formDesc}>{form.description || 'ניהול תוכן וגרסאות הטופס'}</Text>
                                    </View>

                                    <View style={styles.statsContainer}>
                                        <View style={styles.statRow}>
                                            <Users size={14} color="#64748B" />
                                            <Text style={styles.statLabel}>חתמו על הגרסה הנוכחית:</Text>
                                        </View>
                                        <View style={styles.progressWrapper}>
                                            <View style={styles.progressBar}>
                                                <View style={[styles.progressFill, { width: `${completionRate * 100}%` }]} />
                                            </View>
                                            <Text style={styles.statValue}>{form.signed_count}/{form.total_users}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <Text style={styles.footerAction}>עריכה וניהול</Text>
                                        <ChevronLeft size={18} color={Colors.primary} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                <View style={styles.infoBox}>
                    <AlertCircle size={20} color="#64748B" />
                    <Text style={styles.infoText}>
                        עידכון גרסה בטופס ידרוש חתימה מחדש מכל הלקוחות בכניסתם הבאה לאפליקציה.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    welcomeSection: {
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'right',
    },
    welcomeSubtitle: {
        fontSize: 15,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'right',
    },
    formsGrid: {
        gap: 20,
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    versionBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    versionText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
    },
    cardContent: {
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'right',
    },
    formDesc: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'right',
    },
    statsContainer: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 18,
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
    },
    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
        minWidth: 50,
        textAlign: 'right',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerAction: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 16,
        marginTop: 30,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        textAlign: 'right',
        lineHeight: 18,
    },
});
