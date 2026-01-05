import * as React from "react";
import { View, Text, ViewStyle } from "react-native";
import { cn } from "../../lib/utils";

const Card = React.forwardRef<View, React.ComponentProps<typeof View>>(
    ({ className, ...props }, ref) => (
        <View
            ref={ref}
            className={cn(
                "rounded-lg bg-white shadow-sm dark:bg-gray-950",
                className
            )}
            {...props}
        />
    )
);
Card.displayName = "Card";

const CardContent = React.forwardRef<View, React.ComponentProps<typeof View>>(
    ({ className, ...props }, ref) => (
        <View ref={ref} className={cn("p-6 pt-0", className)} {...props} />
    )
);
CardContent.displayName = "CardContent";

export { Card, CardContent };