import { Platform, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as LucideIcons from 'lucide-react-native';
import { ICON_MAP } from '@/constants/iconMap';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
}

export const Icon = ({
  name,
  size = 24,
  color = '#000',
  strokeWidth = 2,
  style
}: IconProps) => {
  const iconConfig = ICON_MAP[name];

  if (!iconConfig) {
    console.warn(`Icon "${name}" not found in ICON_MAP`);
    return null;
  }

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={iconConfig.ios}
        size={size}
        type="monochrome"
        tintColor={color}
        style={[{ width: size, height: size }, style]}
      />
    );
  }

  const LucideIcon = LucideIcons[iconConfig.android as keyof typeof LucideIcons];

  if (!LucideIcon) {
    console.warn(`Lucide icon "${iconConfig.android}" not found`);
    return null;
  }

  return (
    <LucideIcon
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};
