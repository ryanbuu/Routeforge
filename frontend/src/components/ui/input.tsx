import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/*
 * Apple-inspired input: #fafafc background, 11px radius, 2px Apple Blue focus.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg bg-[#fafafc] dark:bg-[#2a2a2d]',
        'border border-foreground/[0.06] dark:border-white/[0.08]',
        'px-3.5 py-2 text-[15px] text-foreground placeholder:text-foreground/40',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
