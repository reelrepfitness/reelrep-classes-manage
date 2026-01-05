import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { ChartContainer } from '@/components/charts/chart-container';
import { BarChart } from '@/components/charts/bar-chart';
import { X, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/constants/supabase';
import Colors from '@/constants/colors';

interface MonthlyData {
    month: string;
    revenue: number;
}

export function MonthlyComparisonChart() {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [yearPickerVisible, setYearPickerVisible] = useState(false);
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
    const [yearlyData, setYearlyData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);

    const [todaysIncome, setTodaysIncome] = useState(0);

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        loadMonthlyComparison();
    }, []);

    useEffect(() => {
        if (modalVisible) {
            loadYearlyData(selectedYear);
        }
    }, [selectedYear, modalVisible]);

    const loadMonthlyComparison = async () => {
        try {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Fetch Today's Income
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

            const { data: todayDocs } = await supabase
                .from('green_invoice_documents')
                .select('amount')
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)
                .in('status', [1, 2]);

            const todayTotal = todayDocs?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
            setTodaysIncome(todayTotal);


            // Get current month and 3 months back
            const months = [];
            for (let i = 3; i >= 0; i--) {
                const date = new Date(currentYear, currentMonth - i, 1);
                months.push({
                    month: date.toLocaleDateString('he-IL', { month: 'short' }),
                    year: date.getFullYear(),
                    monthNum: date.getMonth(),
                });
            }

            const data = await Promise.all(
                months.map(async ({ month, year, monthNum }) => {
                    const startDate = new Date(year, monthNum, 1).toISOString();
                    const endDate = new Date(year, monthNum + 1, 0, 23, 59, 59).toISOString();

                    const { data: docs } = await supabase
                        .from('green_invoice_documents')
                        .select('amount')
                        .gte('created_at', startDate)
                        .lte('created_at', endDate)
                        .in('status', [1, 2]); // Paid statuses

                    const revenue = docs?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
                    return { month, revenue };
                })
            );

            setMonthlyData(data);
        } catch (error) {
            console.error('Error loading monthly comparison:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadYearlyData = async (year: number) => {
        try {
            const months = Array.from({ length: 12 }, (_, i) => {
                const date = new Date(year, i, 1);
                return {
                    month: date.toLocaleDateString('he-IL', { month: 'short' }),
                    monthNum: i,
                };
            });

            const data = await Promise.all(
                months.map(async ({ month, monthNum }) => {
                    const startDate = new Date(year, monthNum, 1).toISOString();
                    const endDate = new Date(year, monthNum + 1, 0, 23, 59, 59).toISOString();

                    const { data: docs } = await supabase
                        .from('green_invoice_documents')
                        .select('amount')
                        .gte('created_at', startDate)
                        .lte('created_at', endDate)
                        .in('status', [1, 2]);

                    const revenue = docs?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
                    return { month, revenue };
                })
            );

            setYearlyData(data);
        } catch (error) {
            console.error('Error loading yearly data:', error);
        }
    };

    const chartData = monthlyData.map((item, index) => ({
        label: item.month,
        value: item.revenue,
        color: index === monthlyData.length - 1 ? Colors.primary : Colors.accent,
    }));

    const yearlyChartData = yearlyData.map((item) => ({
        label: item.month,
        value: item.revenue,
        color: Colors.primary,
    }));

    // Don't render until we have data
    if (loading || chartData.length === 0) {
        return (
            <View style={styles.card}>
                <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: Colors.textSecondary }}>טוען נתונים...</Text>
                </View>
            </View>
        );
    }

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <ChartContainer>
                    {/* Custom Header Card */}
                    <View style={{
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 20,
                        flexDirection: 'row-reverse',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                        borderWidth: 1,
                        borderColor: '#f4f4f5'
                    }}>
                        <View>
                            <Text style={{ fontSize: 13, color: '#71717A', fontWeight: '600', textAlign: 'right' }}>הכנסות היום</Text>
                            <Text style={{ fontSize: 10, color: '#A1A1AA', textAlign: 'right' }}>{new Date().toLocaleDateString('he-IL')}</Text>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.primary }}>₪{todaysIncome.toLocaleString()}</Text>
                    </View>

                    <BarChart
                        data={chartData}
                        config={{
                            height: 180,
                            showLabels: true,
                            animated: true,
                            duration: 800,
                        }}
                    />
                    <View style={styles.tapHint}>
                        <Text style={styles.tapHintText}>לחץ לצפייה שנתית</Text>
                    </View>
                </ChartContainer>
            </TouchableOpacity>

            {/* Yearly View Bottom Sheet */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>הכנסות שנתיות</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Year Picker */}
                        <TouchableOpacity
                            style={styles.yearPicker}
                            onPress={() => setYearPickerVisible(!yearPickerVisible)}
                        >
                            <ChevronDown size={20} color={Colors.text} />
                            <Text style={styles.yearText}>{selectedYear}</Text>
                        </TouchableOpacity>

                        {yearPickerVisible && (
                            <View style={styles.yearList}>
                                {years.map((year) => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.yearItem,
                                            year === selectedYear && styles.yearItemActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedYear(year);
                                            setYearPickerVisible(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.yearItemText,
                                                year === selectedYear && styles.yearItemTextActive,
                                            ]}
                                        >
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Yearly Chart */}
                        <ScrollView style={styles.chartScroll}>
                            <ChartContainer
                                title={`הכנסות ${selectedYear}`}
                                description="סך ההכנסות לפי חודש"
                            >
                                <BarChart
                                    data={yearlyChartData}
                                    config={{
                                        height: 250,
                                        showLabels: true,
                                        animated: true,
                                        duration: 1000,
                                    }}
                                />
                            </ChartContainer>

                            {/* Total Revenue */}
                            <View style={styles.totalCard}>
                                <Text style={styles.totalLabel}>סך הכנסות שנתיות</Text>
                                <Text style={styles.totalValue}>
                                    ₪{yearlyData.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tapHint: {
        padding: 12,
        backgroundColor: Colors.primary + '10',
        alignItems: 'center',
    },
    tapHintText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    yearPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: Colors.card,
        borderRadius: 12,
        gap: 8,
    },
    yearText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    yearList: {
        marginHorizontal: 20,
        marginTop: 8,
        backgroundColor: Colors.card,
        borderRadius: 12,
        overflow: 'hidden',
    },
    yearItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    yearItemActive: {
        backgroundColor: Colors.primary + '20',
    },
    yearItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
    },
    yearItemTextActive: {
        color: Colors.primary,
    },
    chartScroll: {
        flex: 1,
        padding: 20,
    },
    totalCard: {
        marginTop: 20,
        padding: 20,
        backgroundColor: Colors.card,
        borderRadius: 16,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    totalValue: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.success,
    },
});
