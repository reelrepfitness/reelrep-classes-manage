import React from 'react';
import { View, Dimensions } from 'react-native';
import { MonthlyComparisonChart } from '@/components/charts/MonthlyComparisonChart';
import { RetentionCard } from './cards/RetentionCard';
import { BirthdayCard } from './cards/BirthdayCard';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from '@/components/ui/carousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AdminActionStack = () => {
    return (
        <View style={{ height: 400, alignItems: 'center', justifyContent: 'center' }}>
            <Carousel className="w-full max-w-xs">
                <CarouselContent>
                    <CarouselItem>
                        <View className="p-1">
                            <MonthlyComparisonChart />
                        </View>
                    </CarouselItem>
                    <CarouselItem>
                        <View className="p-1">
                            <RetentionCard />
                        </View>
                    </CarouselItem>
                    <CarouselItem>
                        <View className="p-1">
                            <BirthdayCard />
                        </View>
                    </CarouselItem>
                </CarouselContent>
            </Carousel>
        </View>
    );
};
