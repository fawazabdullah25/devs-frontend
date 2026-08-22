import { createFileRoute, notFound } from "@tanstack/react-router"

import { AboutContent, ContentDetailHero } from "@/components/content-detail"
import { VideoPlayer } from "@/components/video-player"
import { AttachmentsSection } from "@/components/attachments-section"
import { getContent } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { localize } from "@/types/content"

export const Route = createFileRoute("/$locale/courses/$slug")({
  loader: async ({ params }) => {
    const content = await getContent(params.slug)
    if (!content || content.kind !== "COURSE") throw notFound()
    return content
  },
  component: CoursePage,
})

function CoursePage() {
  const content = Route.useLoaderData()
  const { locale, t } = useLocale()
  const unit = content.units[0]

  return (
    <>
      <ContentDetailHero content={content} actionHref={`#${unit.slug}`} />
      <div className="content-shell flex flex-col gap-16 py-14 sm:py-20">
        <section id={unit.slug} className="scroll-mt-24">
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {t("watchNow")}
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              {localize(content.title, locale)}
            </h2>
          </div>
          <VideoPlayer unit={unit} title={localize(content.title, locale)} />
          <div className="mt-6">
            <AttachmentsSection attachments={unit.attachments} />
          </div>
        </section>
        <AboutContent content={content} />
      </div>
    </>
  )
}
