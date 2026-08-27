import { ArrowRightIcon, ClockIcon, PlayIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  curriculumGroups,
  lessonNumber,
  orderedSeriesUnits,
} from "@/lib/curriculum"
import { useLocale } from "@/lib/locale-context"
import { formatDuration, localize } from "@/types/content"
import type { ContentUnit, LearningContent } from "@/types/content"

export function SeriesCurriculum({ content }: { content: LearningContent }) {
  const { locale, t } = useLocale()
  const groups = curriculumGroups(content)

  if (!groups.length) {
    return (
      <div className="grid gap-3">
        {orderedSeriesUnits(content).map((unit) => (
          <OverviewLesson key={unit.id} content={content} unit={unit} />
        ))}
      </div>
    )
  }

  return (
    <Accordion
      multiple
      defaultValue={groups[0] ? [groups[0].section.id] : []}
      className="border px-4 sm:px-5"
    >
      {groups.map((group, sectionIndex) => (
        <AccordionItem key={group.section.id} value={group.section.id}>
          <AccordionTrigger className="items-center gap-4 py-5 no-underline hover:no-underline">
            <span className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary tabular-nums">
                {sectionIndex + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-base font-semibold">
                  {localize(group.section.title, locale)}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {group.units.length} {t("lessons")}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDuration(group.durationSeconds)}</span>
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-5">
            {group.section.description && (
              <p className="leading-6 text-muted-foreground">
                {localize(group.section.description, locale)}
              </p>
            )}
            <div className="grid gap-3">
              {group.units.map((unit) => (
                <OverviewLesson key={unit.id} content={content} unit={unit} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function SeriesCurriculumSidebar({
  content,
  activeUnitId,
}: {
  content: LearningContent
  activeUnitId: string
}) {
  const { locale, t } = useLocale()
  const groups = curriculumGroups(content)

  if (!groups.length) {
    return (
      <div className="flex flex-col gap-1">
        {orderedSeriesUnits(content).map((unit) => (
          <SidebarLesson
            key={unit.id}
            content={content}
            unit={unit}
            active={unit.id === activeUnitId}
          />
        ))}
      </div>
    )
  }

  const currentSection = groups.find((group) =>
    group.units.some((unit) => unit.id === activeUnitId)
  )
  return (
    <Accordion
      multiple
      defaultValue={currentSection ? [currentSection.section.id] : []}
    >
      {groups.map((group, sectionIndex) => (
        <AccordionItem key={group.section.id} value={group.section.id}>
          <AccordionTrigger className="items-center gap-2 py-3 no-underline hover:no-underline">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {t("section")} {sectionIndex + 1}
              </span>
              <span className="truncate text-sm font-semibold">
                {localize(group.section.title, locale)}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-1 pb-3">
            {group.units.map((unit) => (
              <SidebarLesson
                key={unit.id}
                content={content}
                unit={unit}
                active={unit.id === activeUnitId}
              />
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function OverviewLesson({
  content,
  unit,
}: {
  content: LearningContent
  unit: ContentUnit
}) {
  const { locale, t } = useLocale()
  return (
    <Card className="sm:flex-row sm:items-center">
      <CardHeader className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {t("lessonNumber")} {lessonNumber(content, unit.id)}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon aria-hidden="true" />
            {formatDuration(unit.media.durationSeconds)}
          </span>
        </div>
        <CardTitle>{localize(unit.title, locale)}</CardTitle>
        {unit.summary && (
          <CardDescription>{localize(unit.summary, locale)}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="sm:ps-0 sm:pe-6">
        <Button
          variant={unit.position === 1 ? "default" : "outline"}
          render={
            <Link
              to="/$locale/series/$seriesSlug/lessons/$lessonSlug"
              params={{
                locale,
                seriesSlug: content.slug,
                lessonSlug: unit.slug,
              }}
            />
          }
          nativeButton={false}
        >
          <PlayIcon data-icon="inline-start" />
          {t("watchNow")}
          <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" />
        </Button>
      </CardContent>
    </Card>
  )
}

function SidebarLesson({
  content,
  unit,
  active,
}: {
  content: LearningContent
  unit: ContentUnit
  active: boolean
}) {
  const { locale } = useLocale()
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className="h-auto justify-start py-3 text-start whitespace-normal"
      aria-current={active ? "page" : undefined}
      render={
        <Link
          to="/$locale/series/$seriesSlug/lessons/$lessonSlug"
          params={{
            locale,
            seriesSlug: content.slug,
            lessonSlug: unit.slug,
          }}
        />
      }
      nativeButton={false}
    >
      <span className="w-7 shrink-0 text-center text-xs tabular-nums">
        {lessonNumber(content, unit.id)}
      </span>
      {localize(unit.title, locale)}
    </Button>
  )
}
