import type { ComponentType } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewEmptyStateProps {
    icon: ComponentType<any>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    actionIcon?: ComponentType<any>;
    compact?: boolean;
    className?: string;
}

export function ViewEmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    actionIcon: ActionIcon = Plus,
    compact = false,
    className,
}: ViewEmptyStateProps) {
    return (
        <div
            className={cn(
                "flex h-full items-center justify-center p-8 text-center text-muted-foreground",
                compact && "p-4",
                className
            )}
        >
            <div className={cn("flex flex-col items-center", compact ? "max-w-[15rem]" : "max-w-md")}>
                <Icon
                    size={compact ? 52 : 64}
                    weight="thin"
                    className={cn("mb-4 opacity-20", compact && "mb-3")}
                />
                <h1 className={cn("mb-2 text-2xl font-semibold text-foreground", compact && "text-lg")}>
                    {title}
                </h1>
                <p className={cn("opacity-60", compact && "text-xs")}>{description}</p>
                {actionLabel && onAction ? (
                    <Button
                        onClick={onAction}
                        size={compact ? "sm" : "default"}
                        className={cn("mt-4", compact && "h-8 w-full rounded-none text-xs")}
                    >
                        <ActionIcon className="mr-2" size={compact ? 14 : 16} weight="bold" />
                        {actionLabel}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
