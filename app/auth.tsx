import { View, Text, StyleSheet, TouchableOpacity, I18nManager, ActivityIndicator, Alert, Image, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { Input } from '@/components/ui/input';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

type AuthMode = 'signin' | 'forgot' | 'otp' | 'verify';

export default function AuthScreen() {
  const router = useRouter();
  const { isAuthenticated, signInWithPassword, signInWithOTP, verifyOTP, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  const emailError = email && !email.includes('@') ? 'נא להזין כתובת אימייל תקינה' : undefined;
  const passwordError = password && password.length < 6 ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : undefined;
  const otpError = otp && otp.length !== 6 ? 'הקוד חייב להכיל 6 ספרות' : undefined;

  const handleSignIn = async () => {
    if (emailError || passwordError) return;

    try {
      await signInWithPassword.mutateAsync({ email, password });
    } catch (error: unknown) {
      console.error('Sign in error:', error);
      Alert.alert(hebrew.common.error, error instanceof Error ? error.message : hebrew.auth.invalidCredentials);
    }
  };

  const handleSendOTP = async () => {
    if (emailError) return;

    try {
      await signInWithOTP.mutateAsync(email);
      setMode('verify');
      Alert.alert(hebrew.common.success, hebrew.auth.otpSent);
    } catch (error: unknown) {
      console.error('OTP error:', error);
      Alert.alert(hebrew.common.error, error instanceof Error ? error.message : hebrew.auth.errorOccurred);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpError) return;

    try {
      await verifyOTP.mutateAsync({ email, token: otp });
    } catch (error: unknown) {
      console.error('Verify OTP error:', error);
      Alert.alert(hebrew.common.error, error instanceof Error ? error.message : hebrew.auth.errorOccurred);
    }
  };

  const handleResetPassword = async () => {
    if (emailError) return;

    try {
      await resetPassword.mutateAsync(email);
      Alert.alert(hebrew.common.success, hebrew.auth.emailSent);
      setMode('signin');
    } catch (error: unknown) {
      console.error('Reset password error:', error);
      Alert.alert(hebrew.common.error, error instanceof Error ? error.message : hebrew.auth.errorOccurred);
    }
  };

  const isLoading = signInWithPassword.isPending || signInWithOTP.isPending || verifyOTP.isPending || resetPassword.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          {mode === 'signin' && (
            <>
              <Input
                label={hebrew.auth.email}
                placeholder={hebrew.auth.enterEmail}
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Input
                label={hebrew.auth.password}
                placeholder={hebrew.auth.enterPassword}
                icon={Lock}
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                secureTextEntry
                style={styles.input}
              />

              <TouchableOpacity
                onPress={() => setMode('forgot')}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>{hebrew.auth.forgotPassword}</Text>
              </TouchableOpacity>

              <LinearGradient
                colors={['#1F2937', '#111827']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={isLoading || !!emailError || !!passwordError}
                  activeOpacity={0.8}
                  style={styles.primaryButtonInner}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{hebrew.auth.signIn}</Text>
                  )}
                </TouchableOpacity>
              </LinearGradient>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>או</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setMode('otp')}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>{hebrew.auth.signInWithOTP}</Text>
                <ArrowRight size={20} color="#000000" />
              </TouchableOpacity>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <Text style={styles.modeTitle}>{hebrew.auth.resetPassword}</Text>
              <Text style={styles.modeDescription}>נשלח לך קישור לאיפוס סיסמה לאימייל</Text>

              <Input
                label={hebrew.auth.email}
                placeholder={hebrew.auth.enterEmail}
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={isLoading || !!emailError}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>{hebrew.auth.sendResetLink}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('signin')}
                style={styles.backButton}
              >
                <Text style={styles.backText}>{hebrew.auth.backToLogin}</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'otp' && (
            <>
              <Text style={styles.modeTitle}>{hebrew.auth.signInWithOTP}</Text>
              <Text style={styles.modeDescription}>נשלח לך קוד חד פעמי לאימייל</Text>

              <Input
                label={hebrew.auth.email}
                placeholder={hebrew.auth.enterEmail}
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendOTP}
                disabled={isLoading || !!emailError}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>{hebrew.auth.sendOTP}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('signin')}
                style={styles.backButton}
              >
                <Text style={styles.backText}>{hebrew.auth.backToLogin}</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'verify' && (
            <>
              <Text style={styles.modeTitle}>{hebrew.auth.verify}</Text>
              <Text style={styles.modeDescription}>הזן את הקוד שנשלח ל-{email}</Text>

              <Input
                label={hebrew.auth.enterOTP}
                placeholder="000000"
                value={otp}
                onChangeText={setOtp}
                error={otpError}
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleVerifyOTP}
                disabled={isLoading || !!otpError}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>{hebrew.auth.verify}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode('otp')}
                style={styles.backButton}
              >
                <Text style={styles.backText}>חזור</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginBottom: 24,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
  },
  forgotButton: {
    alignSelf: 'flex-start',
  },
  forgotText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  primaryButton: {
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  primaryButtonInner: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
    writingDirection: 'rtl',
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    writingDirection: 'rtl',
  },
  divider: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  backText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});
