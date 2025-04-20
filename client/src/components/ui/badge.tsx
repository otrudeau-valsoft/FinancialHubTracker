import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary bg-opacity-20 text-secondary hover:bg-secondary/20",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success-200 bg-opacity-20 text-success-200 hover:bg-success-200/20",
        warning: "border-transparent bg-[#FFC107] bg-opacity-20 text-[#FFC107] hover:bg-[#FFC107]/20",
        danger: "border-transparent bg-danger bg-opacity-20 text-danger hover:bg-danger/20",
        comp: "border-transparent bg-secondary bg-opacity-20 text-secondary hover:bg-secondary/20",
        cat: "border-transparent bg-[#FFC107] bg-opacity-20 text-[#FFC107] hover:bg-[#FFC107]/20",
        cycl: "border-transparent bg-[#9C27B0] bg-opacity-20 text-[#9C27B0] hover:bg-[#9C27B0]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
