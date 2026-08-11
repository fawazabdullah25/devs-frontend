import { cn } from "@/lib/utils"

export function DevsLogo({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative size-8 shrink-0">
        <img
          src="/devs-mark-light.svg"
          alt=""
          className="size-full dark:hidden"
          aria-hidden="true"
        />
        <img
          src="/devs-mark-dark.svg"
          alt=""
          className="hidden size-full dark:block"
          aria-hidden="true"
        />
      </span>
      {!compact && (
        <span className="font-heading text-lg font-bold tracking-tight">
          <span className="text-foreground">K</span>
          <span className="text-primary">Stack</span> Devs
        </span>
      )}
    </span>
  )
}
