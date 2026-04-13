import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

/*
 * Apple-style page header: large tight-tracked headline, single-line
 * descriptor below. No card background — it reads as a page scene header.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-10 pt-10 pb-6 gap-6">
      <div className="min-w-0">
        {/* DESIGN.md §3: Section Heading — 40px weight 600 line-height 1.10 tracking -0.003em */}
        <h1 className="text-[40px] font-semibold leading-[1.10] tracking-apple-section text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-[17px] text-muted-foreground mt-2 tracking-apple-body leading-[1.47]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-2">{action}</div>}
    </div>
  )
}
