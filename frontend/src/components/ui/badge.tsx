import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary backdrop-blur-sm',
        secondary: 'border-white/30 bg-white/40 text-secondary-foreground backdrop-blur-sm',
        destructive: 'border-transparent bg-red-500/15 text-red-600 backdrop-blur-sm',
        outline: 'border-white/40 bg-white/25 text-foreground/80 backdrop-blur-sm',
        success: 'border-transparent bg-emerald-500/15 text-emerald-600 backdrop-blur-sm',
        warning: 'border-transparent bg-amber-500/15 text-amber-600 backdrop-blur-sm',
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
