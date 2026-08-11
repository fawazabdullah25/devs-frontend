import {
  CodeIcon,
  DatabaseIcon,
  GitBranchIcon,
  GlobeIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const coverIcons = [GlobeIcon, DatabaseIcon, GitBranchIcon, CodeIcon]

export function BrandCover({
  seed,
  title,
  className,
}: {
  seed: string
  title: string
  className?: string
}) {
  const index =
    [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) %
    coverIcons.length
  const Icon = coverIcons[index]

  return (
    <div
      className={cn(
        "brand-grid relative isolate flex aspect-video overflow-hidden bg-secondary p-5 text-secondary-foreground",
        className
      )}
      role="img"
      aria-label={title}
    >
      <div className="absolute -end-10 -top-16 size-48 rotate-45 border-[24px] border-primary/35" />
      <div className="absolute -start-8 -bottom-16 size-40 rotate-45 bg-primary/20" />
      <div className="relative mt-auto flex w-full items-end justify-between gap-4">
        <span className="max-w-[75%] font-heading text-xl leading-tight font-bold text-balance">
          {title}
        </span>
        <span className="grid size-12 shrink-0 place-items-center border bg-background/85 text-primary shadow-sm backdrop-blur-sm">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      </div>
    </div>
  )
}
