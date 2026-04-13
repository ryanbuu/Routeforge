import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/*
 * Apple-style badge: small tag. Apple rarely uses colored chips,
 * so we default to neutral. Accent variants remain minimal.
 */

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-apple-micro whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-foreground/5 text-foreground/80 dark:bg-white/10 dark:text-white/85',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-foreground/15 text-foreground/70',
        success: 'bg-[#30d158]/[0.12] text-[#248a3d] dark:text-[#30d158]',
        warning: 'bg-[#ff9500]/[0.12] text-[#c26500] dark:text-[#ff9f0a]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
