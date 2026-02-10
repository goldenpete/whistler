import * as React from "react"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/useStore"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const toggleThemingEnabled = useStore((state) => state.toggleThemingEnabled);

    return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        className="sr-only peer" 
        ref={ref} 
        onChange={(e) => {
           onChange?.(e);
           onCheckedChange?.(e.target.checked);
        }}
        {...props} 
      />
    <div className={cn(
      "w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600",
      toggleThemingEnabled ? "peer-checked:bg-primary" : "peer-checked:bg-zinc-500",
      className
    )}></div>
  </label>
)})
Switch.displayName = "Switch"

export { Switch }
