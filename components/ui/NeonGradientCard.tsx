import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { cn } from '../../lib/utils';

interface NeonColorsProps {
    firstColor: string;
    secondColor: string;
}

interface NeonGradientCardProps {
    className?: string;
    children?: React.ReactNode;
    borderSize?: number;
    borderRadius?: number;
    neonColors?: NeonColorsProps;
    style?: ViewStyle;
}

const NeonGradientCard: React.FC<NeonGradientCardProps> = ({
    className,
    children,
    borderSize = 2,
    borderRadius = 20,
    neonColors = {
        firstColor: '#ff00aa',
        secondColor: '#00FFF1',
    },
    style,
    ...props
}) => {
    // Animation value to simulate the background-position movement
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withTiming(-100, {
                duration: 3000,
                easing: Easing.linear, // Or Easing.inOut(Easing.ease) to match "alternate" better
            }),
            -1, // Infinite
            true // Reverse (alternate)
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: `${translateY.value}%` }],
        };
    });

    return (
        <View
            className={cn('relative justify-center items-center', className)}
            style={[{ borderRadius }, style]}
            {...props}
        >
            {/* The "Glow" Layer (Background) 
        Simulating ::before and ::after behavior
      */}
            <View
                style={{
                    position: 'absolute',
                    top: -borderSize,
                    left: -borderSize,
                    right: -borderSize,
                    bottom: -borderSize,
                    borderRadius: borderRadius,
                    overflow: 'hidden',
                    zIndex: -1,
                }}
            >
                <Animated.View
                    style={[
                        {
                            width: '100%',
                            height: '300%', // Extra height for the sliding animation
                            top: '-100%', // Center the gradient initially
                        },
                        animatedStyle,
                    ]}
                >
                    <LinearGradient
                        colors={[neonColors.firstColor, neonColors.secondColor, neonColors.firstColor]}
                        style={{ flex: 1 }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                </Animated.View>
            </View>

            {/* The Content Layer */}
            <View
                className="bg-gray-100 dark:bg-neutral-900 w-full h-full p-6"
                style={{
                    borderRadius: borderRadius - borderSize,
                }}
            >
                {children}
            </View>
        </View>
    );
};

export { NeonGradientCard };
