import * as React from "react"
import { FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { createFileRoute } from "@tanstack/react-router"

import { ContentCard } from "@/components/content-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getCatalog } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import type {
  CatalogFilters,
  CatalogPayload,
  ContentKind,
  SpokenLanguage,
} from "@/types/content"
import { localize } from "@/types/content"

export const Route = createFileRoute("/$locale/catalog")({
  loader: () => getCatalog(),
  component: CatalogPage,
})

function CatalogPage() {
  const initialCatalog = Route.useLoaderData()
  const { locale, t } = useLocale()
  const [filters, setFilters] = React.useState<CatalogFilters>({
    kind: "ALL",
    language: "ALL",
  })
  const [catalog, setCatalog] = React.useState<CatalogPayload>(initialCatalog)
  const [loading, startTransition] = React.useTransition()

  React.useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await getCatalog(filters)
        if (active) setCatalog(result)
      })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [filters])

  const updateFilter = <TKey extends keyof CatalogFilters>(
    key: TKey,
    value: CatalogFilters[TKey]
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => setFilters({ kind: "ALL", language: "ALL" })
  const topicItems = [
    { value: "ALL", label: t("all") },
    ...initialCatalog.topics.map((topic) => ({
      value: topic.slug,
      label: localize(topic.name, locale),
    })),
  ]
  const levelItems = [
    { value: "ALL", label: t("all") },
    ...initialCatalog.levels.map((level) => ({
      value: level.slug,
      label: localize(level.name, locale),
    })),
  ]
  const languageItems = [
    { value: "ALL", label: t("all") },
    { value: "AR", label: t("arabic") },
    { value: "EN", label: t("english") },
    { value: "MIXED", label: t("mixed") },
  ]

  return (
    <div className="content-shell py-14 sm:py-20">
      <header className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t("catalog")}
        </h1>
        <p className="text-base leading-8 text-muted-foreground">
          {t("catalogDescription")}
        </p>
      </header>

      <section
        aria-label={t("catalog")}
        className="mt-10 flex flex-col gap-5 border bg-card p-4 sm:p-5"
      >
        <InputGroup className="h-11">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.query ?? ""}
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
          />
        </InputGroup>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t("kind")}
            </span>
            <ToggleGroup
              value={[filters.kind ?? "ALL"]}
              onValueChange={(values) =>
                updateFilter(
                  "kind",
                  (values[0] ?? "ALL") as ContentKind | "ALL"
                )
              }
              variant="outline"
              spacing={0}
              aria-label={t("kind")}
            >
              <ToggleGroupItem value="ALL">{t("all")}</ToggleGroupItem>
              <ToggleGroupItem value="COURSE">{t("course")}</ToggleGroupItem>
              <ToggleGroupItem value="SERIES">{t("series")}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FilterSelect
              label={t("topic")}
              value={filters.topic ?? "ALL"}
              items={topicItems}
              onValueChange={(value) =>
                updateFilter("topic", value === "ALL" ? undefined : value)
              }
            />
            <FilterSelect
              label={t("level")}
              value={filters.level ?? "ALL"}
              items={levelItems}
              onValueChange={(value) =>
                updateFilter("level", value === "ALL" ? undefined : value)
              }
            />
            <FilterSelect
              label={t("language")}
              value={filters.language ?? "ALL"}
              items={languageItems}
              onValueChange={(value) =>
                updateFilter("language", value as SpokenLanguage | "ALL")
              }
            />
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("showingResults")}{" "}
          <strong className="text-foreground">{catalog.totalItems}</strong>{" "}
          {t("results")}
        </p>
        {loading && (
          <span className="text-xs text-muted-foreground">{t("loading")}</span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : catalog.items.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.items.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      ) : (
        <Empty className="mt-5 min-h-80 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FunnelIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t("noResults")}</EmptyTitle>
            <EmptyDescription>{t("noResultsDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  items,
  onValueChange,
}: {
  label: string
  value: string
  items: { value: string; label: string }[]
  onValueChange: (value: string) => void
}) {
  return (
    <label className="flex min-w-40 flex-col gap-2 text-xs font-medium text-muted-foreground">
      {label}
      <Select
        items={items}
        value={value}
        onValueChange={(next) => next && onValueChange(next)}
      >
        <SelectTrigger className="h-9 w-full min-w-40" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}
