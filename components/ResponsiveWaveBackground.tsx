import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/colors';

/**
 * Responsive Wave Background Component
 * Adapts to any screen size and orientation (portrait/landscape)
 * Uses app colors for consistency
 */

interface ResponsiveWaveBackgroundProps {
  bottomWhite?: boolean;
  variant?: 'home' | 'classes' | 'shop' | 'profile';
}

export const ResponsiveWaveBackground: React.FC<ResponsiveWaveBackgroundProps> = ({ bottomWhite = false, variant = 'home' }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // Determine orientation
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

  // Animation values
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const wave3Anim = useRef(new Animated.Value(0)).current;
  const wave4Anim = useRef(new Animated.Value(0)).current;

  // Variant-specific animation settings
  const animationConfig = {
    home: { wave1: [10, 3000], wave2: [-15, 4000], wave3: [8, 3500], wave4: [-12, 4500] },
    classes: { wave1: [12, 2800], wave2: [-18, 3600], wave3: [10, 3200], wave4: [-14, 4200] },
    shop: { wave1: [8, 3200], wave2: [-12, 4200], wave3: [6, 3800], wave4: [-10, 4800] },
    profile: { wave1: [7, 3400], wave2: [-10, 4400], wave3: [5, 3900], wave4: [-8, 5000] },
  }[variant];

  // Infinite wave animations
  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(wave1Anim, {
            toValue: animationConfig.wave1[0],
            duration: animationConfig.wave1[1],
            useNativeDriver: true,
          }),
          Animated.timing(wave1Anim, {
            toValue: 0,
            duration: animationConfig.wave1[1],
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(wave2Anim, {
            toValue: animationConfig.wave2[0],
            duration: animationConfig.wave2[1],
            useNativeDriver: true,
          }),
          Animated.timing(wave2Anim, {
            toValue: 0,
            duration: animationConfig.wave2[1],
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(wave3Anim, {
            toValue: animationConfig.wave3[0],
            duration: animationConfig.wave3[1],
            useNativeDriver: true,
          }),
          Animated.timing(wave3Anim, {
            toValue: 0,
            duration: animationConfig.wave3[1],
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(wave4Anim, {
            toValue: animationConfig.wave4[0],
            duration: animationConfig.wave4[1],
            useNativeDriver: true,
          }),
          Animated.timing(wave4Anim, {
            toValue: 0,
            duration: animationConfig.wave4[1],
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [wave1Anim, wave2Anim, wave3Anim, wave4Anim, variant]);

  // Variant-specific position adjustments
  const positionAdjustment = {
    home: 0,
    classes: -0.02,
    shop: 0.015,
    profile: -0.01,
  }[variant];

  // Responsive wave positions (adapt to orientation and variant)
  const wavePositions = {
    wave1: {
      top: isLandscape ? SCREEN_HEIGHT * (0.35 + positionAdjustment) : SCREEN_HEIGHT * (0.5148 + positionAdjustment),
      height: isLandscape ? SCREEN_HEIGHT * 0.95 : SCREEN_HEIGHT * 0.79,
      width: SCREEN_WIDTH * 1.02,
    },
    wave2: {
      top: isLandscape ? SCREEN_HEIGHT * (0.48 + positionAdjustment) : SCREEN_HEIGHT * (0.6018 + positionAdjustment),
      height: isLandscape ? SCREEN_HEIGHT * 0.75 : SCREEN_HEIGHT * 0.595,
      width: SCREEN_WIDTH * 1.014,
    },
    wave3: {
      top: isLandscape ? SCREEN_HEIGHT * (0.58 + positionAdjustment) : SCREEN_HEIGHT * (0.7211 + positionAdjustment),
      height: isLandscape ? SCREEN_HEIGHT * 0.6 : SCREEN_HEIGHT * 0.456,
      width: SCREEN_WIDTH * 1.02,
    },
    wave4: {
      top: isLandscape ? SCREEN_HEIGHT * (0.7 + positionAdjustment) : SCREEN_HEIGHT * (0.8503 + positionAdjustment),
      height: isLandscape ? SCREEN_HEIGHT * 0.45 : SCREEN_HEIGHT * 0.325,
      width: SCREEN_WIDTH * 1.014,
    },
  };

  // Light pink color for wave highlights
  const lightPrimary = '#fce7ef'; // Light version of primary pink
  const darkPrimary = '#8b2f4f'; // Darker version of primary pink

  // Variant-specific opacity adjustments
  const opacityMultiplier = {
    home: 1,
    classes: 0.95,
    shop: 0.92,
    profile: 0.88,
  }[variant];

  return (
    <>
      {/* Wave Layer 1 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -4,
          top: wavePositions.wave1.top,
          transform: [{ translateY: wave1Anim }],
          opacity: opacityMultiplier,
        }}
        pointerEvents="none"
      >
        <Svg
          width={wavePositions.wave1.width}
          height={wavePositions.wave1.height}
          viewBox="0 0 375 643"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 294.76C93.75 328.84 187.5 362.92 281.25 362.92C375 362.92 375 328.84 375 294.76V643.76H0V294.76Z"
            fill="url(#wave1Gradient)"
          />
          <Defs>
            <SvgLinearGradient
              id="wave1Gradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={Colors.background} />
              <Stop offset="40%" stopColor={lightPrimary} />
              <Stop offset="80%" stopColor="#2a2a2a" />
              <Stop offset="100%" stopColor={Colors.dark} />
            </SvgLinearGradient>
          </Defs>
        </Svg>
      </Animated.View>

      {/* Wave Layer 2 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -4,
          top: wavePositions.wave2.top,
          transform: [{ translateY: wave2Anim }],
        }}
        pointerEvents="none"
      >
        <Svg
          width={wavePositions.wave2.width}
          height={wavePositions.wave2.height}
          viewBox="0 0 380 483"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 0C95 69.57 190 139.14 285 139.14C380 139.14 380 69.57 380 0V483H0V0Z"
            fill="url(#wave2Gradient)"
          />
          <Defs>
            <SvgLinearGradient
              id="wave2Gradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={Colors.primary} />
              <Stop offset="30%" stopColor={Colors.gradient2} />
              <Stop offset="60%" stopColor={darkPrimary} />
              <Stop offset="100%" stopColor="#1a1a1a" />
            </SvgLinearGradient>
          </Defs>
        </Svg>
      </Animated.View>

      {/* Wave Layer 3 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -1,
          top: wavePositions.wave3.top,
          transform: [{ translateY: wave3Anim }],
        }}
        pointerEvents="none"
      >
        <Svg
          width={wavePositions.wave3.width}
          height={wavePositions.wave3.height}
          viewBox="0 0 375 371"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 144.68C93.75 96.45 187.5 48.23 281.25 48.23C375 48.23 375 96.45 375 144.68V371H0V144.68Z"
            fill="url(#wave3Gradient)"
          />
          <Defs>
            <SvgLinearGradient
              id="wave3Gradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={darkPrimary} />
              <Stop offset="40%" stopColor="#3a3a3a" />
              <Stop offset="100%" stopColor={Colors.dark} />
            </SvgLinearGradient>
          </Defs>
        </Svg>
      </Animated.View>

      {/* Wave Layer 4 */}
      <Animated.View
        style={{
          position: 'absolute',
          left: -4,
          top: wavePositions.wave4.top,
          transform: [{ translateY: wave4Anim }],
        }}
        pointerEvents="none"
      >
        <Svg
          width={wavePositions.wave4.width}
          height={wavePositions.wave4.height}
          viewBox="0 0 380 264"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 52.88C95 17.63 190 0 285 0C380 0 380 35.25 380 70.51V264H0V52.88Z"
            fill="url(#wave4Gradient)"
          />
          <Defs>
            <SvgLinearGradient
              id="wave4Gradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#2a2a2a" />
              <Stop offset="50%" stopColor={Colors.dark} />
              <Stop offset="100%" stopColor={bottomWhite ? Colors.dark : "#0a0a0a"} />
            </SvgLinearGradient>
          </Defs>
        </Svg>
      </Animated.View>
    </>
  );
};
