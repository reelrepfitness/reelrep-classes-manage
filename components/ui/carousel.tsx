import * as React from "react";
import {
    View,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { cn } from "../../lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type CarouselApi = {
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
    scrollToIndex: (index: number) => void;
};

type CarouselContextProps = {
    carouselRef: React.RefObject<ScrollView>;
    api: CarouselApi;
    scrollPrev: () => void;
    scrollNext: () => void;
    canScrollPrev: boolean;
    canScrollNext: boolean;
    itemWidth: number;
    setItemWidth: (width: number) => void;
    orientation: "horizontal" | "vertical";
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
    const context = React.useContext(CarouselContext);
    if (!context) {
        throw new Error("useCarousel must be used within a <Carousel />");
    }
    return context;
}

interface CarouselProps {
    className?: string;
    orientation?: "horizontal" | "vertical";
    children: React.ReactNode;
    setApi?: (api: CarouselApi) => void;
}

function Carousel({
    orientation = "horizontal",
    setApi,
    className,
    children,
}: CarouselProps) {
    const carouselRef = React.useRef<ScrollView>(null);
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(true);
    const [itemWidth, setItemWidth] = React.useState(SCREEN_WIDTH);
    const [activeIndex, setActiveIndex] = React.useState(0);

    const scrollTo = React.useCallback(
        (index: number) => {
            if (carouselRef.current) {
                carouselRef.current.scrollTo({
                    x: orientation === "horizontal" ? index * itemWidth : 0,
                    y: orientation === "vertical" ? index * itemWidth : 0,
                    animated: true,
                });
                setActiveIndex(index);
            }
        },
        [itemWidth, orientation]
    );

    const scrollPrev = React.useCallback(() => {
        if (activeIndex > 0) scrollTo(activeIndex - 1);
    }, [activeIndex, scrollTo]);

    const scrollNext = React.useCallback(() => {
        scrollTo(activeIndex + 1);
    }, [activeIndex, scrollTo]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset =
            orientation === "horizontal"
                ? event.nativeEvent.contentOffset.x
                : event.nativeEvent.contentOffset.y;

        const index = Math.round(offset / itemWidth);

        if (index !== activeIndex) {
            setActiveIndex(index);
        }
        setCanScrollPrev(offset > 0);
        setCanScrollNext(true);
    };

    const api = React.useMemo(
        () => ({
            scrollPrev,
            scrollNext,
            canScrollPrev,
            canScrollNext,
            scrollToIndex: scrollTo,
        }),
        [scrollPrev, scrollNext, canScrollPrev, canScrollNext, scrollTo]
    );

    React.useEffect(() => {
        if (setApi) setApi(api);
    }, [api, setApi]);

    return (
        <CarouselContext.Provider
            value={{
                carouselRef,
                api,
                scrollPrev,
                scrollNext,
                canScrollPrev,
                canScrollNext,
                itemWidth,
                setItemWidth,
                orientation,
            }}
        >
            <View className={cn("relative", className)}>
                {children}
            </View>
        </CarouselContext.Provider>
    );
}

function CarouselContent({ className, children }: { className?: string; children: React.ReactNode }) {
    const { carouselRef, orientation } = useCarousel();

    return (
        <ScrollView
            ref={carouselRef}
            horizontal={orientation === "horizontal"}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            className={cn("flex", orientation === "horizontal" ? "flex-row" : "flex-col", className)}
        >
            {children}
        </ScrollView>
    );
}

function CarouselItem({ className, children }: { className?: string; children: React.ReactNode }) {
    const { setItemWidth } = useCarousel();

    return (
        <View
            onLayout={(e) => {
                setItemWidth(e.nativeEvent.layout.width);
            }}
            className={cn(
                "min-w-0 shrink-0 grow-0 basis-full",
                className
            )}
            style={{
                width: Dimensions.get('window').width * 0.8
            }}
        >
            {children}
        </View>
    );
}

// עדכון: כפתור עצמאי שלא דורש את Button.tsx החיצוני
function CarouselPrevious({
    className,
    ...props
}: React.ComponentProps<typeof TouchableOpacity>) {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
        <TouchableOpacity
            className={cn(
                "absolute h-8 w-8 rounded-full items-center justify-center border border-gray-200 bg-white dark:border-gray-800 dark:bg-black shadow-sm z-10",
                orientation === "horizontal"
                    ? "top-1/2 -left-4 -translate-y-1/2" // הזזתי קצת פנימה כדי שלא יברח מהמסך
                    : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
                !canScrollPrev && "opacity-50",
                className
            )}
            disabled={!canScrollPrev}
            onPress={scrollPrev}
            {...props}
        >
            <ArrowLeft size={16} className="text-black dark:text-white" color="#000" />
        </TouchableOpacity>
    );
}

function CarouselNext({
    className,
    ...props
}: React.ComponentProps<typeof TouchableOpacity>) {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
        <TouchableOpacity
            className={cn(
                "absolute h-8 w-8 rounded-full items-center justify-center border border-gray-200 bg-white dark:border-gray-800 dark:bg-black shadow-sm z-10",
                orientation === "horizontal"
                    ? "top-1/2 -right-4 -translate-y-1/2"
                    : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
                !canScrollNext && "opacity-50",
                className
            )}
            disabled={!canScrollNext}
            onPress={scrollNext}
            {...props}
        >
            <ArrowRight size={16} className="text-black dark:text-white" color="#000" />
        </TouchableOpacity>
    );
}

export {
    type CarouselApi,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
};