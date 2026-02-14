import React from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import {
    Home,
    Plus,
    User,
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import colors from '../constants/colors';

interface TabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

const TAB_BAR_MARGIN = 20;
const TAB_BAR_HEIGHT = 70;
const CORNER_RADIUS = 35;

export const SimpleTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const TAB_BAR_WIDTH = SCREEN_WIDTH - (TAB_BAR_MARGIN * 2);

    // Generate Path for the Tab Bar Shape with center pocket
    const d = React.useMemo(() => {
        const w = TAB_BAR_WIDTH;
        const h = TAB_BAR_HEIGHT;
        const r = CORNER_RADIUS;
        const c = w / 2;
        const pr = 42; // Pocket radius (button 32 + 10 padding)

        const pocketStart = c - pr;
        const pocketEnd = c + pr;

        return `
            M 0 ${r}
            Q 0 0 ${r} 0
            L ${pocketStart} 0
            A ${pr} ${pr} 0 0 0 ${pocketEnd} 0 
            L ${w - r} 0
            Q ${w} 0 ${w} ${r}
            L ${w} ${h - r}
            Q ${w} ${h} ${w - r} ${h}
            L ${r} ${h}
            Q 0 ${h} 0 ${h - r}
            Z
        `;
    }, [TAB_BAR_WIDTH]);

    const getIconComponent = (routeName: string) => {
        switch (routeName) {
            case 'index':
                return Home;
            case 'classes':
                return Plus;
            case 'profile':
                return User;
            default:
                return Home;
        }
    };

    // Reorder routes: index, classes (center), profile
    const orderedRoutes = React.useMemo(() => {
        const routes = [...state.routes];
        // Order should be: index (left), classes (center), profile (right)
        const indexRoute = routes.find((r: any) => r.name === 'index');
        const classesRoute = routes.find((r: any) => r.name === 'classes');
        const profileRoute = routes.find((r: any) => r.name === 'profile');
        return [indexRoute, classesRoute, profileRoute].filter(Boolean);
    }, [state.routes]);

    return (
        <View style={styles.containerWrapper}>
            <ExpoLinearGradient
                colors={['transparent', 'rgba(169, 36, 169, 0.8)', '#952594ff']}
                locations={[0, 0.4, 1]}
                style={{
                    position: 'absolute',
                    bottom: -30,
                    left: -TAB_BAR_MARGIN,
                    right: -TAB_BAR_MARGIN,
                    height: 150,
                    zIndex: -1,
                }}
            />
            {/* SVG Background */}
            <View style={styles.svgContainer}>
                <Svg width={TAB_BAR_WIDTH} height={TAB_BAR_HEIGHT}>
                    <Defs>
                        <LinearGradient id="tabBarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#000000" />
                            <Stop offset="50%" stopColor="#1a1a1a" />
                            <Stop offset="100%" stopColor="#2d2d2d" />
                        </LinearGradient>
                    </Defs>
                    <Path d={d} fill="url(#tabBarGradient)" />
                </Svg>
            </View>

            <View style={[styles.container, { paddingBottom: 0 }]}>
                {orderedRoutes.map((route: any) => {
                    const originalIndex = state.routes.findIndex((r: any) => r.key === route.key);
                    const { options } = descriptors[route.key];

                    if (options.tabBarButton === null || (typeof options.tabBarButton === 'function' && options.tabBarButton({}) === null)) {
                        return null;
                    }

                    const isFocused = state.index === originalIndex;
                    const isCenterButton = route.name === 'classes';

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const IconComponent = getIconComponent(route.name);
                    const activeColor = colors.primary;
                    const inactiveColor = '#FFFFFF';
                    const centerIconColor = '#FFFFFF';

                    if (isCenterButton) {
                        return (
                            <View key={route.key} style={styles.centerButtonContainer}>
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    accessibilityState={isFocused ? { selected: true } : {}}
                                    onPress={onPress}
                                    style={styles.centerButton}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={require('../assets/images/plus-icon-kettlebell.svg')}
                                        style={{ width: 110, height: 110 }}
                                        contentFit="contain"
                                    />
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={onPress}
                            style={styles.tab}
                        >
                            {route.name === 'index' ? (
                                <Image
                                    source={require('../assets/images/home-screen.webp')}
                                    style={{ width: 28, height: 28, tintColor: isFocused ? activeColor : inactiveColor }}
                                    contentFit="contain"
                                />
                            ) : route.name === 'profile' ? (
                                <Image
                                    source={require('../assets/images/profile-screen.webp')}
                                    style={{ width: 28, height: 28, tintColor: isFocused ? activeColor : inactiveColor }}
                                    contentFit="contain"
                                />
                            ) : (
                                <IconComponent
                                    size={30}
                                    color={isFocused ? activeColor : inactiveColor}
                                    strokeWidth={isFocused ? 2.5 : 2}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    containerWrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 50 : 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: TAB_BAR_MARGIN,
    },
    svgContainer: {
        position: 'absolute',
        top: 0,
        left: TAB_BAR_MARGIN,
        right: TAB_BAR_MARGIN,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    container: {
        flexDirection: 'row',
        height: TAB_BAR_HEIGHT,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    centerButtonContainer: {
        width: 80,
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 10,
    },
    centerButton: {
        width: 110,
        height: 110,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -70,
        // Removed container styling (borderRadius, shadow, overflow) to let SVG stand alone
    },
    centerButtonGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SimpleTabBar;
