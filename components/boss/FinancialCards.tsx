import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '@/constants/supabase';
import { TrendingUp, TrendingDown, Minus, DollarSign, Award, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cn } from '@/lib/utils';

// --- Types ---
interface FinancialData {
  todayIncome: number;
  lastMonthIncome: number;
  currentMonthIncome: number;
}

export function FinancialCards() {
  const router = useRouter(); // הוספנו את זה לניווט
  const [data, setData] = useState<FinancialData>({
    todayIncome: 0,
    lastMonthIncome: 0,
    currentMonthIncome: 0,
  });
  const [loading, setLoading] = useState(true);

  // --- Logic (Kept Intact) ---
  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Today
      const { data: todayDocs } = await supabase
        .from('green_invoice_documents')
        .select('amount')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .eq('status', 1);
      const todayIncome = todayDocs?.reduce((sum, doc) => sum + Number(doc.amount), 0) || 0;

      // Last Month
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const { data: lastMonthDocs } = await supabase
        .from('green_invoice_documents')
        .select('amount')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString())
        .eq('status', 1);
      const lastMonthIncome = lastMonthDocs?.reduce((sum, doc) => sum + Number(doc.amount), 0) || 0;

      // Current Month
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: currentMonthDocs } = await supabase
        .from('green_invoice_documents')
        .select('amount')
        .gte('created_at', currentMonthStart.toISOString())
        .eq('status', 1);
      const currentMonthIncome = currentMonthDocs?.reduce((sum, doc) => sum + Number(doc.amount), 0) || 0;

      setData({ todayIncome, lastMonthIncome, currentMonthIncome });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
  };

  // --- UI Configuration ---
  const screenWidth = Dimensions.get('window').width;
  // Chart Config specifically for Light Mode (Clean)
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(209, 77, 114, ${opacity})`, // Primary Pink
    labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`, // Zinc-500 (Gray)
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      strokeDasharray: "4", // Dashed lines
      stroke: "#e4e4e7" // Light gray grid
    }
  };

  return (
    <View className="gap-4 mb-6">

      {/* Row 1: Quick Stats */}
      <View className="flex-row gap-3">

        {/* Card 1: Today's Income */}
        <View className="flex-1 bg-surface p-4 rounded-2xl border border-gray-200 shadow-sm">
          <View className="flex-row-reverse justify-between items-start mb-2">
            <View className="bg-green-100 p-2 rounded-full">
              <DollarSign size={18} color="#15803d" />
            </View>
            <Text className="text-xs font-bold text-gray-500">היום</Text>
          </View>
          <Text className="text-2xl font-extrabold text-[#09090B] text-right">
            {formatCurrency(data.todayIncome)}
          </Text>
        </View>

        {/* Card 2: Current Month Income */}
        <View className="flex-1 bg-surface p-4 rounded-2xl border border-gray-200 shadow-sm">
          <View className="flex-row-reverse justify-between items-start mb-2">
            <View className="bg-blue-100 p-2 rounded-full">
              <TrendingUp size={18} color="#1d4ed8" />
            </View>
            <Text className="text-xs font-bold text-gray-500">החודש</Text>
          </View>
          <Text className="text-2xl font-extrabold text-[#09090B] text-right">
            {formatCurrency(data.currentMonthIncome)}
          </Text>
        </View>

      </View>

      {/* Row 2: Chart Comparison */}
      <View className="bg-surface p-4 rounded-2xl border border-gray-200 shadow-sm items-center">
        <View className="w-full flex-row-reverse justify-between items-center mb-4 px-2">
          <Text className="text-sm font-bold text-[#09090B]">השוואה חודשית</Text>
          {data.currentMonthIncome > data.lastMonthIncome ? (
            <View className="flex-row items-center bg-green-100 px-2 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-green-700 ml-1">עלייה</Text>
              <TrendingUp size={12} color="#15803d" />
            </View>
          ) : data.currentMonthIncome < data.lastMonthIncome ? (
            <View className="flex-row items-center bg-red-100 px-2 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-red-700 ml-1">ירידה</Text>
              <TrendingDown size={12} color="#b91c1c" />
            </View>
          ) : (
            <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-gray-600 ml-1">ללא שינוי</Text>
              <Minus size={12} color="#52525b" />
            </View>
          )}
        </View>

        <BarChart
          data={{
            labels: ['חודש שעבר', 'החודש'],
            datasets: [{ data: [data.lastMonthIncome, data.currentMonthIncome] }],
          }}
          width={screenWidth - 64} // Responsive width (minus padding)
          height={160}
          yAxisLabel="₪"
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={{ borderRadius: 16, paddingRight: 0 }}
          fromZero
          showValuesOnTopOfBars
          withInnerLines={true}
          flatColor={true}
        />
      </View>

      {/* Row 3: Navigation to Achievements (Fix for the crash) */}
      <TouchableOpacity
        onPress={() => router.push('/achievements' as any)}
        className="bg-surface p-4 rounded-2xl border border-gray-200 shadow-sm flex-row-reverse justify-between items-center active:scale-[0.99]"
      >
        <View className="flex-row-reverse items-center gap-3">
          <View className="bg-yellow-100 p-2.5 rounded-full border border-yellow-200">
            <Award size={20} color="#ca8a04" />
          </View>
          <View>
            <Text className="text-sm font-bold text-[#09090B] text-right">מרכז ההישגים</Text>
            <Text className="text-xs text-gray-500 text-right">צפה באתגרים ובפלטות שלך</Text>
          </View>
        </View>
        <ChevronLeft size={20} color="#A1A1AA" />
      </TouchableOpacity>

    </View>
  );
}