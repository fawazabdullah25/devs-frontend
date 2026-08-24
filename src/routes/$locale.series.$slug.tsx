import { createFileRoute, notFound } from "@tanstack/react-router"

import { AboutContent, ContentDetailHero } from "@/components/content-detail"
import { SeriesCurriculum } from "@/components/series-curriculum"
import { getContent } from "@/lib/api"
import { orderedSeriesUnits } from "@/lib/curriculum"
import { useLocale } from "@/lib/locale-context"

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
  const firstLesson = orderedSeriesUnits(content)[0]
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
          <SeriesCurriculum content={content} />
        </section>
        <AboutContent content={content} />
      </div>
    </>
  )
}
