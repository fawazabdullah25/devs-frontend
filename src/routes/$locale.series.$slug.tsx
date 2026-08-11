import { ArrowRightIcon, ClockIcon, PlayIcon } from "@phosphor-icons/react"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"

import { AboutContent, ContentDetailHero } from "@/components/content-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getContent } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { formatDuration, localize } from "@/types/content"

export const Route = createFileRoute("/$locale/series/$slug")({
  loader: async ({ params }) => {
    const content = await getContent(params.slug)
    if (!content || content.kind !== "SERIES") throw notFound()
    return content
  },
  component: SeriesPage,
})

function SeriesPage() {
  const content = Route.useLoaderData()
  const { locale, t } = useLocale()
  const firstLesson = content.units[0]
  const firstHref = `/${locale}/series/${content.slug}/lessons/${firstLesson.slug}`

  return (
    <>
      <ContentDetailHero content={content} actionHref={firstHref} />
      <div className="content-shell flex flex-col gap-16 py-14 sm:py-20">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("whatYouWillLearn")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              {t("curriculum")}
            </h2>
          </div>
          <div className="grid gap-3">
            {content.units.map((unit) => (
              <Card key={unit.id} className="sm:flex-row sm:items-center">
                <CardHeader className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {t("lessonNumber")} {unit.position}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ClockIcon aria-hidden="true" />
                      {formatDuration(unit.media.durationSeconds)}
                    </span>
                  </div>
                  <CardTitle>{localize(unit.title, locale)}</CardTitle>
                  {unit.summary && (
                    <CardDescription>
                      {localize(unit.summary, locale)}
                    </CardDescription>
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
                    <ArrowRightIcon
                      data-icon="inline-end"
                      className="rtl:rotate-180"
                    />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        <AboutContent content={content} />
      </div>
    </>
  )
}
