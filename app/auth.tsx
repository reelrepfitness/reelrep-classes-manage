import { View, Text, StyleSheet, TouchableOpacity, I18nManager, Alert, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import Colors from '@/constants/colors';
import { hebrew } from '@/constants/hebrew';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = 280;
const LOGO_SIZE_SMALL = 160;
const LOGO_SCALE_TARGET = LOGO_SIZE_SMALL / LOGO_SIZE;
const LOGO_CENTER_Y = (SCREEN_HEIGHT - LOGO_SIZE) / 2;
const LOGO_FORM_Y = 10;

type AuthMode = 'signin' | 'forgot' | 'otp' | 'verify';

export default function AuthScreen() {
  const router = useRouter();
  const { isAuthenticated, signInWithPassword, signInWithOTP, verifyOTP, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Animation shared values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const logoTop = useSharedValue(LOGO_CENTER_Y);
  const buttonOpacity = useSharedValue(0);
  const bgTranslateX = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);


  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  // Entrance animation on mount
  useEffect(() => {
    // Background slow slide loop
    bgTranslateX.value = withRepeat(
      withTiming(-200, { duration: 20000, easing: Easing.linear }),
      -1,
      true
    );
    // Icon fades in
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    // Button fades in after logo
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
  }, []);

  const handleEnterLogin = useCallback(() => {
    // Fade out button, scale & move logo
    buttonOpacity.value = withTiming(0, { duration: 200 });
    logoScale.value = withTiming(LOGO_SCALE_TARGET, { duration: 500 });
    logoTop.value = withTiming(LOGO_FORM_Y, { duration: 500 });
    // Show form after logo starts moving
    setTimeout(() => {
      setShowForm(true);
      formOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      formTranslateY.value = withDelay(100, withTiming(0, { duration: 400 }));
    }, 300);
  }, []);

  // Animated styles
  const logoContainerStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    top: logoTop.value,
    transform: [{ scale: logoScale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bgTranslateX.value }],
  }));

  const enterButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

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
      {/* Logo - absolutely positioned, animated from center to top */}
      <Animated.View style={[styles.logoAbsolute, logoContainerStyle]}>
        <ExpoImage
          source={require('@/assets/images/login-screen-logo.png')}
          style={styles.logoImage}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.splashBg, bgStyle]}>
        <ExpoImage
          source={require('@/assets/images/jnjkn.png')}
          style={styles.splashBgImage}
          contentFit="cover"
        />
      </Animated.View>

      {!showForm ? (
        <>
          <View style={{ flex: 1 }} />
          <Animated.View style={[styles.bottomContainer, enterButtonStyle]}>
            <View style={styles.enterButtonWrapper}>
              <TouchableOpacity
                onPress={handleEnterLogin}
                activeOpacity={0.8}
                style={styles.enterButton}
              >
                <LinearGradient
                  colors={['#1F2937', '#111827']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.enterButtonGradient}
                >
                  <Text style={styles.enterButtonText}>כניסה</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.formContainer, formStyle]}>
            {mode === 'signin' && (
              <>
                <Input
                  label={hebrew.auth.email}
                  placeholder={hebrew.auth.enterEmail}
                  icon={Mail}
                  iconColor="#FFFFFF"
                  iconBgColor={Colors.primary}
                  value={email}
                  onChangeText={setEmail}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  containerStyle={styles.inputShadow}
                />
                <Input
                  label={hebrew.auth.password}
                  placeholder={hebrew.auth.enterPassword}
                  icon={Lock}
                  iconColor="#FFFFFF"
                  iconBgColor={Colors.primary}
                  value={password}
                  onChangeText={setPassword}
                  error={passwordError}
                  secureTextEntry
                  containerStyle={styles.inputShadow}
                />

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
                      <Spinner size="sm" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{hebrew.auth.signIn}</Text>
                    )}
                  </TouchableOpacity>
                </LinearGradient>

                <TouchableOpacity
                  onPress={() => setMode('forgot')}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>{hebrew.auth.forgotPassword}</Text>
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
                    <Spinner size="sm" />
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
                    <Spinner size="sm" />
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
                    <Spinner size="sm" />
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
          </Animated.View>
        </ScrollView>
      )}

      {/* Always visible at the bottom */}
      <View style={styles.badgeContainer}>
        <ExpoImage
          source={require('@/assets/images/byreelrep-black.png')}
          style={styles.byReelRepImage}
          contentFit="contain"
        />
      </View>
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
    paddingTop: 220,
    paddingBottom: 40,
  },
  logoAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  splashBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH + 400,
    left: -200,
    opacity: 0.15,
  },
  splashBgImage: {
    width: '100%',
    height: '100%',
  },
  bottomContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  badgeContainer: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop: 8,
  },
  byReelRepImage: {
    width: 300,
    height: 60,
  },
  enterButtonWrapper: {
    width: '100%',
    maxWidth: 340,
  },
  enterButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  enterButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  enterButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  // Form
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
    backgroundColor: '#FFFFFF',
  },
  inputShadow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  forgotButton: {
    alignSelf: 'center',
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
