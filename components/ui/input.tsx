import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | undefined;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  containerStyle?: any;
}

export function Input({
  label,
  error,
  icon: Icon,
  iconColor,
  iconBgColor,
  style,
  containerStyle,
  ...props
}: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputContainerError, containerStyle]}>
        {Icon && (
          <View style={[styles.iconContainer, iconBgColor ? { backgroundColor: iconBgColor } : undefined]}>
            <Icon size={20} color={error ? '#ff6b6b' : (iconColor || '#888')} />
          </View>
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#888"
          {...props}
        />
      </View>
      {error !== undefined && error !== '' && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },
  inputContainer: {
    flexDirection: 'row-reverse' as const,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputContainerError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  iconContainer: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: 'right',
    writingDirection: 'rtl' as const,
  },
  error: {
    fontSize: 13,
    color: '#ff6b6b',
    textAlign: 'right',
    writingDirection: 'rtl' as const,
    fontWeight: '500' as const,
  },
});
