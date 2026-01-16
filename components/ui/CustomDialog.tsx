import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
} from 'react-native';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// GIF duration for auto-close
const SUCCESS_GIF_DURATION = 1800;

export type DialogType = 'success' | 'warning' | 'error' | 'confirm';

export interface DialogButton {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomDialogProps {
    visible: boolean;
    onClose: () => void;
    type?: DialogType;
    title?: string;
    message?: string;
    buttons?: DialogButton[];
    image?: any;
    showSuccessGif?: boolean;
    showWarningGif?: boolean;
    showCancelGif?: boolean;
    autoCloseAfterGif?: boolean;
}

export default function CustomDialog({
    visible,
    onClose,
    type = 'confirm',
    title,
    message,
    buttons,
    image,
    showSuccessGif = false,
    showWarningGif = false,
    showCancelGif = false,
    autoCloseAfterGif = false,
}: CustomDialogProps) {
    const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);

    // Handle auto-close
    useEffect(() => {
        if (visible && autoCloseAfterGif && showSuccessGif) {
            autoCloseTimer.current = setTimeout(() => {
                onClose();
            }, SUCCESS_GIF_DURATION);
        }

        return () => {
            if (autoCloseTimer.current) {
                clearTimeout(autoCloseTimer.current);
                autoCloseTimer.current = null;
            }
        };
    }, [visible, autoCloseAfterGif, showSuccessGif, onClose]);

    const getDefaultButtons = (): DialogButton[] => {
        switch (type) {
            case 'success':
                return [{ text: 'אישור', onPress: onClose, style: 'default' }];
            case 'warning':
            case 'error':
                return [{ text: 'הבנתי', onPress: onClose, style: 'default' }];
            case 'confirm':
            default:
                return [
                    { text: 'ביטול', onPress: onClose, style: 'cancel' },
                    { text: 'אישור', onPress: onClose, style: 'default' },
                ];
        }
    };

    const dialogButtons = buttons || getDefaultButtons();

    const getButtonStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return styles.destructiveButton;
            case 'cancel':
                return styles.cancelButton;
            default:
                return styles.defaultButton;
        }
    };

    const getButtonTextStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return styles.destructiveButtonText;
            case 'cancel':
                return styles.cancelButtonText;
            default:
                return styles.defaultButtonText;
        }
    };

    const getImageSource = () => {
        if (showSuccessGif) {
            return require('@/assets/images/doodle-outline-477-approved-checked-hover-pinch.gif');
        }
        if (showWarningGif) {
            return require('@/assets/images/alert.gif');
        }
        if (showCancelGif) {
            return require('@/assets/images/thumb-down.gif');
        }
        return image;
    };

    const hasImage = showSuccessGif || showWarningGif || showCancelGif || image;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    style={styles.dialog}
                    activeOpacity={1}
                    onPress={() => {}}
                >
                    {/* Image/GIF */}
                    {hasImage && (
                        <View style={styles.imageContainer}>
                            <Image
                                source={getImageSource()}
                                style={styles.dialogImage}
                                resizeMode="contain"
                            />
                        </View>
                    )}

                    {/* Title */}
                    {title && (
                        <Text style={styles.title}>{title}</Text>
                    )}

                    {/* Message */}
                    {message && (
                        <Text style={styles.message}>{message}</Text>
                    )}

                    {/* Buttons */}
                    {!autoCloseAfterGif && (
                        <View style={[
                            styles.buttonsContainer,
                            dialogButtons.length === 1 && styles.singleButtonContainer,
                        ]}>
                            {dialogButtons.map((button, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        getButtonStyle(button.style),
                                        dialogButtons.length === 1 && styles.singleButton,
                                    ]}
                                    onPress={button.onPress}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        getButtonTextStyle(button.style),
                                    ]}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 24,
    },
    dialog: {
        width: SCREEN_WIDTH - 48,
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    dialogImage: {
        width: 140,
        height: 140,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    singleButtonContainer: {
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    singleButton: {
        flex: 0,
        minWidth: 140,
    },
    defaultButton: {
        backgroundColor: Colors.primary,
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    destructiveButton: {
        backgroundColor: '#FEE2E2',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    defaultButtonText: {
        color: '#FFFFFF',
    },
    cancelButtonText: {
        color: '#374151',
    },
    destructiveButtonText: {
        color: '#DC2626',
    },
});
