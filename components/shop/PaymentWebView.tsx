import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Spinner } from '@/components/ui/spinner';
import { WebView } from 'react-native-webview';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface PaymentWebViewProps {
    formUrl: string;
    onNavigationStateChange?: (navState: any) => void;
    onLoadEnd?: () => void;
    onGoBack: () => void;
}

export function PaymentWebView({
    formUrl,
    onNavigationStateChange,
    onLoadEnd,
    onGoBack,
}: PaymentWebViewProps) {
    const [loading, setLoading] = useState(true);

    return (
        <View style={styles.container}>
            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.text || '#000'} />
                    <Text style={styles.backText}>חזור</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>השלמת תשלום</Text>
            </View>

            {/* Loading Indicator */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <Spinner size="lg" />
                    <Text style={styles.loadingText}>טוען טופס תשלום...</Text>
                </View>
            )}

            {/* WebView */}
            <WebView
                source={{ uri: formUrl }}
                onLoadEnd={() => {
                    setLoading(false);
                    onLoadEnd?.();
                }}
                onNavigationStateChange={onNavigationStateChange}
                startInLoadingState={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={styles.webview}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.card || '#fff',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border || '#e5e5e5',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text || '#000',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text || '#000',
        textAlign: 'right',
    },
    loadingContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transform: [{ translateY: -50 }],
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textSecondary || '#666',
    },
    webview: {
        flex: 1,
    },
});
