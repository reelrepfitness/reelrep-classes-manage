import { useColor } from '@/hooks/useColor';
import { LayoutChangeEvent, View, ViewStyle } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';
import { useState } from 'react';

interface ChartConfig {
  width?: number;
  height?: number;
  padding?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  animated?: boolean;
  duration?: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

type Props = {
  data: ChartDataPoint[];
  config?: ChartConfig;
  style?: ViewStyle;
};

export const BarChart = ({ data, config = {}, style }: Props) => {
  const [containerWidth, setContainerWidth] = useState(300);

  const {
    height = 200,
    padding = 20,
    showLabels = true,
  } = config;

  const chartWidth = containerWidth || config.width || 300;
  const primaryColor = useColor('primary');
  const mutedColor = useColor('mutedForeground');

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: measuredWidth } = event.nativeEvent.layout;
    if (measuredWidth > 0) {
      setContainerWidth(measuredWidth);
    }
  };

  if (!data.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1); // Ensure at least 1 to avoid division by zero
  const innerChartWidth = chartWidth - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (innerChartWidth / data.length) * 0.8;
  const barSpacing = (innerChartWidth / data.length) * 0.2;

  return (
    <View style={[{ width: '100%', height }, style]} onLayout={handleLayout}>
      <Svg width={chartWidth} height={height}>
        {data.map((item, index) => {
          const value = item.value || 0; // Handle null/undefined values
          const barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
          const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
          const y = height - padding - barHeight;

          return (
            <G key={`bar-${index}`}>
              <Rect
                x={x}
                width={barWidth}
                fill={item.color || primaryColor}
                rx={4}
                height={Math.max(barHeight, 0)} // Ensure non-negative
                y={y}
              />

              {showLabels && (
                <>
                  <SvgText
                    x={x + barWidth / 2}
                    y={height - 5}
                    textAnchor='middle'
                    fontSize={12}
                    fill={mutedColor}
                  >
                    {item.label || ''}
                  </SvgText>
                  <SvgText
                    x={x + barWidth / 2}
                    y={Math.max(y - 5, padding + 10)} // Keep label visible
                    textAnchor='middle'
                    fontSize={11}
                    fill={mutedColor}
                    fontWeight='600'
                  >
                    {value.toFixed(0)}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};
