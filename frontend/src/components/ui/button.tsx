import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Apple-inspired button variants.
 * - default: Apple Blue CTA
 * - dark: #1d1d1f solid (secondary CTA)
 * - outline: 1px border, transparent bg
 * - ghost: no bg, darkens on hover
 * - link: inline text link, Apple link blue
 * - pill: 980px radius, transparent, 1px border — "Learn more" style
 * - destructive: red CTA
 */

const buttonVariants = cva(
  'inline-flex items-center justify-center font-normal transition-colors duration-200 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85 rounded-md',
        dark:
          'bg-[#1d1d1f] text-white hover:bg-black active:bg-[#333] rounded-md dark:bg-white dark:text-[#1d1d1f] dark:hover:bg-white/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md',
        outline:
          'bg-transparent border border-foreground/20 text-foreground hover:bg-foreground/5 rounded-md',
        secondary:
          'bg-[#fafafc] dark:bg-[#2a2a2d] text-foreground hover:bg-[#ededf2] dark:hover:bg-[#333] rounded-lg border border-foreground/[0.06]',
        ghost:
          'text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-md',
        link:
          'text-[#0066cc] dark:text-[#2997ff] hover:underline underline-offset-2 rounded-none p-0 h-auto',
        pill:
          'bg-transparent text-[#0066cc] dark:text-[#2997ff] border border-[#0066cc] dark:border-[#2997ff] hover:bg-[#0066cc]/5 dark:hover:bg-[#2997ff]/10 rounded-pill',
      },
      size: {
        /* DESIGN.md §4: Standard button — 17px SF Pro Text weight 400, 8px 15px padding */
        default: 'h-[34px] px-[15px] text-[17px] leading-none tracking-apple-body',
        sm: 'h-8 px-3 text-[14px] leading-none tracking-apple-caption',
        lg: 'h-11 px-6 text-[17px] leading-none tracking-apple-body',
        icon: 'h-[34px] w-[34px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
