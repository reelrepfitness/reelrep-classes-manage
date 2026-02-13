import LottieView, { type LottieViewProps } from 'lottie-react-native';
import React, { forwardRef } from 'react';
import { type ViewStyle } from 'react-native';

interface LottieAnimationProps {
  source: LottieViewProps['source'];
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  style?: ViewStyle;
  width?: number;
  height?: number;
  onAnimationFinish?: (isCancelled: boolean) => void;
}

export const LottieAnimation = forwardRef<LottieView, LottieAnimationProps>(
  (
    {
      source,
      autoPlay = true,
      loop = true,
      speed = 1,
      style,
      width = 200,
      height = 200,
      onAnimationFinish,
    },
    ref
  ) => {
    return (
      <LottieView
        ref={ref}
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        onAnimationFinish={onAnimationFinish}
        style={[{ width, height }, style]}
      />
    );
  }
);
