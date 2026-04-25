import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { useStore } from "@/store/useStore"

const TOOLTIP_GAP = 4
const TOOLTIP_ARROW_DEPTH = 6
const TOOLTIP_SIDE_OFFSET = TOOLTIP_GAP + TOOLTIP_ARROW_DEPTH

type TooltipSide = "top" | "bottom" | "left" | "right"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const tooltipsEnabled = useStore((state) => state.tooltipsEnabled)

  return (
    <TooltipPrimitive.Root
      open={tooltipsEnabled ? open : false}
      defaultOpen={tooltipsEnabled ? defaultOpen : false}
      onOpenChange={tooltipsEnabled ? onOpenChange : undefined}
      {...props}
    />
  )
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    data-slot="tooltip-trigger"
    {...props}
  />
))
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

interface TooltipSurfaceProps {
  children: React.ReactNode
  side?: TooltipSide
}

function TooltipSurface({ children, side }: TooltipSurfaceProps) {
  return (
    <div
      className={cn(
        "whistler-tooltip-surface",
        side && `whistler-tooltip-surface--${side}`
      )}
    >
      <div className="whistler-tooltip-surface__arrow" aria-hidden="true" />
      <div className="whistler-tooltip-surface__panel">{children}</div>
    </div>
  )
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = TOOLTIP_SIDE_OFFSET, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 origin-(--radix-tooltip-content-transform-origin) bg-transparent border-0 p-0 shadow-none",
        className
      )}
      {...props}
    >
      <TooltipSurface>{children}</TooltipSurface>
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

interface AppTooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  content?: React.ReactNode
  children: React.ReactElement
  disabled?: boolean
}

function AppTooltip({
  content,
  children,
  disabled = false,
  sideOffset = TOOLTIP_SIDE_OFFSET,
  ...props
}: AppTooltipProps) {
  const tooltipsEnabled = useStore((state) => state.tooltipsEnabled)

  if (
    !tooltipsEnabled ||
    disabled ||
    content === null ||
    content === undefined ||
    (typeof content === "string" && content.trim().length === 0)
  ) {
    return children
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={sideOffset} {...props}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  AppTooltip,
  TOOLTIP_ARROW_DEPTH,
  TOOLTIP_GAP,
  TOOLTIP_SIDE_OFFSET,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipSurface,
  TooltipTrigger,
}
export type { TooltipSide }
