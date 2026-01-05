import React from 'react';
import { View } from 'react-native';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { IncomeSlide } from './slides/IncomeSlide';
import { RetentionSlide } from './slides/RetentionSlide';
import { BirthdaySlide } from './slides/BirthdaySlide';

export const AdminActionCarousel = () => {
    return (
        <View className="w-full justify-center items-center py-4">
            <Carousel className="w-full max-w-[340px]">
                <CarouselContent>
                    <CarouselItem>
                        <IncomeSlide />
                    </CarouselItem>
                    <CarouselItem>
                        <RetentionSlide />
                    </CarouselItem>
                    <CarouselItem>
                        <BirthdaySlide />
                    </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </View>
    );
};
