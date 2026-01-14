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

const CardHeader = React.forwardRef<View, React.ComponentProps<typeof View>>(
    ({ className, ...props }, ref) => (
        <View
            ref={ref}
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        />
    )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<Text, React.ComponentProps<typeof Text>>(
    ({ className, ...props }, ref) => (
        <Text
            ref={ref}
            className={cn(
                "font-semibold leading-none tracking-tight",
                className
            )}
            {...props}
        />
    )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<Text, React.ComponentProps<typeof Text>>(
    ({ className, ...props }, ref) => (
        <Text
            ref={ref}
            className={cn("text-sm text-gray-500", className)}
            {...props}
        />
    )
);
CardDescription.displayName = "CardDescription";

const CardFooter = React.forwardRef<View, React.ComponentProps<typeof View>>(
    ({ className, ...props }, ref) => (
        <View
            ref={ref}
            className={cn("flex flex-row items-center p-6 pt-0", className)}
            {...props}
        />
    )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };