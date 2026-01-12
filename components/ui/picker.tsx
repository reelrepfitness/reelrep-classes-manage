import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    Platform,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

export interface PickerOption {
    label: string;
    value: string;
    icon?: (props: any) => React.ReactNode;
}

interface PickerProps {
    options: PickerOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    variant?: 'default' | 'group';
    style?: ViewStyle;
    inputStyle?: TextStyle;
    grid?: boolean;
    modalTitle?: string;
    anchor?: 'top' | 'bottom';
    disabled?: boolean;
    triggerContentStyle?: ViewStyle;
    renderCustomModalHeader?: (onClose: () => void) => React.ReactNode;
}

export function Picker({
    options,
    value,
    onValueChange,
    placeholder = 'Select an option',
    variant = 'default',
    style,
    inputStyle,
    grid = false,
    modalTitle,
    anchor = 'bottom',
    disabled = false,
    triggerContentStyle,
    renderCustomModalHeader,
}: PickerProps) {
    const [visible, setVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (val: string) => {
        onValueChange(val);
        setVisible(false);
    };

    const renderOption = ({ item }: { item: PickerOption }) => {
        const isSelected = item.value === value;

        if (grid) {
            return (
                <TouchableOpacity
                    style={[
                        styles.gridItem,
                        isSelected && styles.gridItemActive,
                    ]}
                    onPress={() => handleSelect(item.value)}
                >
                    <View style={[styles.gridIcon, isSelected && styles.gridIconActive]}>
                        {item.icon ? item.icon({ size: 24, color: isSelected ? '#fff' : '#333' }) : null}
                    </View>
                    <Text style={[styles.gridLabel, isSelected && styles.gridLabelActive]}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.optionItemActive]}
                onPress={() => handleSelect(item.value)}
            >
                <View style={styles.optionContent}>
                    {item.icon && (
                        <View style={styles.optionIcon}>
                            {item.icon({ size: 20, color: isSelected ? Colors.primary : '#666' })}
                        </View>
                    )}
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                        {item.label}
                    </Text>
                </View>
                {isSelected && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>
        );
    };

    const isTop = anchor === 'top';

    return (
        <>
            <TouchableOpacity
                style={[styles.trigger, style]}
                onPress={() => !disabled && setVisible(true)}
                disabled={disabled}
            >
                <View style={[styles.triggerContent, triggerContentStyle]}>
                    {/* If custom trigger style is passed, we might just render text/placeholder
               or let the parent handle the layout via style constraints.
               For AdminHeader, it passes specific triggerContentStyle to stack text.
           */}
                    {selectedOption ? (
                        // If it's a custom layout (like in AdminHeader), we might just render children?
                        // The provided code uses Picker as a controlled component but expects it to render specific things.
                        // The usage: inputStyle={styles.headerPickerText} placeholder={displayTitle}
                        // It seems it relies on `placeholder` being the main text if present & overrides logic?
                        // Wait, AdminHeader says `placeholder={displayTitle}`.
                        <Text style={[styles.valueText, inputStyle]}>
                            {placeholder || selectedOption.label}
                        </Text>
                    ) : (
                        <Text style={[styles.placeholderText, inputStyle]}>{placeholder}</Text>
                    )}
                </View>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={[
                    styles.modalOverlay,
                    isTop ? { justifyContent: 'flex-start' } : { justifyContent: 'flex-end' }
                ]}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />

                    <View style={[
                        styles.modalContent,
                        isTop ? styles.modalTop : { paddingBottom: insets.bottom + 20 },
                        // For top, we might need top padding/safe area handling if header is part of it or not.
                        // The user usage in AdminHeader handles "renderCustomModalHeader" which includes the safe area padding.
                        // So we just strict top: 0 behavior if top anchor.
                    ]}>
                        {renderCustomModalHeader ? (
                            renderCustomModalHeader(() => setVisible(false))
                        ) : (
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{modalTitle || placeholder}</Text>
                                <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                                    <X size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <FlatList
                            data={options}
                            renderItem={renderOption}
                            keyExtractor={(item) => item.value}
                            numColumns={grid ? 3 : 1}
                            contentContainerStyle={styles.listContent}
                            columnWrapperStyle={grid ? styles.columnWrapper : undefined}
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        padding: 12,
        // borderWidth: 1,
        // borderColor: '#E5E7EB',
        // borderRadius: 12,
        // backgroundColor: '#fff',
    },
    triggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    valueText: {
        fontSize: 16,
        color: '#111827',
    },
    placeholderText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        // justifyContent set dynamically
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        width: '100%',
        // Shadow since it's "floating" over
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    modalTop: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        // For top drawer, we usually want it to just sit at top.
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    listContent: {
        padding: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    optionItemActive: {
        backgroundColor: '#F9FAFB',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionIcon: {
        width: 32,
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    optionLabelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    // Grid Styles
    gridItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
        marginHorizontal: 6,
        aspectRatio: 1,
    },
    gridItemActive: {
        backgroundColor: Colors.primary,
    },
    gridIcon: {
        marginBottom: 8,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    gridIconActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    gridLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        textAlign: 'center',
    },
    gridLabelActive: {
        color: '#fff',
    },
    columnWrapper: {
        gap: 12,
    },
});
