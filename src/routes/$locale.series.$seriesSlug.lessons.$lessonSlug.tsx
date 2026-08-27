import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  ListBulletsIcon,
} from "@phosphor-icons/react"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"

import { VideoPlayer } from "@/components/video-player"
import { AttachmentsSection } from "@/components/attachments-section"
import { SeriesCurriculumSidebar } from "@/components/series-curriculum"
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
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { getContent } from "@/lib/api"
import { lessonNumber, orderedSeriesUnits } from "@/lib/curriculum"
import { useLocale } from "@/lib/locale-context"
import { formatDuration, localize } from "@/types/content"

export const Route = createFileRoute(
  "/$locale/series/$seriesSlug/lessons/$lessonSlug"
)({
  loader: async ({ params }) => {
    const content = await getContent(params.seriesSlug)
    const unit = content?.units.find(
      (candidate) => candidate.slug === params.lessonSlug
    )
    if (!content || content.kind !== "SERIES" || !unit) throw notFound()
    return { content, unit }
  },
  component: LessonPage,
})

function LessonPage() {
  const { content, unit } = Route.useLoaderData()
  const { locale, t } = useLocale()
  const orderedUnits = orderedSeriesUnits(content)
  const index = orderedUnits.findIndex((candidate) => candidate.id === unit.id)
  const previous = index > 0 ? orderedUnits[index - 1] : null
  const next = index < orderedUnits.length - 1 ? orderedUnits[index + 1] : null
  const progress = Math.round(((index + 1) / orderedUnits.length) * 100)

  return (
    <div className="content-shell py-8 sm:py-12">
      <Button
        variant="ghost"
        size="sm"
        render={
          <Link
            to="/$locale/series/$slug"
            params={{ locale, slug: content.slug }}
          />
        }
        nativeButton={false}
      >
        <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
        {localize(content.title, locale)}
      </Button>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0">
          <VideoPlayer unit={unit} title={localize(unit.title, locale)} />
          <div className="mt-7 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>
                {t("lessonNumber")} {lessonNumber(content, unit.id)}
              </Badge>
              <Badge variant="outline">
                <ClockIcon />
                {formatDuration(unit.media.durationSeconds)}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {localize(unit.title, locale)}
            </h1>
            {unit.summary && (
              <p className="leading-7 text-muted-foreground">
                {localize(unit.summary, locale)}
              </p>
            )}
          </div>

          {(previous || next) && (
            <nav
              className="mt-6 grid gap-3 sm:grid-cols-2"
              aria-label={t("curriculum")}
            >
              {previous ? (
                <LessonNavigation
                  label={t("previousLesson")}
                  contentSlug={content.slug}
                  unitSlug={previous.slug}
                  title={localize(previous.title, locale)}
                  icon="previous"
                />
              ) : (
                <span aria-hidden="true" className="hidden sm:block" />
              )}
              {next && (
                <LessonNavigation
                  label={t("nextLesson")}
                  contentSlug={content.slug}
                  unitSlug={next.slug}
                  title={localize(next.title, locale)}
                  icon="next"
                />
              )}
            </nav>
          )}
        </main>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListBulletsIcon />
                {t("curriculum")}
              </CardTitle>
              <CardDescription>
                {localize(content.title, locale)}
              </CardDescription>
              <Progress value={progress}>
                <ProgressLabel>
                  {index + 1} / {content.units.length}
                </ProgressLabel>
                <ProgressValue>{() => `${progress}%`}</ProgressValue>
              </Progress>
            </CardHeader>
            <CardContent>
              <SeriesCurriculumSidebar
                content={content}
                activeUnitId={unit.id}
              />
            </CardContent>
          </Card>
          <AttachmentsSection attachments={unit.attachments} />
        </aside>
      </div>
    </div>
  )
}

function LessonNavigation({
  label,
  contentSlug,
  unitSlug,
  title,
  icon,
}: {
  label: string
  contentSlug: string
  unitSlug: string
  title: string
  icon: "previous" | "next"
}) {
  const { locale } = useLocale()
  return (
    <Button
      variant="outline"
      className="h-auto justify-between gap-4 py-4 text-start whitespace-normal"
      render={
        <Link
          to="/$locale/series/$seriesSlug/lessons/$lessonSlug"
          params={{ locale, seriesSlug: contentSlug, lessonSlug: unitSlug }}
        />
      }
      nativeButton={false}
    >
      {icon === "previous" && (
        <ArrowLeftIcon data-icon="inline-start" className="rtl:rotate-180" />
      )}
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span>{title}</span>
      </span>
      {icon === "next" && (
        <ArrowRightIcon data-icon="inline-end" className="rtl:rotate-180" />
      )}
    </Button>
  )
}
